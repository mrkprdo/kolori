import Constants from 'expo-constants';
import { STORAGE_KEYS } from '../storage';

// Mock expo-constants
jest.mock('expo-constants', () => ({
  appOwnership: 'expo',
}));

describe('storage constants', () => {
  describe('STORAGE_KEYS', () => {
    it('should have all required storage keys', () => {
      expect(STORAGE_KEYS).toHaveProperty('APP_SETTINGS');
      expect(STORAGE_KEYS).toHaveProperty('MDNS_CACHE');
      expect(STORAGE_KEYS).toHaveProperty('NETWORK_CACHE');
      expect(STORAGE_KEYS).toHaveProperty('USER_DEVICES');
      expect(STORAGE_KEYS).toHaveProperty('USER_PRESETS');
      expect(STORAGE_KEYS).toHaveProperty('PLAYLISTS');
    });

    it('should prefix keys with "dev_" in development mode', () => {
      // In development mode (__DEV__ or expo ownership)
      Object.values(STORAGE_KEYS).forEach((key) => {
        expect(key).toMatch(/^dev_/);
      });
    });

    it('should generate correct development keys', () => {
      expect(STORAGE_KEYS.APP_SETTINGS).toBe('dev_app_settings');
      expect(STORAGE_KEYS.MDNS_CACHE).toBe('dev_mdns_cache');
      expect(STORAGE_KEYS.NETWORK_CACHE).toBe('dev_network_cache');
      expect(STORAGE_KEYS.USER_DEVICES).toBe('dev_user_devices');
      expect(STORAGE_KEYS.USER_PRESETS).toBe('dev_user_presets');
      expect(STORAGE_KEYS.PLAYLISTS).toBe('dev_playlists');
    });
  });
});
