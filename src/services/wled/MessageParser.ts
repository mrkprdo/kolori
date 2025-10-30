/**
 * WebSocket Message Parser for WLED
 *
 * Parses incoming WebSocket messages (binary LED data and JSON)
 */

import { logger } from "../../utils/logger";

export interface LEDColor {
  r: number;
  g: number;
  b: number;
  w?: number;
}

export interface ParsedMessage {
  type: "leds" | "state" | "info" | "unknown";
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
    if (typeof data === "string") {
      return this.parseJsonMessage(data);
    }

    return { type: "unknown", data };
  }

  /**
   * Parse binary LED data (supports 1D and 2D matrix formats)
   */
  private static parseBinaryLedData(byteArray: Uint8Array): ParsedMessage {
    const colors: LEDColor[] = [];

    // Check for WLED protocol header byte 76 ('L')
    if (byteArray.length >= 2 && byteArray[0] === 76) {
      const protocolVersion = byteArray[1];

      // WLED 2D matrix format: [76, 2, width, height, ...RGB data]
      if (protocolVersion === 2 && byteArray.length >= 4) {
        const width = byteArray[2];
        const height = byteArray[3];
        const expectedLEDs = width * height;

        // Parse RGB data starting from byte 4
        let dataIndex = 4;
        for (
          let led = 0;
          led < expectedLEDs && dataIndex + 2 < byteArray.length;
          led++
        ) {
          colors.push({
            r: byteArray[dataIndex],
            g: byteArray[dataIndex + 1],
            b: byteArray[dataIndex + 2],
            w: 0,
          });
          dataIndex += 3;
        }

        return {
          type: "leds",
          data: colors,
          matrixDimensions: { width, height },
        };
      }

      // WLED 1D strip format: [76, 1, ...LED data]
      if (protocolVersion === 1) {
        // LED data starts at byte 2 (after the 2-byte header)
        const ledDataStart = 2;
        const remainingBytes = byteArray.length - ledDataStart;

        // Determine bytes per LED (RGB=3 or RGBW=4)
        // Prefer RGB (3) over RGBW (4) when both are possible
        let bytesPerLed = 3;

        // Only use RGBW if it's divisible by 4 AND NOT divisible by 3
        if (remainingBytes % 4 === 0 && remainingBytes % 3 !== 0) {
          bytesPerLed = 4;
        }

        // Parse LED data starting from byte 2
        for (let i = ledDataStart; i < byteArray.length; i += bytesPerLed) {
          if (i + 2 < byteArray.length) {
            colors.push({
              r: byteArray[i],
              g: byteArray[i + 1],
              b: byteArray[i + 2],
              w:
                bytesPerLed === 4 && i + 3 < byteArray.length
                  ? byteArray[i + 3]
                  : undefined,
            });
          }
        }

        return { type: "leds", data: colors };
      }
    }

    // Fallback: No WLED header detected - parse as raw LED data
    let bytesPerLed = 3;
    if (byteArray.length % 4 === 0 && byteArray.length % 3 !== 0) {
      bytesPerLed = 4;
    }

    for (let i = 0; i < byteArray.length; i += bytesPerLed) {
      if (i + 2 < byteArray.length) {
        colors.push({
          r: byteArray[i],
          g: byteArray[i + 1],
          b: byteArray[i + 2],
          w:
            bytesPerLed === 4 && i + 3 < byteArray.length
              ? byteArray[i + 3]
              : undefined,
        });
      }
    }

    return { type: "leds", data: colors };
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
          w: led[3],
        }));
        return { type: "leds", data: colors };
      }

      // State update - WLED sends state directly at root level
      // Check for common state properties (including "v" which WLED sends for state updates)
      if (
        json &&
        (json.on !== undefined ||
          json.bri !== undefined ||
          json.ps !== undefined ||
          json.v !== undefined)
      ) {
        logger.log("📥 Detected state update:", json);
        return { type: "state", data: json };
      }

      // Device info - check for info-specific properties
      if (
        json &&
        (json.ver !== undefined ||
          json.name !== undefined ||
          json.leds?.count !== undefined)
      ) {
        return { type: "info", data: json };
      }

      // Command acknowledgment - WLED sends {success: true} for command responses
      if (json && json.success !== undefined) {
        // Silently ignore success responses (no need to log)
        return { type: "unknown", data: json };
      }

      // Legacy: check nested state/info
      if (json.state) {
        return { type: "state", data: json.state };
      }

      if (json.info) {
        return { type: "info", data: json.info };
      }

      logger.log("📥 Unknown WebSocket message:", json);
      return { type: "unknown", data: json };
    } catch (error) {
      logger.error("Failed to parse JSON message:", error);
      return { type: "unknown", data: jsonString };
    }
  }
}
