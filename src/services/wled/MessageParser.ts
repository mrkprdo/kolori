/**
 * WebSocket Message Parser for WLED
 *
 * Parses incoming WebSocket messages (binary LED data and JSON)
 */

import { logger } from '../../utils/logger';

export interface LEDColor {
  r: number;
  g: number;
  b: number;
  w?: number;
}

export interface ParsedMessage {
  type: 'leds' | 'state' | 'info' | 'unknown';
  data: any;
  matrixDimensions?: { width: number; height: number };
}

export class MessageParser {
  /**
   * Parse WebSocket message (binary or JSON)
   */
  static async parse(data: any): Promise<ParsedMessage> {
    // Binary data (LED colors)
    if (data instanceof ArrayBuffer) {
      return this.parseBinaryLedData(new Uint8Array(data));
    }

    // Blob data (convert to ArrayBuffer)
    if (data instanceof Blob) {
      const arrayBuffer = await data.arrayBuffer();
      return this.parseBinaryLedData(new Uint8Array(arrayBuffer));
    }

    // JSON string
    if (typeof data === 'string') {
      return this.parseJsonMessage(data);
    }

    return { type: 'unknown', data };
  }

  /**
   * Parse binary LED data (supports 1D and 2D matrix formats)
   */
  private static parseBinaryLedData(byteArray: Uint8Array): ParsedMessage {
    const colors: LEDColor[] = [];

    // Check for WLED 2D matrix format: [76, 2, width, height, ...RGB data]
    if (byteArray.length >= 4 && byteArray[0] === 76 && byteArray[1] === 2) {
      const width = byteArray[2];
      const height = byteArray[3];
      const expectedLEDs = width * height;

      // Parse RGB data starting from byte 4
      let dataIndex = 4;
      for (let led = 0; led < expectedLEDs && dataIndex + 2 < byteArray.length; led++) {
        colors.push({
          r: byteArray[dataIndex],
          g: byteArray[dataIndex + 1],
          b: byteArray[dataIndex + 2],
          w: 0
        });
        dataIndex += 3;
      }

      return {
        type: 'leds',
        data: colors,
        matrixDimensions: { width, height }
      };
    }

    // Legacy 1D LED strip format (GRB order)
    let bytesPerLed = 3; // Default RGB

    // Heuristic: if divisible by 4, might be RGBW
    if (byteArray.length > 0 && byteArray.length % 4 === 0) {
      bytesPerLed = 4;
    }

    for (let i = 0; i < byteArray.length; i += bytesPerLed) {
      colors.push({
        r: byteArray[i + 2], // GRB order
        g: byteArray[i],
        b: byteArray[i + 1],
        w: bytesPerLed === 4 ? byteArray[i + 3] : undefined
      });
    }

    return { type: 'leds', data: colors };
  }

  /**
   * Parse JSON message (state, info, etc.)
   */
  private static parseJsonMessage(jsonString: string): ParsedMessage {
    try {
      const json = JSON.parse(jsonString);

      // LED data as JSON array
      if (json && Array.isArray(json.leds)) {
        const colors = json.leds.map((led: number[]) => ({
          r: led[0],
          g: led[1],
          b: led[2],
          w: led[3]
        }));
        return { type: 'leds', data: colors };
      }

      // State update - WLED sends state directly at root level
      // Check for common state properties (including "v" which WLED sends for state updates)
      if (json && (json.on !== undefined || json.bri !== undefined || json.ps !== undefined || json.v !== undefined)) {
        logger.log('📥 Detected state update:', json);
        return { type: 'state', data: json };
      }

      // Device info - check for info-specific properties
      if (json && (json.ver !== undefined || json.name !== undefined || json.leds?.count !== undefined)) {
        return { type: 'info', data: json };
      }

      // Command acknowledgment - WLED sends {success: true} for command responses
      if (json && json.success !== undefined) {
        // Silently ignore success responses (no need to log)
        return { type: 'unknown', data: json };
      }

      // Legacy: check nested state/info
      if (json.state) {
        return { type: 'state', data: json.state };
      }

      if (json.info) {
        return { type: 'info', data: json.info };
      }

      logger.log('📥 Unknown WebSocket message:', json);
      return { type: 'unknown', data: json };
    } catch (error) {
      logger.error('Failed to parse JSON message:', error);
      return { type: 'unknown', data: jsonString };
    }
  }
}
