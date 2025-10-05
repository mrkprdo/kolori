import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Hooks
import {
  useDeviceCache,
  usePresetManager,
  useWebSocketManager,
  useDeviceMonitor
} from '../hooks';

// API & Config
import { activateWledPresetById } from '../config/wledApi';
import { getWledState } from '../config/wledApi';

// Utils
import { logger } from '../utils/logger';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { getDeviceAddress } from '../utils/deviceUtils';

// Types
import {
  Device as WledDevice,
  Settings,
  SavedPlaylist
} from '../types';

// Components
import PresetGrid from './PresetGrid';
import PlaylistModal from './PlaylistModal';

/**
 * Props for the main KoloriApp component
 */
interface KoloriAppProps {
  navigation: any;
  devices: WledDevice[];
  activeDeviceId: number | null;
  settings: Settings;
  onDeviceUpdate: (id: number, updates: Partial<WledDevice>) => void;
  onDeviceDelete: (id: number) => void;
  onSettingsUpdate: (settings: Settings) => void;
  onSetActiveDeviceId: (id: number | null) => void;
  onDeviceAdd: (device: WledDevice) => void;
  showScanNetworkModal: boolean;
  setShowScanNetworkModal: (show: boolean) => void;
  setIsDiscoveryInProgress: (inProgress: boolean) => void;
  onShowSettings: () => void;
  onScanFromMain: () => void;
  onShowAddManually: () => void;
  isAnyModalOpen: boolean;
  isCustomEffectsModalOpen: boolean;
  updateChildModalState: (modalName: string, isOpen: boolean) => void;
}

/**
 * Main Kolori application screen component
 *
 * Manages WLED device control, presets, playlists, WebSocket connections,
 * and live LED view using custom hooks for better separation of concerns.
 */
function KoloriApp({
  navigation,
  devices,
  activeDeviceId,
  settings,
  onDeviceUpdate,
  onDeviceDelete,
  onSettingsUpdate,
  onSetActiveDeviceId,
  onDeviceAdd,
  showScanNetworkModal,
  setShowScanNetworkModal,
  setIsDiscoveryInProgress,
  onShowSettings,
  onScanFromMain,
  onShowAddManually,
  isAnyModalOpen,
  isCustomEffectsModalOpen,
  updateChildModalState,
}: KoloriAppProps) {
  const systemColorScheme = useColorScheme();
  const [showPlaylist, setShowPlaylist] = useState(false);

  // Calculate active device
  const activeDevice = useMemo(() => {
    return devices.find((d) => d.id === activeDeviceId) || devices[0];
  }, [devices, activeDeviceId]);

  // Initialize hooks
  const deviceCache = useDeviceCache();

  const presetManager = usePresetManager();

  // Memoized callbacks for WebSocket manager
  const loadDevicePresetsCallback = useCallback(() => {
    presetManager.loadDevicePresets(activeDevice, isAnyModalOpen);
  }, [activeDevice?.id, isAnyModalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshDeviceStateCallback = useCallback(() => {
    presetManager.refreshDeviceState(activeDevice, onDeviceUpdate);
  }, [activeDevice?.id, onDeviceUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDeviceInfoViaHttp = useCallback(async () => {
    if (!activeDevice?.isConnected) {
      logger.warn('Cannot fetch device info via HTTP - device not connected');
      return;
    }

    try {
      const deviceAddress = getDeviceAddress(activeDevice);
      const protocol = activeDevice.protocol || 'http';

      logger.log('🌐 Fetching device info and state via HTTP:', deviceAddress);

      const [infoResponse, stateResponse] = await Promise.all([
        fetch(`${protocol}://${deviceAddress}/json/info`),
        getWledState(deviceAddress!, protocol)
      ]);

      const deviceInfo = await infoResponse.json();

      logger.log('📥 Device info received via HTTP:', {
        deviceName: deviceInfo.name,
        ledCount: deviceInfo.leds?.count,
        version: deviceInfo.ver
      });

      if (stateResponse.success && stateResponse.data) {
        deviceInfo.bri = stateResponse.data.bri;
        deviceInfo.on = stateResponse.data.on;
        deviceInfo.ps = stateResponse.data.ps;

        logger.log('📊 Device state merged - brightness:', deviceInfo.bri, 'on:', deviceInfo.on);
      }

      onDeviceUpdate(activeDevice.id, { wledInfo: deviceInfo });
      logger.log('✅ Device info and state updated via HTTP fallback');
    } catch (error) {
      logger.error('❌ Failed to fetch device info via HTTP:', error);
    }
  }, [activeDevice?.id, activeDevice?.isConnected, onDeviceUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

  const websocket = useWebSocketManager({
    activeDevice,
    settings,
    isAnyModalOpen,
    isCustomEffectsModalOpen,
    onDeviceUpdate,
    onLoadDevicePresets: loadDevicePresetsCallback,
    onRefreshDeviceState: refreshDeviceStateCallback,
    onFetchDeviceInfoViaHttp: fetchDeviceInfoViaHttp
  });

  const deviceMonitor = useDeviceMonitor({
    devices,
    isAnyModalOpen,
    isCustomEffectsModalOpen,
    onDeviceUpdate
  });

  // Report playlist modal state to parent
  useEffect(() => {
    updateChildModalState('showPlaylist', showPlaylist);
  }, [showPlaylist, updateChildModalState]);

  // Clear playlist state when device changes and load cached data
  useEffect(() => {
    logger.log('🔄 Device ID changed, checking cache:', {
      activeDeviceId: activeDevice?.id,
      activeDeviceName: activeDevice?.name
    });

    // Clear current playlist
    presetManager.setCurrentPlaylist([]);

    // Clear active preset when switching devices
    if (activeDevice?.id) {
      onDeviceUpdate(activeDevice.id, { activePreset: null });
    }

    // Clear active playlist
    presetManager.setSavedPlaylists(prev =>
      prev.map(playlist => ({ ...playlist, isActive: false }))
    );

    // Check cache and load if available
    if (activeDevice?.id && activeDevice?.isConnected) {
      const cachedData = deviceCache.loadCachedDataForDevice(activeDevice.id);
      if (cachedData) {
        logger.log('📦 Found cached data, loading immediately');
        presetManager.setCustomEffects(cachedData.presets);
        presetManager.setSavedPlaylists(cachedData.playlists);

        // Fetch fresh data in background to update cache
        logger.log('🔄 Refreshing presets in background to update cache');
        presetManager.fetchWledPresets(activeDevice, (presets, playlists) => {
          return deviceCache.updateCache(activeDevice.id, presets, playlists);
        });
      } else {
        logger.log('📦 No cached data, fetching from device');
        presetManager.setCustomEffects([]);
        presetManager.setSavedPlaylists([]);

        // Fetch data immediately
        presetManager.fetchWledPresets(activeDevice, (presets, playlists) => {
          return deviceCache.updateCache(activeDevice.id, presets, playlists);
        });
      }
    } else if (activeDevice?.id) {
      // Device exists but not connected, only load from cache
      const cachedData = deviceCache.loadCachedDataForDevice(activeDevice.id);
      if (cachedData) {
        logger.log('📦 Device offline, loading cached data');
        presetManager.setCustomEffects(cachedData.presets);
        presetManager.setSavedPlaylists(cachedData.playlists);
      } else {
        logger.log('📦 Device offline, no cached data available');
        presetManager.setCustomEffects([]);
        presetManager.setSavedPlaylists([]);
      }
    }
  }, [activeDevice?.id, activeDevice?.isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load local data on mount
  useEffect(() => {
    const loadLocalData = async () => {
      const [playlists, effects] = await Promise.all([
        storage.loadFromStorage(STORAGE_KEYS.PLAYLISTS, []),
        storage.loadFromStorage(STORAGE_KEYS.CUSTOM_EFFECTS, [])
      ]);
      presetManager.setSavedPlaylists(playlists);
      presetManager.setCustomEffects(effects);
    };
    loadLocalData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      presetManager.setCurrentPlaylist([]);
      presetManager.setSavedPlaylists([]);
      presetManager.setCustomEffects([]);
      websocket.setLiveLedData([]);
      deviceCache.clearCache();
      logger.log('🧹 KoloriApp: Cleanup completed on unmount');
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoized computed values
  const isConnected = useMemo(() => activeDevice?.isConnected || false, [activeDevice?.isConnected]);
  const deviceName = useMemo(() => activeDevice?.name || 'No Device', [activeDevice?.name]);
  const activePreset = useMemo(() => activeDevice?.activePreset || null, [activeDevice?.activePreset]);
  const isDark = useMemo(() => {
    if (settings.theme === 'system') {
      return systemColorScheme === 'dark';
    }
    return settings.theme === 'dark';
  }, [settings.theme, systemColorScheme]);

  // Handle playlist selection
  const handlePlaylistSelect = useCallback(
    async (id: number) => {
      const selectedPlaylist = presetManager.savedPlaylists.find(p => p.id === id);
      if (!selectedPlaylist) return;

      logger.log('📋 Setting playlist as current:', selectedPlaylist.name);

      presetManager.setCurrentPlaylist(selectedPlaylist.items || []);
      presetManager.setSavedPlaylists(prev =>
        prev.map(playlist => ({
          ...playlist,
          isActive: playlist.id === id
        }))
      );

      // Activate playlist on WLED device
      if (activeDevice?.isConnected && selectedPlaylist.presetId) {
        logger.log('🎯 Activating playlist on WLED device with preset ID:', selectedPlaylist.presetId);

        try {
          const result = await activateWledPresetById(
            getDeviceAddress(activeDevice)!,
            selectedPlaylist.presetId,
            activeDevice.protocol || 'http'
          );

          if (result.success) {
            logger.log('✅ Playlist activated successfully');
            onDeviceUpdate(activeDeviceId!, {
              activePreset: null,
              isPlaying: true
            });
          } else {
            logger.error('❌ Failed to activate playlist:', result.message);
          }
        } catch (error) {
          logger.error('❌ Error activating playlist:', error);
        }
      } else if (!activeDevice?.isConnected) {
        logger.warn('❌ Device offline - playlist set as current but not activated');
      } else if (!selectedPlaylist.presetId) {
        logger.warn('❌ Playlist has no preset ID - cannot activate on WLED device');
      }
    },
    [presetManager.savedPlaylists, activeDevice, activeDeviceId, onDeviceUpdate]
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, isDark ? styles.statusBarDark : styles.statusBarLight]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <PresetGrid
          key={`presets-${JSON.stringify(settings.seasonalPresets)}`}
          activePreset={activePreset}
          onPresetSelect={(presetId) =>
            presetManager.handlePresetSelect(presetId, activeDevice, settings, onDeviceUpdate)
          }
          isDark={isDark}
          activeDevice={activeDevice}
          devices={devices}
          activeDeviceId={activeDeviceId}
          onSetActiveDeviceId={onSetActiveDeviceId}
          customEffects={presetManager.customEffects}
          onAddCustomEffect={(effect) => {
            const newEffects = [...presetManager.customEffects, effect];
            presetManager.setCustomEffects(newEffects);
            storage.saveToStorage(STORAGE_KEYS.CUSTOM_EFFECTS, newEffects);
          }}
          onRemoveCustomEffect={(id) => {
            const newEffects = presetManager.customEffects.filter(e => e.id !== id);
            presetManager.setCustomEffects(newEffects);
            storage.saveToStorage(STORAGE_KEYS.CUSTOM_EFFECTS, newEffects);
          }}
          savedPlaylists={presetManager.savedPlaylists}
          isLoadingPlaylists={presetManager.isLoadingPlaylists}
          onPlaylistRemove={(id) =>
            presetManager.setSavedPlaylists(prev => prev.filter(p => p.id !== id))
          }
          updateChildModalState={updateChildModalState}
          onPlaylistSelect={handlePlaylistSelect}
          setShowSettings={onShowSettings}
          onDeviceRemove={onDeviceDelete}
          onAddDevice={onShowAddManually}
          onScanForDevices={onScanFromMain}
          liveLedData={websocket.liveLedData}
          liveViewEnabled={settings.liveViewEnabled}
          onLiveViewToggle={(enabled) => onSettingsUpdate({ ...settings, liveViewEnabled: enabled })}
          onRefreshPresets={async () => {
            await Promise.all([
              presetManager.fetchWledPresets(activeDevice, (presets, playlists) => {
                return deviceCache.updateCache(activeDevice!.id, presets, playlists);
              }),
              presetManager.refreshDeviceState(activeDevice, onDeviceUpdate)
            ]);
          }}
          onSavePlaylist={(playlist) => {
            const newPlaylists = [...presetManager.savedPlaylists, playlist];
            presetManager.setSavedPlaylists(newPlaylists);
            storage.saveToStorage(STORAGE_KEYS.PLAYLISTS, newPlaylists);
          }}
          seasonalPresets={settings.seasonalPresets || []}
          onBrightnessChange={(brightness) =>
            presetManager.handleBrightnessChange(brightness, activeDevice)
          }
          liveViewLedSize={settings.liveViewLedSize}
          onDeviceUpdate={onDeviceUpdate}
        />
        <PlaylistModal
          isVisible={showPlaylist}
          onClose={() => setShowPlaylist(false)}
          isDark={isDark}
          customEffects={presetManager.customEffects}
          savedPlaylists={presetManager.savedPlaylists}
          onSavePlaylist={(playlist) =>
            presetManager.setSavedPlaylists(prev => [...prev, playlist])
          }
          onEditPlaylist={(playlist) =>
            presetManager.setSavedPlaylists(prev => prev.map(p => (p.id === playlist.id ? playlist : p)))
          }
          onDeletePlaylist={(id) =>
            presetManager.setSavedPlaylists(prev => prev.filter(p => p.id !== id))
          }
          onPlayPlaylist={handlePlaylistSelect}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default KoloriApp;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  statusBarLight: {
    backgroundColor: '#f9fafb'
  },
  statusBarDark: {
    backgroundColor: '#111827'
  }
});
