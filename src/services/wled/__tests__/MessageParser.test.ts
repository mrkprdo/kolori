import { MessageParser, LEDColor, ParsedMessage } from '../MessageParser';
import { logger } from '../../../utils/logger';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('MessageParser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parse - main entry point', () => {
    it('should handle ArrayBuffer input', async () => {
      // RGB data: 2 LEDs (255,0,0) and (0,255,0)
      const buffer = new Uint8Array([255, 0, 0, 0, 255, 0]).buffer;
      const result = await MessageParser.parse(buffer);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ r: 255, g: 0, b: 0, w: undefined });
      expect(result.data[1]).toEqual({ r: 0, g: 255, b: 0, w: undefined });
    });

    it('should handle Blob input', async () => {
      // RGB data: 1 LED (128,128,128)
      const blob = new Blob([new Uint8Array([128, 128, 128])]);
      const result = await MessageParser.parse(blob);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({ r: 128, g: 128, b: 128, w: undefined });
    });

    it('should handle JSON string input', async () => {
      const jsonString = JSON.stringify({ on: true, bri: 128 });
      const result = await MessageParser.parse(jsonString);

      expect(result.type).toBe('state');
      expect(result.data).toEqual({ on: true, bri: 128 });
    });

    it('should handle unknown data types', async () => {
      const result = await MessageParser.parse(12345);

      expect(result.type).toBe('unknown');
      expect(result.data).toBe(12345);
    });
  });

  describe('parseBinaryLedData - WLED 2D matrix format', () => {
    it('should parse 2D matrix format with correct header', async () => {
      // Header: [76, 2] = WLED 2D format
      // Dimensions: [3, 2] = 3 wide, 2 high = 6 LEDs
      // LED data: 6 LEDs × 3 bytes = 18 bytes
      const data = new Uint8Array([
        76, 2, 3, 2, // Header + dimensions
        255, 0, 0,   // LED 0: Red
        0, 255, 0,   // LED 1: Green
        0, 0, 255,   // LED 2: Blue
        255, 255, 0, // LED 3: Yellow
        255, 0, 255, // LED 4: Magenta
        0, 255, 255  // LED 5: Cyan
      ]).buffer;

      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(6);
      expect(result.matrixDimensions).toEqual({ width: 3, height: 2 });
      expect(result.data[0]).toEqual({ r: 255, g: 0, b: 0, w: 0 });
      expect(result.data[5]).toEqual({ r: 0, g: 255, b: 255, w: 0 });
    });

    it('should handle incomplete 2D matrix data', async () => {
      // Header says 3×2=6 LEDs but only provide data for 2 LEDs
      const data = new Uint8Array([
        76, 2, 3, 2,  // Header: expects 6 LEDs
        255, 0, 0,    // LED 0
        0, 255, 0     // LED 1
      ]).buffer;

      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(2); // Only 2 complete LEDs parsed
      expect(result.matrixDimensions).toEqual({ width: 3, height: 2 });
    });

    it('should handle 1×1 matrix', async () => {
      const data = new Uint8Array([
        76, 2, 1, 1,  // 1×1 matrix
        128, 64, 32   // Single LED
      ]).buffer;

      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(1);
      expect(result.matrixDimensions).toEqual({ width: 1, height: 1 });
      expect(result.data[0]).toEqual({ r: 128, g: 64, b: 32, w: 0 });
    });
  });

  describe('parseBinaryLedData - WLED 1D strip format', () => {
    it('should parse 1D RGB format (3 bytes per LED)', async () => {
      // Header: [76, 1] = WLED 1D format
      // 3 LEDs × 3 bytes = 9 bytes (divisible by 3)
      const data = new Uint8Array([
        76, 1,        // Header
        255, 0, 0,    // LED 0: Red
        0, 255, 0,    // LED 1: Green
        0, 0, 255     // LED 2: Blue
      ]).buffer;

      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({ r: 255, g: 0, b: 0, w: undefined });
      expect(result.data[1]).toEqual({ r: 0, g: 255, b: 0, w: undefined });
      expect(result.data[2]).toEqual({ r: 0, g: 0, b: 255, w: undefined });
    });

    it('should parse 1D RGBW format (4 bytes per LED)', async () => {
      // Header: [76, 1] = WLED 1D format
      // 2 LEDs × 4 bytes = 8 bytes (divisible by 4, NOT by 3)
      const data = new Uint8Array([
        76, 1,          // Header
        255, 0, 0, 128, // LED 0: Red + 128 white
        0, 255, 0, 64   // LED 1: Green + 64 white
      ]).buffer;

      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ r: 255, g: 0, b: 0, w: 128 });
      expect(result.data[1]).toEqual({ r: 0, g: 255, b: 0, w: 64 });
    });

    it('should prefer RGB over RGBW when both are possible', async () => {
      // Header: [76, 1]
      // 12 bytes (divisible by both 3 and 4, should prefer RGB)
      const data = new Uint8Array([
        76, 1,
        255, 0, 0,
        0, 255, 0,
        0, 0, 255,
        128, 128, 128
      ]).buffer;

      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(4); // 4 RGB LEDs
      expect(result.data[0].w).toBeUndefined(); // RGB format, no white channel
    });

    it('should handle incomplete LED data at end', async () => {
      // 10 bytes after header: 3 complete RGB LEDs + 1 incomplete byte
      const data = new Uint8Array([
        76, 1,
        255, 0, 0,
        0, 255, 0,
        0, 0, 255,
        128 // Incomplete LED (only 1 byte)
      ]).buffer;

      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(3); // Only complete LEDs
    });
  });

  describe('parseBinaryLedData - raw format without header', () => {
    it('should parse raw RGB data without header', async () => {
      const data = new Uint8Array([
        255, 0, 0,    // LED 0: Red
        0, 255, 0     // LED 1: Green
      ]).buffer;

      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ r: 255, g: 0, b: 0, w: undefined });
      expect(result.data[1]).toEqual({ r: 0, g: 255, b: 0, w: undefined });
    });

    it('should parse raw RGBW data without header', async () => {
      const data = new Uint8Array([
        255, 0, 0, 64,  // LED 0: Red + white
        0, 255, 0, 32   // LED 1: Green + white
      ]).buffer;

      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ r: 255, g: 0, b: 0, w: 64 });
      expect(result.data[1]).toEqual({ r: 0, g: 255, b: 0, w: 32 });
    });

    it('should prefer RGB for raw data divisible by both 3 and 4', async () => {
      const data = new Uint8Array([
        255, 0, 0,
        0, 255, 0,
        0, 0, 255,
        128, 128, 128
      ]).buffer;

      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(4); // 4 RGB LEDs
      expect(result.data[0].w).toBeUndefined();
    });

    it('should handle empty binary data', async () => {
      const data = new Uint8Array([]).buffer;
      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(0);
    });

    it('should handle incomplete raw LED data', async () => {
      const data = new Uint8Array([
        255, 0, 0,  // Complete LED
        128, 64     // Incomplete LED (only 2 bytes)
      ]).buffer;

      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(1); // Only complete LEDs
    });
  });

  describe('parseJsonMessage - LED data', () => {
    it('should parse JSON LED data array', async () => {
      const json = JSON.stringify({
        leds: [
          [255, 0, 0, 0],
          [0, 255, 0, 64],
          [0, 0, 255, 128]
        ]
      });

      const result = await MessageParser.parse(json);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({ r: 255, g: 0, b: 0, w: 0 });
      expect(result.data[1]).toEqual({ r: 0, g: 255, b: 0, w: 64 });
      expect(result.data[2]).toEqual({ r: 0, g: 0, b: 255, w: 128 });
    });

    it('should handle empty LED array', async () => {
      const json = JSON.stringify({ leds: [] });
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(0);
    });
  });

  describe('parseJsonMessage - state updates', () => {
    it('should detect state update with "on" property', async () => {
      const json = JSON.stringify({ on: true });
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('state');
      expect(result.data).toEqual({ on: true });
      expect(logger.log).toHaveBeenCalledWith('📥 Detected state update:', { on: true });
    });

    it('should detect state update with "bri" property', async () => {
      const json = JSON.stringify({ bri: 128 });
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('state');
      expect(result.data).toEqual({ bri: 128 });
    });

    it('should detect state update with "ps" property', async () => {
      const json = JSON.stringify({ ps: 5 });
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('state');
      expect(result.data).toEqual({ ps: 5 });
    });

    it('should detect state update with "v" property', async () => {
      const json = JSON.stringify({ v: true });
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('state');
      expect(result.data).toEqual({ v: true });
    });

    it('should detect complex state update', async () => {
      const state = {
        on: true,
        bri: 200,
        ps: 3,
        seg: [{ id: 0, start: 0, stop: 100 }]
      };
      const json = JSON.stringify(state);
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('state');
      expect(result.data).toEqual(state);
    });
  });

  describe('parseJsonMessage - device info', () => {
    it('should detect device info with "ver" property', async () => {
      const json = JSON.stringify({ ver: '0.14.0' });
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('info');
      expect(result.data).toEqual({ ver: '0.14.0' });
    });

    it('should detect device info with "name" property', async () => {
      const json = JSON.stringify({ name: 'My WLED' });
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('info');
      expect(result.data).toEqual({ name: 'My WLED' });
    });

    it('should detect device info with "leds.count" property', async () => {
      const json = JSON.stringify({ leds: { count: 100 } });
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('info');
      expect(result.data).toEqual({ leds: { count: 100 } });
    });

    it('should detect complex device info', async () => {
      const info = {
        ver: '0.14.0',
        name: 'WLED Device',
        leds: { count: 144, rgbw: false },
        ip: '192.168.137.163'
      };
      const json = JSON.stringify(info);
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('info');
      expect(result.data).toEqual(info);
    });
  });

  describe('parseJsonMessage - command acknowledgments', () => {
    it('should handle success response', async () => {
      const json = JSON.stringify({ success: true });
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('unknown');
      expect(result.data).toEqual({ success: true });
      expect(logger.log).not.toHaveBeenCalled(); // Silent
    });

    it('should handle success false response', async () => {
      const json = JSON.stringify({ success: false });
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('unknown');
      expect(result.data).toEqual({ success: false });
    });
  });

  describe('parseJsonMessage - legacy nested format', () => {
    it('should parse legacy nested state', async () => {
      const json = JSON.stringify({
        state: { on: true, bri: 150 }
      });
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('state');
      expect(result.data).toEqual({ on: true, bri: 150 });
    });

    it('should parse legacy nested info', async () => {
      const json = JSON.stringify({
        info: { ver: '0.13.0', name: 'Legacy WLED' }
      });
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('info');
      expect(result.data).toEqual({ ver: '0.13.0', name: 'Legacy WLED' });
    });

    it('should prioritize direct state over nested state', async () => {
      const json = JSON.stringify({
        on: true,
        bri: 100,
        state: { on: false, bri: 50 }
      });
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('state');
      expect(result.data.on).toBe(true); // Direct property takes precedence
      expect(result.data.bri).toBe(100);
    });
  });

  describe('parseJsonMessage - error handling', () => {
    it('should handle invalid JSON', async () => {
      const invalidJson = '{invalid json}';
      const result = await MessageParser.parse(invalidJson);

      expect(result.type).toBe('unknown');
      expect(result.data).toBe(invalidJson);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to parse JSON message:',
        expect.any(SyntaxError)
      );
    });

    it('should handle empty JSON string', async () => {
      const result = await MessageParser.parse('');

      expect(result.type).toBe('unknown');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle null JSON', async () => {
      const json = JSON.stringify(null);
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('unknown');
      expect(result.data).toBe('null');
      // Accessing properties of null throws error, caught by error handler
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to parse JSON message:',
        expect.any(TypeError)
      );
    });

    it('should handle undefined properties', async () => {
      const json = JSON.stringify({});
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('unknown');
      expect(logger.log).toHaveBeenCalledWith('📥 Unknown WebSocket message:', {});
    });

    it('should log unknown message formats', async () => {
      const json = JSON.stringify({ random: 'data', unknown: true });
      const result = await MessageParser.parse(json);

      expect(result.type).toBe('unknown');
      expect(logger.log).toHaveBeenCalledWith(
        '📥 Unknown WebSocket message:',
        { random: 'data', unknown: true }
      );
    });
  });

  describe('edge cases and special scenarios', () => {
    it('should handle single LED', async () => {
      const data = new Uint8Array([255, 128, 64]).buffer;
      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({ r: 255, g: 128, b: 64, w: undefined });
    });

    it('should handle large LED count', async () => {
      // 100 LEDs × 3 bytes
      const data = new Uint8Array(300).fill(128).buffer;
      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(100);
      expect(result.data[0]).toEqual({ r: 128, g: 128, b: 128, w: undefined });
    });

    it('should handle zero brightness LEDs', async () => {
      const data = new Uint8Array([0, 0, 0, 0, 0, 0]).buffer;
      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ r: 0, g: 0, b: 0, w: undefined });
    });

    it('should handle max brightness LEDs', async () => {
      const data = new Uint8Array([255, 255, 255]).buffer;
      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({ r: 255, g: 255, b: 255, w: undefined });
    });

    it('should handle header-only data (too short)', async () => {
      const data = new Uint8Array([76, 1]).buffer;
      const result = await MessageParser.parse(data);

      expect(result.type).toBe('leds');
      expect(result.data).toHaveLength(0);
    });

    it('should handle incorrect protocol version', async () => {
      // Header with unknown version 99
      const data = new Uint8Array([
        76, 99,       // Unknown version
        255, 0, 0     // LED data
      ]).buffer;

      const result = await MessageParser.parse(data);

      // Falls back to raw parsing
      expect(result.type).toBe('leds');
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should handle WLED header with incomplete dimension data', async () => {
      const data = new Uint8Array([76, 2, 3]).buffer; // Missing height
      const result = await MessageParser.parse(data);

      // Falls back to raw parsing
      expect(result.type).toBe('leds');
    });
  });
});
