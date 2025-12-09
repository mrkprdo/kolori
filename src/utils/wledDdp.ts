/**
 * WLED DDP (Distributed Display Protocol) Implementation
 *
 * DDP is the recommended protocol for WLED 0.13+ (LedFx's default)
 * More reliable than UDP Realtime, supports larger LED counts
 *
 * Protocol Specification:
 * - 10-byte header + RGB pixel data
 * - Port: 4048
 * - Max per packet: 480 LEDs (1440 bytes)
 * - Multi-packet support for larger displays
 */

import dgram from "react-native-udp";
import { Buffer } from "buffer";
import { AudioFeatures } from "./audioProcessing";
import { logger } from "./logger";
import { generateEffectColors, EffectType, EffectConfig } from "./ledfxEffects";

const DDP_PORT = 4048; // DDP standard port
const DDP_MAX_PIXELS_PER_PACKET = 480; // 1440 bytes / 3 bytes per pixel
const DDP_HEADER_SIZE = 10;

// DDP Protocol Constants
// Flags byte format: bits 7-6 = version (01 = v1), bit 0 = push
const DDP_FLAGS_VER1 = 0x40; // Version 1 (bits 7-6 = 01)
const DDP_PUSH_FLAG = 0x01; // Push flag for final packet
const DDP_DATA_TYPE_RGB = 0x01; // RGB 24-bit (3 bytes per pixel)

// Singleton socket
let ddpSocket: any = null;
let socketReady: boolean = false;
let packetsSent: number = 0;
let packetsDropped: number = 0;

// Smoothing for LED colors
let previousLedColors: { r: number; g: number; b: number }[] = [];

// Default effect configuration
const defaultEffectConfig: EffectConfig = {
  brightness: 1.0, // Full brightness by default
  speed: 2,
  blur: 0.3,
  temporalSmoothing: 0.4,
  noiseGate: 0.05,
  intensityGamma: 0.85,
};

/**
 * Get or create DDP socket
 */
function getDdpSocket() {
  if (!ddpSocket) {
    try {
      ddpSocket = dgram.createSocket({ type: "udp4" });
      socketReady = false;

      ddpSocket.bind(0, () => {
        socketReady = true;
      });

      ddpSocket.on("error", function (error: any) {
        logger.error("DDP socket error:", error);
        socketReady = false;
      });
    } catch (error) {
      logger.error("Failed to create DDP socket:", error);
      return null;
    }
  }
  return ddpSocket;
}

/**
 * Check if socket is ready
 */
function isSocketReady(): boolean {
  return ddpSocket !== null && socketReady;
}

/**
 * Generate LED colors using LedFx effects
 */
function audioToLEDColors(
  audioFeatures: AudioFeatures,
  melSpectrum: number[],
  numLeds: number,
  effectType: EffectType = "wavelength",
  config: EffectConfig = defaultEffectConfig
): { r: number; g: number; b: number }[] {
  // Generate colors using effect system
  let colors = generateEffectColors(
    effectType,
    audioFeatures,
    melSpectrum,
    numLeds,
    config
  );

  const baseSmoothing = Math.min(
    0.95,
    Math.max(0, config.temporalSmoothing ?? 0.35)
  );

  if (previousLedColors.length !== colors.length) {
    previousLedColors = colors.map(() => ({ r: 0, g: 0, b: 0 }));
  }

  if (baseSmoothing === 0) {
    previousLedColors = colors.map((c) => ({ ...c }));
    return colors;
  }

  // Temporal smoothing envelope constants:
  // - ATTACK_BLEND_MIN: Minimum blend for attack (prevents abrupt changes)
  // - ATTACK_BLEND_MAX: Maximum blend for attack (limits smoothing)
  // - ATTACK_BLEND_MULTIPLIER: Scales base smoothing for attack phase
  // - RELEASE_BLEND_OFFSET: Offset added to base smoothing for release phase (slower fade-out)
  // - RELEASE_BLEND_MAX: Maximum blend for release (prevents excessive smoothing)
  const ATTACK_BLEND_MIN = 0.05;         // Minimum attack blend
  const ATTACK_BLEND_MAX = 0.85;         // Maximum attack blend
  const ATTACK_BLEND_MULTIPLIER = 0.5;   // Attack blend scaling factor
  const RELEASE_BLEND_OFFSET = 0.45;     // Release blend offset for slower fade
  const RELEASE_BLEND_MAX = 0.98;        // Maximum release blend

  // Asymmetric attack/release envelope:
  // - Attack: Faster response to rising values (less smoothing)
  // - Release: Slower response to falling values (more smoothing)
  const attackBlend = Math.max(
    ATTACK_BLEND_MIN,
    Math.min(ATTACK_BLEND_MAX, baseSmoothing * ATTACK_BLEND_MULTIPLIER)
  );
  const releaseBlend = Math.max(
    attackBlend,
    Math.min(RELEASE_BLEND_MAX, baseSmoothing + RELEASE_BLEND_OFFSET)
  );

  const blended = colors.map((color, i) => {
    const prev = previousLedColors[i] || { r: 0, g: 0, b: 0 };
    const mixR = color.r >= prev.r ? attackBlend : releaseBlend;
    const mixG = color.g >= prev.g ? attackBlend : releaseBlend;
    const mixB = color.b >= prev.b ? attackBlend : releaseBlend;

    return {
      r: Math.floor(prev.r * mixR + color.r * (1 - mixR)),
      g: Math.floor(prev.g * mixG + color.g * (1 - mixG)),
      b: Math.floor(prev.b * mixB + color.b * (1 - mixB)),
    };
  });

  previousLedColors = blended.map((c) => ({ ...c }));
  return blended;
}

/**
 * Build DDP packet header
 */
function buildDdpHeader(
  sequenceNumber: number,
  pixelOffset: number,
  dataLength: number,
  isPushPacket: boolean,
  destinationId: number = 0
): Uint8Array {
  const header = new Uint8Array(DDP_HEADER_SIZE);

  // Byte 0: Flags (version 1, push flag if final packet)
  header[0] = DDP_FLAGS_VER1 | (isPushPacket ? DDP_PUSH_FLAG : 0);

  // Byte 1: Sequence number (1-15, cycling)
  header[1] = (sequenceNumber % 15) + 1;

  // Byte 2: Data type (RGB 8-bit)
  header[2] = DDP_DATA_TYPE_RGB;

  // Byte 3: Destination ID
  header[3] = destinationId;

  // Bytes 4-7: Data offset (32-bit big-endian)
  // For RGB data type, WLED expects PIXEL offset, not byte offset
  header[4] = (pixelOffset >> 24) & 0xff;
  header[5] = (pixelOffset >> 16) & 0xff;
  header[6] = (pixelOffset >> 8) & 0xff;
  header[7] = pixelOffset & 0xff;

  // Bytes 8-9: Data length (16-bit big-endian)
  header[8] = (dataLength >> 8) & 0xff;
  header[9] = dataLength & 0xff;

  return header;
}

/**
 * Send LED data to WLED using DDP protocol
 * Automatically handles multi-packet fragmentation for large LED counts
 */
export function sendDdpToWLED(
  deviceIp: string,
  audioFeatures: AudioFeatures,
  melSpectrum: number[],
  numLeds: number = 50,
  effectType: EffectType = "wavelength",
  config: EffectConfig = defaultEffectConfig,
  ledOffset: number = 15
): void {
  try {
    const socket = getDdpSocket();
    if (!socket || !isSocketReady()) {
      packetsDropped++;
      return;
    }

    // Generate LED colors from audio using selected effect
    const ledColors = audioToLEDColors(
      audioFeatures,
      melSpectrum,
      numLeds,
      effectType,
      config
    );

    // Add LED offset compensation to fix data corruption/offset issues
    const sendNumLeds = numLeds + ledOffset;
    const paddedLedColors = [...ledColors];
    // Pad with the actual LED data (repeat the pattern)
    for (let i = numLeds; i < sendNumLeds; i++) {
      paddedLedColors.push(ledColors[i % numLeds] || { r: 0, g: 0, b: 0 });
    }

    // Calculate number of packets needed
    const totalPackets = Math.ceil(sendNumLeds / DDP_MAX_PIXELS_PER_PACKET);
    let sequenceNumber = Math.floor(Date.now() / 100) % 15; // Use time-based sequence

    // Send packets
    for (let packetIndex = 0; packetIndex < totalPackets; packetIndex++) {
      const pixelOffset = packetIndex * DDP_MAX_PIXELS_PER_PACKET;
      const pixelsInPacket = Math.min(
        DDP_MAX_PIXELS_PER_PACKET,
        sendNumLeds - pixelOffset
      );
      const dataLength = pixelsInPacket * 3; // 3 bytes per pixel (RGB)
      const isPushPacket = packetIndex === totalPackets - 1; // Mark last packet with PUSH flag

      // Build packet header
      const header = buildDdpHeader(
        sequenceNumber,
        pixelOffset,
        dataLength,
        isPushPacket
      );

      // Build packet data (RGB values)
      const packetData = new Uint8Array(DDP_HEADER_SIZE + dataLength);
      packetData.set(header, 0);

      // Copy RGB data in BGR order (Blue, Green, Red)
      for (let i = 0; i < pixelsInPacket; i++) {
        const color = paddedLedColors[pixelOffset + i] || { r: 0, g: 0, b: 0 };
        const offset = DDP_HEADER_SIZE + i * 3;
        packetData[offset] = Math.max(0, Math.min(255, color.b)); // Blue
        packetData[offset + 1] = Math.max(0, Math.min(255, color.g)); // Green
        packetData[offset + 2] = Math.max(0, Math.min(255, color.r)); // Red
      }

      const packetBuffer = Buffer.from(packetData);

      socket.send(
        packetBuffer,
        0,
        packetBuffer.length,
        DDP_PORT,
        deviceIp,
        (err: any) => {
          if (err) {
            packetsDropped++;
            logger.error(`DDP send failed to ${deviceIp}:${DDP_PORT}:`, err);
          } else {
            packetsSent++;
          }
        }
      );

      sequenceNumber++;
    }
  } catch (error) {
    logger.error("Error sending DDP data to WLED:", error);
  }
}

/**
 * Get packet statistics
 */
export function getDdpPacketStats(): { sent: number; dropped: number } {
  return {
    sent: Number(packetsSent),
    dropped: Number(packetsDropped),
  };
}

/**
 * Reset packet statistics
 */
export function resetDdpPacketStats(): void {
  packetsSent = 0;
  packetsDropped = 0;
}

/**
 * Reset LED color smoothing state and effect state
 */
export function resetDdpState(): void {
  previousLedColors = [];
  // Reset effect-specific state (scroll buffer, wave phase, etc.)
  const { resetEffectState } = require("./ledfxEffects");
  resetEffectState();
}

/**
 * Send blank (all black) frame to WLED to turn off LEDs
 */
export function sendBlankFrame(deviceIp: string, numLeds: number = 50): void {
  try {
    const socket = getDdpSocket();
    if (!socket || !isSocketReady()) {
      return;
    }

    // Build DDP packets with all-black data
    const totalPackets = Math.ceil(numLeds / DDP_MAX_PIXELS_PER_PACKET);
    let sequenceNumber = Math.floor(Date.now() / 100) % 15;

    for (let packetIndex = 0; packetIndex < totalPackets; packetIndex++) {
      const pixelOffset = packetIndex * DDP_MAX_PIXELS_PER_PACKET;
      const pixelsInPacket = Math.min(
        DDP_MAX_PIXELS_PER_PACKET,
        numLeds - pixelOffset
      );
      const dataLength = pixelsInPacket * 3;
      const isPushPacket = packetIndex === totalPackets - 1;

      const header = buildDdpHeader(
        sequenceNumber,
        pixelOffset,
        dataLength,
        isPushPacket
      );
      const packetData = new Uint8Array(DDP_HEADER_SIZE + dataLength);
      packetData.set(header, 0);

      // Fill with zeros (all black pixels)
      for (let i = 0; i < pixelsInPacket; i++) {
        const offset = DDP_HEADER_SIZE + i * 3;
        packetData[offset] = 0; // B
        packetData[offset + 1] = 0; // G
        packetData[offset + 2] = 0; // R
      }

      const packetBuffer = Buffer.from(packetData);

      socket.send(
        packetBuffer,
        0,
        packetBuffer.length,
        DDP_PORT,
        deviceIp,
        (err: any) => {
          if (err) {
            logger.error(
              `Failed to send blank frame to ${deviceIp}:${DDP_PORT}:`,
              err
            );
          }
        }
      );

      sequenceNumber++;
    }
  } catch (error) {
    logger.error("Error sending blank frame:", error);
  }
}

/**
 * Close DDP socket
 */
export function closeDdpSocket(): void {
  if (ddpSocket) {
    try {
      ddpSocket.close();
      ddpSocket = null;
      socketReady = false;
      previousLedColors = [];
    } catch (error) {
      logger.error("Error closing DDP socket:", error);
    }
  }
}
