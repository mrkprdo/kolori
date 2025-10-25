/**
 * WLED UDP Audio Sync Protocol
 *
 * Sends real-time audio data to WLED for audio reactive effects
 * Based on WLED's AudioReactive usermod UDP protocol
 */

import dgram from 'react-native-udp';
import { AudioFeatures } from './audioProcessing';
import { logger } from './logger';

const WLED_AUDIO_SYNC_PORT = 11988; // WLED audio sync UDP port
const WLED_REALTIME_PORT = 21324;   // WLED realtime UDP port

// Singleton socket for reuse
let audioSocket: any = null;
let socketReady: boolean = false;
let packetsSent: number = 0;
let packetsDropped: number = 0;

/**
 * Get or create UDP socket
 */
function getAudioSocket() {
  if (!audioSocket) {
    try {
      audioSocket = dgram.createSocket({ type: 'udp4' });
      socketReady = false;

      audioSocket.bind(0, () => {
        logger.log('📡 UDP audio socket bound and ready');
        socketReady = true;
      });

      audioSocket.on('error', function(error: any) {
        logger.error('UDP socket error:', error);
        socketReady = false;
      });
    } catch (error) {
      logger.error('Failed to create UDP socket:', error);
      return null;
    }
  }
  return audioSocket;
}

/**
 * Check if socket is ready to send
 */
function isSocketReady(): boolean {
  return audioSocket !== null && socketReady;
}

/**
 * Send audio data to WLED via UDP
 * Protocol: WLED AudioSync V2 (40 bytes)
 * Reference: https://kno.wled.ge/WLEDSR/UDP-Sound-Sync/
 *
 * Note: WLED 0.14+ uses V2, older versions use V1
 */
export function sendAudioDataToWLED(
  deviceIp: string,
  audioFeatures: AudioFeatures,
  melSpectrum: number[],
  port: number = 11988,
  useV1: boolean = false
): void {
  try {
    const socket = getAudioSocket();
    if (!socket) {
      return;
    }

    // Wait for socket to be bound before sending
    if (!isSocketReady()) {
      // Socket is binding, skip this packet
      packetsDropped++;
      return;
    }

    let buffer: Uint8Array;
    let dataView: DataView;
    let sampleRaw: number;
    let sampleSmooth: number;
    let peak: number;

    if (useV1) {
      // WLED AudioSync V1 packet format (for WLED < 0.14):
      // This is a simplified version - V1 has different structure
      logger.warn('V1 protocol not fully implemented yet');
      return;
    }

    // WLED AudioSync V2 packet format (40 bytes total):
    // Bytes 0-5: Header "00002" (version 2, 6 chars including null terminator)
    // Bytes 6-9: Sample Raw (float, 4 bytes)
    // Bytes 10-13: Sample Smooth (float, 4 bytes)
    // Byte 14: Sample Peak (uint8)
    // Byte 15: Reserved (uint8)
    // Bytes 16-31: FFT Results (16 bytes, uint8 array)
    // Bytes 32-35: FFT Magnitude (float, 4 bytes)
    // Bytes 36-39: FFT Major Peak Frequency (float, 4 bytes)
    // Total: 40 bytes

    buffer = new Uint8Array(40);
    dataView = new DataView(buffer.buffer);

    // Header "00002" (6 bytes including null terminator)
    buffer[0] = 0x30; // '0'
    buffer[1] = 0x30; // '0'
    buffer[2] = 0x30; // '0'
    buffer[3] = 0x30; // '0'
    buffer[4] = 0x32; // '2'
    buffer[5] = 0x00; // null terminator

    // Sample Raw (float, little-endian)
    // Scale volume to reasonable float range (WLED expects 0.0 - ~512.0)
    sampleRaw = audioFeatures.volume * 512.0;
    dataView.setFloat32(6, sampleRaw, true);

    // Sample Smooth (float, slightly lower than raw for smoothing, little-endian)
    sampleSmooth = audioFeatures.volume * 0.85 * 512.0;
    dataView.setFloat32(10, sampleSmooth, true);

    // Sample Peak (uint8, 0-255)
    peak = Math.floor(audioFeatures.volume * 255);
    buffer[14] = peak;

    // Reserved byte
    buffer[15] = 0;

    // FFT Results (16 frequency bins, 0-255 each)
    const targetBands = 16;
    const fftData = new Array(targetBands).fill(0);

    if (melSpectrum.length === targetBands) {
      // Direct copy
      for (let i = 0; i < targetBands; i++) {
        fftData[i] = Math.floor(melSpectrum[i] * 255);
      }
    } else {
      // Interpolate to 16 bands
      for (let i = 0; i < targetBands; i++) {
        const sourceIndex = (i / targetBands) * melSpectrum.length;
        const lowerIndex = Math.floor(sourceIndex);
        const upperIndex = Math.min(Math.ceil(sourceIndex), melSpectrum.length - 1);
        const fraction = sourceIndex - lowerIndex;

        const interpolated =
          melSpectrum[lowerIndex] * (1 - fraction) +
          melSpectrum[upperIndex] * fraction;

        fftData[i] = Math.floor(interpolated * 255);
      }
    }

    // Write FFT data to buffer (bytes 16-31)
    for (let i = 0; i < targetBands; i++) {
      buffer[16 + i] = Math.min(255, Math.max(0, fftData[i]));
    }

    // FFT Magnitude (float, sum of all FFT bins, little-endian)
    const fftMagnitude = fftData.reduce((sum, val) => sum + val, 0);
    dataView.setFloat32(32, fftMagnitude, true);

    // FFT Major Peak Frequency (float, dominant frequency in Hz, little-endian)
    // Find the bin with highest value
    let maxBin = 0;
    let maxValue = 0;
    for (let i = 0; i < fftData.length; i++) {
      if (fftData[i] > maxValue) {
        maxValue = fftData[i];
        maxBin = i;
      }
    }
    // Map bin to approximate frequency (assuming 20-10000 Hz range across 16 bins)
    const peakFrequency = 20 + (maxBin / targetBands) * 9980;
    dataView.setFloat32(36, peakFrequency, true);

    // Send UDP packet (don't close socket, reuse it)
    // react-native-udp expects base64 encoded string OR buffer
    // Convert Uint8Array to base64
    let base64 = '';
    const len = buffer.length;
    for (let i = 0; i < len; i++) {
      base64 += String.fromCharCode(buffer[i]);
    }
    base64 = btoa(base64);

    // Debug: log first few packets sent
    if (!audioSocket._debugLogged || packetsSent < 5) {
      logger.log(`📡 Packet #${packetsSent + 1} to ${deviceIp}:${port}`);
      logger.log(`   Header: [${buffer[0]}, ${buffer[1]}, ${buffer[2]}, ${buffer[3]}, ${buffer[4]}, ${buffer[5]}] = "${String.fromCharCode(buffer[0])}${String.fromCharCode(buffer[1])}${String.fromCharCode(buffer[2])}${String.fromCharCode(buffer[3])}${String.fromCharCode(buffer[4])}"`);
      logger.log(`   Sample Raw: ${sampleRaw.toFixed(2)} (bytes 6-9)`);
      logger.log(`   Sample Smooth: ${sampleSmooth.toFixed(2)} (bytes 10-13)`);
      logger.log(`   Peak: ${peak} (byte 14)`);
      logger.log(`   FFT bins (bytes 16-31): [${fftData.slice(0, 16).join(', ')}]`);
      logger.log(`   FFT Magnitude: ${fftMagnitude.toFixed(2)} (bytes 32-35)`);
      logger.log(`   Peak Freq: ${peakFrequency.toFixed(2)} Hz (bytes 36-39)`);
      logger.log(`   Total packet size: ${buffer.length} bytes`);

      // Log raw bytes in hex
      const hexBytes = Array.from(buffer.slice(0, 40)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      logger.log(`   Raw hex: ${hexBytes}`);

      if (packetsSent >= 4) {
        audioSocket._debugLogged = true;
      }
    }

    socket.send(
      base64,
      undefined, // offset
      base64.length, // length
      port,
      deviceIp,
      (err: any) => {
        if (err) {
          logger.error(`❌ Failed to send audio data to WLED ${deviceIp}:${port}:`, err);
          packetsDropped++;
        } else {
          packetsSent++;
        }
      }
    );
  } catch (error) {
    logger.error('Error sending audio data to WLED:', error);
  }
}

/**
 * Close audio socket when done
 */
/**
 * Get packet statistics
 */
export function getPacketStats(): { sent: number; dropped: number } {
  return { sent: packetsSent, dropped: packetsDropped };
}

/**
 * Reset packet statistics
 */
export function resetPacketStats(): void {
  packetsSent = 0;
  packetsDropped = 0;
}

/**
 * Close audio socket when done
 */
export function closeAudioSocket(): void {
  if (audioSocket) {
    try {
      audioSocket.close();
      audioSocket = null;
      socketReady = false;
      logger.log(`📡 UDP audio socket closed (Sent: ${packetsSent}, Dropped: ${packetsDropped})`);
      resetPacketStats();
    } catch (error) {
      logger.error('Error closing audio socket:', error);
    }
  }
}
