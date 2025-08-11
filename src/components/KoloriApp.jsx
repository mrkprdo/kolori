import { connectWebSocket, disconnectWebSocket, setWebSocketCallbacks } from '../utils/wledWebSocket';
import React, { useState, useEffect, useRef } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import Header from "./Header";
import PresetGrid from "./PresetGrid";
import PlaylistModal from "./PlaylistModal";
import SettingsModal from "./SettingsModal";
import WelcomePage from "./WelcomePage";
import UserAgreement from "./UserAgreement";
import ConfirmModal from "./ConfirmModal";
import Notification from "./Notification";
import {
  activateWledPreset,
  activateWledPresetById,
  activateWledEffect,
  deleteWledPlaylistViaWebSocket,
  checkWledHeartbeat,
  turnWledOn,
  turnWledOff,
} from "../config/wledApi";
import { SEASONAL_PRESETS } from "../constants/presets";

export default function KoloriApp() {
  // LocalStorage keys
  const DEVICES_STORAGE_KEY = "kolori_devices";
  const ACTIVE_DEVICE_STORAGE_KEY = "kolori_active_device";
  const USER_AGREEMENT_STORAGE_KEY = "kolori_user_agreement";
  const SCHEDULE_MODE_STORAGE_KEY = "kolori_schedule_mode";

  // LocalStorage helper functions
  const loadFromStorage = (key, defaultValue) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.warn(`Failed to load ${key} from localStorage:`, error);
      return defaultValue;
    }
  };

  const saveToStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save ${key} to localStorage:`, error);
    }
  };

  // State management with localStorage initialization
  const [customEffects, setCustomEffects] = useState([]);
  const [theme, setTheme] = useState("system");
  const [devices, setDevices] = useState(() =>
    loadFromStorage(DEVICES_STORAGE_KEY, [])
  );
  const [activeDeviceId, setActiveDeviceId] = useState(() =>
    loadFromStorage(ACTIVE_DEVICE_STORAGE_KEY, null)
  );
  const [userAgreementAccepted, setUserAgreementAccepted] = useState(() =>
    loadFromStorage(USER_AGREEMENT_STORAGE_KEY, false)
  );
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [savedPlaylists, setSavedPlaylists] = useState([]);
  const [scheduleMode, setScheduleMode] = useState(() =>
    loadFromStorage(SCHEDULE_MODE_STORAGE_KEY, "all-day")
  );
  
  const [lastScheduleCheck, setLastScheduleCheck] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [notification, setNotification] = useState({
    isVisible: false,
    type: "success",
    title: "",
    message: "",
  });
  const [newDevice, setNewDevice] = useState({
    name: "",
    ip: "",
    protocol: "http",
  });

  // Use ref to track current devices for heartbeat monitoring
  const devicesRef = useRef(devices);
  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  // Computed values
  const activeDevice =
    devices.find((d) => d.id === activeDeviceId) || devices[0];
  const isConnected = activeDevice?.isConnected || false;
  const deviceName = activeDevice?.name || "No Device";
  const activePreset = activeDevice?.activePreset || null;
  const isPlaying = activeDevice?.isPlaying || false;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Configure status bar for mobile
  useEffect(() => {
    const configureStatusBar = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Set status bar to be transparent/overlay
          await StatusBar.setOverlaysWebView({ overlay: true });

          // Set status bar style based on theme
          await StatusBar.setStyle({
            style: isDark ? Style.Dark : Style.Light,
          });

          // Set background color to transparent
          await StatusBar.setBackgroundColor({ color: "#00000000" });
        } catch (error) {
          console.log("StatusBar not available:", error);
        }
      }
    };

    configureStatusBar();
  }, [isDark]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(DEVICES_STORAGE_KEY, devices);
  }, [devices]);

  useEffect(() => {
    saveToStorage(ACTIVE_DEVICE_STORAGE_KEY, activeDeviceId);
  }, [activeDeviceId]);

  useEffect(() => {
    saveToStorage(USER_AGREEMENT_STORAGE_KEY, userAgreementAccepted);
  }, [userAgreementAccepted]);

  useEffect(() => {
    saveToStorage(SCHEDULE_MODE_STORAGE_KEY, scheduleMode);
  }, [scheduleMode]);

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

  // Device heartbeat monitoring - check every 60 seconds
  useEffect(() => {
    if (devices.length === 0) return;

    const checkAllDevicesHeartbeat = async () => {
      const currentDevices = devicesRef.current;
      if (currentDevices.length === 0) return;

      const updatedDevices = [];

      for (const device of currentDevices) {
        const heartbeatResult = await checkWledHeartbeat(
          device.ip,
          device.protocol || "http"
        );
        const wasConnected = device.isConnected;
        const isConnected = heartbeatResult.online;

        // Log connection status changes
        if (wasConnected && !isConnected) {
          console.log(`Device ${device.name} (${device.ip}) went offline`);
        } else if (!wasConnected && isConnected) {
          console.log(`Device ${device.name} (${device.ip}) came back online`);
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

    // Set up interval for heartbeat checks every 60 seconds
    const heartbeatInterval = setInterval(checkAllDevicesHeartbeat, 10000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [devices.length]); // Only re-run when number of devices changes

  // Device management helper function - moved here to avoid hoisting issues
  const updateDevice = (deviceId, updates) => {
    setDevices(
      devices.map((d) => (d.id === deviceId ? { ...d, ...updates } : d))
    );
  };

  // WebSocket state and effects
  useEffect(() => {
    let wsConnectTimer = null;

    if (activeDevice && activeDevice.ip && activeDevice.isConnected) {
      setWebSocketCallbacks({
        onOpen: () => {
          console.log("WebSocket connected in KoloriApp.");
          // Update device connection status to reflect WebSocket connection
          setDevices(prevDevices => prevDevices.map(d =>
            d.id === activeDevice.id ? { ...d, isConnected: true } : d
          ));
        },
        onMessage: (data) => {
          // Update active device state based on WebSocket message
          setDevices(prevDevices => prevDevices.map(d =>
            d.id === activeDevice.id ? { ...d, wledInfo: data, isConnected: true } : d
          ));
          // Update device state based on incoming WLED state
          if (data.state) {
            updateDevice(activeDevice.id, {
              activePreset: data.state.ps || null,
              isPlaying: data.state.pl > -1,
            });
          }
        },
        onClose: (event) => {
          console.log("WebSocket disconnected in KoloriApp.", event);
          // Only mark as disconnected if it wasn't a manual close
          if (event.code !== 1000) {
            setDevices(prevDevices => prevDevices.map(d =>
              d.id === activeDevice.id ? { ...d, isConnected: false } : d
            ));
          }
        },
        onError: (error) => {
          console.error("WebSocket error in KoloriApp:", error);
          // Mark device as disconnected on error
          setDevices(prevDevices => prevDevices.map(d =>
            d.id === activeDevice.id ? { ...d, isConnected: false } : d
          ));
          showNotification('error', 'Connection Lost', `WebSocket connection to ${activeDevice.name} failed.`);
        }
      });

      // Connect with a short delay to ensure callbacks are set
      wsConnectTimer = setTimeout(() => {
        const wsProtocol = activeDevice.protocol === 'https' ? 'wss' : 'ws';
        console.log(`Connecting to WebSocket: ${wsProtocol}://${activeDevice.ip}/ws`);
        connectWebSocket(activeDevice.ip, wsProtocol);
      }, 1000);
    }

    return () => {
      if (wsConnectTimer) {
        clearTimeout(wsConnectTimer);
      }
      disconnectWebSocket();
    };
  }, [activeDevice?.id, activeDevice?.ip, activeDevice?.protocol]);

  // Schedule helper functions - moved here to avoid hoisting issues
  const shouldLightsBeOn = () => {
    if (scheduleMode === "all-day") {
      return true; // Always on
    }

    const now = new Date();
    const currentHour = now.getHours();

    if (scheduleMode === "day") {
      // Day mode: 7am to 7pm (7:00 - 19:00)
      return currentHour >= 7 && currentHour < 19;
    } else if (scheduleMode === "night") {
      // Night mode: 7pm to 7am (19:00 - 07:00)
      return currentHour >= 19 || currentHour < 7;
    }

    return true; // Default to on if unknown mode
  };

  const checkAndApplySchedule = async () => {
    console.log(`📅 Schedule Check: Starting check...`);
    console.log(`📅 Active Device: ${activeDevice?.name || 'none'}`);
    console.log(`📅 Device Connected: ${activeDevice?.isConnected || false}`);
    
    console.log(`📅 Schedule Mode: ${scheduleMode}`);
    
    if (!activeDevice) {
      console.log(`📅 Schedule Check: No active device - skipping`);
      return;
    }
    
    if (!activeDevice.isConnected) {
      console.log(`📅 Schedule Check: Device disconnected - skipping`);
      return;
    }
    
    const shouldBeOn = shouldLightsBeOn();
    const currentTime = new Date().toISOString();
    const currentHour = new Date().getHours();

    console.log(`📅 Current Time: ${currentTime}`);
    console.log(`📅 Current Hour: ${currentHour}`);
    console.log(`📅 Should Lights Be On: ${shouldBeOn}`);

    // Only apply if this is a new schedule decision (avoid spam)
    if (lastScheduleCheck && 
        Math.abs(new Date() - new Date(lastScheduleCheck)) < 60000) {
      console.log(`📅 Schedule Check: Checked recently - skipping (last: ${lastScheduleCheck})`);
      return;
    }

    setLastScheduleCheck(currentTime);
    console.log(`📅 Schedule Check: Applying schedule action...`);

    try {
      if (shouldBeOn) {
        console.log(`📅 Schedule Action: Calling turnWledOn for ${activeDevice.ip}`);
        const result = await turnWledOn(activeDevice.ip, activeDevice.protocol || "http");
        if (result.success) {
          console.log(`✅ Schedule: Turned lights ON (${scheduleMode} mode) - ${result.message}`);
        } else {
          console.error(`❌ Schedule: Failed to turn lights ON - ${result.message}`);
        }
      } else {
        console.log(`📅 Schedule Action: Calling turnWledOff for ${activeDevice.ip}`);
        const result = await turnWledOff(activeDevice.ip, activeDevice.protocol || "http");
        if (result.success) {
          console.log(`✅ Schedule: Turned lights OFF (${scheduleMode} mode) - ${result.message}`);
        } else {
          console.error(`❌ Schedule: Failed to turn lights OFF - ${result.message}`);
        }
      }
    } catch (error) {
      console.error("📅 Schedule enforcement error:", error);
    }
  };

  // Schedule monitoring - check every minute to enforce schedule
  useEffect(() => {
    if (scheduleMode === "all-day") return;

    // Initial check
    checkAndApplySchedule();

    // Set up interval to check schedule every minute
    const scheduleInterval = setInterval(checkAndApplySchedule, 60000);

    return () => {
      clearInterval(scheduleInterval);
    };
  }, [scheduleMode, activeDevice?.id, activeDevice?.isConnected]);

  // Device validation function
  const validateDeviceUrl = async (ip, protocol = "http") => {
    try {
      // First check basic connectivity
      const connectivityResponse = await fetch(`${protocol}://${ip}`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!connectivityResponse.ok && connectivityResponse.status !== 404) {
        return {
          success: false,
          message: `Device not accessible - HTTP ${connectivityResponse.status}`,
        };
      }

      // If basic connectivity works, try WLED-specific endpoint
      const wledResponse = await fetch(`${protocol}://${ip}/json/info`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (wledResponse.ok) {
        const data = await wledResponse.json();
        return {
          success: true,
          data: data,
          message: "WLED device found and accessible",
        };
      } else if (wledResponse.status === 404) {
        return {
          success: false,
          message:
            "Device accessible but WLED not detected - not a WLED device",
        };
      } else {
        return {
          success: false,
          message: `WLED endpoint error - HTTP ${wledResponse.status}`,
        };
      }
    } catch (error) {
      if (error.name === "TimeoutError") {
        return {
          success: false,
          message: "Connection timeout - device may be offline or unreachable",
        };
      } else if (
        error.name === "TypeError" ||
        error.message.includes("Failed to fetch")
      ) {
        return {
          success: false,
          message:
            "Network error - check IP address and ensure device is on same network",
        };
      } else {
        return {
          success: false,
          message: `Connection failed: ${error.message}`,
        };
      }
    }
  };

  // IP address validation function
  const isValidIP = (ip) => {
    const ipPattern =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipPattern.test(ip);
  };

  // Device management functions
  const addDevice = async () => {
    if (newDevice.name && newDevice.ip && isValidIP(newDevice.ip)) {
      try {
        // Check for duplicate device name (case-insensitive)
        const duplicateName = devices.find(
          (device) => device.name.toLowerCase() === newDevice.name.toLowerCase()
        );
        if (duplicateName) {
          setNewDevice((prev) => ({
            ...prev,
            validating: false,
            validationMessage: `Device name "${newDevice.name}" already exists. Please choose a different name.`,
            validationError: true,
          }));
          return;
        }

        // Check for duplicate IP address
        const duplicateIP = devices.find(
          (device) => device.ip === newDevice.ip
        );
        if (duplicateIP) {
          setNewDevice((prev) => ({
            ...prev,
            validating: false,
            validationMessage: `IP address ${newDevice.ip} is already in use by device "${duplicateIP.name}".`,
            validationError: true,
          }));
          return;
        }

        // Show connecting screen
        setNewDevice((prev) => ({
          ...prev,
          validating: true,
          validationMessage: "Connecting to device...",
          validationError: false,
        }));

        // First check basic HTTP connectivity
        setNewDevice((prev) => ({
          ...prev,
          validationMessage: "Checking if device is accessible...",
        }));

        // Validate device URL
        const validation = await validateDeviceUrl(
          newDevice.ip,
          newDevice.protocol
        );

        if (validation.success) {
          // Show success message briefly before adding device
          setNewDevice((prev) => ({
            ...prev,
            validationMessage: "WLED device confirmed! Adding to devices...",
          }));

          // Short delay to show success message
          await new Promise((resolve) => setTimeout(resolve, 500));

          const device = {
            id: Date.now(),
            name: newDevice.name,
            ip: newDevice.ip,
            protocol: newDevice.protocol,
            isConnected: true, // Set to true since validation passed
            autoBrightness: true,
            maxBrightness: 80,
            activePreset: null,
            isPlaying: false,
            wledInfo: validation.data || null,
          };
          const updatedDevices = [...devices, device];
          setDevices(updatedDevices);

          // If this is the first device, make it active
          if (devices.length === 0) {
            setActiveDeviceId(device.id);
          }

          setNewDevice({
            name: "",
            ip: "",
            protocol: "http",
            description: "",
            validating: false,
            validationMessage: "",
          });
          setShowDeviceForm(false);
          console.log(`Added device: ${device.name} at ${device.ip}`);
        } else {
          // Show validation error but keep form open
          setNewDevice((prev) => ({
            ...prev,
            validating: false,
            validationMessage: validation.message,
            validationError: true,
          }));
        }
      } catch (error) {
        // Handle any unexpected errors
        setNewDevice((prev) => ({
          ...prev,
          validating: false,
          validationMessage:
            "Unexpected error occurred during device validation",
          validationError: true,
        }));
        console.error("Device addition error:", error);
      }
    }
  };

  const removeDevice = (deviceId) => {
    const deviceToRemove = devices.find((d) => d.id === deviceId);
    if (!deviceToRemove) return;

    // Show confirmation modal instead of browser confirm
    setDeviceToDelete(deviceToRemove);
    setShowConfirmDelete(true);
  };

  const confirmRemoveDevice = () => {
    if (!deviceToDelete) return;

    const updatedDevices = devices.filter((d) => d.id !== deviceToDelete.id);
    setDevices(updatedDevices);

    // If we're removing the active device, set a new active device
    if (activeDeviceId === deviceToDelete.id) {
      setActiveDeviceId(
        updatedDevices.length > 0 ? updatedDevices[0].id : null
      );
    }

    console.log(
      `Removed device: ${deviceToDelete.name} at ${deviceToDelete.ip}`
    );

    // Clean up state
    setDeviceToDelete(null);
  };

  // Preset and playlist functions
  const applyPreset = async (presetId) => {
    // Check if active device is connected
    if (!activeDevice) {
      console.log("No active device");
      return;
    }

    if (!activeDevice.isConnected) {
      console.log("Active device is disconnected, blocking preset activation");
      showNotification(
        "error",
        "Device Offline",
        `${activeDevice.name} is disconnected. Please check your device connection.`
      );
      return;
    }

    // First check seasonal presets
    const seasonalPreset = SEASONAL_PRESETS.find((p) => p.id === presetId);

    if (seasonalPreset) {
      if (!activeDevice) {
        console.log(`No active device`);
        return;
      }

      console.log(
        `Applying preset "${seasonalPreset.name}" to device ${activeDevice.ip}`
      );

      // Call WLED API to activate preset
      const result = await activateWledPreset(
        activeDevice.ip,
        seasonalPreset.name,
        activeDevice.protocol || "http"
      );

      if (result.success) {
        updateDevice(activeDeviceId, { activePreset: presetId });
        console.log(`Successfully activated preset: ${seasonalPreset.name}`);
      } else {
        console.error(`Failed to activate preset: ${result.message}`);
      }
      return;
    }

    // Check custom effects
    const customEffect = customEffects.find((e) => e.id === presetId);

    if (customEffect) {
      if (!activeDevice) {
        console.log(`No active device`);
        return;
      }

      console.log(
        `Applying custom effect "${customEffect.name}" to device ${activeDevice.ip}`
      );

      // Use preset ID if available, otherwise fall back to effect/palette activation
      let result;
      if (customEffect.presetId) {
        result = await activateWledPresetById(
          activeDevice.ip,
          customEffect.presetId,
          activeDevice.protocol || "http"
        );
      } else {
        // Fallback for effects created before preset integration
        result = await activateWledEffect(
          activeDevice.ip,
          customEffect.effectId,
          customEffect.paletteId,
          activeDevice.protocol || "http"
        );
      }

      if (result.success) {
        updateDevice(activeDeviceId, { activePreset: presetId });
        console.log(
          `Successfully activated custom effect: ${customEffect.name}`
        );
      } else {
        console.error(`Failed to activate custom effect: ${result.message}`);
      }
      return;
    }

    // Unknown preset ID
    console.log(`Unknown preset ID: ${presetId}`);
    updateDevice(activeDeviceId, { activePreset: presetId });
  };

  const togglePlaylist = async () => {
    const newPlayingState = !isPlaying;

    if (!activeDevice) {
      console.log("No active device");
      return;
    }

    if (!activeDevice.isConnected) {
      console.log("Active device is disconnected, blocking playlist control");
      showNotification(
        "error",
        "Device Offline",
        `${activeDevice.name} is disconnected. Please check your device connection.`
      );
      return;
    }

    const savedPlaylist = savedPlaylists.find((p) => p.isActive);
    if (!savedPlaylist) {
      console.log("No active saved playlist to play");
      updateDevice(activeDeviceId, { isPlaying: newPlayingState });
      return;
    }

    if (newPlayingState) {
      const result = await startWledPlaylist(
        activeDevice.ip,
        savedPlaylist.firstPresetId,
        savedPlaylist.lastPresetId
      );
      if (result.success) {
        console.log("Playlist started successfully");
      } else {
        console.error("Failed to start playlist:", result.message);
      }
    } else {
      const result = await stopWledPlaylist(activeDevice.ip);
      if (result.success) {
        console.log("Playlist stopped successfully");
      } else {
        console.error("Failed to stop playlist:", result.message);
      }
    }

    updateDevice(activeDeviceId, { isPlaying: newPlayingState });
  };

  const addToPlaylist = (preset) => {
    const playlistItem = {
      ...preset,
      duration: 30,
      playlistItemId: `${preset.id || preset.name}_${Date.now()}`,
    };
    setCurrentPlaylist([...currentPlaylist, playlistItem]);
  };

  const removeFromPlaylist = (index) => {
    setCurrentPlaylist(currentPlaylist.filter((_, i) => i !== index));
  };

  const reorderPlaylist = (newPlaylist) => {
    setCurrentPlaylist(newPlaylist);
  };

  const showNotification = (type, title, message) => {
    setNotification({
      isVisible: true,
      type,
      title,
      message,
    });
  };

  const closeNotification = () => {
    setNotification({
      ...notification,
      isVisible: false,
    });
  };

  const editPlaylist = (playlist) => {
    // Load playlist items into current playlist for editing
    const playlistEffects = playlist.items.map((item) => ({
      ...item,
      playlistItemId: `${item.name}_${Date.now()}`,
    }));
    setCurrentPlaylist(playlistEffects);
    setShowPlaylist(true);

    // Remove the playlist from saved playlists while editing
    setSavedPlaylists((prev) => prev.filter((p) => p.id !== playlist.id));

    console.log("Editing playlist:", playlist.name);
  };

  const removePlaylist = async (playlistId) => {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    if (!playlist) {
      console.error("Playlist not found:", playlistId);
      return;
    }

    if (!activeDevice?.isConnected) {
      console.log("No active device connected");
      showNotification(
        "error",
        "Device Offline",
        "Connect to a WLED device to delete playlists from the device."
      );
      // Still allow local removal even if device is offline
      setSavedPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      return;
    }

    try {
      // Delete from WLED device via WebSocket if it has a preset ID
      if (playlist.presetId) {
        const result = await deleteWledPlaylistViaWebSocket(
          playlist.presetId,
          playlist.name
        );
        
        if (result.success) {
          console.log("✅ Playlist deleted from WLED device:", playlist.name);
          showNotification(
            "success",
            "Playlist Deleted",
            `"${playlist.name}" has been removed from your WLED device.`
          );
        } else {
          console.warn("⚠️ Failed to delete from device, removing locally:", result.message);
          showNotification(
            "warning",
            "Partial Deletion",
            `"${playlist.name}" removed locally but may still exist on WLED device.`
          );
        }
      } else {
        console.log("No preset ID, removing locally only:", playlist.name);
      }
    } catch (error) {
      console.error("❌ Error deleting playlist from device:", error.message);
      showNotification(
        "warning",
        "Deletion Error",
        `Error removing "${playlist.name}" from device, but removed locally.`
      );
    }

    // Always remove from local state
    setSavedPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    console.log("Removed playlist locally:", playlist.name);
  };

  const savePlaylist = async (playlistName) => {
    if (currentPlaylist.length === 0) {
      console.log("Cannot save empty playlist");
      showNotification(
        "error",
        "Empty Playlist",
        "Add some custom effects to your playlist before saving."
      );
      return;
    }

    if (!activeDevice?.isConnected) {
      console.log("No active device connected");
      showNotification(
        "error",
        "Device Offline",
        "Connect to a WLED device before saving playlists."
      );
      return;
    }

    const finalPlaylistName = playlistName || `Playlist_${Date.now()}`;

    // Map current playlist items to WebSocket format
    const playlistItems = currentPlaylist.map((item) => ({
      name: item.name,
      presetId: item.presetId, // Required for WebSocket playlist
      duration: item.duration || 30,
      gradient: item.gradient,
    }));

    // Validate that all items have preset IDs (required for WebSocket playlist)
    const missingPresetIds = playlistItems.filter(item => !item.presetId);
    if (missingPresetIds.length > 0) {
      console.error("Some playlist items missing preset IDs:", missingPresetIds);
      showNotification(
        "error",
        "Invalid Playlist",
        "All playlist items must be saved custom effects with preset IDs."
      );
      return;
    }

    // Use ONLY WebSocket for playlist creation - no HTTP fallback
    try {
      // Import WebSocket function dynamically
      const { savePlaylistViaWebSocket } = await import('../utils/wledWebSocket.js');
      
      // Generate playlist preset ID
      const timestamp = Date.now();
      const randomComponent = Math.floor(Math.random() * 100);
      const playlistPresetId = 50 + ((timestamp + randomComponent) % 200);
      
      const success = savePlaylistViaWebSocket(
        playlistPresetId,
        finalPlaylistName,
        playlistItems,
        {
          transition: 7,  // 0.7 seconds transition
          repeat: 0       // Infinite repeat
        }
      );

      if (success) {
        const newSavedPlaylist = {
          id: Date.now(),
          name: finalPlaylistName,
          items: playlistItems,
          presetId: playlistPresetId,
          method: 'websocket-only'
        };

        setSavedPlaylists((prev) => [...prev, newSavedPlaylist]);
        
        // Clear current playlist after saving
        setCurrentPlaylist([]);

        console.log("✅ Playlist saved via WebSocket only:", finalPlaylistName);
        showNotification(
          "success",
          "Playlist Saved!",
          `"${finalPlaylistName}" has been saved to your WLED device via WebSocket.`
        );
      } else {
        throw new Error('WebSocket playlist save failed');
      }
    } catch (error) {
      console.error("❌ Failed to save playlist via WebSocket:", error.message);
      showNotification(
        "error",
        "Save Failed",
        `Could not save playlist via WebSocket: ${error.message || 'WebSocket not connected'}`
      );
    }
  };

  // Schedule functions
  const setSchedule = (mode) => {
    setScheduleMode(mode);
    console.log(`Schedule set to: ${mode}`);
    // Reset last check time to allow immediate schedule application
    setLastScheduleCheck(null);
    // Force immediate schedule check when mode changes  
    setTimeout(() => checkAndApplySchedule(), 100); // Small delay to ensure state update
  };

  // Manual override functions for testing
  const manualTurnOn = async () => {
    if (!activeDevice?.isConnected) {
      showNotification('error', 'Device Offline', 'Cannot control disconnected device');
      return;
    }
    
    console.log('🔧 Manual Override: Turning lights ON');
    const result = await turnWledOn(activeDevice.ip, activeDevice.protocol || "http");
    if (result.success) {
      showNotification('success', 'Manual Control', 'Lights turned ON manually');
    } else {
      showNotification('error', 'Control Failed', result.message);
    }
  };

  const manualTurnOff = async () => {
    if (!activeDevice?.isConnected) {
      showNotification('error', 'Device Offline', 'Cannot control disconnected device');
      return;
    }
    
    console.log('🔧 Manual Override: Turning lights OFF');
    const result = await turnWledOff(activeDevice.ip, activeDevice.protocol || "http");
    if (result.success) {
      showNotification('success', 'Manual Control', 'Lights turned OFF manually');
    } else {
      showNotification('error', 'Control Failed', result.message);
    }
  };

  // Debug function to test schedule logic
  const testScheduleLogic = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const shouldBeOn = shouldLightsBeOn();
    
    console.log('🧪 SCHEDULE DEBUG:');
    console.log(`🕐 Current time: ${now.toLocaleString()}`);
    console.log(`🕐 Current hour: ${currentHour}`);
    console.log(`📅 Schedule mode: ${scheduleMode}`);
    console.log(`💡 Should lights be on: ${shouldBeOn}`);
    
    console.log(`📱 Active device: ${activeDevice?.name || 'none'}`);
    console.log(`🌐 Device connected: ${activeDevice?.isConnected || false}`);
    
    if (scheduleMode === "day") {
      console.log(`☀️ DAY MODE: Lights should be ON from 7am-7pm (7-19)`);
      console.log(`☀️ Current evaluation: ${currentHour >= 7 && currentHour < 19 ? 'ON' : 'OFF'}`);
    } else if (scheduleMode === "night") {
      console.log(`🌙 NIGHT MODE: Lights should be ON from 7pm-7am (19-7)`);
      console.log(`🌙 Current evaluation: ${currentHour >= 19 || currentHour < 7 ? 'ON' : 'OFF'}`);
    }
    
    showNotification('info', 'Schedule Debug', `Current hour: ${currentHour}, Should be: ${shouldBeOn ? 'ON' : 'OFF'}`);
    
    // Immediately run schedule check
    checkAndApplySchedule();
  };


  // Handle first device addition
  const handleAddFirstDevice = () => {
    setShowSettings(true);
    setShowDeviceForm(true);
  };

  // Handle user agreement
  const handleAcceptAgreement = () => {
    const agreementData = {
      accepted: true,
      timestamp: new Date().toISOString(),
      version: "1.0",
    };
    setUserAgreementAccepted(agreementData);
  };

  const handleRejectAgreement = () => {
    // Clear any stored data and show rejection message
    localStorage.removeItem(USER_AGREEMENT_STORAGE_KEY);
    localStorage.removeItem(DEVICES_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_DEVICE_STORAGE_KEY);

    alert("You must accept the terms to use Kolori. The page will now close.");
    window.close();
  };

  // Show user agreement if not accepted
  if (!userAgreementAccepted) {
    return (
      <UserAgreement
        isDark={isDark}
        onAccept={handleAcceptAgreement}
        onReject={handleRejectAgreement}
      />
    );
  }

  // Show welcome page if no devices
  if (devices.length === 0) {
    return (
      <>
        <WelcomePage isDark={isDark} onAddDevice={handleAddFirstDevice} />

        {/* Settings Modal for adding first device */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => {
            setShowSettings(false);
            setShowDeviceForm(false);
            setNewDevice({
              name: "",
              ip: "",
              protocol: "http",
              description: "",
              validating: false,
              validationMessage: "",
              validationError: false,
            });
          }}
          theme={theme}
          onThemeChange={setTheme}
          devices={devices}
          activeDeviceId={activeDeviceId}
          onSetActiveDevice={setActiveDeviceId}
          onRemoveDevice={removeDevice}
          onUpdateDevice={updateDevice}
          showDeviceForm={showDeviceForm}
          onShowDeviceForm={() => setShowDeviceForm(true)}
          onHideDeviceForm={() => {
            setShowDeviceForm(false);
            setNewDevice({
              name: "",
              ip: "",
              protocol: "http",
              description: "",
              validating: false,
              validationMessage: "",
              validationError: false,
            });
          }}
          newDevice={newDevice}
          onNewDeviceChange={setNewDevice}
          onAddDevice={addDevice}
          isDark={isDark}
          scheduleMode={scheduleMode}
          onScheduleChange={setSchedule}

          onManualTurnOn={manualTurnOn}
          onManualTurnOff={manualTurnOff}
          onTestScheduleLogic={testScheduleLogic}
        />
      </>
    );
  }

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
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
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PresetGrid
          activePreset={activePreset}
          onPresetSelect={applyPreset}
          isDark={isDark}
          currentPlaylist={currentPlaylist}
          onShowPlaylist={() => setShowPlaylist(true)}
          activeDevice={activeDevice}
          onCustomEffectUpdate={setCustomEffects}
          savedPlaylists={savedPlaylists}
          onPlaylistEdit={editPlaylist}
          onPlaylistRemove={removePlaylist}
        />

        {/* Modals */}
        <PlaylistModal
          isOpen={showPlaylist}
          onClose={() => setShowPlaylist(false)}
          currentPlaylist={currentPlaylist}
          onAddToPlaylist={addToPlaylist}
          onRemoveFromPlaylist={removeFromPlaylist}
          onReorderPlaylist={reorderPlaylist}
          onSavePlaylist={savePlaylist}
          customEffects={customEffects}
          isDark={isDark}
        />

        <SettingsModal
          isOpen={showSettings}
          onClose={() => {
            setShowSettings(false);
            setNewDevice({
              name: "",
              ip: "",
              protocol: "http",
              description: "",
              validating: false,
              validationMessage: "",
              validationError: false,
            });
          }}
          theme={theme}
          onThemeChange={setTheme}
          devices={devices}
          activeDeviceId={activeDeviceId}
          onSetActiveDevice={setActiveDeviceId}
          onRemoveDevice={removeDevice}
          onUpdateDevice={updateDevice}
          showDeviceForm={showDeviceForm}
          onShowDeviceForm={() => setShowDeviceForm(true)}
          onHideDeviceForm={() => {
            setShowDeviceForm(false);
            setNewDevice({
              name: "",
              ip: "",
              protocol: "http",
              description: "",
              validating: false,
              validationMessage: "",
              validationError: false,
            });
          }}
          newDevice={newDevice}
          onNewDeviceChange={setNewDevice}
          onAddDevice={addDevice}
          isDark={isDark}
          scheduleMode={scheduleMode}
          onScheduleChange={setSchedule}

          onManualTurnOn={manualTurnOn}
          onManualTurnOff={manualTurnOff}
          onTestScheduleLogic={testScheduleLogic}
        />

        {/* Confirmation Modal for Device Deletion */}
        <ConfirmModal
          isOpen={showConfirmDelete}
          onClose={() => {
            setShowConfirmDelete(false);
            setDeviceToDelete(null);
          }}
          onConfirm={confirmRemoveDevice}
          title="Remove Device"
          message={
            deviceToDelete
              ? `Are you sure you want to remove "${deviceToDelete.name}"?\n\nThis will permanently delete the device from your list and cannot be undone.`
              : ""
          }
          confirmText="Remove Device"
          cancelText="Cancel"
          isDark={isDark}
          isDestructive={true}
        />

        {/* Notification */}
        <Notification
          isVisible={notification.isVisible}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={closeNotification}
        />
      </main>
    </div>
  );
}
