import { useState, useCallback, useRef } from 'react';
import { Device as WledDevice, CustomEffect, SavedPlaylist, Settings } from '../types';
import {
  getWledPresets,
  activateWledEffect,
  activateWledPresetById,
  setWledBrightness,
  getWledState
} from '../config/wledApi';
import { getDeviceAddress, filterSeasonalPresets } from '../utils/deviceUtils';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';

export interface UsePresetManagerReturn {
  customEffects: CustomEffect[];
  savedPlaylists: SavedPlaylist[];
  currentPlaylist: any[];
  isLoadingPlaylists: boolean;
  setCustomEffects: React.Dispatch<React.SetStateAction<CustomEffect[]>>;
  setSavedPlaylists: React.Dispatch<React.SetStateAction<SavedPlaylist[]>>;
  setCurrentPlaylist: React.Dispatch<React.SetStateAction<any[]>>;
  loadDevicePresets: (device: WledDevice | undefined, isAnyModalOpen: boolean) => Promise<void>;
  fetchWledPresets: (device: WledDevice | undefined, onCacheUpdate: (presets: CustomEffect[], playlists: SavedPlaylist[]) => { presetsChanged: boolean; playlistsChanged: boolean }) => Promise<void>;
  handlePresetSelect: (presetId: string | number, device: WledDevice | undefined, settings: Settings, onDeviceUpdate: (id: number, updates: Partial<WledDevice>) => void) => Promise<void>;
  handleBrightnessChange: (brightness: number, device: WledDevice | undefined) => Promise<void>;
  refreshDeviceState: (device: WledDevice | undefined, onDeviceUpdate: (id: number, updates: Partial<WledDevice>) => void) => Promise<void>;
}

/**
 * Custom hook to manage WLED presets, playlists, and device control operations
 */
export function usePresetManager(): UsePresetManagerReturn {
  const [customEffects, setCustomEffects] = useState<CustomEffect[]>([]);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<any[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  const lastPresetLoadDeviceId = useRef<number | null>(null);

  /**
   * Load presets from device
   */
  const loadDevicePresets = useCallback(async (
    device: WledDevice | undefined,
    isAnyModalOpen: boolean
  ) => {
    // Skip loading presets when modals are open for better performance
    if (isAnyModalOpen) {
      logger.log('⏸️ Skipping preset load - modal is open');
      return;
    }

    // Prevent duplicate calls for the same device
    if (device?.id && lastPresetLoadDeviceId.current === device.id) {
      logger.log('🔄 Skipping duplicate preset load for device:', device.name);
      return;
    }

    logger.log('🔍 loadDevicePresets called with device:', {
      deviceName: device?.name,
      isConnected: device?.isConnected,
      deviceAddress: getDeviceAddress(device),
      protocol: device?.protocol
    });

    if (!device?.isConnected) {
      logger.warn('❌ Device offline - cannot fetch presets:', device?.name);
      return;
    }

    const deviceAddress = getDeviceAddress(device);
    if (!deviceAddress) {
      logger.warn('❌ No device address available for preset fetching');
      return;
    }

    // Mark this device as having presets loaded
    lastPresetLoadDeviceId.current = device.id;

    try {
      logger.log('📡 Fetching presets from device:', device.name, 'at', deviceAddress);
      const result = await getWledPresets(deviceAddress, device.protocol || 'http');

      logger.log(
        '📥 getWledPresets result:',
        result.success ? 'SUCCESS' : 'FAILED',
        `${result.presets?.length || 0} presets, ${result.playlists?.length || 0} playlists`
      );

      if (result.success) {
        const filteredPresets = filterSeasonalPresets(result.presets || []);
        const filteredPlaylists = filterSeasonalPresets(result.playlists || []);

        logger.log(`Fetched ${filteredPresets.length} device presets`);
        setCustomEffects(filteredPresets);

        if (filteredPlaylists.length > 0) {
          setSavedPlaylists(filteredPlaylists);
          logger.log(`Fetched ${filteredPlaylists.length} device playlists`);
        }
      } else {
        logger.error('Failed to fetch presets:', result.message);
        setCustomEffects([]); // Clear if failed
      }
    } catch (error) {
      logger.error('Error fetching WLED presets:', error);
      setCustomEffects([]); // Clear if error
    }
  }, []);

  /**
   * Fetch WLED presets with caching support
   */
  const fetchWledPresets = useCallback(async (
    device: WledDevice | undefined,
    onCacheUpdate: (presets: CustomEffect[], playlists: SavedPlaylist[]) => {
      presetsChanged: boolean;
      playlistsChanged: boolean;
    }
  ) => {
    if (!device?.isConnected) {
      return;
    }

    try {
      const result = await getWledPresets(getDeviceAddress(device)!, device.protocol || 'http');

      if (result.success) {
        const fetchedPresets = filterSeasonalPresets(result.presets || []);
        const fetchedPlaylists = filterSeasonalPresets(result.playlists || []);

        const { presetsChanged, playlistsChanged } = onCacheUpdate(fetchedPresets, fetchedPlaylists);

        // Only update UI if data actually changed
        let updatedCount = 0;
        if (presetsChanged) {
          setCustomEffects(fetchedPresets);
          storage.saveToStorage(STORAGE_KEYS.CUSTOM_EFFECTS, fetchedPresets);
          updatedCount += fetchedPresets.length;
        }

        if (playlistsChanged) {
          setSavedPlaylists(fetchedPlaylists.map((playlist: SavedPlaylist) => ({ ...playlist, isActive: false })));
          storage.saveToStorage(STORAGE_KEYS.PLAYLISTS, fetchedPlaylists);
          updatedCount += fetchedPlaylists.length;
        }

        // Always clear loading state
        setIsLoadingPlaylists(false);
      } else {
        // Only log non-timeout errors
        if (result.message !== 'Request timeout') {
          logger.error('❌ Failed to fetch WLED presets:', result.message);
        }
        setIsLoadingPlaylists(false);
      }
    } catch (error: any) {
      // Only log non-timeout errors
      if (error.message !== 'Request timeout') {
        logger.error('❌ Failed to fetch WLED presets:', error.message);
      }
      setIsLoadingPlaylists(false);
    }
  }, []);

  /**
   * Activate a preset on the device
   */
  const handlePresetSelect = useCallback(async (
    presetId: string | number,
    device: WledDevice | undefined,
    settings: Settings,
    onDeviceUpdate: (id: number, updates: Partial<WledDevice>) => void
  ) => {
    if (!device?.isConnected) {
      return;
    }

    try {
      logger.log('🎯 Activating preset:', presetId, 'on device:', device.name);

      // Find the preset to get its details
      const seasonalPresets = settings.seasonalPresets || [];

      const preset = [...customEffects].find(p =>
        p.id.toString() === presetId.toString()
      ) || seasonalPresets.find(p =>
        p.presetId.toString() === presetId.toString()
      );

      if (!preset) {
        return;
      }

      let result;

      if ('isWledPreset' in preset && preset.isWledPreset) {
        // For device presets, use the original WLED preset ID
        const wledPresetId = parseInt(preset.id.toString().replace('wled_', ''));
        logger.log('🎯 Activating WLED preset ID:', wledPresetId);

        result = await activateWledPresetById(
          getDeviceAddress(device)!,
          wledPresetId,
          device.protocol || 'http'
        );
      } else if ('presetId' in preset) {
        // For seasonal presets, use the configured presetId
        logger.log('🎯 Activating seasonal preset:', preset.name, 'with ID:', preset.presetId);

        result = await activateWledPresetById(
          getDeviceAddress(device)!,
          preset.presetId,
          device.protocol || 'http'
        );
      } else {
        // For custom effects, use the effectId and paletteId
        logger.log('🎯 Activating custom effect:', preset.name, 'FX:', preset.effectId, 'Palette:', preset.paletteId);

        result = await activateWledEffect(
          getDeviceAddress(device)!,
          preset.effectId,
          preset.paletteId,
          device.protocol || 'http'
        );
      }

      if (result.success) {
        // Update the active device's active preset
        onDeviceUpdate(device.id, { activePreset: presetId as any });

        // Clear any active playlist when a preset is selected
        setSavedPlaylists(prev => prev.map(playlist => ({
          ...playlist,
          isActive: false
        })));

        logger.log('✅ Successfully activated preset:', preset.name);
      } else {
        throw new Error(result.message || 'Failed to activate preset');
      }
    } catch (error: any) {
      logger.error('❌ Failed to activate preset:', error.message.toString());
    }
  }, [customEffects]);

  /**
   * Change device brightness
   */
  const handleBrightnessChange = useCallback(async (
    brightness: number,
    device: WledDevice | undefined
  ) => {
    if (!device?.isConnected) {
      return;
    }

    try {
      const result = await setWledBrightness(
        getDeviceAddress(device)!,
        brightness,
        device.protocol || 'http'
      );

      if (result.success) {
        logger.log(`✅ Brightness set to ${brightness} on ${device.name}`);
      } else {
        throw new Error(result.message || 'Failed to set brightness');
      }
    } catch (error: any) {
      logger.error('❌ Failed to set brightness:', error.message);
    }
  }, []);

  /**
   * Refresh device state and info
   */
  const refreshDeviceState = useCallback(async (
    device: WledDevice | undefined,
    onDeviceUpdate: (id: number, updates: Partial<WledDevice>) => void
  ) => {
    if (!device?.isConnected) {
      logger.warn('Cannot refresh device state - device not connected');
      return;
    }

    try {
      const deviceAddress = getDeviceAddress(device);
      const protocol = device.protocol || 'http';

      logger.log('🔄 Refreshing device state and info for:', device.name);

      // Fetch both device info AND state
      const [infoResponse, stateResponse] = await Promise.all([
        fetch(`${protocol}://${deviceAddress}/json/info`),
        getWledState(deviceAddress!, protocol)
      ]);

      if (stateResponse.success && stateResponse.data) {
        let updatedWledInfo = device.wledInfo || {};

        // If we got device info, merge it first
        if (infoResponse.ok) {
          const deviceInfo = await infoResponse.json();
          updatedWledInfo = { ...updatedWledInfo, ...deviceInfo };
          logger.log('📥 Device info fetched during refresh - LED count:', deviceInfo.leds?.count);
        }

        // Then update with current state
        updatedWledInfo = {
          ...updatedWledInfo,
          bri: stateResponse.data.bri,
          on: stateResponse.data.on,
          ps: stateResponse.data.ps // current preset
        };

        onDeviceUpdate(device.id, { wledInfo: updatedWledInfo });

        logger.log(
          '✅ Device state and info refreshed - brightness:',
          stateResponse.data.bri,
          'on:',
          stateResponse.data.on,
          'LED count:',
          updatedWledInfo.leds?.count
        );
      }
    } catch (error: any) {
      logger.error('❌ Failed to refresh device state:', error);
    }
  }, []);

  return {
    customEffects,
    savedPlaylists,
    currentPlaylist,
    isLoadingPlaylists,
    setCustomEffects,
    setSavedPlaylists,
    setCurrentPlaylist,
    loadDevicePresets,
    fetchWledPresets,
    handlePresetSelect,
    handleBrightnessChange,
    refreshDeviceState
  };
}
