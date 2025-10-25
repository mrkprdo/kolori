import {
  activateWledEffect,
  activateWledPresetById,
  fetchWledPresets,
} from '../wledPresets';

// Mock dependencies
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

jest.mock('../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../wledGradients', () => ({
  generatePresetGradient: jest.fn(() => ({ gradient: '#ff0000' })),
  generatePlaylistGradient: jest.fn(() => ({ gradient: '#00ff00' })),
  generateLinearGradientColors: jest.fn(() => ['#ff0000', '#00ff00']),
}));

import { fetchWithTimeout } from '../wledUtils';

describe('wledPresets', () => {
  const mockDeviceAddress = '192.168.1.100';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('activateWledEffect', () => {
    it('should activate effect successfully', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: '<html>Success</html>',
      });

      const result = await activateWledEffect(mockDeviceAddress, 5, 10);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Effect activated');
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        'http://192.168.1.100/win&FX=5&FP=10',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should handle errors when activating effect', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await activateWledEffect(mockDeviceAddress, 5, 10);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
    });

    it('should use custom protocol', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: '<html>Success</html>',
      });

      await activateWledEffect(mockDeviceAddress, 5, 10, 'https');

      expect(fetchWithTimeout).toHaveBeenCalledWith(
        'https://192.168.1.100/win&FX=5&FP=10',
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('activateWledPresetById', () => {
    it('should activate preset successfully', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: '<html>Success</html>',
      });

      const result = await activateWledPresetById(mockDeviceAddress, 3);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Preset activated');
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        'http://192.168.1.100/win&PL=3',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should handle errors when activating preset', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Device offline',
      });

      const result = await activateWledPresetById(mockDeviceAddress, 3);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Device offline');
    });

    it('should use custom protocol', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: '<html>Success</html>',
      });

      await activateWledPresetById(mockDeviceAddress, 3, 'https');

      expect(fetchWithTimeout).toHaveBeenCalledWith(
        'https://192.168.1.100/win&PL=3',
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('fetchWledPresets', () => {
    it('should fetch and parse presets successfully', async () => {
      const mockPresetsData = {
        '1': {
          n: 'Sunset',
          on: true,
        },
        '2': {
          n: 'Ocean',
          on: true,
        },
      };

      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: mockPresetsData,
      });

      const result = await fetchWledPresets(mockDeviceAddress);

      expect(result.success).toBe(true);
      expect(result.presets).toHaveLength(2);
      expect(result.presets[0].name).toBe('Sunset');
      expect(result.presets[0].presetId).toBe(1);
      expect(result.presets[0].isWledPreset).toBe(true);
    });

    it('should parse playlists correctly', async () => {
      const mockPresetsData = {
        '5': {
          n: 'My Playlist',
          playlist: {
            ps: [1, 2, 3],
            dur: [300, 600, 450], // durations in deciseconds
          },
        },
      };

      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: mockPresetsData,
      });

      const result = await fetchWledPresets(mockDeviceAddress);

      expect(result.success).toBe(true);
      expect(result.playlists).toHaveLength(1);
      expect(result.playlists[0].name).toBe('My Playlist');
      expect(result.playlists[0].items).toHaveLength(3);
      expect(result.playlists[0].items[0].duration).toBe(30); // 300/10
      expect(result.playlists[0].items[1].duration).toBe(60); // 600/10
      expect(result.playlists[0].isWledPlaylist).toBe(true);
    });

    it('should handle fetch errors', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network timeout',
      });

      const result = await fetchWledPresets(mockDeviceAddress);

      expect(result.success).toBe(false);
      expect(result.presets).toEqual([]);
      expect(result.playlists).toEqual([]);
      expect(result.message).toBe('Network timeout');
    });

    it('should handle empty presets', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await fetchWledPresets(mockDeviceAddress);

      expect(result.success).toBe(true);
      expect(result.presets).toEqual([]);
      expect(result.playlists).toEqual([]);
    });

    it('should use custom protocol', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: {},
      });

      await fetchWledPresets(mockDeviceAddress, 'https');

      expect(fetchWithTimeout).toHaveBeenCalledWith(
        'https://192.168.1.100/presets.json',
        expect.any(Object)
      );
    });

    it('should handle preset without name', async () => {
      const mockPresetsData = {
        '10': {
          on: true,
        },
      };

      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: mockPresetsData,
      });

      const result = await fetchWledPresets(mockDeviceAddress);

      expect(result.presets[0].name).toBe('Preset 10');
    });

    it('should handle playlist without durations', async () => {
      const mockPresetsData = {
        '7': {
          n: 'Quick Playlist',
          playlist: {
            ps: [1, 2],
          },
        },
      };

      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: mockPresetsData,
      });

      const result = await fetchWledPresets(mockDeviceAddress);

      expect(result.playlists[0].items[0].duration).toBe(30); // default
      expect(result.playlists[0].items[1].duration).toBe(30); // default
    });
  });
});
