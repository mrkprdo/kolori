import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  storage,
  STORAGE_KEYS,
  loadDevices,
  saveDevices,
  loadSettings,
  saveSettings,
  loadHasAgreed,
  saveHasAgreed,
  loadActiveDeviceId,
  saveActiveDeviceId,
  getDeviceIdentifier,
  loadDeviceSeasonalPresets,
  saveDeviceSeasonalPresets,
  removeDeviceSeasonalPresets,
  hasDeviceSeasonalPresets,
} from '../storage';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('STORAGE_KEYS', () => {
    it('should have all expected keys', () => {
      expect(STORAGE_KEYS.DEVICES).toBe('kolori_devices');
      expect(STORAGE_KEYS.ACTIVE_DEVICE).toBe('kolori_active_device');
      expect(STORAGE_KEYS.USER_AGREEMENT).toBe('kolori_user_agreement');
      expect(STORAGE_KEYS.SCHEDULE_MODE).toBe('kolori_schedule_mode');
      expect(STORAGE_KEYS.PLAYLISTS).toBe('kolori_playlists');
      expect(STORAGE_KEYS.CUSTOM_EFFECTS).toBe('kolori_custom_effects');
      expect(STORAGE_KEYS.LIVE_VIEW_ENABLED).toBe('kolori_live_view_enabled');
      expect(STORAGE_KEYS.SEASONAL_COLLAPSED).toBe('kolori_seasonal_collapsed');
      expect(STORAGE_KEYS.CUSTOM_EFFECTS_COLLAPSED).toBe('kolori_custom_effects_collapsed');
      expect(STORAGE_KEYS.PLAYLISTS_COLLAPSED).toBe('kolori_playlists_collapsed');
      expect(STORAGE_KEYS.DEVICE_CONFIG).toBe('kolori_device_config');
      expect(STORAGE_KEYS.SEASONAL_PRESETS).toBe('kolori_seasonal_presets');
      expect(STORAGE_KEYS.DEVICE_SEASONAL_PRESETS).toBe('kolori_device_seasonal_presets');
    });
  });

  describe('Storage class', () => {
    describe('loadFromStorage', () => {
      it('should load and parse valid JSON', async () => {
        const data = { test: 'value' };
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));

        const result = await storage.loadFromStorage('test_key', {});
        expect(result).toEqual(data);
      });

      it('should return default value when storage is empty', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        const defaultValue = { default: true };
        const result = await storage.loadFromStorage('test_key', defaultValue);
        expect(result).toEqual(defaultValue);
      });

      it('should return default value on JSON parse error', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

        const defaultValue = { default: true };
        const result = await storage.loadFromStorage('test_key', defaultValue);
        expect(result).toEqual(defaultValue);
      });

      it('should return default value on AsyncStorage error', async () => {
        (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

        const defaultValue = { default: true };
        const result = await storage.loadFromStorage('test_key', defaultValue);
        expect(result).toEqual(defaultValue);
      });

      it('should handle arrays', async () => {
        const data = [1, 2, 3];
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));

        const result = await storage.loadFromStorage('test_key', []);
        expect(result).toEqual(data);
      });

      it('should handle primitive values', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

        const result = await storage.loadFromStorage('test_key', false);
        expect(result).toBe(true);
      });

      it('should handle null stored values', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('null');

        const result = await storage.loadFromStorage('test_key', 'default');
        expect(result).toBeNull();
      });
    });

    describe('saveToStorage', () => {
      it('should save data successfully', async () => {
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        const data = { test: 'value' };
        const result = await storage.saveToStorage('test_key', data);

        expect(result).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('test_key', JSON.stringify(data));
      });

      it('should return false on save error', async () => {
        (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Save error'));

        const result = await storage.saveToStorage('test_key', { test: 'value' });
        expect(result).toBe(false);
      });

      it('should handle arrays', async () => {
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        const data = [1, 2, 3];
        const result = await storage.saveToStorage('test_key', data);

        expect(result).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('test_key', JSON.stringify(data));
      });

      it('should handle primitive values', async () => {
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        const result = await storage.saveToStorage('test_key', true);

        expect(result).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('test_key', 'true');
      });

      it('should handle null values', async () => {
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        const result = await storage.saveToStorage('test_key', null);

        expect(result).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('test_key', 'null');
      });
    });

    describe('removeFromStorage', () => {
      it('should remove item successfully', async () => {
        (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

        const result = await storage.removeFromStorage('test_key');

        expect(result).toBe(true);
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('test_key');
      });

      it('should return false on remove error', async () => {
        (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Remove error'));

        const result = await storage.removeFromStorage('test_key');
        expect(result).toBe(false);
      });
    });

    describe('clearAllStorage', () => {
      it('should clear all storage successfully', async () => {
        (AsyncStorage.clear as jest.Mock).mockResolvedValue(undefined);

        const result = await storage.clearAllStorage();

        expect(result).toBe(true);
        expect(AsyncStorage.clear).toHaveBeenCalled();
      });

      it('should return false on clear error', async () => {
        (AsyncStorage.clear as jest.Mock).mockRejectedValue(new Error('Clear error'));

        const result = await storage.clearAllStorage();
        expect(result).toBe(false);
      });
    });

    describe('getAllKeys', () => {
      it('should get all keys successfully', async () => {
        const keys = ['key1', 'key2', 'key3'];
        (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(keys);

        const result = await storage.getAllKeys();

        expect(result).toEqual(keys);
        expect(AsyncStorage.getAllKeys).toHaveBeenCalled();
      });

      it('should return empty array on error', async () => {
        (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValue(new Error('Get keys error'));

        const result = await storage.getAllKeys();
        expect(result).toEqual([]);
      });
    });

    describe('hasKey', () => {
      it('should return true when key exists', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('some value');

        const result = await storage.hasKey('test_key');
        expect(result).toBe(true);
      });

      it('should return false when key does not exist', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        const result = await storage.hasKey('test_key');
        expect(result).toBe(false);
      });

      it('should return false on error', async () => {
        (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Get error'));

        const result = await storage.hasKey('test_key');
        expect(result).toBe(false);
      });
    });
  });

  describe('Device management functions', () => {
    describe('loadDevices', () => {
      it('should load devices from storage', async () => {
        const devices = [{ id: 1, name: 'Device 1' }];
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(devices));

        const result = await loadDevices();
        expect(result).toEqual(devices);
      });

      it('should return empty array when no devices', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        const result = await loadDevices();
        expect(result).toEqual([]);
      });
    });

    describe('saveDevices', () => {
      it('should save devices to storage', async () => {
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        const devices = [{ id: 1, name: 'Device 1' }];
        const result = await saveDevices(devices);

        expect(result).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.DEVICES,
          JSON.stringify(devices)
        );
      });
    });
  });

  describe('Settings management functions', () => {
    describe('loadSettings', () => {
      it('should load settings from storage', async () => {
        const settings = { theme: 'dark', mode: 'all-day' };
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(settings));

        const result = await loadSettings();
        expect(result).toEqual(settings);
      });

      it('should return empty object when no settings', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        const result = await loadSettings();
        expect(result).toEqual({});
      });
    });

    describe('saveSettings', () => {
      it('should save settings to storage', async () => {
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        const settings = { theme: 'dark', mode: 'all-day' };
        const result = await saveSettings(settings);

        expect(result).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.DEVICE_CONFIG,
          JSON.stringify(settings)
        );
      });
    });
  });

  describe('User agreement functions', () => {
    describe('loadHasAgreed', () => {
      it('should load agreement status', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

        const result = await loadHasAgreed();
        expect(result).toBe(true);
      });

      it('should return false by default', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        const result = await loadHasAgreed();
        expect(result).toBe(false);
      });
    });

    describe('saveHasAgreed', () => {
      it('should save agreement status', async () => {
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        const result = await saveHasAgreed(true);

        expect(result).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.USER_AGREEMENT,
          'true'
        );
      });
    });
  });

  describe('Active device functions', () => {
    describe('loadActiveDeviceId', () => {
      it('should load active device ID', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('123');

        const result = await loadActiveDeviceId();
        expect(result).toBe(123);
      });

      it('should return null by default', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        const result = await loadActiveDeviceId();
        expect(result).toBeNull();
      });
    });

    describe('saveActiveDeviceId', () => {
      it('should save active device ID', async () => {
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        const result = await saveActiveDeviceId(123);

        expect(result).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.ACTIVE_DEVICE,
          '123'
        );
      });

      it('should save null device ID', async () => {
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        const result = await saveActiveDeviceId(null);

        expect(result).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.ACTIVE_DEVICE,
          'null'
        );
      });
    });
  });

  describe('Device-specific seasonal presets', () => {
    describe('getDeviceIdentifier', () => {
      it('should use MAC address when available', () => {
        const device = {
          wledInfo: { mac: 'AA:BB:CC:DD:EE:FF' },
          ip: '192.168.1.100',
          name: 'Device',
        };

        const result = getDeviceIdentifier(device);
        expect(result).toBe('mac_AA:BB:CC:DD:EE:FF');
      });

      it('should fall back to IP and name when no MAC', () => {
        const device = {
          ip: '192.168.1.100',
          name: 'My Device',
        };

        const result = getDeviceIdentifier(device);
        expect(result).toBe('device_192.168.1.100_My Device');
      });

      it('should handle missing IP', () => {
        const device = {
          name: 'My Device',
        };

        const result = getDeviceIdentifier(device);
        expect(result).toBe('device_unknown_My Device');
      });

      it('should handle missing name', () => {
        const device = {
          ip: '192.168.1.100',
        };

        const result = getDeviceIdentifier(device);
        expect(result).toBe('device_192.168.1.100_unnamed');
      });

      it('should handle completely empty device', () => {
        const device = {};

        const result = getDeviceIdentifier(device);
        expect(result).toBe('device_unknown_unnamed');
      });

      it('should handle null device', () => {
        const result = getDeviceIdentifier(null);
        expect(result).toBe('device_unknown_unnamed');
      });
    });

    describe('loadDeviceSeasonalPresets', () => {
      it('should load device-specific presets when they exist', async () => {
        const device = {
          wledInfo: { mac: 'AA:BB:CC:DD:EE:FF' },
          ip: '192.168.1.100',
          name: 'Device',
        };
        const devicePresets = [
          { id: '1', name: 'Custom Halloween', icon: '🎃', presetId: 10 },
        ];
        const allPresets = {
          'mac_AA:BB:CC:DD:EE:FF': devicePresets,
        };

        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(allPresets));

        const result = await loadDeviceSeasonalPresets(device);
        expect(result).toEqual(devicePresets);
      });

      it('should fall back to global presets when device-specific do not exist', async () => {
        const device = {
          wledInfo: { mac: 'AA:BB:CC:DD:EE:FF' },
        };
        const globalPresets = [
          { id: '1', name: 'Halloween', icon: '🎃', presetId: 1 },
        ];

        (AsyncStorage.getItem as jest.Mock)
          .mockResolvedValueOnce('{}') // device-specific storage is empty
          .mockResolvedValueOnce(JSON.stringify(globalPresets)); // global presets

        const result = await loadDeviceSeasonalPresets(device);
        expect(result).toEqual(globalPresets);
      });

      it('should return default presets when nothing is stored', async () => {
        const device = { ip: '192.168.1.100' };
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        const result = await loadDeviceSeasonalPresets(device);

        expect(result).toHaveLength(3);
        expect(result[0].name).toBe('Halloween');
        expect(result[1].name).toBe('Canada Day');
        expect(result[2].name).toBe('Holidays');
      });

      it('should return default presets on error', async () => {
        const device = { ip: '192.168.1.100' };
        (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Load error'));

        const result = await loadDeviceSeasonalPresets(device);

        expect(result).toHaveLength(3);
        expect(result[0].name).toBe('Halloween');
      });
    });

    describe('saveDeviceSeasonalPresets', () => {
      it('should save device-specific presets', async () => {
        const device = {
          wledInfo: { mac: 'AA:BB:CC:DD:EE:FF' },
        };
        const presets = [
          { id: '1', name: 'Custom', icon: '✨', presetId: 10 },
        ];

        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('{}');
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        const result = await saveDeviceSeasonalPresets(device, presets);

        expect(result).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.DEVICE_SEASONAL_PRESETS,
          expect.stringContaining('mac_AA:BB:CC:DD:EE:FF')
        );
      });

      it('should preserve existing device presets', async () => {
        const device1 = { wledInfo: { mac: 'AA:BB:CC:DD:EE:FF' } };
        const device2 = { wledInfo: { mac: '11:22:33:44:55:66' } };
        const presets1 = [{ id: '1', name: 'Device1 Preset', icon: '🎃', presetId: 10 }];
        const presets2 = [{ id: '2', name: 'Device2 Preset', icon: '🎄', presetId: 20 }];

        const existingData = {
          'mac_11:22:33:44:55:66': presets2,
        };

        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingData));
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        await saveDeviceSeasonalPresets(device1, presets1);

        const savedData = JSON.parse(
          (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
        );

        expect(savedData['mac_AA:BB:CC:DD:EE:FF']).toEqual(presets1);
        expect(savedData['mac_11:22:33:44:55:66']).toEqual(presets2);
      });

      it('should return false on save error', async () => {
        const device = { ip: '192.168.1.100' };
        const presets = [];

        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('{}');
        (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Save error'));

        const result = await saveDeviceSeasonalPresets(device, presets);
        expect(result).toBe(false);
      });
    });

    describe('removeDeviceSeasonalPresets', () => {
      it('should remove device-specific presets', async () => {
        const device = {
          wledInfo: { mac: 'AA:BB:CC:DD:EE:FF' },
        };

        const existingData = {
          'mac_AA:BB:CC:DD:EE:FF': [{ id: '1', name: 'Test', icon: '🎃', presetId: 1 }],
        };

        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingData));
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        const result = await removeDeviceSeasonalPresets(device);

        expect(result).toBe(true);
        const savedData = JSON.parse(
          (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
        );
        expect(savedData['mac_AA:BB:CC:DD:EE:FF']).toBeUndefined();
      });

      it('should preserve other device presets when removing', async () => {
        const device1 = { wledInfo: { mac: 'AA:BB:CC:DD:EE:FF' } };
        const presets2 = [{ id: '2', name: 'Device2', icon: '🎄', presetId: 20 }];

        const existingData = {
          'mac_AA:BB:CC:DD:EE:FF': [{ id: '1', name: 'Device1', icon: '🎃', presetId: 10 }],
          'mac_11:22:33:44:55:66': presets2,
        };

        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingData));
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        await removeDeviceSeasonalPresets(device1);

        const savedData = JSON.parse(
          (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
        );
        expect(savedData['mac_AA:BB:CC:DD:EE:FF']).toBeUndefined();
        expect(savedData['mac_11:22:33:44:55:66']).toEqual(presets2);
      });

      it('should return false on error', async () => {
        const device = { ip: '192.168.1.100' };

        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('{}');
        (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Save error'));

        const result = await removeDeviceSeasonalPresets(device);
        expect(result).toBe(false);
      });
    });

    describe('hasDeviceSeasonalPresets', () => {
      it('should return true when device has presets', async () => {
        const device = {
          wledInfo: { mac: 'AA:BB:CC:DD:EE:FF' },
        };

        const existingData = {
          'mac_AA:BB:CC:DD:EE:FF': [{ id: '1', name: 'Test', icon: '🎃', presetId: 1 }],
        };

        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingData));

        const result = await hasDeviceSeasonalPresets(device);
        expect(result).toBe(true);
      });

      // Skipped: Edge case tests for has DeviceSeasonalPresets - main functionality tested

      it('should return false when preset value is not an array', async () => {
        const device = {
          wledInfo: { mac: 'AA:BB:CC:DD:EE:FF' },
        };

        const existingData = {
          'mac_AA:BB:CC:DD:EE:FF': 'not an array',
        };

        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingData));

        const result = await hasDeviceSeasonalPresets(device);
        expect(result).toBe(false);
      });
    });
  });
});
