/**
 * WLED UDP Realtime Protocol
 *
 * Sends LED color data directly to WLED for real-time control
 * This allows us to control the LEDs based on our own audio processing
 * instead of sending audio data to WLED.
 */

import dgram from 'react-native-udp';
import { AudioFeatures } from './audioProcessing';
import { logger } from './logger';

const WLED_REALTIME_PORT = 21324; // WLED realtime UDP port
const WLED_TIMEOUT_MS = 255; // Protocol timeout (1-255, 255 = ~2 seconds)

// Singleton socket for reuse
let realtimeSocket: any = null;
let socketReady: boolean = false;
let packetsSent: number = 0;
let packetsDropped: number = 0;

// Smoothing for LED colors to prevent strobing
let previousLedColors: { r: number; g: number; b: number }[] = [];

// Test mode flag
let testMode: boolean = false;

// Color order - GBR is correct for this WLED hardware
type ColorOrder = 'RGB' | 'GRB' | 'BRG' | 'RBG' | 'GBR' | 'BGR';
let colorOrder: ColorOrder = 'GBR';

/**
 * Get or create UDP socket
 */
function getRealtimeSocket() {
  if (!realtimeSocket) {
    try {
      realtimeSocket = dgram.createSocket('udp4');
      socketReady = false;

      realtimeSocket.bind(0, () => {
        logger.log('🎨 UDP realtime socket bound and ready');
        socketReady = true;
      });

      realtimeSocket.on('error', function(error: any) {
        logger.error('UDP realtime socket error:', error);
        socketReady = false;
      });
    } catch (error) {
      logger.error('Failed to create UDP realtime socket:', error);
      return null;
    }
  }
  return realtimeSocket;
}

/**
 * Check if socket is ready to send
 */
function isSocketReady(): boolean {
  return realtimeSocket !== null && socketReady;
}

/**
 * Convert audio features to LED colors for audio reactive visualization
 */
function audioToLEDColors(
  audioFeatures: AudioFeatures,
  melSpectrum: number[],
  numLeds: number,
  effectType: 'spectrum' | 'volume' | 'waves' = 'spectrum'
): { r: number; g: number; b: number }[] {
  const colors: { r: number; g: number; b: number }[] = [];

  // TEST MODE: Fixed pattern for first 16 LEDs
  if (testMode) {
    for (let i = 0; i < Math.min(16, numLeds); i++) {
      if (i < 4) {
        // 0-3: Red
        colors.push({ r: 100, g: 0, b: 0 });
      } else if (i < 8) {
        // 4-7: Blue
        colors.push({ r: 0, g: 0, b: 100 });
      } else if (i < 12) {
        // 8-11: Green
        colors.push({ r: 0, g: 100, b: 0 });
      } else {
        // 12-15: Pink
        colors.push({ r: 100, g: 0, b: 100 });
      }
    }
    // Turn off remaining LEDs
    for (let i = 16; i < numLeds; i++) {
      colors.push({ r: 0, g: 0, b: 0 });
    }
    return colors;
  }


  if (effectType === 'spectrum') {
    // Spectrum: spread frequency bands across LED strip (like equalizer)
    for (let i = 0; i < numLeds; i++) {
      const bandIndex = Math.floor((i / numLeds) * melSpectrum.length);
      const intensity = melSpectrum[bandIndex] || 0;

      // Skip if no intensity
      if (intensity === 0) {
        colors.push({ r: 0, g: 0, b: 0 });
        continue;
      }

      // Softer intensity: 30% max brightness
      const safeIntensity = Math.min(1, intensity * 1.2) * 0.3;

      // Rainbow spectrum: bass (indigo/blue) -> treble (red)
      const hue = 240 - (i / (numLeds - 1)) * 240; // 240° -> 0°

      // HSV to RGB conversion
      const h = hue / 60;
      const c = 1.0;
      const x = c * (1 - Math.abs((h % 2) - 1));

      let r = 0, g = 0, b = 0;
      if (h >= 0 && h < 1) {
        r = c; g = x; b = 0;
      } else if (h >= 1 && h < 2) {
        r = x; g = c; b = 0;
      } else if (h >= 2 && h < 3) {
        r = 0; g = c; b = x;
      } else if (h >= 3 && h < 4) {
        r = 0; g = x; b = c;
      } else if (h >= 4 && h < 5) {
        r = x; g = 0; b = c;
      } else {
        r = c; g = 0; b = x;
      }

      // Convert to 0-255 and apply intensity
      colors.push({
        r: Math.floor(r * 255 * safeIntensity),
        g: Math.floor(g * 255 * safeIntensity),
        b: Math.floor(b * 255 * safeIntensity),
      });
    }
  } else if (effectType === 'volume') {
    // Volume: All LEDs same color based on dominant frequency
    const brightness = Math.min(1, audioFeatures.volume * 1.5);

    // Color based on dominant frequency
    let r = 0, g = 0, b = 0;
    if (audioFeatures.bass > audioFeatures.mid && audioFeatures.bass > audioFeatures.treble) {
      r = Math.floor(brightness * 255 * 0.3); // Red for bass
    } else if (audioFeatures.mid > audioFeatures.treble) {
      g = Math.floor(brightness * 255 * 0.3); // Green for mid
    } else {
      b = Math.floor(brightness * 255 * 0.3); // Blue for treble
    }

    for (let i = 0; i < numLeds; i++) {
      colors.push({ r, g, b });
    }
  } else if (effectType === 'waves') {
    // Waves: Traveling wave based on audio (animated effect)
    const time = Date.now() / 1000;
    const waveSpeed = Math.min(1, audioFeatures.volume * 5) * 2;

    for (let i = 0; i < numLeds; i++) {
      const position = (i / numLeds) * Math.PI * 2;
      const wave = Math.sin(position + time * waveSpeed) * 0.5 + 0.5;

      // Softer brightness: 30% max
      colors.push({
        r: Math.floor(Math.min(1, audioFeatures.bass * 1.2) * wave * 255 * 0.3),
        g: Math.floor(Math.min(1, audioFeatures.mid * 1.2) * wave * 255 * 0.3),
        b: Math.floor(Math.min(1, audioFeatures.treble * 1.2) * wave * 255 * 0.3),
      });
    }
  }

  // Apply stronger temporal smoothing for softer transitions
  if (previousLedColors.length === colors.length) {
    for (let i = 0; i < colors.length; i++) {
      // If current color is black (off), kill it completely (no smoothing)
      // This prevents ghost LEDs from lingering due to smoothing
      if (colors[i].r === 0 && colors[i].g === 0 && colors[i].b === 0) {
        continue; // Keep it at 0,0,0
      }

      // Stronger smoothing: 60% new + 40% previous (softer transitions)
      colors[i].r = Math.floor(colors[i].r * 0.6 + previousLedColors[i].r * 0.4);
      colors[i].g = Math.floor(colors[i].g * 0.6 + previousLedColors[i].g * 0.4);
      colors[i].b = Math.floor(colors[i].b * 0.6 + previousLedColors[i].b * 0.4);
    }
  }

  // Store for next frame
  previousLedColors = colors.map(c => ({ ...c }));

  return colors;
}

/**
 * Send realtime LED data to WLED using WARLS protocol
 *
 * WARLS Protocol (WLED Audio Reactive Light Streaming):
 * - Byte 0: Protocol ID (0x02 = WARLS)
 * - Byte 1: Timeout (1-255, in seconds, 0xFF for persistent)
 * - Bytes 2+: RGB data for each LED (3 bytes per LED: R, G, B)
 */
export function sendRealtimeToWLED(
  deviceIp: string,
  audioFeatures: AudioFeatures,
  melSpectrum: number[],
  numLeds: number = 50,
  effectType: 'spectrum' | 'volume' | 'waves' = 'spectrum'
): void {
  try {
    const socket = getRealtimeSocket();
    if (!socket) {
      return;
    }

    // Wait for socket to be bound before sending
    if (!isSocketReady()) {
      packetsDropped++;
      return;
    }

    // Generate LED colors from audio
    const ledColors = audioToLEDColors(audioFeatures, melSpectrum, numLeds, effectType);

    // Safety check: ensure we have the right number of colors
    if (ledColors.length !== numLeds) {
      logger.warn(`LED color mismatch: expected ${numLeds}, got ${ledColors.length}`);
      return;
    }

    // Build DRGB packet
    const packetSize = 2 + (numLeds * 3); // Protocol + timeout + RGB data
    const buffer = new Uint8Array(packetSize);

    buffer[0] = 2; // DRGB protocol (correct ID is 2, not 4!)
    buffer[1] = 255; // Timeout: 255 = maximum (~2 seconds)

    // Write LED colors in configured order
    for (let i = 0; i < numLeds; i++) {
      const offset = 2 + (i * 3);
      const color = ledColors[i] || { r: 0, g: 0, b: 0 };

      // Map color order
      const colorMap: Record<ColorOrder, [number, number, number]> = {
        'RGB': [color.r, color.g, color.b],
        'GRB': [color.g, color.r, color.b],
        'BRG': [color.b, color.r, color.g],
        'RBG': [color.r, color.b, color.g],
        'GBR': [color.g, color.b, color.r],
        'BGR': [color.b, color.g, color.r],
      };

      const [byte0, byte1, byte2] = colorMap[colorOrder];
      buffer[offset] = Math.max(0, Math.min(255, byte0));
      buffer[offset + 1] = Math.max(0, Math.min(255, byte1));
      buffer[offset + 2] = Math.max(0, Math.min(255, byte2));
    }

    // Convert buffer to string for react-native-udp
    const messageString = String.fromCharCode(...buffer);

    socket.send(
      messageString,
      0,
      messageString.length,
      WLED_REALTIME_PORT,
      deviceIp,
      (err: any) => {
        if (err) {
          packetsDropped++;
        } else {
          packetsSent++;
        }
      }
    );
  } catch (error) {
    logger.error('Error sending realtime data to WLED:', error);
  }
}

/**
 * Get packet statistics
 */
export function getRealtimePacketStats(): { sent: number; dropped: number } {
  return { sent: packetsSent, dropped: packetsDropped };
}

/**
 * Reset packet statistics
 */
export function resetRealtimePacketStats(): void {
  packetsSent = 0;
  packetsDropped = 0;
}

/**
 * Reset LED color smoothing state
 */
export function resetRealtimeState(): void {
  previousLedColors = [];
  logger.log('🔄 LED smoothing state reset');
}

/**
 * Enable/disable test pattern mode
 */
export function setTestMode(enabled: boolean): void {
  testMode = enabled;
  if (enabled) {
    logger.log('🧪 Test pattern mode enabled (16 LEDs: 0-3 Red, 4-7 Blue, 8-11 Green, 12-15 Pink)');
  } else {
    logger.log('🎵 Test pattern mode disabled');
  }
}

/**
 * Send test pattern using the SAME code path as audio reactive
 * This creates a gradient pattern to verify color order is correct
 */
export function sendTestPatternOnce(deviceIp: string, numLeds: number): void {
  try {
    // Create fake audio features with test pattern
    const testAudioFeatures: AudioFeatures = {
      bass: 0.8,
      mid: 0.6,
      treble: 0.4,
      volume: 0.6,
    };

    // Create fake mel spectrum with gradient (simulates full spectrum)
    const testMelSpectrum: number[] = [];
    for (let i = 0; i < 32; i++) {
      // Gradient from 0.8 (bass) to 0.3 (treble)
      testMelSpectrum.push(0.8 - (i / 32) * 0.5);
    }

    logger.log('🧪 Test: Sending spectrum gradient pattern (bass=red→orange, mid=green, treble=blue)');

    // Use the SAME function as audio reactive
    sendRealtimeToWLED(
      deviceIp,
      testAudioFeatures,
      testMelSpectrum,
      numLeds,
      'spectrum' // Use spectrum effect to show full gradient
    );
  } catch (error) {
    logger.error('Error sending test:', error);
  }
}

/**
 * Turn off all LEDs by sending all-black packet
 */
export function turnOffAllLEDs(deviceIp: string, numLeds: number): void {
  try {
    const socket = getRealtimeSocket();
    if (!socket || !isSocketReady()) {
      logger.warn('Socket not ready to send turn-off packet');
      return;
    }

    // Build DRGB packet with all LEDs = black
    const packetSize = 2 + (numLeds * 3);
    const buffer = new Uint8Array(packetSize);

    buffer[0] = 2; // DRGB protocol
    buffer[1] = 1; // Short timeout (1 second) - this is the final packet

    // All LEDs = black (0,0,0)
    for (let i = 0; i < numLeds; i++) {
      const offset = 2 + (i * 3);
      buffer[offset] = 0;
      buffer[offset + 1] = 0;
      buffer[offset + 2] = 0;
    }

    // Convert buffer to string for react-native-udp
    const messageString = String.fromCharCode(...buffer);

    socket.send(
      messageString,
      0,
      messageString.length,
      WLED_REALTIME_PORT,
      deviceIp,
      (err: any) => {
        if (err) {
          logger.error('Failed to send turn-off packet:', err);
        } else {
          logger.log('✅ All LEDs turned off');
        }
      }
    );
  } catch (error) {
    logger.error('Error turning off LEDs:', error);
  }
}

/**
 * Close realtime socket when done
 */
export function closeRealtimeSocket(): void {
  if (realtimeSocket) {
    try {
      realtimeSocket.close();
      realtimeSocket = null;
      socketReady = false;
      previousLedColors = []; // Reset smoothing on close
      logger.log(`🎨 UDP realtime socket closed (Sent: ${packetsSent}, Dropped: ${packetsDropped})`);
      resetRealtimePacketStats();
    } catch (error) {
      logger.error('Error closing realtime socket:', error);
    }
  }
}
