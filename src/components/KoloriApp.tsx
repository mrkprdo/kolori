// Main Kolori App Component for React Native
import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { logger } from '../utils/logger';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { deviceMonitor, DeviceStatus } from '../services/deviceMonitor';
import {
  connectWebSocket,
  disconnectWebSocket,
  setWebSocketCallbacks,
  sendWebSocketCommand,
} from '../utils/wledWebSocket';
import {
  activateWledPreset,
  activateWledPresetById,
  activateWledEffect,
  checkWledHeartbeat,
  turnWledOn,
  turnWledOff,
} from '../config/wledApi';
import { SEASONAL_PRESETS } from '../constants/presets';
import {
  Device as WledDevice,
  Settings,
  CustomEffect,
  SavedPlaylist,
  LEDColor,
  NotificationState,
} from '../types';

import Header from './Header';
import PresetGrid from './PresetGrid';
import Notification from './Notification';
import PlaylistModal from './PlaylistModal';

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
}

export default function KoloriApp({
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
}: KoloriAppProps) {
  const [currentPlaylist, setCurrentPlaylist] = useState<any[]>([]);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [customEffects, setCustomEffects] = useState<CustomEffect[]>([]);
  
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [notification, setNotification] = useState<NotificationState>({ isVisible: false, type: 'success', title: '', message: '' });
  const [liveLedData, setLiveLedData] = useState<LEDColor[]>([]);
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);
  
  const devicesRef = useRef(devices);
  useEffect(() => { devicesRef.current = devices; }, [devices]);

  useEffect(() => {
    const loadLocalData = async () => {
      const [playlists, effects] = await Promise.all([
        storage.loadFromStorage(STORAGE_KEYS.PLAYLISTS, []),
        storage.loadFromStorage(STORAGE_KEYS.CUSTOM_EFFECTS, []),
      ]);
      setSavedPlaylists(playlists);
      setCustomEffects(effects);
    };
    loadLocalData();
  }, []);

  // Device monitoring setup
  useEffect(() => {
    if (devices.length === 0) {
      deviceMonitor.stop();
      return;
    }

    // Set up status callback
    const handleStatusUpdate = (statuses: DeviceStatus[]) => {
      setDeviceStatuses(statuses);
      
      // Update device connection status
      statuses.forEach(status => {
        const device = devices.find(d => d.id === status.deviceId);
        if (device && device.isConnected !== status.isOnline) {
          onDeviceUpdate(device.id, { isConnected: status.isOnline });
        }
      });
    };

    deviceMonitor.addStatusCallback(handleStatusUpdate);
    deviceMonitor.start(devices);

    // Cleanup on unmount
    return () => {
      deviceMonitor.removeStatusCallback(handleStatusUpdate);
      deviceMonitor.stop();
    };
  }, [devices, onDeviceUpdate]);

  // WebSocket connection and message handling
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    if (activeDevice && activeDevice.ip) {
      connectWebSocket(activeDevice.ip);

      setWebSocketCallbacks({
        onMessage: (message) => {
          if (isMounted && message.type === 'liveLedData') {
            setLiveLedData(message.data);
          }
          // Handle other message types if necessary
        },
        onOpen: () => {
          logger.log('WebSocket opened for live view');
          // Request live LED data when connected and live view is enabled
          if (isMounted && settings.liveViewEnabled) {
            sendWebSocketCommand({ lv: true });
          }
        },
        onClose: () => {
          logger.log('WebSocket closed for live view');
          if (isMounted) {
            setLiveLedData([]); // Clear live data on disconnect
          }
        },
        onError: (error) => {
          logger.error('WebSocket error for live view:', error);
          if (isMounted) {
            setLiveLedData([]); // Clear live data on error
          }
        },
      });
    } else {
      disconnectWebSocket();
      if (isMounted) {
        setLiveLedData([]); // Clear live data if no active device
      }
    }

    

    return () => {
      isMounted = false; // Set flag to false on unmount
      disconnectWebSocket();
    };
  }, [activeDevice, settings.liveViewEnabled]); // Reconnect if activeDevice or liveViewEnabled changes

  const activeDevice = devices.find((d) => d.id === activeDeviceId) || devices[0];
  const isConnected = activeDevice?.isConnected || false;
  const deviceName = activeDevice?.name || 'No Device';
  const activePreset = activeDevice?.activePreset || null;
  const isDark = settings.theme === 'dark';

  const getDeviceAddress = (device: WledDevice | undefined): string | null => device?.bestAddress || device?.ip || null;

  const showNotification = (type: NotificationState['type'], title: string, message: string) => {
    setNotification({ isVisible: true, type, title, message });
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#f9fafb' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Header
          deviceName={deviceName}
          isConnected={isConnected}
          devices={devices}
          activeDeviceId={activeDeviceId}
          setActiveDeviceId={onSetActiveDeviceId}
          setShowSettings={onShowSettings}
          isDark={isDark}
          scheduleMode={settings.scheduleMode}
        />
        <PresetGrid
          activePreset={activePreset}
          onPresetSelect={() => {}}
          isDark={isDark}
          currentPlaylist={currentPlaylist}
          onShowPlaylist={() => setShowPlaylist(true)}
          activeDevice={activeDevice}
          customEffects={customEffects}
          onAddCustomEffect={(effect) => setCustomEffects(prev => [...prev, effect])}
          onRemoveCustomEffect={(id) => setCustomEffects(prev => prev.filter(e => e.id !== id))}
          onCustomEffectUpdate={setCustomEffects}
          savedPlaylists={savedPlaylists}
          onPlaylistEdit={(playlist) => {}}
          onPlaylistRemove={(id) => setSavedPlaylists(prev => prev.filter(p => p.id !== id))}
          onPlaylistSelect={(id) => {}}
          setShowSettings={onShowSettings}
          liveLedData={liveLedData}
          onLiveViewToggle={(enabled) => onSettingsUpdate({ ...settings, liveViewEnabled: enabled })}
        />
        <Notification
          {...notification}
          onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
          autoClose={true}
          duration={4000}
          isDark={isDark}
        />
        <PlaylistModal
          isVisible={showPlaylist}
          onClose={() => setShowPlaylist(false)}
          isDark={isDark}
          customEffects={customEffects}
          savedPlaylists={savedPlaylists}
          onSavePlaylist={(playlist) => setSavedPlaylists(prev => [...prev, playlist])}
          onEditPlaylist={(playlist) => setSavedPlaylists(prev => prev.map(p => p.id === playlist.id ? playlist : p))}
          onDeletePlaylist={(id) => setSavedPlaylists(prev => prev.filter(p => p.id !== id))}
          onPlayPlaylist={(id) => {}}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
