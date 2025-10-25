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
  SEASONAL_PRESETS: "kolori_seasonal_presets",
  DEVICE_SEASONAL_PRESETS: "kolori_device_seasonal_presets",
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

export const saveActiveDeviceId = async (
  deviceId: number | null
): Promise<boolean> => {
  return storage.saveToStorage(STORAGE_KEYS.ACTIVE_DEVICE, deviceId);
};

// Device-specific seasonal presets functions
export const getDeviceIdentifier = (device: any): string => {
  // Use MAC address as primary identifier, fallback to IP + name
  const macAddress = device?.wledInfo?.mac;
  const identifier = macAddress
    ? `mac_${macAddress}`
    : `device_${device?.ip || "unknown"}_${device?.name || "unnamed"}`;

  return identifier;
};

export const loadDeviceSeasonalPresets = async (
  device: any
): Promise<any[]> => {
  try {
    const deviceIdentifier = getDeviceIdentifier(device);
    const allDevicePresets: Record<string, any> = await storage.loadFromStorage(
      STORAGE_KEYS.DEVICE_SEASONAL_PRESETS,
      {}
    );

    // Return device-specific presets if they exist, otherwise return global defaults
    const devicePresets = allDevicePresets[deviceIdentifier];
    if (devicePresets && Array.isArray(devicePresets)) {
      return devicePresets;
    }

    // Fallback to global seasonal presets for backward compatibility
    const globalPresets = await storage.loadFromStorage(
      STORAGE_KEYS.SEASONAL_PRESETS,
      []
    );
    if (globalPresets && globalPresets.length > 0) {
      return globalPresets;
    }

    // Return default presets
    return [
      { id: "1", name: "Halloween", icon: "🎃", presetId: 1 },
      { id: "2", name: "Canada Day", icon: "🇨🇦", presetId: 2 },
      { id: "3", name: "Holidays", icon: "🎄", presetId: 3 },
    ];
  } catch (error) {
    logger.error("Failed to load device seasonal presets:", error);
    return [
      { id: "1", name: "Halloween", icon: "🎃", presetId: 1 },
      { id: "2", name: "Canada Day", icon: "🇨🇦", presetId: 2 },
      { id: "3", name: "Holidays", icon: "🎄", presetId: 3 },
    ];
  }
};

export const saveDeviceSeasonalPresets = async (
  device: any,
  presets: any[]
): Promise<boolean> => {
  try {
    const deviceIdentifier = getDeviceIdentifier(device);
    const allDevicePresets: Record<string, any> = await storage.loadFromStorage(
      STORAGE_KEYS.DEVICE_SEASONAL_PRESETS,
      {}
    );

    // Update the presets for this specific device
    allDevicePresets[deviceIdentifier] = presets;

    return await storage.saveToStorage(
      STORAGE_KEYS.DEVICE_SEASONAL_PRESETS,
      allDevicePresets
    );
  } catch (error) {
    logger.error("Failed to save device seasonal presets:", error);
    return false;
  }
};

export const removeDeviceSeasonalPresets = async (
  device: any
): Promise<boolean> => {
  try {
    const deviceIdentifier = getDeviceIdentifier(device);
    const allDevicePresets: Record<string, any> = await storage.loadFromStorage(
      STORAGE_KEYS.DEVICE_SEASONAL_PRESETS,
      {}
    );

    // Remove the presets for this specific device
    delete allDevicePresets[deviceIdentifier];

    return await storage.saveToStorage(
      STORAGE_KEYS.DEVICE_SEASONAL_PRESETS,
      allDevicePresets
    );
  } catch (error) {
    logger.error("Failed to remove device seasonal presets:", error);
    return false;
  }
};

export const hasDeviceSeasonalPresets = async (
  device: any
): Promise<boolean> => {
  try {
    const deviceIdentifier = getDeviceIdentifier(device);
    const allDevicePresets = await storage.loadFromStorage(
      STORAGE_KEYS.DEVICE_SEASONAL_PRESETS,
      {}
    );

    // Check if this device has stored presets (not just fallback defaults)
    const hasPresets =
      allDevicePresets[deviceIdentifier] &&
      Array.isArray(allDevicePresets[deviceIdentifier]);

    return hasPresets;
  } catch (error) {
    logger.error("Failed to check device seasonal presets:", error);
    return false;
  }
};

export default storage;
