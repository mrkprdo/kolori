import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "./logger";

// Storage keys (same as React version for consistency)
export const STORAGE_KEYS = {
  DEVICES: "kolori_devices",
  ACTIVE_DEVICE: "kolori_active_device",
  USER_AGREEMENT: "kolori_user_agreement",
  SCHEDULE_MODE: "kolori_schedule_mode",
  PLAYLISTS: "kolori_playlists",
  CUSTOM_EFFECTS: "kolori_custom_effects",
  LIVE_VIEW_ENABLED: "kolori_live_view_enabled",
  SEASONAL_COLLAPSED: "kolori_seasonal_collapsed",
  CUSTOM_EFFECTS_COLLAPSED: "kolori_custom_effects_collapsed",
  PLAYLISTS_COLLAPSED: "kolori_playlists_collapsed",
  DEVICE_CONFIG: "kolori_device_config",
};

class Storage {
  private readonly parseJson = <T>(
    jsonString: string | null,
    defaultValue: T
  ): T => {
    if (!jsonString) return defaultValue;
    try {
      return JSON.parse(jsonString) as T;
    } catch {
      return defaultValue;
    }
  };

  /**
   * Load data from AsyncStorage with fallback to default value
   */
  readonly loadFromStorage = async <T>(
    key: string,
    defaultValue: T
  ): Promise<T> => {
    try {
      const stored = await AsyncStorage.getItem(key);
      return this.parseJson(stored, defaultValue);
    } catch (error) {
      logger.error("Failed to load from storage:", key, error);
      return defaultValue;
    }
  };

  /**
   * Save data to AsyncStorage
   */
  readonly saveToStorage = async (
    key: string,
    value: unknown
  ): Promise<boolean> => {
    try {
      const serialized = JSON.stringify(value);
      await AsyncStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      logger.error("Failed to save to storage:", key, error);
      return false;
    }
  };

  /**
   * Remove item from AsyncStorage
   */
  readonly removeFromStorage = async (key: string): Promise<boolean> => {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.error("Failed to remove from storage:", key, error);
      return false;
    }
  };

  /**
   * Clear all storage (use with caution)
   */
  readonly clearAllStorage = async (): Promise<boolean> => {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      logger.error("Failed to clear storage:", error);
      return false;
    }
  };

  /**
   * Get all keys from storage
   */
  readonly getAllKeys = async (): Promise<readonly string[]> => {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      logger.error("Failed to get all keys:", error);
      return [];
    }
  };

  /**
   * Check if a key exists in storage
   */
  readonly hasKey = async (key: string): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null;
    } catch (error) {
      logger.error("Failed to check key existence:", key, error);
      return false;
    }
  };
}

export const storage = new Storage();

// Device management functions
export const loadDevices = async (): Promise<any[]> => {
  return storage.loadFromStorage(STORAGE_KEYS.DEVICES, []);
};

export const saveDevices = async (
  devices: readonly any[]
): Promise<boolean> => {
  return storage.saveToStorage(STORAGE_KEYS.DEVICES, devices);
};

// Settings management functions
export const loadSettings = async (): Promise<Record<string, unknown>> => {
  return storage.loadFromStorage(STORAGE_KEYS.DEVICE_CONFIG, {});
};

export const saveSettings = async (
  settings: Record<string, unknown>
): Promise<boolean> => {
  return storage.saveToStorage(STORAGE_KEYS.DEVICE_CONFIG, settings);
};

// User agreement functions
export const loadHasAgreed = async (): Promise<boolean> => {
  return storage.loadFromStorage(STORAGE_KEYS.USER_AGREEMENT, false);
};

export const saveHasAgreed = async (hasAgreed: boolean): Promise<boolean> => {
  return storage.saveToStorage(STORAGE_KEYS.USER_AGREEMENT, hasAgreed);
};

// Active device functions
export const loadActiveDeviceId = async (): Promise<number | null> => {
  return storage.loadFromStorage(STORAGE_KEYS.ACTIVE_DEVICE, null);
};

export const saveActiveDeviceId = async (deviceId: number | null): Promise<boolean> => {
  return storage.saveToStorage(STORAGE_KEYS.ACTIVE_DEVICE, deviceId);
};

export default storage;
