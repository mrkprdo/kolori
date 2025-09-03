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
  getWledPresets, // Added getWledPresets
  generatePresetGradient,
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
  
  // Debug logging for playlist state changes
  useEffect(() => {
    logger.log('📋 Current playlist state changed:', 
      `${currentPlaylist.length} items, device ${activeDeviceId} (${activeDevice?.name})`);
  }, [currentPlaylist, activeDeviceId, activeDevice?.name]);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [customEffects, setCustomEffects] = useState<CustomEffect[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  
  // Cache for device-specific presets and playlists
  const deviceCacheRef = useRef<{
    [deviceId: number]: {
      presets: CustomEffect[];
      playlists: SavedPlaylist[];
      presetsHash: string;
      playlistsHash: string;
      lastFetched: number;
    }
  }>({});
  
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [notification, setNotification] = useState<NotificationState>({ isVisible: false, type: 'success', title: '', message: '' });
  const [liveLedData, setLiveLedData] = useState<LEDColor[]>([]);
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);
  const [currentWebSocketDeviceId, setCurrentWebSocketDeviceId] = useState<number | null>(null);
  
  const devicesRef = useRef(devices);
  const settingsRef = useRef(settings);
  const activeDeviceRef = useRef<WledDevice | undefined>(undefined);
  
  // Helper function to generate hash for comparing data changes
  const generateHash = (data: any[]): string => {
    return JSON.stringify(data.map(item => ({
      id: item.id,
      name: item.name,
      // Include key properties that indicate changes
      ...(item.items && { itemsLength: item.items.length }),
      ...(item.gradient && { gradient: item.gradient }),
      ...(item.isWledPreset !== undefined && { isWledPreset: item.isWledPreset })
    }))).substring(0, 100); // Use first 100 chars as hash
  };
  
  // Helper function to check if cached data is different from new data
  const hasDataChanged = (newData: any[], cachedHash: string): boolean => {
    const newHash = generateHash(newData);
    return newHash !== cachedHash;
  };
  
  // Helper function to load cached data for device
  const loadCachedDataForDevice = (deviceId: number | undefined) => {
    if (!deviceId || !deviceCacheRef.current[deviceId]) {
      logger.log('📦 No cached data for device:', deviceId);
      return;
    }
    
    const cached = deviceCacheRef.current[deviceId];
    const cacheAge = Date.now() - cached.lastFetched;
    
    logger.log('📦 Loading cached data for device:', deviceId, 
      `${cached.presets.length} presets, ${cached.playlists.length} playlists (${Math.round(cacheAge/1000)}s old)`);
    
    setCustomEffects(cached.presets);
    setSavedPlaylists(cached.playlists.map(playlist => ({ ...playlist, isActive: false })));
  };
  
  useEffect(() => { devicesRef.current = devices; }, [devices]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  // Calculate activeDevice first, before any useEffects that depend on it
  const activeDevice = devices.find((d) => d.id === activeDeviceId) || devices[0];
  
  useEffect(() => { 
    activeDeviceRef.current = activeDevice;
    logger.log('🔄 activeDeviceRef updated:', {
      deviceId: activeDevice?.id,
      deviceName: activeDevice?.name,
      isConnected: activeDevice?.isConnected
    });
  }, [activeDevice?.id, activeDevice?.name, activeDevice?.isConnected]); // Only update when meaningful properties change

  // Clear playlist state when device changes and load cached data if available
  useEffect(() => {
    logger.log('🔄 Device ID changed, checking cache:', {
      activeDeviceId: activeDevice?.id,
      activeDeviceName: activeDevice?.name,
      currentPlaylistLength: currentPlaylist.length
    });
    
    // Clear current playlist state
    setCurrentPlaylist([]);
    
    // Check if we have cached data for this device
    if (activeDevice?.id && deviceCacheRef.current[activeDevice.id]) {
      logger.log('📦 Found cached data for device, loading immediately');
      loadCachedDataForDevice(activeDevice.id);
      setIsLoadingPlaylists(false);
    } else {
      // No cached data, show loading and clear state for smooth transition
      logger.log('📦 No cached data, clearing state for fresh fetch');
      setIsLoadingPlaylists(true);
      setCustomEffects([]);
      setSavedPlaylists([]);
      
      // Brief delay for smooth transition
      setTimeout(() => {
        if (!activeDevice?.id || !deviceCacheRef.current[activeDevice.id]) {
          setIsLoadingPlaylists(false);
        }
      }, 300);
    }
  }, [activeDevice?.id]); // Only trigger when device ID changes

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

  // Clear Live View UI when device changes (WebSocket will handle the rest)
  useEffect(() => {
    // Aggressively clear all live data when device changes
    setLiveLedData([]);
    logger.log('🧹 KoloriApp: Device changed - CLEARED Live View UI', {
      deviceId: activeDevice?.id,
      deviceName: activeDevice?.name,
      isConnected: activeDevice?.isConnected
    });
  }, [activeDevice?.id]);

  // Ensure WebSocket connects immediately on app mount if there's an active device
  useEffect(() => {
    if (activeDevice && activeDevice.isConnected && devices.length > 0) {
      const deviceAddress = getDeviceAddress(activeDevice);
      logger.log('KoloriApp: App mounted with active device, ensuring WebSocket connection', {
        deviceName: activeDevice.name,
        deviceAddress,
        isConnected: activeDevice.isConnected
      });
    }
  }, []); // Empty dependency array - runs once on mount

  // Global WebSocket connection manager - maintains single connection to active device
  useEffect(() => {
    let isMounted = true;
    
    logger.log('🔄 WebSocket useEffect triggered with:', {
      activeDeviceId: activeDevice?.id,
      activeDeviceName: activeDevice?.name,
      isConnected: activeDevice?.isConnected,
      currentWebSocketDeviceId: currentWebSocketDeviceId
    });

    // FIRST: If we have an active connection, disable live view on previous device before switching
    if (currentWebSocketDeviceId !== null) {
      logger.log('🔄 Disabling live view on previous device before switching');
      sendWebSocketCommand({ lv: false });
      // Small delay to ensure command is sent before disconnecting
      setTimeout(() => {
        logger.log('🚫 FORCEFULLY terminating previous WebSocket connection for device switch');
        disconnectWebSocket();
      }, 100);
    } else {
      logger.log('🚫 FORCEFULLY terminating previous WebSocket connection for device switch');
      disconnectWebSocket();
    }
    
    // Force clear any lingering callbacks immediately
    setWebSocketCallbacks({
      onMessage: () => { logger.log('🚫 Ignoring message from terminated connection'); },
      onOpen: () => { logger.log('🚫 Ignoring open from terminated connection'); },
      onClose: () => { logger.log('🚫 Ignoring close from terminated connection'); },
      onError: () => { logger.log('🚫 Ignoring error from terminated connection'); },
    });

    // IMMEDIATELY clear UI state when switching devices to prevent showing old device data
    logger.log('🧹 Clearing UI state for device switch:', 
      `${currentWebSocketDeviceId}→${activeDevice?.id} (${activeDevice?.name})`);
    setLiveLedData([]);
    setCustomEffects([]); // Clear device presets when switching devices
    setCurrentPlaylist([]); // Clear current playlist when switching devices
    // Clear active state from all saved playlists when switching devices
    setSavedPlaylists(prev => prev.map(playlist => ({ ...playlist, isActive: false })));
    setCurrentWebSocketDeviceId(null); // Clear current WebSocket device tracking
    logger.log('🔄 KoloriApp: Managing global WebSocket for active device:', activeDevice?.name, 'clearing old data');

    const deviceAddress = getDeviceAddress(activeDevice);
    logger.log('🔍 KoloriApp: Check reconnection conditions:', {
      hasActiveDevice: !!activeDevice,
      deviceId: activeDevice?.id,
      deviceName: activeDevice?.name,
      isConnected: activeDevice?.isConnected,
      hasDeviceAddress: !!deviceAddress,
      deviceAddress: deviceAddress,
      protocol: activeDevice?.protocol,
      bestAddress: activeDevice?.bestAddress,
      ip: activeDevice?.ip
    });
    
    if (activeDevice && activeDevice.isConnected && deviceAddress) {
      const wsProtocol = activeDevice.protocol === "https" ? "wss" : "ws";
      // Adjust delay based on whether we sent lv:false command first
      const connectionDelay = currentWebSocketDeviceId !== null ? 1200 : 1000; // Extra time if we sent lv:false
      logger.log('KoloriApp: Will establish NEW WebSocket connection in', connectionDelay + 'ms:', `${wsProtocol}://${deviceAddress}/ws`);
      
      // Longer delay to ensure previous connection is COMPLETELY terminated
      setTimeout(() => {
        logger.log('⏰ Timeout callback executing after', connectionDelay + 'ms delay');
        if (isMounted) {
          logger.log('🔌 NOW connecting to new device:', activeDevice?.name, 'at address:', deviceAddress);
          
          // Store the device ID we're connecting to for verification
          const connectingDeviceId = activeDevice.id;
          const connectingDeviceName = activeDevice.name;
          
          logger.log('🔗 WebSocket connecting with device info:', {
            connectingDeviceId: connectingDeviceId,
            connectingDeviceName: connectingDeviceName,
            deviceAddress: deviceAddress,
            activeDeviceId: activeDevice.id
          });
          
          connectWebSocket(deviceAddress, wsProtocol);
          
          // Fetch device presets when connecting to device (like old implementation)
          setTimeout(() => {
            if (isMounted && activeDeviceRef.current?.id === connectingDeviceId) {
              logger.log('📡 Attempting to fetch device presets for:', connectingDeviceName, {
                isConnected: activeDeviceRef.current?.isConnected,
                hasDeviceAddress: !!getDeviceAddress(activeDeviceRef.current)
              });
              loadDevicePresets();
            }
          }, 1500); // Increase delay to ensure connection is established
          
          setWebSocketCallbacks({
        onMessage: (message) => {
          if (!isMounted) return;
          
          // Get current active device from ref to avoid stale closure
          const currentActiveDevice = activeDeviceRef.current;
          
          // Simple verification: Only process messages if we have an active device
          if (!currentActiveDevice) {
            logger.warn('🚫 Ignoring WebSocket message - no active device');
            return;
          }
          
          if (message.type === 'liveLedData') {
            // Get current live view setting from ref to avoid stale closure
            const currentLiveViewEnabled = settingsRef.current?.liveViewEnabled || false;
            
            // Handle live LED data - but verify it's from the correct device AND live view is enabled
            
            // Only update if live view is enabled and this is from the active device
            if (isMounted && currentLiveViewEnabled) {
              setLiveLedData(message.data);
            } else {
              logger.warn('🚫 Ignoring LED data - live view disabled');
              // Clear any existing data if live view is disabled
              setLiveLedData([]);
            }
          } else if (typeof message === 'object' && message !== null) {
            // Handle WLED JSON API responses
            logger.log('WebSocket JSON message received:', Object.keys(message));
            
            // Handle device info response (from { info: {} } request)
            if (message.info) {
              logger.log('📥 WebSocket: Device info received via WebSocket:', {
                deviceName: message.info.name,
                ledCount: message.info.leds?.count,
                ledMatrix: message.info.leds?.matrix,
                rgbw: message.info.leds?.rgbw,
                version: message.info.ver,
                currentActiveDeviceId: currentActiveDevice.id,
                currentActiveDeviceName: currentActiveDevice.name
              });
              
              // Update device with info (using the current active device ID)
              onDeviceUpdate(currentActiveDevice.id, { wledInfo: message.info });
              logger.log('✅ Device info updated for device ID:', currentActiveDevice.id);
            }
            
            // Handle device state updates
            if (message.state) {
              logger.log('WebSocket: Device state received:', {
                on: message.state.on,
                brightness: message.state.bri,
                effect: message.state.seg?.[0]?.fx
              });
              // Can update device state here if needed
            }
            
            // Handle effects list response
            if (message.effects && Array.isArray(message.effects)) {
              logger.log('WebSocket: Effects list received, count:', message.effects.length);
            }
            
            // Handle presets response
            if (message.presets) {
              logger.log('WebSocket: Presets received via WebSocket');
              // Could handle presets here instead of via HTTP
            }
          }
        },
        onOpen: () => {
          if (!isMounted) return;
          
          // Get current active device from ref
          const currentActiveDevice = activeDeviceRef.current;
          if (!currentActiveDevice) {
            logger.warn('WebSocket opened but no current active device');
            return;
          }
          
          // Set the current WebSocket device ID to track which device we're connected to
          setCurrentWebSocketDeviceId(currentActiveDevice.id);
          logger.log('✅ Global WebSocket CONNECTED for device:', currentActiveDevice.name, 'ID:', currentActiveDevice.id);
          
          // Sequence: 1. Request device info, 2. Request state, 3. Enable live view if needed
          logger.log('📡 Starting device initialization sequence for:', currentActiveDevice.name);
          
          // Step 1: Request device info immediately upon connection
          logger.log('📡 Step 1: Requesting device info for:', currentActiveDevice.name);
          const infoSuccess = sendWebSocketCommand({ info: {} });
          logger.log('📡 Device info request result:', infoSuccess);
          
          // Step 2: Request current state
          logger.log('📡 Step 2: Requesting device state for:', currentActiveDevice.name);
          const stateSuccess = sendWebSocketCommand({ state: {} });
          logger.log('📡 Device state request result:', stateSuccess);
          
          // Step 3: Enable live view if setting is on
          const currentLiveViewEnabled = settingsRef.current?.liveViewEnabled || false;
          if (currentLiveViewEnabled) {
            logger.log('📡 Step 3: Enabling live view for new device:', currentActiveDevice.name);
            const enableLiveView = () => {
              const success = sendWebSocketCommand({ lv: true });
              if (success) {
                logger.log('✅ Live view enabled for new device:', currentActiveDevice.name);
              } else {
                logger.warn('❌ Failed to enable live view on new device, retrying...');
                setTimeout(() => sendWebSocketCommand({ lv: true }), 500);
              }
            };
            // Small delay to ensure WebSocket is fully ready
            setTimeout(enableLiveView, 150);
          } else {
            logger.log('📡 Step 3: Skipping live view enable (setting is off)');
          }
          
          // Step 4: Load device presets (like old implementation in onOpen)
          setTimeout(() => {
            if (isMounted && activeDeviceRef.current?.id === currentActiveDevice.id) {
              logger.log('📡 Step 4: Loading device presets from onOpen for:', currentActiveDevice.name);
              loadDevicePresets();
            }
          }, 500);
          
          // Ensure device info is available via HTTP fallback if needed
          setTimeout(() => {
            if (isMounted) {
              // Backup: If device info is still not available after 3 seconds, try HTTP request
              setTimeout(() => {
                if (isMounted && activeDevice && !activeDevice.wledInfo) {
                  logger.warn('⚠️ Device info not received via WebSocket after 3s, trying HTTP fallback for:', activeDevice.name);
                  fetchDeviceInfoViaHttp();
                }
              }, 3000);
            }
          }, 500);
        },
        onClose: () => {
          const currentActiveDevice = activeDeviceRef.current;
          logger.log('❌ Global WebSocket CLOSED for device:', currentActiveDevice?.name || 'unknown', 'ID:', currentActiveDevice?.id || 'unknown');
          setCurrentWebSocketDeviceId(null); // Clear WebSocket device tracking
          if (isMounted) {
            setLiveLedData([]);
          }
        },
        onError: (error) => {
          const currentActiveDevice = activeDeviceRef.current;
          logger.error('Global WebSocket error for device:', currentActiveDevice?.name || 'unknown', error);
          if (isMounted) {
            setLiveLedData([]);
          }
        },
          });
        } else {
          logger.warn('⚠️ Component unmounted, skipping WebSocket reconnection');
        }
      }, connectionDelay);
    } else {
      logger.log('KoloriApp: Cannot reconnect WebSocket - missing requirements:', {
        noActiveDevice: !activeDevice,
        notConnected: activeDevice ? !activeDevice.isConnected : 'no device',
        noDeviceAddress: !deviceAddress
      });
      disconnectWebSocket();
      if (isMounted) {
        setLiveLedData([]);
      }
    }

    return () => {
      isMounted = false;
      logger.log('KoloriApp: Global WebSocket cleanup');
      setCurrentWebSocketDeviceId(null);
      disconnectWebSocket();
    };
  }, [activeDevice?.id, activeDevice?.isConnected]); // Reconnect on device change or connection status change

  // Handle live view toggle for existing connection
  useEffect(() => {
    if (activeDevice?.isConnected) {
      logger.log('KoloriApp: Live view toggle ->', settings.liveViewEnabled, 'for device:', activeDevice.name, 'ID:', activeDevice.id);
      
      // Add a small delay to ensure WebSocket is ready
      const sendLiveViewCommand = () => {
        const command = { lv: settings.liveViewEnabled };
        const success = sendWebSocketCommand(command);
        
        if (!success) {
          logger.warn('Failed to send live view command, retrying in 1 second...');
          setTimeout(() => {
            sendWebSocketCommand(command);
          }, 1000);
        }
        
        if (!settings.liveViewEnabled) {
          setLiveLedData([]);
        }
      };

      // Delay the command slightly to ensure WebSocket is ready
      setTimeout(sendLiveViewCommand, 100);
    } else if (!settings.liveViewEnabled) {
      // Always clear live LED data when live view is disabled
      setLiveLedData([]);
    }
  }, [settings.liveViewEnabled, activeDevice?.isConnected, activeDevice?.id]);

  const isConnected = activeDevice?.isConnected || false;
  const deviceName = activeDevice?.name || 'No Device';
  const activePreset = activeDevice?.activePreset || null;
  const isDark = settings.theme === 'dark';

  const getDeviceAddress = (device: WledDevice | undefined): string | null => {
    const address = device?.bestAddress || device?.ip || null;
    logger.log('🔍 getDeviceAddress for device:', {
      deviceId: device?.id,
      deviceName: device?.name,
      bestAddress: device?.bestAddress,
      ip: device?.ip,
      resolvedAddress: address
    });
    return address;
  };

  
  // Fallback function to fetch device info via HTTP if WebSocket fails
  const fetchDeviceInfoViaHttp = async () => {
    if (!activeDevice?.isConnected) {
      logger.warn('Cannot fetch device info via HTTP - device not connected');
      return;
    }
    
    try {
      const deviceAddress = getDeviceAddress(activeDevice);
      const protocol = activeDevice.protocol || 'http';
      const url = `${protocol}://${deviceAddress}/json/info`;
      
      logger.log('🌐 Fetching device info via HTTP:', url);
      
      const response = await fetch(url);
      const deviceInfo = await response.json();
      
      logger.log('📥 Device info received via HTTP:', {
        deviceName: deviceInfo.name,
        ledCount: deviceInfo.leds?.count,
        version: deviceInfo.ver
      });
      
      // Update device with HTTP-fetched info
      onDeviceUpdate(activeDevice.id, { wledInfo: deviceInfo });
      logger.log('✅ Device info updated via HTTP fallback for device ID:', activeDevice.id);
      
    } catch (error) {
      logger.error('❌ Failed to fetch device info via HTTP:', error);
    }
  };

  // Fetch WLED presets and playlists from device (based on old implementation)
  const loadDevicePresets = async () => {
    const currentActiveDevice = activeDeviceRef.current || activeDevice;
    
    logger.log('🔍 loadDevicePresets called with device:', {
      deviceName: currentActiveDevice?.name,
      isConnected: currentActiveDevice?.isConnected,
      deviceAddress: getDeviceAddress(currentActiveDevice),
      protocol: currentActiveDevice?.protocol
    });
    
    if (!currentActiveDevice?.isConnected) {
      logger.warn('❌ Device offline - cannot fetch presets:', currentActiveDevice?.name);
      return;
    }
    
    const deviceAddress = getDeviceAddress(currentActiveDevice);
    if (!deviceAddress) {
      logger.warn('❌ No device address available for preset fetching');
      return;
    }
    
    try {
      logger.log('📡 Fetching presets from device:', currentActiveDevice.name, 'at', deviceAddress);
      const result = await getWledPresets(
        deviceAddress,
        currentActiveDevice.protocol || "http"
      );
      
      logger.log('📥 getWledPresets result:', result.success ? 'SUCCESS' : 'FAILED', 
        `${result.presets?.length || 0} presets, ${result.playlists?.length || 0} playlists`);
      
      if (result.success) {
        // Filter out seasonal presets (based on old implementation)
        const EXCLUDE_PREFIXES = [
          "preset 0",
          "autumn-",
          "xmas-", 
          "canada day-",
        ];
        
        const filteredPresets = (result.presets || []).filter((preset) => {
          const presetNameLower = preset.name.toLowerCase();
          return !EXCLUDE_PREFIXES.some((prefix) =>
            presetNameLower.startsWith(prefix)
          );
        });
        
        logger.log(`Fetched ${filteredPresets.length} device presets`);
        setCustomEffects(filteredPresets);
        
        // Update saved playlists if any
        const filteredPlaylists = (result.playlists || []).filter((playlist) => {
          const playlistNameLower = playlist.name.toLowerCase();
          return !EXCLUDE_PREFIXES.some((prefix) =>
            playlistNameLower.startsWith(prefix)
          );
        });
        
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
  };

  const showNotification = (type: NotificationState['type'], title: string, message: string) => {
    setNotification({ isVisible: true, type, title, message });
  };

  // Fetch WLED presets and playlists from device
  const fetchWledPresets = async () => {
    if (!activeDevice?.isConnected) {
      showNotification(
        "error",
        "Device Offline",
        "Connect to a WLED device to fetch presets."
      );
      return;
    }

    try {
      const result = await getWledPresets(
        getDeviceAddress(activeDevice),
        activeDevice.protocol || "http"
      );

      if (result.success) {
        // Filter out excluded presets and playlists
        const EXCLUDE_PREFIXES = [
          "preset 0",
          "autumn-",
          "xmas-",
          "canada day-",
        ];

        const fetchedPresets = (result.presets || []).filter((effect: any) => {
          const effectNameLower = effect.name.toLowerCase();
          return !EXCLUDE_PREFIXES.some((prefix) =>
            effectNameLower.startsWith(prefix)
          );
        });
        
        const fetchedPlaylists = (result.playlists || []).filter((playlist: any) => {
          const playlistNameLower = playlist.name.toLowerCase();
          return !EXCLUDE_PREFIXES.some((prefix) =>
            playlistNameLower.startsWith(prefix)
          );
        });

        // Check cache for this device
        const deviceId = activeDevice.id;
        const currentCache = deviceCacheRef.current[deviceId];
        
        const presetsChanged = !currentCache || hasDataChanged(fetchedPresets, currentCache.presetsHash);
        const playlistsChanged = !currentCache || hasDataChanged(fetchedPlaylists, currentCache.playlistsHash);

        logger.log('📦 Cache comparison:', `Device ${deviceId}:`,
          presetsChanged ? `presets changed (${currentCache?.presets.length || 0}→${fetchedPresets.length})` : 'presets unchanged',
          playlistsChanged ? `playlists changed (${currentCache?.playlists.length || 0}→${fetchedPlaylists.length})` : 'playlists unchanged');

        // Update cache
        deviceCacheRef.current[deviceId] = {
          presets: fetchedPresets,
          playlists: fetchedPlaylists,
          presetsHash: generateHash(fetchedPresets),
          playlistsHash: generateHash(fetchedPlaylists),
          lastFetched: Date.now()
        };

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

        // Show notification only if something actually changed
        if (presetsChanged || playlistsChanged) {
          const totalItems = fetchedPresets.length + fetchedPlaylists.length;
          const itemType =
            fetchedPresets.length > 0 && fetchedPlaylists.length > 0
              ? "presets and playlists"
              : fetchedPresets.length > 0
              ? "presets"
              : "playlists";

          showNotification(
            "success",
            presetsChanged && playlistsChanged ? "Data Updated" : presetsChanged ? "Presets Updated" : "Playlists Updated",
            `Successfully updated ${totalItems} ${itemType} from your WLED device.`
          );
        } else {
          logger.log('📦 No changes detected, using cached data');
        }
        
        // Always clear loading state
        setIsLoadingPlaylists(false);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      logger.error("❌ Failed to fetch WLED presets:", error.message);
      showNotification(
        "error",
        "Import Failed",
        `Could not fetch presets: ${error.message}`
      );
    }
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
          isLoadingPlaylists={isLoadingPlaylists}
          onPlaylistEdit={(playlist) => {}}
          onPlaylistRemove={(id) => setSavedPlaylists(prev => prev.filter(p => p.id !== id))}
          onPlaylistSelect={(id) => {
            const selectedPlaylist = savedPlaylists.find(p => p.id === id);
            if (selectedPlaylist) {
              logger.log('📋 Setting playlist as current:', selectedPlaylist.name, selectedPlaylist.items?.length, 'effects');
              setCurrentPlaylist(selectedPlaylist.items || []);
              // Mark this playlist as active and others as inactive
              setSavedPlaylists(prev => prev.map(playlist => ({ 
                ...playlist, 
                isActive: playlist.id === id 
              })));
            }
          }}
          setShowSettings={onShowSettings}
          liveLedData={liveLedData}
          liveViewEnabled={settings.liveViewEnabled}
          onLiveViewToggle={(enabled) => onSettingsUpdate({ ...settings, liveViewEnabled: enabled })}
          onLiveLedDataUpdate={setLiveLedData}
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
