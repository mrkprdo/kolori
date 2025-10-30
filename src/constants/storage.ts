import Constants from "expo-constants";

// Use different storage keys for development vs production
const getStorageKey = (key: string): string => {
  const isDevelopment = __DEV__ || Constants.appOwnership === "expo";
  return isDevelopment ? `dev_${key}` : key;
};

export const STORAGE_KEYS = {
  APP_SETTINGS: getStorageKey("app_settings"),
  MDNS_CACHE: getStorageKey("mdns_cache"),
  NETWORK_CACHE: getStorageKey("network_cache"),
  USER_DEVICES: getStorageKey("user_devices"),
  USER_PRESETS: getStorageKey("user_presets"),
  PLAYLISTS: getStorageKey("playlists"),
};
