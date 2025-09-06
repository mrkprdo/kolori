import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Utilities
import { logger } from '../utils/logger';
import { storage, STORAGE_KEYS } from '../utils/storage';

// Services
import { deviceMonitor, DeviceStatus } from '../services/deviceMonitor';
import {
  connectWebSocket,
  disconnectWebSocket,
  setWebSocketCallbacks,
  sendWebSocketCommand,
} from '../utils/wledWebSocket';

// API & Config
import {
  activateWledPreset,
  activateWledPresetById,
  getWledPresets,
  setWledBrightness,
  getWledState,
} from '../config/wledApi';

// Types
import {
  Device as WledDevice,
  Settings,
  CustomEffect,
  SavedPlaylist,
  LEDColor,
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
}

/**
 * Main Kolori App Component - Optimized React Native component
 * Handles WLED device management, preset activation, and playlist functionality
 * 
 * @component
 * @param {KoloriAppProps} props - Component properties
 * @returns {JSX.Element} The main application interface
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
}: KoloriAppProps) {
  
  const systemColorScheme = useColorScheme();
  const [currentPlaylist, setCurrentPlaylist] = useState<any[]>([]);
  
  // Debug logging for playlist state changes - memoized to prevent unnecessary logging
  useEffect(() => {
    logger.log('📋 Current playlist state changed:', 
      `${currentPlaylist.length} items, device ${activeDeviceId} (${activeDevice?.name})`);
  }, [currentPlaylist.length, activeDeviceId, activeDevice?.name]); // Only log on meaningful changes
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
  const [liveLedData, setLiveLedData] = useState<LEDColor[]>([]);
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);
  const [currentWebSocketDeviceId, setCurrentWebSocketDeviceId] = useState<number | null>(null);
  
  const devicesRef = useRef(devices);
  const settingsRef = useRef(settings);
  const activeDeviceRef = useRef<WledDevice | undefined>(undefined);
  
  // Memoized helper function to generate hash for comparing data changes
  const generateHash = useCallback((data: any[]): string => {
    return JSON.stringify(data.map(item => ({
      id: item.id,
      name: item.name,
      // Include key properties that indicate changes
      ...(item.items && { itemsLength: item.items.length }),
      ...(item.gradient && { gradient: item.gradient }),
      ...(item.isWledPreset !== undefined && { isWledPreset: item.isWledPreset })
    }))).substring(0, 100); // Use first 100 chars as hash
  }, []);
  
  // Memoized helper function to check if cached data is different from new data
  const hasDataChanged = useCallback((newData: any[], cachedHash: string): boolean => {
    const newHash = generateHash(newData);
    return newHash !== cachedHash;
  }, [generateHash]);
  
  // Memoized helper function to load cached data for device
  const loadCachedDataForDevice = useCallback((deviceId: number | undefined) => {
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
  }, []);
  
  useEffect(() => { devicesRef.current = devices; }, [devices]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  
  // Calculate activeDevice with memoization to prevent unnecessary re-renders
  const activeDevice = useMemo(() => {
    const device = devices.find((d) => d.id === activeDeviceId) || devices[0];
    logger.log('🔄 activeDevice recalculated:', {
      deviceId: device?.id,
      deviceName: device?.name,
      isConnected: device?.isConnected
    });
    return device;
  }, [devices, activeDeviceId]);
  
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
    
    // Clear current playlist and active preset state
    setCurrentPlaylist([]);
    
    // Clear active preset when switching devices (each device has its own active preset)
    if (activeDevice?.id) {
      onDeviceUpdate(activeDevice.id, { activePreset: null });
    }
    
    // Clear any active playlist when switching devices
    setSavedPlaylists(prev => prev.map(playlist => ({ 
      ...playlist, 
      isActive: false 
    })));
    
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

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear all timeouts and intervals
      disconnectWebSocket();
      deviceMonitor.stop();
      // Clear all state to free memory
      setCurrentPlaylist([]);
      setSavedPlaylists([]);
      setCustomEffects([]);
      setLiveLedData([]);
      setDeviceStatuses([]);
      // Clear cache
      deviceCacheRef.current = {};
      logger.log('🧹 KoloriApp: Cleanup completed on unmount');
    };
  }, []); // Only run on unmount

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
    
    // Reset one-way brightness sync on device switch
    hasLocalBrightnessModification.current = false;
    console.log('🔄 One-way brightness sync reset on device switch - will allow WebSocket brightness updates');
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
              
              // Block brightness updates if slider operation is in progress OR one-way sync is enabled
              if (isChangingBrightness.current || hasLocalBrightnessModification.current) {
                const reason = isChangingBrightness.current ? 'slider operation in progress' : 'one-way sync enabled';
                logger.log(`🚫 WebSocket brightness update blocked - ${reason}`);
                
                // Update everything except brightness
                const currentWledInfo = currentActiveDevice.wledInfo || {};
                onDeviceUpdate(currentActiveDevice.id, { 
                  wledInfo: {
                    ...currentWledInfo,
                    // bri: message.state.bri, // BLOCKED
                    on: message.state.on,
                    ps: message.state.ps || currentWledInfo.ps // current preset
                  }
                });
              } else {
                // Normal update with brightness
                const currentWledInfo = currentActiveDevice.wledInfo || {};
                onDeviceUpdate(currentActiveDevice.id, { 
                  wledInfo: {
                    ...currentWledInfo,
                    bri: message.state.bri,
                    on: message.state.on,
                    ps: message.state.ps || currentWledInfo.ps // current preset
                  }
                });
                logger.log('✅ Device state updated for device ID:', currentActiveDevice.id, 'brightness:', message.state.bri);
              }
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
          
          // Step 4: Load device presets and state (like old implementation in onOpen)
          setTimeout(() => {
            if (isMounted && activeDeviceRef.current?.id === currentActiveDevice.id) {
              logger.log('📡 Step 4: Loading device presets and state from onOpen for:', currentActiveDevice.name);
              loadDevicePresets();
              refreshDeviceState();
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
          // Filter out masking errors that don't affect functionality
          const errorMessage = (error as any)?.message || '';
          if (errorMessage.includes('Server-sent frames must not be masked')) {
            logger.warn('WebSocket masking warning for device:', currentActiveDevice?.name || 'unknown', '(functionality not affected)');
            return;
          }
          
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

  // Memoize computed values to prevent unnecessary re-renders
  const isConnected = useMemo(() => activeDevice?.isConnected || false, [activeDevice?.isConnected]);
  const deviceName = useMemo(() => activeDevice?.name || 'No Device', [activeDevice?.name]);
  const activePreset = useMemo(() => activeDevice?.activePreset || null, [activeDevice?.activePreset]);
  const isDark = useMemo(() => {
    if (settings.theme === 'system') {
      return systemColorScheme === 'dark';
    }
    return settings.theme === 'dark';
  }, [settings.theme, systemColorScheme]);

  const getDeviceAddress = useCallback((device: WledDevice | undefined): string | null => {
    if (!device) return null;
    const address = device.bestAddress || device.ip || null;
    logger.log('🔍 getDeviceAddress for device:', {
      deviceId: device.id,
      deviceName: device.name,
      bestAddress: device.bestAddress,
      ip: device.ip,
      resolvedAddress: address
    });
    return address;
  }, []);

  
  // Fallback function to fetch device info via HTTP if WebSocket fails
  const fetchDeviceInfoViaHttp = async () => {
    if (!activeDevice?.isConnected) {
      logger.warn('Cannot fetch device info via HTTP - device not connected');
      return;
    }
    
    try {
      const deviceAddress = getDeviceAddress(activeDevice);
      const protocol = activeDevice.protocol || 'http';
      
      logger.log('🌐 Fetching device info and state via HTTP:', deviceAddress);
      
      // Fetch both device info and current state
      const [infoResponse, stateResponse] = await Promise.all([
        fetch(`${protocol}://${deviceAddress}/json/info`),
        getWledState(deviceAddress, protocol)
      ]);
      
      const deviceInfo = await infoResponse.json();
      
      logger.log('📥 Device info received via HTTP:', {
        deviceName: deviceInfo.name,
        ledCount: deviceInfo.leds?.count,
        version: deviceInfo.ver
      });
      
      // Merge device info with current state (including brightness)
      if (stateResponse.success && stateResponse.data) {
        deviceInfo.bri = stateResponse.data.bri;
        deviceInfo.on = stateResponse.data.on;
        deviceInfo.ps = stateResponse.data.ps; // current preset
        
        logger.log('📊 Device state merged - brightness:', deviceInfo.bri, 'on:', deviceInfo.on);
      }
      
      // Update device with HTTP-fetched info including state
      onDeviceUpdate(activeDevice.id, { wledInfo: deviceInfo });
      logger.log('✅ Device info and state updated via HTTP fallback for device ID:', activeDevice.id);
      
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

  const showNotification = (type: string, title: string, message: string) => {
    // Notification removed - using console logging instead
    console.log(`${type.toUpperCase()}: ${title} - ${message}`);
  };

  // Handle preset activation on device - memoized to prevent unnecessary re-creation
  const handlePresetSelect = useCallback(async (presetId: string | number) => {
    if (!activeDevice?.isConnected) {
      showNotification('error', 'Device Offline', 'Connect to a WLED device to activate presets.');
      return;
    }

    try {
      logger.log('🎯 Activating preset:', presetId, 'on device:', activeDevice.name);
      
      // Find the preset to get its details
      const seasonalPresets = settings.seasonalPresets || [
        { id: '1', name: 'Halloween/Fall', icon: '🍂', presetId: 1 },
        { id: '2', name: 'Canada Day', icon: '🇨🇦', presetId: 2 },
        { id: '3', name: 'Holidays', icon: '🎄', presetId: 3 },
      ];
      
      const preset = [...customEffects].find(p => 
        p.id.toString() === presetId.toString()
      ) || seasonalPresets.find(p => 
        p.presetId.toString() === presetId.toString()
      );

      if (!preset) {
        showNotification('error', 'Preset Not Found', 'The selected preset could not be found.');
        return;
      }

      let result;
      
      if (preset.isWledPreset) {
        // For device presets, use the original WLED preset ID
        const wledPresetId = parseInt(preset.id.toString().replace('wled_', ''));
        logger.log('🎯 Activating WLED preset ID:', wledPresetId);
        
        result = await activateWledPresetById(
          getDeviceAddress(activeDevice),
          wledPresetId,
          activeDevice.protocol || "http"
        );
      } else if ('presetId' in preset) {
        // For seasonal presets, use the configured presetId
        logger.log('🎯 Activating seasonal preset:', preset.name, 'with ID:', preset.presetId);
        
        result = await activateWledPresetById(
          getDeviceAddress(activeDevice),
          preset.presetId,
          activeDevice.protocol || "http"
        );
      } else {
        // For custom effects, use the preset name/data
        logger.log('🎯 Activating custom effect:', preset.name);
        
        result = await activateWledPreset(
          getDeviceAddress(activeDevice),
          preset,
          activeDevice.protocol || "http"
        );
      }

      if (result.success) {
        // Update the active device's active preset
        onDeviceUpdate(activeDevice.id, { activePreset: presetId });
        
        // Clear any active playlist when a preset is selected
        setSavedPlaylists(prev => prev.map(playlist => ({ 
          ...playlist, 
          isActive: false 
        })));
        
        showNotification(
          'success', 
          'Preset Activated', 
          `"${preset.name}" is now active on ${activeDevice.name}.`
        );
        
        logger.log('✅ Successfully activated preset:', preset.name);
      } else {
        throw new Error(result.message || 'Failed to activate preset');
      }
      
    } catch (error: any) {
      logger.error('❌ Failed to activate preset:', error.message.toString());
      showNotification(
        'error',
        'Activation Failed',
        `Could not activate preset: ${error.message}`
      );
    }
  }, [activeDevice?.isConnected, activeDevice?.name, activeDevice?.id, activeDevice?.protocol, customEffects, getDeviceAddress, onDeviceUpdate]);

  // Global brightness changing flag to coordinate between slider and WebSocket
  const isChangingBrightness = useRef(false);
  
  // One-way brightness sync flag - blocks WebSocket brightness updates once user modifies locally
  const hasLocalBrightnessModification = useRef(false);
  
  // Handle brightness change from slider
  const handleBrightnessChange = useCallback(async (brightness: number) => {
    if (!activeDevice?.isConnected) {
      showNotification(
        "error",
        "Device Offline", 
        "Connect to a WLED device to change brightness."
      );
      return;
    }

    // Set global brightness changing flag
    isChangingBrightness.current = true;
    console.log('🔒 Global brightness lock enabled');
    
    // Set one-way brightness sync flag - block WebSocket updates permanently
    hasLocalBrightnessModification.current = true;
    console.log('🚫 One-way brightness sync enabled - WebSocket brightness updates blocked');

    try {
      const result = await setWledBrightness(
        getDeviceAddress(activeDevice),
        brightness,
        activeDevice.protocol || "http"
      );

      if (result.success) {
        // Update the device's brightness info in local state after protection period
        // Wait longer to ensure slider protection period is active
        setTimeout(() => {
          onDeviceUpdate(activeDevice.id, { 
            wledInfo: {
              ...activeDevice.wledInfo,
              bri: brightness
            }
          });
          console.log('💾 Device state updated in KoloriApp with brightness:', brightness);
        }, 2500); // After slider protection period ends
        
        // Release global brightness lock after longer delay
        setTimeout(() => {
          isChangingBrightness.current = false;
          console.log('🔓 Global brightness lock released');
        }, 3000);
        
        logger.log(`✅ Brightness set to ${brightness} on ${activeDevice.name}`);
      } else {
        // Release lock on error
        isChangingBrightness.current = false;
        throw new Error(result.message || 'Failed to set brightness');
      }
    } catch (error: any) {
      // Release lock on error
      isChangingBrightness.current = false;
      logger.error('❌ Failed to set brightness:', error.message);
      showNotification(
        'error',
        'Brightness Change Failed',
        `Could not set brightness: ${error.message}`
      );
    }
  }, [activeDevice?.isConnected, activeDevice?.name, activeDevice?.id, activeDevice?.protocol, activeDevice?.wledInfo, getDeviceAddress, onDeviceUpdate]);

  // Function to refresh device state (including brightness)
  const refreshDeviceState = useCallback(async () => {
    if (!activeDevice?.isConnected) {
      logger.warn('Cannot refresh device state - device not connected');
      return;
    }

    try {
      const deviceAddress = getDeviceAddress(activeDevice);
      const protocol = activeDevice.protocol || 'http';
      
      logger.log('🔄 Refreshing device state for:', activeDevice.name);
      
      const stateResponse = await getWledState(deviceAddress, protocol);
      
      if (stateResponse.success && stateResponse.data) {
        // Update device with current state
        const currentWledInfo = activeDevice.wledInfo || {};
        onDeviceUpdate(activeDevice.id, { 
          wledInfo: {
            ...currentWledInfo,
            bri: stateResponse.data.bri,
            on: stateResponse.data.on,
            ps: stateResponse.data.ps // current preset
          }
        });
        
        logger.log('✅ Device state refreshed - brightness:', stateResponse.data.bri, 'on:', stateResponse.data.on);
      }
    } catch (error: any) {
      logger.error('❌ Failed to refresh device state:', error);
    }
  }, [activeDevice?.isConnected, activeDevice?.name, activeDevice?.id, activeDevice?.protocol, activeDevice?.wledInfo, getDeviceAddress, onDeviceUpdate]);

  // Fetch WLED presets and playlists from device - memoized
  const fetchWledPresets = useCallback(async () => {
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
  }, [activeDevice?.isConnected, activeDevice?.id, activeDevice?.name, activeDevice?.protocol, getDeviceAddress, generateHash, hasDataChanged]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, isDark ? styles.statusBarDark : styles.statusBarLight]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <PresetGrid
          key={`presets-${JSON.stringify(settings.seasonalPresets)}`}
          activePreset={activePreset}
          onPresetSelect={handlePresetSelect}
          isDark={isDark}
          currentPlaylist={currentPlaylist}
          onShowPlaylist={() => setShowPlaylist(true)}
          activeDevice={activeDevice}
          devices={devices}
          activeDeviceId={activeDeviceId}
          onSetActiveDeviceId={onSetActiveDeviceId}
          customEffects={customEffects}
          onAddCustomEffect={(effect) => setCustomEffects(prev => [...prev, effect])}
          onRemoveCustomEffect={(id) => setCustomEffects(prev => prev.filter(e => e.id !== id))}
          onCustomEffectUpdate={setCustomEffects}
          savedPlaylists={savedPlaylists}
          isLoadingPlaylists={isLoadingPlaylists}
          onPlaylistEdit={(playlist) => {}}
          onPlaylistRemove={(id) => setSavedPlaylists(prev => prev.filter(p => p.id !== id))}
          onPlaylistSelect={useCallback(async (id: number) => {
            const selectedPlaylist = savedPlaylists.find(p => p.id === id);
            if (selectedPlaylist) {
              logger.log('📋 Setting playlist as current:', selectedPlaylist.name, selectedPlaylist.items?.length, 'effects');
              logger.log('📱 Playlist preset ID:', selectedPlaylist.presetId || 'NOT SET');
              
              setCurrentPlaylist(selectedPlaylist.items || []);
              // Mark this playlist as active and others as inactive
              setSavedPlaylists(prev => prev.map(playlist => ({ 
                ...playlist, 
                isActive: playlist.id === id 
              })));

              // Now actually activate the playlist on the WLED device
              if (activeDevice?.isConnected && selectedPlaylist.presetId) {
                logger.log('🎯 Activating playlist on WLED device with preset ID:', selectedPlaylist.presetId);
                
                try {
                  const result = await activateWledPresetById(
                    getDeviceAddress(activeDevice),
                    selectedPlaylist.presetId,
                    activeDevice.protocol || "http"
                  );
                  
                  if (result.success) {
                    logger.log('✅ Playlist activated successfully on WLED device');
                    // Clear the preset activePreset when playlist is activated (they use different systems)
                    onDeviceUpdate(activeDeviceId!, {
                      activePreset: null,
                      isPlaying: true,
                    });
                  } else {
                    logger.error('❌ Failed to activate playlist on WLED device:', result.message);
                  }
                } catch (error) {
                  logger.error('❌ Error activating playlist:', error);
                }
              } else if (!activeDevice?.isConnected) {
                logger.warn('❌ Device offline - playlist set as current but not activated on device');
              } else if (!selectedPlaylist.presetId) {
                logger.warn('❌ Playlist has no preset ID - cannot activate on WLED device');
              }
            }
          }, [savedPlaylists, activeDevice?.isConnected, activeDevice?.protocol, activeDeviceId, getDeviceAddress, onDeviceUpdate])}
          setShowSettings={onShowSettings}
          onDeviceRemove={onDeviceDelete}
          onAddDevice={() => {
            console.log('Add Device button clicked');
            if (onShowAddManually && typeof onShowAddManually === 'function') {
              onShowAddManually();
            } else {
              console.error('onShowAddManually is not a function:', onShowAddManually);
            }
          }}
          onScanForDevices={() => {
            setShowScanNetworkModal(true);
          }}
          liveLedData={liveLedData}
          liveViewEnabled={settings.liveViewEnabled}
          onLiveViewToggle={(enabled) => onSettingsUpdate({ ...settings, liveViewEnabled: enabled })}
          onLiveLedDataUpdate={setLiveLedData}
          onRefreshPresets={async () => {
            // Reset one-way brightness sync on refresh
            hasLocalBrightnessModification.current = false;
            console.log('🔄 One-way brightness sync reset - will allow WebSocket brightness updates');
            
            await Promise.all([
              fetchWledPresets(),
              refreshDeviceState()
            ]);
          }}
          onSavePlaylist={(playlist) => {
            const newPlaylists = [...savedPlaylists, playlist];
            setSavedPlaylists(newPlaylists);
            storage.saveToStorage(STORAGE_KEYS.PLAYLISTS, newPlaylists);
          }}
          seasonalPresets={(() => {
            const presets = settings.seasonalPresets || [
              { id: '1', name: 'Halloween/Fall', icon: '🍂', presetId: 1 },
              { id: '2', name: 'Canada Day', icon: '🇨🇦', presetId: 2 },
              { id: '3', name: 'Holidays', icon: '🎄', presetId: 3 },
            ];
            return presets;
          })()}
          onBrightnessChange={handleBrightnessChange}
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
          onPlayPlaylist={useCallback(async (playlistId: number) => {
            // Use the same logic as onPlaylistSelect since it's working
            const selectedPlaylist = savedPlaylists.find(p => p.id === playlistId);
            if (!selectedPlaylist) {
              logger.warn('Playlist not found:', playlistId);
              return;
            }

            logger.log('🎵 Playing playlist via PlaylistModal:', selectedPlaylist.name, selectedPlaylist.items?.length, 'effects');
            logger.log('📱 Playlist preset ID:', selectedPlaylist.presetId || 'NOT SET');
            
            if (activeDevice?.isConnected && selectedPlaylist.presetId) {
              logger.log('🎯 Activating playlist on WLED device with preset ID:', selectedPlaylist.presetId);
              
              try {
                const result = await activateWledPresetById(
                  getDeviceAddress(activeDevice),
                  selectedPlaylist.presetId,
                  activeDevice.protocol || "http"
                );
                
                if (result.success) {
                  logger.log('✅ Playlist activated successfully on WLED device');
                  // Clear the preset activePreset when playlist is activated (they use different systems)
                  onDeviceUpdate(activeDeviceId!, {
                    activePreset: null,
                    isPlaying: true,
                  });
                } else {
                  logger.error('❌ Failed to activate playlist on WLED device:', result.message);
                }
              } catch (error) {
                logger.error('❌ Error activating playlist:', error);
              }
            } else if (!activeDevice?.isConnected) {
              logger.warn('❌ Device offline - cannot activate playlist');
            } else if (!selectedPlaylist.presetId) {
              logger.warn('❌ Playlist has no preset ID - cannot activate on WLED device');
              logger.log('💡 Tip: Try refreshing playlists from the device to get preset IDs');
            }
          }, [savedPlaylists, activeDevice?.isConnected, activeDevice?.protocol, activeDeviceId, getDeviceAddress, onDeviceUpdate])}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default KoloriApp;

// Memoize styles to prevent recreation on every render
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBarLight: {
    backgroundColor: '#f9fafb',
  },
  statusBarDark: {
    backgroundColor: '#111827',
  },
});
