import {
  getDeviceAddress,
  getWebSocketProtocol,
  isDeviceReady,
  generateDataHash,
  hasDataChanged,
  filterSeasonalPresets,
  EXCLUDE_PREFIXES,
} from '../deviceUtils';
import { Device } from '../../types';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('deviceUtils', () => {
  describe('getDeviceAddress', () => {
    it('should return bestAddress when available', () => {
      const device: Device = {
        id: 1,
        name: 'Test Device',
        ip: '192.168.137.163',
        bestAddress: 'wled.local',
        protocol: 'http',
        isConnected: true,
        isPlaying: false,
        autoBrightness: false,
        maxBrightness: 255,
      };

      expect(getDeviceAddress(device)).toBe('wled.local');
    });

    it('should return ip when bestAddress is not available', () => {
      const device: Device = {
        id: 1,
        name: 'Test Device',
        ip: '192.168.137.163',
        protocol: 'http',
        isConnected: true,
        isPlaying: false,
        autoBrightness: false,
        maxBrightness: 255,
      };

      expect(getDeviceAddress(device)).toBe('192.168.137.163');
    });

    it('should return null when device is undefined', () => {
      expect(getDeviceAddress(undefined)).toBeNull();
    });

    it('should prefer bestAddress over ip', () => {
      const device: Device = {
        id: 1,
        name: 'Test Device',
        ip: '192.168.137.163',
        bestAddress: 'preferred.local',
        protocol: 'http',
        isConnected: true,
        isPlaying: false,
        autoBrightness: false,
        maxBrightness: 255,
      };

      expect(getDeviceAddress(device)).toBe('preferred.local');
    });

    it('should return null when device has no addresses', () => {
      const device = {
        id: 1,
        name: 'Test Device',
        protocol: 'http',
        isConnected: true,
        isPlaying: false,
        autoBrightness: false,
        maxBrightness: 255,
      } as Device;

      expect(getDeviceAddress(device)).toBeNull();
    });

    it('should handle empty string bestAddress', () => {
      const device: Device = {
        id: 1,
        name: 'Test Device',
        ip: '192.168.137.163',
        bestAddress: '',
        protocol: 'http',
        isConnected: true,
        isPlaying: false,
        autoBrightness: false,
        maxBrightness: 255,
      };

      // Empty string is falsy, should fall back to ip
      expect(getDeviceAddress(device)).toBe('192.168.137.163');
    });
  });

  describe('getWebSocketProtocol', () => {
    it('should return wss for https protocol', () => {
      const device: Device = {
        id: 1,
        name: 'Test Device',
        ip: '192.168.137.163',
        protocol: 'https',
        isConnected: true,
        isPlaying: false,
        autoBrightness: false,
        maxBrightness: 255,
      };

      expect(getWebSocketProtocol(device)).toBe('wss');
    });

    it('should return ws for http protocol', () => {
      const device: Device = {
        id: 1,
        name: 'Test Device',
        ip: '192.168.137.163',
        protocol: 'http',
        isConnected: true,
        isPlaying: false,
        autoBrightness: false,
        maxBrightness: 255,
      };

      expect(getWebSocketProtocol(device)).toBe('ws');
    });

    it('should return ws for undefined device', () => {
      expect(getWebSocketProtocol(undefined)).toBe('ws');
    });

    it('should handle device without protocol property', () => {
      const device = {
        id: 1,
        name: 'Test Device',
        ip: '192.168.137.163',
      } as Device;

      expect(getWebSocketProtocol(device)).toBe('ws');
    });
  });

  describe('isDeviceReady', () => {
    it('should return true for connected device with address', () => {
      const device: Device = {
        id: 1,
        name: 'Test Device',
        ip: '192.168.137.163',
        protocol: 'http',
        isConnected: true,
        isPlaying: false,
        autoBrightness: false,
        maxBrightness: 255,
      };

      expect(isDeviceReady(device)).toBe(true);
    });

    it('should return false for disconnected device', () => {
      const device: Device = {
        id: 1,
        name: 'Test Device',
        ip: '192.168.137.163',
        protocol: 'http',
        isConnected: false,
        isPlaying: false,
        autoBrightness: false,
        maxBrightness: 255,
      };

      expect(isDeviceReady(device)).toBe(false);
    });

    it('should return false for device without address', () => {
      const device = {
        id: 1,
        name: 'Test Device',
        protocol: 'http',
        isConnected: true,
        isPlaying: false,
        autoBrightness: false,
        maxBrightness: 255,
      } as Device;

      expect(isDeviceReady(device)).toBe(false);
    });

    it('should return false for undefined device', () => {
      expect(isDeviceReady(undefined)).toBe(false);
    });

    it('should return true when device has bestAddress', () => {
      const device: Device = {
        id: 1,
        name: 'Test Device',
        ip: '192.168.137.163',
        bestAddress: 'wled.local',
        protocol: 'http',
        isConnected: true,
        isPlaying: false,
        autoBrightness: false,
        maxBrightness: 255,
      };

      expect(isDeviceReady(device)).toBe(true);
    });

    it('should return false for connected device with empty ip', () => {
      const device = {
        id: 1,
        name: 'Test Device',
        ip: '',
        protocol: 'http',
        isConnected: true,
        isPlaying: false,
        autoBrightness: false,
        maxBrightness: 255,
      } as Device;

      expect(isDeviceReady(device)).toBe(false);
    });
  });

  describe('generateDataHash', () => {
    it('should generate hash from data array', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      const hash = generateDataHash(data);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should include items length in hash when present', () => {
      const data = [
        { id: 1, name: 'Playlist', items: [1, 2, 3] },
      ];

      const hash = generateDataHash(data);
      expect(hash).toContain('itemsLength');
    });

    it('should include gradient in hash when present', () => {
      const data = [
        { id: 1, name: 'Item', gradient: 'linear-gradient(...)' },
      ];

      const hash = generateDataHash(data);
      expect(hash).toContain('gradient');
    });

    it('should include isWledPreset in hash when defined', () => {
      const data = [
        { id: 1, name: 'Item', isWledPreset: true },
      ];

      const hash = generateDataHash(data);
      expect(hash).toContain('isWledPreset');
    });

    it('should limit hash to first 100 characters', () => {
      const data = Array(100).fill(0).map((_, i) => ({
        id: i,
        name: `Very Long Name ${i}`.repeat(10),
      }));

      const hash = generateDataHash(data);
      expect(hash.length).toBeLessThanOrEqual(100);
    });

    it('should generate same hash for identical data', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      const hash1 = generateDataHash(data);
      const hash2 = generateDataHash(data);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different data', () => {
      const data1 = [{ id: 1, name: 'Item 1' }];
      const data2 = [{ id: 2, name: 'Item 2' }];

      const hash1 = generateDataHash(data1);
      const hash2 = generateDataHash(data2);
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty array', () => {
      const hash = generateDataHash([]);
      expect(typeof hash).toBe('string');
    });

    it('should handle complex nested objects', () => {
      const data = [
        {
          id: 1,
          name: 'Complex',
          items: [1, 2, 3],
          gradient: 'test',
          isWledPreset: false,
        },
      ];

      const hash = generateDataHash(data);
      expect(typeof hash).toBe('string');
    });
  });

  describe('hasDataChanged', () => {
    it('should return true when data has changed', () => {
      const data1 = [{ id: 1, name: 'Item 1' }];
      const data2 = [{ id: 2, name: 'Item 2' }];

      const hash1 = generateDataHash(data1);
      expect(hasDataChanged(data2, hash1)).toBe(true);
    });

    it('should return false when data has not changed', () => {
      const data = [{ id: 1, name: 'Item 1' }];
      const hash = generateDataHash(data);

      expect(hasDataChanged(data, hash)).toBe(false);
    });

    it('should return true for empty vs non-empty array', () => {
      const emptyHash = generateDataHash([]);
      const data = [{ id: 1, name: 'Item' }];

      expect(hasDataChanged(data, emptyHash)).toBe(true);
    });

    it('should return false for identical complex data', () => {
      const data = [
        { id: 1, name: 'Item', items: [1, 2, 3], gradient: 'test' },
      ];
      const hash = generateDataHash(data);

      expect(hasDataChanged(data, hash)).toBe(false);
    });

    it('should detect changes in items length', () => {
      const data1 = [{ id: 1, name: 'Item', items: [1, 2] }];
      const data2 = [{ id: 1, name: 'Item', items: [1, 2, 3] }];

      const hash1 = generateDataHash(data1);
      expect(hasDataChanged(data2, hash1)).toBe(true);
    });

    it('should detect changes in gradient', () => {
      const data1 = [{ id: 1, name: 'Item', gradient: 'gradient1' }];
      const data2 = [{ id: 1, name: 'Item', gradient: 'gradient2' }];

      const hash1 = generateDataHash(data1);
      expect(hasDataChanged(data2, hash1)).toBe(true);
    });
  });

  describe('filterSeasonalPresets', () => {
    it('should filter out preset 0', () => {
      const items = [
        { name: 'Preset 0' },
        { name: 'Normal Preset' },
      ];

      const filtered = filterSeasonalPresets(items);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Normal Preset');
    });

    it('should filter out autumn presets', () => {
      const items = [
        { name: 'autumn-colors' },
        { name: 'Normal Preset' },
      ];

      const filtered = filterSeasonalPresets(items);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Normal Preset');
    });

    it('should filter out xmas presets', () => {
      const items = [
        { name: 'xmas-lights' },
        { name: 'Normal Preset' },
      ];

      const filtered = filterSeasonalPresets(items);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Normal Preset');
    });

    it('should filter out canada day presets', () => {
      const items = [
        { name: 'canada day-special' },
        { name: 'Normal Preset' },
      ];

      const filtered = filterSeasonalPresets(items);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Normal Preset');
    });

    it('should filter out off presets', () => {
      const items = [
        { name: 'off-preset' },
        { name: 'Normal Preset' },
      ];

      const filtered = filterSeasonalPresets(items);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Normal Preset');
    });

    it('should be case insensitive', () => {
      const items = [
        { name: 'AUTUMN-colors' },
        { name: 'XMAS-lights' },
        { name: 'Normal Preset' },
      ];

      const filtered = filterSeasonalPresets(items);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Normal Preset');
    });

    it('should filter all seasonal presets at once', () => {
      const items = [
        { name: 'Preset 0' },
        { name: 'autumn-colors' },
        { name: 'xmas-lights' },
        { name: 'canada day-special' },
        { name: 'off-preset' },
        { name: 'Normal Preset 1' },
        { name: 'Normal Preset 2' },
      ];

      const filtered = filterSeasonalPresets(items);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(i => i.name)).toEqual(['Normal Preset 1', 'Normal Preset 2']);
    });

    it('should return empty array when all presets are seasonal', () => {
      const items = [
        { name: 'Preset 0' },
        { name: 'autumn-colors' },
        { name: 'xmas-lights' },
      ];

      const filtered = filterSeasonalPresets(items);
      expect(filtered).toHaveLength(0);
    });

    it('should return all items when none are seasonal', () => {
      const items = [
        { name: 'Normal Preset 1' },
        { name: 'Normal Preset 2' },
        { name: 'Normal Preset 3' },
      ];

      const filtered = filterSeasonalPresets(items);
      expect(filtered).toHaveLength(3);
    });

    it('should handle empty array', () => {
      const filtered = filterSeasonalPresets([]);
      expect(filtered).toHaveLength(0);
    });

    it('should preserve item properties', () => {
      const items = [
        { name: 'Test Preset', id: 1, custom: 'value' },
      ];

      const filtered = filterSeasonalPresets(items);
      expect(filtered[0]).toEqual({ name: 'Test Preset', id: 1, custom: 'value' });
    });

    it('should only filter by prefix, not contain', () => {
      const items = [
        { name: 'My autumn-colors preset' }, // should NOT be filtered (doesn't start with)
        { name: 'autumn-colors' }, // should be filtered
      ];

      const filtered = filterSeasonalPresets(items);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('My autumn-colors preset');
    });
  });

  describe('EXCLUDE_PREFIXES constant', () => {
    it('should contain expected prefixes', () => {
      expect(EXCLUDE_PREFIXES).toContain('preset 0');
      expect(EXCLUDE_PREFIXES).toContain('autumn-');
      expect(EXCLUDE_PREFIXES).toContain('xmas-');
      expect(EXCLUDE_PREFIXES).toContain('canada day-');
      expect(EXCLUDE_PREFIXES).toContain('off-');
    });

    it('should be a readonly array', () => {
      expect(Array.isArray(EXCLUDE_PREFIXES)).toBe(true);
    });

    it('should have 5 prefixes', () => {
      expect(EXCLUDE_PREFIXES.length).toBe(5);
    });
  });
});
