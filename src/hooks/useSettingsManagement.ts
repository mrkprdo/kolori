import { useState, useCallback, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Settings, Device } from '../types';
import { loadSettings, saveSettings, loadDeviceSeasonalPresets } from '../utils/storage';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { logger } from '../utils/logger';

export interface UseSettingsManagementReturn {
  settings: Settings | null;
  isDark: boolean;
  handleUpdateSettings: (newSettings: Settings) => void;
  loadInitialSettings: (activeDevice: Device | null) => Promise<Settings>;
}

/**
 * Custom hook to manage application settings
 */
export function useSettingsManagement(): UseSettingsManagementReturn {
  const systemColorScheme = useColorScheme();
  const [settings, setSettings] = useState<Settings | null>(null);

  // Log system color scheme changes
  useEffect(() => {
    logger.log(`🎨 System color scheme: ${systemColorScheme}`);
  }, [systemColorScheme]);

  /**
   * Determine if the current theme is dark
   */
  const isDark = (() => {
    if (!settings) {
      // Default to system theme before settings load
      return systemColorScheme === 'dark';
    }
    if (settings.theme === 'system') {
      const result = systemColorScheme === 'dark';
      logger.log(`🎨 Theme mode: system, isDark: ${result}, systemColorScheme: ${systemColorScheme}`);
      return result;
    }
    return settings.theme === 'dark';
  })();

  /**
   * Load initial settings from storage
   */
  const loadInitialSettings = useCallback(async (activeDevice: Device | null) => {
    const loadedSettings = await loadSettings();

    // Load device-specific seasonal presets if we have an active device
    let loadedSeasonalPresets = DEFAULT_SETTINGS.seasonalPresets;
    if (activeDevice) {
      loadedSeasonalPresets = await loadDeviceSeasonalPresets(activeDevice);
    }

    // Merge loaded settings with defaults
    const finalSettings: Settings = loadedSettings && Object.keys(loadedSettings).length > 0
      ? {
          ...DEFAULT_SETTINGS,
          ...loadedSettings,
          seasonalPresets: loadedSeasonalPresets
        }
      : { ...DEFAULT_SETTINGS, seasonalPresets: loadedSeasonalPresets };

    setSettings(finalSettings);
    return finalSettings;
  }, []);

  /**
   * Update settings and persist to storage
   */
  const handleUpdateSettings = useCallback((newSettings: Settings) => {
    setSettings(prevSettings => {
      const updatedSettings = { ...newSettings };
      saveSettings(updatedSettings);
      return updatedSettings;
    });
  }, []);

  return {
    settings,
    isDark,
    handleUpdateSettings,
    loadInitialSettings,
  };
}
