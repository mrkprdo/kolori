// React Native Storage Utility using AsyncStorage
// Replaces localStorage functionality from the React version

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

// Storage keys (same as React version for consistency)
export const STORAGE_KEYS = {
  DEVICES: 'kolori_devices',
  ACTIVE_DEVICE: 'kolori_active_device',
  USER_AGREEMENT: 'kolori_user_agreement',
  SCHEDULE_MODE: 'kolori_schedule_mode',
  PLAYLISTS: 'kolori_playlists',
  CUSTOM_EFFECTS: 'kolori_custom_effects',
  MIXED_CONTENT: 'kolori_mixed_content_accepted',
  MIXED_CONTENT_ACCEPTED: 'kolori_mixed_content_accepted',
  LIVE_VIEW_ENABLED: 'kolori_live_view_enabled',
  SEASONAL_COLLAPSED: 'kolori_seasonal_collapsed',
  CUSTOM_EFFECTS_COLLAPSED: 'kolori_custom_effects_collapsed',
  PLAYLISTS_COLLAPSED: 'kolori_playlists_collapsed',
  DEVICE_CONFIG: 'kolori_device_config',
};

class Storage {
  /**
   * Load data from AsyncStorage with fallback to default value
   */
  async loadFromStorage<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      logger.error('Failed to load from storage:', key, error);
      return defaultValue;
    }
  }

  /**
   * Save data to AsyncStorage
   */
  async saveToStorage(key: string, value: any): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Failed to save to storage:', key, error);
      return false;
    }
  }

  /**
   * Remove item from AsyncStorage
   */
  async removeFromStorage(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.error('Failed to remove from storage:', key, error);
      return false;
    }
  }

  /**
   * Clear all storage (use with caution)
   */
  async clearAllStorage(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      logger.error('Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * Get all keys from storage
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys]; // Convert readonly array to mutable array
    } catch (error) {
      logger.error('Failed to get all keys:', error);
      return [];
    }
  }

  /**
   * Check if a key exists in storage
   */
  async hasKey(key: string): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null;
    } catch (error) {
      logger.error('Failed to check key existence:', key, error);
      return false;
    }
  }
}

export const storage = new Storage();
export default storage;