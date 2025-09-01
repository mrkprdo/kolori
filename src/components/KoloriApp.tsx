// Main Kolori App Component for React Native
// Migrated from kolori_old/src/components/KoloriApp.jsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { logger } from '../utils/logger';
import { storage, STORAGE_KEYS } from '../utils/storage';
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
  findBestDeviceAddress,
} from '../config/wledApi';
import { SEASONAL_PRESETS } from '../constants/presets';
import {
  WledDevice,
  CustomEffect,
  SavedPlaylist,
  LEDColor,
  NotificationState,
  ScheduleMode,
  Theme,
} from '../types';

import Header from './Header';
import PresetGrid from './PresetGrid';
import WelcomePage from './WelcomePage';
import UserAgreement from './UserAgreement';
import Notification from './Notification';
import SettingsModal from './SettingsModal';
import PlaylistModal from './PlaylistModal';
import DeviceForm from './DeviceForm';

export default function KoloriApp() {
  // State management with AsyncStorage initialization
  const [theme, setTheme] = useState<Theme>('system');
  const [devices, setDevices] = useState<WledDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<number | null>(null);
  const [userAgreementAccepted, setUserAgreementAccepted] = useState<boolean | any>(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<any[]>([]);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('all-day');
  const [customEffects, setCustomEffects] = useState<CustomEffect[]>([]);
  
  const [lastScheduleCheck, setLastScheduleCheck] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [notification, setNotification] = useState<NotificationState>({
    isVisible: false,
    type: 'success',
    title: '',
    message: '',
  });
  const [liveLedData, setLiveLedData] = useState<LEDColor[]>([]);
  const [liveViewEnabled, setLiveViewEnabled] = useState(true);

  // Use ref to track current devices for heartbeat monitoring
  const devicesRef = useRef(devices);
  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  // Initialize data from AsyncStorage
  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.log('🎉 KoloriApp initializing...');
        
        const [
          storedDevices,
          storedActiveDeviceId,
          storedUserAgreement,
          storedScheduleMode,
          storedPlaylists,
          storedCustomEffects,
          storedLiveView
        ] = await Promise.all([
          storage.loadFromStorage(STORAGE_KEYS.DEVICES, []),
          storage.loadFromStorage(STORAGE_KEYS.ACTIVE_DEVICE, null),
          storage.loadFromStorage(STORAGE_KEYS.USER_AGREEMENT, false),
          storage.loadFromStorage(STORAGE_KEYS.SCHEDULE_MODE, 'all-day'),
          storage.loadFromStorage(STORAGE_KEYS.PLAYLISTS, []),
          storage.loadFromStorage(STORAGE_KEYS.CUSTOM_EFFECTS, []),
          storage.loadFromStorage(STORAGE_KEYS.LIVE_VIEW_ENABLED, true),
        ]);

        setDevices(storedDevices);
        setActiveDeviceId(storedActiveDeviceId);
        setUserAgreementAccepted(storedUserAgreement);
        setScheduleMode(storedScheduleMode as ScheduleMode);
        setSavedPlaylists(storedPlaylists);
        setCustomEffects(storedCustomEffects);
        setLiveViewEnabled(storedLiveView);

        logger.log('✅ KoloriApp initialized successfully');
      } catch (error) {
        logger.error('❌ Failed to initialize KoloriApp:', error);
      }
    };

    initializeApp();
  }, []);

  // Computed values
  const activeDevice = devices.find((d) => d.id === activeDeviceId) || devices[0];
  const isConnected = activeDevice?.isConnected || false;
  const deviceName = activeDevice?.name || 'No Device';
  const activePreset = activeDevice?.activePreset || null;
  const isPlaying = activeDevice?.isPlaying || false;
  const isDark = theme === 'dark' || (theme === 'system' && true); // TODO: Add proper system theme detection

  // Save to AsyncStorage whenever state changes
  useEffect(() => {
    storage.saveToStorage(STORAGE_KEYS.DEVICES, devices);
  }, [devices]);

  useEffect(() => {
    storage.saveToStorage(STORAGE_KEYS.ACTIVE_DEVICE, activeDeviceId);
  }, [activeDeviceId]);

  useEffect(() => {
    storage.saveToStorage(STORAGE_KEYS.USER_AGREEMENT, userAgreementAccepted);
  }, [userAgreementAccepted]);

  useEffect(() => {
    storage.saveToStorage(STORAGE_KEYS.SCHEDULE_MODE, scheduleMode);
  }, [scheduleMode]);

  useEffect(() => {
    storage.saveToStorage(STORAGE_KEYS.PLAYLISTS, savedPlaylists);
  }, [savedPlaylists]);

  useEffect(() => {
    storage.saveToStorage(STORAGE_KEYS.CUSTOM_EFFECTS, customEffects);
  }, [customEffects]);

  useEffect(() => {
    storage.saveToStorage(STORAGE_KEYS.LIVE_VIEW_ENABLED, liveViewEnabled);
  }, [liveViewEnabled]);

  // Validate activeDeviceId when devices change
  useEffect(() => {
    if (devices.length > 0) {
      const activeDeviceExists = devices.some(
        (device) => device.id === activeDeviceId
      );
      if (!activeDeviceExists) {
        setActiveDeviceId(devices[0].id);
      }
    } else {
      setActiveDeviceId(null);
    }
  }, [devices, activeDeviceId]);

  // Device heartbeat monitoring - check every 10 seconds
  useEffect(() => {
    if (devices.length === 0) return;

    const checkAllDevicesHeartbeat = async () => {
      const currentDevices = devicesRef.current;
      if (currentDevices.length === 0) return;

      const updatedDevices: WledDevice[] = [];

      for (const device of currentDevices) {
        const heartbeatResult = await checkWledHeartbeat(
          device.ip,
          device.protocol || 'http'
        );
        const wasConnected = device.isConnected;
        const isConnected = heartbeatResult.online;

        // Log connection status changes
        if (wasConnected && !isConnected) {
          logger.log(`📱 Device ${device.name} went offline`);
        } else if (!wasConnected && isConnected) {
          logger.log(`📱 Device ${device.name} came online`);
        }

        updatedDevices.push({
          ...device,
          isConnected,
          lastHeartbeat: new Date().toISOString(),
        });
      }

      setDevices(updatedDevices);
    };

    // Initial heartbeat check
    checkAllDevicesHeartbeat();

    // Set up interval for heartbeat checks every 10 seconds
    const heartbeatInterval = setInterval(checkAllDevicesHeartbeat, 10000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [devices.length]);

  // Helper to get the best device address (prioritizes bestAddress, falls back to IP)
  const getDeviceAddress = (device: WledDevice | undefined): string | null => {
    if (!device) return null;
    return device.bestAddress || device.ip;
  };

  // Device management helper function
  const updateDevice = (deviceId: number, updates: Partial<WledDevice>) => {
    setDevices((prevDevices) =>
      prevDevices.map((d) => (d.id === deviceId ? { ...d, ...updates } : d))
    );
  };

  // WebSocket state and effects
  useEffect(() => {
    let wsConnectTimer: NodeJS.Timeout | null = null;

    if (
      activeDevice &&
      getDeviceAddress(activeDevice) &&
      activeDevice.isConnected
    ) {
      setWebSocketCallbacks({
        onOpen: () => {
          // Update device connection status to reflect WebSocket connection
          setDevices((prevDevices) =>
            prevDevices.map((d) =>
              d.id === activeDevice.id ? { ...d, isConnected: true } : d
            )
          );
          
          // Set live view state when WebSocket connects (with small delay)
          setTimeout(() => {
            sendWebSocketCommand({ lv: liveViewEnabled });
          }, 100);
        },
        onMessage: (data) => {
          if (data instanceof ArrayBuffer) {
            // Handle binary data (live LED data)
            const byteArray = new Uint8Array(data);
            const colors: LEDColor[] = [];
            let bytesPerLed = 3; // Default to RGB

            // Heuristic: if array length is divisible by 4, it might be RGBW
            if (byteArray.length > 0 && byteArray.length % 4 === 0) {
              bytesPerLed = 4;
            }

            for (let i = 0; i < byteArray.length; i += bytesPerLed) {
              colors.push({
                r: byteArray[i + 2], // Red
                g: byteArray[i],     // Green  
                b: byteArray[i + 1], // Blue
                w: bytesPerLed === 4 ? byteArray[i + 3] : undefined, // Include W if RGBW
              });
            }
            setLiveLedData(colors);
          } else {
            // Handle JSON data
            // Update active device state based on WebSocket message
            setDevices((prevDevices) =>
              prevDevices.map((d) =>
                d.id === activeDevice.id
                  ? { ...d, wledInfo: data, isConnected: true }
                  : d
              )
            );
            // Update device state based on incoming WLED state
            if (data.state) {
              const newActivePreset =
                data.state.ps !== undefined && data.state.ps !== -1
                  ? `wled_${data.state.ps}` // Format to match preset IDs
                  : null;
              updateDevice(activeDevice.id, {
                activePreset: newActivePreset,
                isPlaying: data.state.pl > -1,
              });
            }
          }
        },
        onClose: (event) => {
          // Only mark as disconnected if it wasn't a manual close
          if (event.code !== 1000) {
            setDevices((prevDevices) =>
              prevDevices.map((d) =>
                d.id === activeDevice.id ? { ...d, isConnected: false } : d
              )
            );
          }
        },
        onError: (error) => {
          // Mark device as disconnected on error
          setDevices((prevDevices) =>
            prevDevices.map((d) =>
              d.id === activeDevice.id ? { ...d, isConnected: false } : d
            )
          );
          showNotification(
            'error',
            'Connection Lost',
            `WebSocket connection to ${activeDevice.name} failed.`
          );
        },
      });

      // Connect with a short delay to ensure callbacks are set
      wsConnectTimer = setTimeout(() => {
        const wsProtocol = activeDevice.protocol === 'https' ? 'wss' : 'ws';
        connectWebSocket(getDeviceAddress(activeDevice)!, wsProtocol);
      }, 1000);
    }

    return () => {
      if (wsConnectTimer) {
        clearTimeout(wsConnectTimer);
      }
      disconnectWebSocket();
      // Clear live LED data when disconnecting
      setLiveLedData([]);
    };
  }, [activeDevice?.id, activeDevice?.ip, activeDevice?.protocol]);

  // Schedule helper functions
  const shouldLightsBeOn = (): boolean => {
    if (scheduleMode === 'all-day') {
      return true; // Always on
    }

    const now = new Date();
    const currentHour = now.getHours();

    if (scheduleMode === 'day') {
      // Day mode: 7am to 7pm (7:00 - 19:00)
      return currentHour >= 7 && currentHour < 19;
    } else if (scheduleMode === 'night') {
      // Night mode: 7pm to 7am (19:00 - 07:00)
      return currentHour >= 19 || currentHour < 7;
    }

    return true; // Default to on if unknown mode
  };

  const checkAndApplySchedule = async () => {
    if (!activeDevice || !activeDevice.isConnected) {
      return;
    }

    const shouldBeOn = shouldLightsBeOn();
    const currentTime = new Date().toISOString();

    // Only apply if this is a new schedule decision (avoid spam)
    if (
      lastScheduleCheck &&
      Math.abs(new Date().getTime() - new Date(lastScheduleCheck).getTime()) < 60000
    ) {
      return;
    }

    setLastScheduleCheck(currentTime);

    try {
      const deviceAddress = getDeviceAddress(activeDevice);
      if (!deviceAddress) return;

      if (shouldBeOn) {
        const result = await turnWledOn(deviceAddress, activeDevice.protocol || 'http');
        if (!result.success) {
          logger.error(`❌ Schedule: Failed to turn lights ON - ${result.message}`);
        }
      } else {
        const result = await turnWledOff(deviceAddress, activeDevice.protocol || 'http');
        if (!result.success) {
          logger.error(`❌ Schedule: Failed to turn lights OFF - ${result.message}`);
        }
      }
    } catch (error) {
      logger.error('📅 Schedule enforcement error:', error);
    }
  };

  // Schedule monitoring - check every minute to enforce schedule
  useEffect(() => {
    if (scheduleMode === 'all-day') return;

    // Initial check
    checkAndApplySchedule();

    // Set up interval to check schedule every minute
    const scheduleInterval = setInterval(checkAndApplySchedule, 60000);

    return () => {
      clearInterval(scheduleInterval);
    };
  }, [scheduleMode, activeDevice?.id, activeDevice?.isConnected]);

  // Notification helper
  const showNotification = (type: NotificationState['type'], title: string, message: string) => {
    logger.log('📢 Notification:', type, title, message);

    // Clear any existing notification first
    setNotification({
      isVisible: false,
      type: 'success',
      title: '',
      message: '',
    });

    // Show new notification after a brief delay to ensure clean state
    setTimeout(() => {
      setNotification({
        isVisible: true,
        type,
        title,
        message,
      });
    }, 100);
  };

  // Device validation function with mDNS support
  const validateDevice = async (ip?: string, mdns?: string, protocol = 'http') => {
    try {
      logger.log('🔍 Testing device connectivity:', { ip, mdns, protocol });

      const result = await findBestDeviceAddress(ip, mdns, protocol);

      if (result.success) {
        logger.log(
          '✅ Device found:',
          result.bestAddress,
          result.deviceInfo?.name
        );
        return {
          success: true,
          bestAddress: result.bestAddress,
          responseTime: result.responseTime,
          deviceInfo: result.deviceInfo,
          message: `WLED device found: ${
            result.deviceInfo?.name || 'Unknown'
          } via ${result.bestAddress} (${result.responseTime}ms)`,
          allResults: result.allResults,
        };
      } else {
        logger.log('❌ Device validation failed:', result.message);
        return {
          success: false,
          message: result.details || result.message,
        };
      }
    } catch (error: any) {
      logger.error('💥 Device validation error:', error);
      return {
        success: false,
        message: `Validation failed: ${error.message}`,
      };
    }
  };

  // Preset application function
  const applyPreset = async (presetId: string | number) => {
    logger.log(
      '🎨 Applying preset:',
      presetId,
      'to device:',
      activeDevice?.name
    );

    // Check if active device is connected
    if (!activeDevice || !activeDevice.isConnected) {
      showNotification(
        'error',
        'Device Offline',
        `${activeDevice?.name || 'Device'} is disconnected. Please check your device connection.`
      );
      return;
    }

    // First check seasonal presets
    const seasonalPreset = SEASONAL_PRESETS.find((p) => p.id.toString() === presetId.toString());

    if (seasonalPreset) {
      const deviceAddress = getDeviceAddress(activeDevice);
      if (!deviceAddress) return;

      // Call WLED API to activate preset
      const result = await activateWledPreset(
        deviceAddress,
        seasonalPreset.name,
        activeDevice.protocol || 'http'
      );

      if (result.success) {
        updateDevice(activeDevice.id, { activePreset: seasonalPreset.id.toString() });
        sendWebSocketCommand({ lv: true }); // Send live view command
      } else {
        logger.error(`Failed to activate preset: ${result.message}`);
        showNotification('error', 'Preset Failed', result.message);
      }
      return;
    }

    // Check custom effects
    const customEffect = customEffects.find((e) => e.id.toString() === presetId.toString());

    if (customEffect) {
      const deviceAddress = getDeviceAddress(activeDevice);
      if (!deviceAddress) return;

      // Use preset ID if available, otherwise fall back to effect/palette activation
      let result;
      if (customEffect.presetId) {
        result = await activateWledPresetById(
          deviceAddress,
          customEffect.presetId,
          activeDevice.protocol || 'http'
        );
      } else {
        // Fallback for effects created before preset integration
        result = await activateWledEffect(
          deviceAddress,
          customEffect.effectId,
          customEffect.paletteId,
          activeDevice.protocol || 'http'
        );
      }

      if (result.success) {
        updateDevice(activeDevice.id, { activePreset: customEffect.id.toString() });
        sendWebSocketCommand({ lv: true }); // Send live view command
      } else {
        logger.error(`Failed to activate custom effect: ${result.message}`);
        showNotification('error', 'Effect Failed', result.message);
      }
      return;
    }

    // Unknown preset ID
    updateDevice(activeDevice.id, { activePreset: presetId.toString() });
  };

  // Handler functions
  const handleAddCustomEffect = (newEffect: CustomEffect) => {
    setCustomEffects((prevEffects) => {
      const updatedEffects = [...prevEffects, newEffect];
      storage.saveToStorage(STORAGE_KEYS.CUSTOM_EFFECTS, updatedEffects);
      return updatedEffects;
    });
  };

  const handleRemoveCustomEffect = async (effectId: number) => {
    const effect = customEffects.find((e) => e.id === effectId);
    if (!effect) {
      logger.warn(`Cannot remove effect: No effect found with id ${effectId}`);
      return;
    }

    if (!activeDevice?.isConnected) {
      logger.warn('Device offline - removing effect locally only');
    }

    // Remove from local state
    setCustomEffects((prev) => {
      const updated = prev.filter((e) => e.id !== effectId);
      logger.log(`Removed custom effect "${effect.name}" from local state`);
      storage.saveToStorage(STORAGE_KEYS.CUSTOM_EFFECTS, updated);
      return updated;
    });
  };

  const handleUpdateCustomEffects = (updatedEffects: CustomEffect[]) => {
    setCustomEffects(updatedEffects);
    storage.saveToStorage(STORAGE_KEYS.CUSTOM_EFFECTS, updatedEffects);
  };

  const editPlaylist = (playlist: SavedPlaylist) => {
    // Load playlist items into current playlist for editing
    const playlistEffects = playlist.items.map((item) => ({
      ...item,
      playlistItemId: `${item.name}_${Date.now()}`,
    }));
    setCurrentPlaylist(playlistEffects);
    setShowPlaylist(true);

    // Remove the playlist from saved playlists while editing
    setSavedPlaylists((prev) => prev.filter((p) => p.id !== playlist.id));
  };

  const removePlaylist = async (playlistId: number) => {
    const playlist = savedPlaylists.find((p) => p.id === playlistId);
    if (!playlist) {
      logger.error('Playlist not found:', playlistId);
      return;
    }

    if (!activeDevice?.isConnected) {
      showNotification(
        'error',
        'Device Offline',
        'Connect to a WLED device to delete playlists from the device.'
      );
      // Still allow local removal even if device is offline
      setSavedPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      return;
    }

    // Always remove from local state
    setSavedPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  };

  const applyPlaylist = async (playlistId: number) => {
    const playlistToActivate = savedPlaylists.find((p) => p.id === playlistId);

    if (!playlistToActivate) {
      logger.error('Playlist not found:', playlistId);
      showNotification(
        'error',
        'Playlist Error',
        'Selected playlist not found.'
      );
      return;
    }

    if (!activeDevice?.isConnected) {
      showNotification(
        'error',
        'Device Offline',
        `${
          activeDevice?.name || 'Device'
        } is disconnected. Please check your device connection.`
      );
      return;
    }

    // For now, just update the UI state
    updateDevice(activeDevice.id, {
      activePreset: playlistToActivate.id.toString(),
      isPlaying: true,
    });
    showNotification(
      'success',
      'Playlist Activated',
      `"${playlistToActivate.name}" is now playing.`
    );
  };

  const handleLiveViewToggle = (enabled: boolean) => {
    setLiveViewEnabled(enabled);
    if (enabled) {
      // Enable live view
      sendWebSocketCommand({ lv: true });
    } else {
      // Disable live view
      sendWebSocketCommand({ lv: false });
      // Clear existing LED data
      setLiveLedData([]);
    }
  };

  const closeNotification = () => {
    setNotification({
      isVisible: false,
      type: 'success',
      title: '',
      message: '',
    });
  };

  // Handle user agreement
  const handleAcceptAgreement = () => {
    logger.log('✅ User agreement accepted');
    const agreementData = {
      accepted: true,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
    setUserAgreementAccepted(agreementData);
    storage.saveToStorage(STORAGE_KEYS.USER_AGREEMENT, agreementData);
  };

  const handleRejectAgreement = () => {
    logger.log('❌ User agreement rejected');
    // Clear any stored data
    storage.removeFromStorage(STORAGE_KEYS.USER_AGREEMENT);
    storage.removeFromStorage(STORAGE_KEYS.DEVICES);
    storage.removeFromStorage(STORAGE_KEYS.ACTIVE_DEVICE);

    // On React Native, we can't close the app, so just show a message
    showNotification(
      'error',
      'Terms Declined',
      'You must accept the terms to use Kolori.'
    );
  };

  // Handle first device addition
  const handleAddFirstDevice = async (deviceData?: any) => {
    if (deviceData && deviceData.autoAdd) {
      await handleAutoAddDevice(deviceData);
    } else {
      // Regular flow - show settings modal
      setShowSettings(true);
    }
  };

  // Auto-add device handler
  const handleAutoAddDevice = async (deviceData: any) => {
    logger.log('🚀 Auto-adding discovered device:', deviceData.name, deviceData.ip);
    
    try {
      // Check for duplicate IP only
      const duplicateIP = devices.find(
        (device) => device.ip === deviceData.ip
      );
      
      if (duplicateIP) {
        logger.warn('Device already exists with IP:', deviceData.ip);
        return;
      }
      
      // Validate device connection
      const validation = await validateDevice(
        deviceData.ip,
        deviceData.mdns || '',
        deviceData.protocol || 'http'
      );
      
      if (!validation.success) {
        logger.error('Device validation failed:', validation.message);
        return;
      }
      
      // Create device object
      const device: WledDevice = {
        id: Date.now(),
        name: deviceData.name,
        ip: deviceData.ip || validation.bestAddress,
        mdns: deviceData.mdns || '',
        protocol: deviceData.protocol || 'http',
        bestAddress: validation.bestAddress,
        isConnected: true,
        autoBrightness: true,
        maxBrightness: 80,
        activePreset: null,
        isPlaying: false,
        wledInfo: validation.deviceInfo,
        responseTime: validation.responseTime,
      };
      
      // Add device to list
      const updatedDevices = [...devices, device];
      setDevices(updatedDevices);
      
      // Set as active device if it's the first one
      if (devices.length === 0) {
        setActiveDeviceId(device.id);
      }
      
      logger.log('✅ Device auto-added successfully:', device.name);
      
    } catch (error: any) {
      logger.error('❌ Error auto-adding device:', error);
    }
  };

  // Show user agreement if not accepted
  if (!userAgreementAccepted) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <UserAgreement
          isDark={isDark}
          onAccept={handleAcceptAgreement}
          onReject={handleRejectAgreement}
        />
      </SafeAreaProvider>
    );
  }


  // Show welcome page if no devices
  if (devices.length === 0) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <WelcomePage
          isDark={isDark}
          onAddDevice={() => setShowDeviceForm(true)}
          devices={devices}
        />
        
        {/* Device Form Modal */}
        <DeviceForm
          isVisible={showDeviceForm}
          onClose={() => setShowDeviceForm(false)}
          onAddDevice={(device) => {
            setDevices(prev => [...prev, device]);
            setActiveDeviceId(device.id);
            setShowDeviceForm(false);
            showNotification('success', 'Device Added', `Successfully added ${device.name}`);
          }}
          isDark={isDark}
          existingDevices={devices}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#f9fafb' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        {/* Header */}
        <Header
          deviceName={deviceName}
          isConnected={isConnected}
          devices={devices}
          activeDeviceId={activeDeviceId}
          setActiveDeviceId={setActiveDeviceId}
          setShowSettings={setShowSettings}
          isDark={isDark}
          scheduleMode={scheduleMode}
        />

        {/* Main Content */}
        <PresetGrid
          activePreset={activePreset}
          onPresetSelect={applyPreset}
          isDark={isDark}
          currentPlaylist={currentPlaylist}
          onShowPlaylist={() => setShowPlaylist(true)}
          activeDevice={activeDevice}
          customEffects={customEffects}
          onAddCustomEffect={handleAddCustomEffect}
          onRemoveCustomEffect={handleRemoveCustomEffect}
          onCustomEffectUpdate={handleUpdateCustomEffects}
          savedPlaylists={savedPlaylists}
          onPlaylistEdit={editPlaylist}
          onPlaylistRemove={removePlaylist}
          onPlaylistSelect={applyPlaylist}
          setShowSettings={setShowSettings}
          liveLedData={liveLedData}
          onLiveViewToggle={handleLiveViewToggle}
        />

        {/* Notification */}
        <Notification
          isVisible={notification.isVisible}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={closeNotification}
          autoClose={true}
          duration={4000}
          isDark={isDark}
        />

        {/* Settings Modal */}
        <SettingsModal
          isVisible={showSettings}
          onClose={() => setShowSettings(false)}
          isDark={isDark}
          theme={theme}
          onThemeChange={setTheme}
          scheduleMode={scheduleMode}
          onScheduleModeChange={setScheduleMode}
          devices={devices}
          onDeviceUpdate={(deviceId, updates) => {
            setDevices(prev => prev.map(d => 
              d.id === deviceId ? { ...d, ...updates } : d
            ));
          }}
          onDeviceRemove={(deviceId) => {
            setDevices(prev => prev.filter(d => d.id !== deviceId));
            if (activeDeviceId === deviceId) {
              setActiveDeviceId(null);
            }
          }}
          onAddDevice={() => {
            setShowSettings(false);
            setShowDeviceForm(true);
          }}
        />

        {/* Playlist Modal */}
        <PlaylistModal
          isVisible={showPlaylist}
          onClose={() => setShowPlaylist(false)}
          isDark={isDark}
          customEffects={customEffects}
          savedPlaylists={savedPlaylists}
          onSavePlaylist={(playlist) => {
            setSavedPlaylists(prev => [...prev, playlist]);
            setShowPlaylist(false);
            showNotification('success', 'Playlist Created', `Created "${playlist.name}"`);
          }}
          onEditPlaylist={(playlist) => {
            setSavedPlaylists(prev => prev.map(p => 
              p.id === playlist.id ? playlist : p
            ));
            setShowPlaylist(false);
            showNotification('success', 'Playlist Updated', `Updated "${playlist.name}"`);
          }}
          onDeletePlaylist={(playlistId) => {
            setSavedPlaylists(prev => prev.filter(p => p.id !== playlistId));
            showNotification('success', 'Playlist Deleted', 'Playlist removed');
          }}
          onPlayPlaylist={(playlistId) => {
            applyPlaylist(playlistId);
            setShowPlaylist(false);
          }}
        />

        {/* Device Form Modal */}
        <DeviceForm
          isVisible={showDeviceForm}
          onClose={() => setShowDeviceForm(false)}
          onAddDevice={(device) => {
            setDevices(prev => [...prev, device]);
            setActiveDeviceId(device.id);
            setShowDeviceForm(false);
            showNotification('success', 'Device Added', `Successfully added ${device.name}`);
          }}
          isDark={isDark}
          existingDevices={devices}
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