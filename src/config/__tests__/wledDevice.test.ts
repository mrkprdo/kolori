import {
  checkWledHeartbeat,
  turnWledOn,
  turnWledOff,
  setWledBrightness,
  getWledBrightnessFromWin,
  detectWledDimensions,
  getWledMatrixDimensions,
  getWledState,
} from '../wledDevice';

// Mock wledUtils
jest.mock('../wledUtils', () => ({
  buildWledUrl: (address: string, protocol: string, path: string) =>
    `${protocol}://${address}${path}`,
  fetchWithTimeout: jest.fn(),
  formatApiResponse: (success: boolean, message: string, data?: any) => ({
    success,
    message,
    data,
  }),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { fetchWithTimeout } from '../wledUtils';

describe('wledDevice', () => {
  const mockDeviceAddress = '192.168.1.100';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkWledHeartbeat', () => {
    it('should return success when device is online', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await checkWledHeartbeat(mockDeviceAddress);

      expect(result.success).toBe(true);
      expect(result.online).toBe(true);
      expect(result.message).toBe('Device online');
    });

    it('should return failure when device is offline', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Connection timeout',
      });

      const result = await checkWledHeartbeat(mockDeviceAddress);

      expect(result.success).toBe(false);
      expect(result.online).toBe(false);
      expect(result.message).toBe('Connection timeout');
    });

    it('should use custom protocol', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: {},
      });

      await checkWledHeartbeat(mockDeviceAddress, 'https');

      expect(fetchWithTimeout).toHaveBeenCalledWith(
        'https://192.168.1.100/json/info',
        expect.any(Object)
      );
    });
  });

  describe('turnWledOn', () => {
    it('should turn on lights using JSON API', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await turnWledOn(mockDeviceAddress);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Lights turned on');
    });

    it('should fallback to HTTP API on JSON API failure', async () => {
      (fetchWithTimeout as jest.Mock)
        .mockResolvedValueOnce({ success: false, error: 'JSON API failed' })
        .mockResolvedValueOnce({ success: true, data: {} });

      const result = await turnWledOn(mockDeviceAddress);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Lights turned on (HTTP API)');
    });

    it('should return failure when both APIs fail', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await turnWledOn(mockDeviceAddress);

      expect(result.success).toBe(false);
    });
  });

  describe('turnWledOff', () => {
    it('should turn off lights using JSON API', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await turnWledOff(mockDeviceAddress);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Lights turned off');
    });

    it('should fallback to HTTP API on JSON API failure', async () => {
      (fetchWithTimeout as jest.Mock)
        .mockResolvedValueOnce({ success: false, error: 'JSON API failed' })
        .mockResolvedValueOnce({ success: true, data: {} });

      const result = await turnWledOff(mockDeviceAddress);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Lights turned off (HTTP API)');
    });
  });

  describe('setWledBrightness', () => {
    it('should set brightness successfully', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await setWledBrightness(mockDeviceAddress, 128);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Brightness set to 128');
    });

    it('should reject brightness below 0', async () => {
      const result = await setWledBrightness(mockDeviceAddress, -10);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid brightness value');
    });

    it('should reject brightness above 255', async () => {
      const result = await setWledBrightness(mockDeviceAddress, 300);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid brightness value');
    });

    it('should accept valid brightness range', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: {},
      });

      const values = [0, 1, 128, 254, 255];

      for (const value of values) {
        const result = await setWledBrightness(mockDeviceAddress, value);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('getWledBrightnessFromWin', () => {
    it('should parse brightness from XML response', async () => {
      const xmlResponse = '<root><ac>128</ac></root>';

      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: xmlResponse,
      });

      const result = await getWledBrightnessFromWin(mockDeviceAddress);

      expect(result.success).toBe(true);
      expect(result.brightness).toBe(128);
    });

    it('should handle missing brightness value in XML', async () => {
      const xmlResponse = '<root></root>';

      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: xmlResponse,
      });

      const result = await getWledBrightnessFromWin(mockDeviceAddress);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Brightness value not found');
    });

    it('should handle fetch errors', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await getWledBrightnessFromWin(mockDeviceAddress);

      expect(result.success).toBe(false);
    });
  });

  describe('detectWledDimensions', () => {
    it('should detect 1D configuration', async () => {
      const jsResponse = 'd.Sf.SOMP.value = 0;';

      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: jsResponse,
      });

      const result = await detectWledDimensions(mockDeviceAddress);

      expect(result).toBe('1D');
    });

    it('should detect 2D configuration', async () => {
      const jsResponse = 'd.Sf.SOMP.value = 1;';

      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: jsResponse,
      });

      const result = await detectWledDimensions(mockDeviceAddress);

      expect(result).toBe('2D');
    });

    it('should return null when SOMP value not found', async () => {
      const jsResponse = 'some other javascript';

      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: jsResponse,
      });

      const result = await detectWledDimensions(mockDeviceAddress);

      expect(result).toBeNull();
    });

    it('should return null on fetch error', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await detectWledDimensions(mockDeviceAddress);

      expect(result).toBeNull();
    });
  });

  describe('getWledMatrixDimensions', () => {
    it('should get dimensions from leds.matrix', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          leds: {
            matrix: { w: 16, h: 16 },
          },
        },
      });

      const result = await getWledMatrixDimensions(mockDeviceAddress);

      expect(result).toEqual({ is2D: true, width: 16, height: 16 });
    });

    it('should get dimensions from matrix directly', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          matrix: { w: 8, h: 8 },
        },
      });

      const result = await getWledMatrixDimensions(mockDeviceAddress);

      expect(result).toEqual({ is2D: true, width: 8, height: 8 });
    });

    it('should get dimensions from segment config', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          leds: {
            seglc: [{ m: 1, w: 32, h: 8 }],
          },
        },
      });

      const result = await getWledMatrixDimensions(mockDeviceAddress);

      expect(result).toEqual({ is2D: true, width: 32, height: 8 });
    });

    it('should return 1D for non-matrix devices', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          leds: { count: 100 },
        },
      });

      const result = await getWledMatrixDimensions(mockDeviceAddress);

      expect(result).toEqual({ is2D: false, width: 0, height: 0 });
    });

    it('should return null on fetch error', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await getWledMatrixDimensions(mockDeviceAddress);

      expect(result).toBeNull();
    });

    it('should skip segments with m=0', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          leds: {
            seglc: [
              { m: 0, w: 16, h: 16 }, // Should skip
              { m: 1, w: 32, h: 8 },  // Should use
            ],
          },
        },
      });

      const result = await getWledMatrixDimensions(mockDeviceAddress);

      expect(result).toEqual({ is2D: true, width: 32, height: 8 });
    });
  });

  describe('getWledState', () => {
    it('should get device state successfully', async () => {
      const mockState = { on: true, bri: 128, ps: 1 };

      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: mockState,
      });

      const result = await getWledState(mockDeviceAddress);

      expect(result.success).toBe(true);
      expect(result.message).toBe('State retrieved successfully');
      expect(result.data).toEqual(mockState);
    });

    it('should handle fetch errors', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await getWledState(mockDeviceAddress);

      expect(result.success).toBe(false);
    });

    it('should not log timeout errors', async () => {
      const logger = require('../../utils/logger').logger;

      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Request timeout',
      });

      await getWledState(mockDeviceAddress);

      // logger.error should not be called for timeouts
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should use custom protocol', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: {},
      });

      await getWledState(mockDeviceAddress, 'https');

      expect(fetchWithTimeout).toHaveBeenCalledWith(
        'https://192.168.1.100/json/state',
        expect.any(Object)
      );
    });
  });
});
