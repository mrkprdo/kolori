import {
  connectWebSocket,
  disconnectWebSocket,
  setWebSocketCallbacks,
  sendWebSocketCommand,
} from "../utils/wledWebSocket";
import { logger } from "../utils/logger";
import { useState, useEffect, useRef } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import Header from "./Header";
import PresetGrid from "./PresetGrid";
import PlaylistModal from "./PlaylistModal";
import SettingsModal from "./SettingsModal";
import WelcomePage from "./WelcomePage";
import UserAgreement from "./UserAgreement";
import MixedContentProtection from "./MixedContentProtection";
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
  getWledPresets,
} from "../config/wledApi";
import { SEASONAL_PRESETS } from "../constants/presets";

export default function KoloriApp() {
  // LocalStorage keys
  const DEVICES_STORAGE_KEY = "kolori_devices";
  const ACTIVE_DEVICE_STORAGE_KEY = "kolori_active_device";
  const USER_AGREEMENT_STORAGE_KEY = "kolori_user_agreement";
  const SCHEDULE_MODE_STORAGE_KEY = "kolori_schedule_mode";
  const PLAYLISTS_STORAGE_KEY = "kolori_playlists";

  // LocalStorage helper functions
  const loadFromStorage = (key, defaultValue) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const saveToStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Silently handle localStorage errors
    }
  };

  // State management with localStorage initialization
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
  const [mixedContentAccepted, setMixedContentAccepted] = useState(() =>
    loadFromStorage("kolori_mixed_content_accepted", false)
  );
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [savedPlaylists, setSavedPlaylists] = useState(() =>
    loadFromStorage(PLAYLISTS_STORAGE_KEY, [])
  );
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
    mdns: "",
    protocol: "http",
  });
  const [filterTerm, setFilterTerm] = useState("");
  const [liveLedData, setLiveLedData] = useState([]);

  // Use ref to track current devices for heartbeat monitoring
  const devicesRef = useRef(devices);
  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  // One-time startup log and mixed content detection
  useEffect(() => {
    logger.log("🎉 KoloriApp initialized in development mode");

    // Detect if we're in an iframe and running over HTTPS
    if (window.self !== window.top && location.protocol === "https:") {
      logger.log(
        "🔒 Running in iframe with HTTPS - mixed content protection active"
      );
    }

    // Set up global error handler for mixed content issues
    window.addEventListener("error", (event) => {
      if (event.message && event.message.includes("mixed content")) {
        logger.error("Mixed content error detected:", event.message);

        // Notify parent frame if we're in an iframe
        if (window.parent !== window.self) {
          window.parent.postMessage(
            {
              type: "MIXED_CONTENT_ERROR",
              url: event.filename || "unknown",
              message: event.message,
            },
            "*"
          );
        }
      }
    });
  }, []);

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
    logger.log(
      "🚀 KoloriApp: Configuring status bar for theme:",
      isDark ? "dark" : "light"
    );
    const configureStatusBar = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Disable overlay to prevent overlap with content
          await StatusBar.setOverlaysWebView({ overlay: false });

          // Set status bar style based on theme
          await StatusBar.setStyle({
            style: isDark ? Style.Dark : Style.Light,
          });

          // Set background color to match app theme
          await StatusBar.setBackgroundColor({ 
            color: isDark ? "#111827" : "#F9FAFB" 
          });
        } catch {
          // StatusBar not available in non-mobile environments
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
        } else if (!wasConnected && isConnected) {
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
        },
        onMessage: (data) => {
          if (data instanceof ArrayBuffer) {
            // Handle binary data (live LED data)
            const byteArray = new Uint8Array(data);
            const colors = [];
            let bytesPerLed = 3; // Default to RGB

            // Heuristic: if array length is divisible by 4, it might be RGBW
            if (byteArray.length > 0 && byteArray.length % 4 === 0) {
              bytesPerLed = 4;
            }

            for (let i = 0; i < byteArray.length; i += bytesPerLed) {
              colors.push({
                g: byteArray[i],
                b: byteArray[i + 1],
                r: byteArray[i + 2],
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
            "error",
            "Connection Lost",
            `WebSocket connection to ${activeDevice.name} failed.`
          );
        },
      });

      // Connect with a short delay to ensure callbacks are set
      wsConnectTimer = setTimeout(() => {
        const wsProtocol = activeDevice.protocol === "https" ? "wss" : "ws";
        connectWebSocket(getDeviceAddress(activeDevice), wsProtocol);
      }, 1000);

      // Fetch presets and playlists when active device is connected
      fetchWledPresets();
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
    if (!activeDevice) {
      return;
    }

    if (!activeDevice.isConnected) {
      return;
    }

    const shouldBeOn = shouldLightsBeOn();
    const currentTime = new Date().toISOString();

    // Only apply if this is a new schedule decision (avoid spam)
    if (
      lastScheduleCheck &&
      Math.abs(new Date() - new Date(lastScheduleCheck)) < 60000
    ) {
      return;
    }

    setLastScheduleCheck(currentTime);

    try {
      if (shouldBeOn) {
        const result = await turnWledOn(
          getDeviceAddress(activeDevice),
          activeDevice.protocol || "http"
        );
        if (result.success) {
        } else {
          logger.error(
            `❌ Schedule: Failed to turn lights ON - ${result.message}`
          );
        }
      } else {
        const result = await turnWledOff(
          getDeviceAddress(activeDevice),
          activeDevice.protocol || "http"
        );
        if (result.success) {
        } else {
          logger.error(
            `❌ Schedule: Failed to turn lights OFF - ${result.message}`
          );
        }
      }
    } catch (error) {
      logger.error("📅 Schedule enforcement error:", error);
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

  // Device validation function with mDNS support
  const validateDevice = async (ip, mdns, protocol = "http") => {
    try {
      // Import the connectivity testing function
      const { findBestDeviceAddress } = await import("../config/wledApi.js");

      logger.log("🔍 Testing device connectivity:", { ip, mdns, protocol });

      // Test both IP and mDNS addresses
      const result = await findBestDeviceAddress(ip, mdns, protocol);

      if (result.success) {
        logger.log(
          "✅ Device found:",
          result.bestAddress,
          result.deviceInfo?.name
        );
        return {
          success: true,
          bestAddress: result.bestAddress,
          responseTime: result.responseTime,
          deviceInfo: result.deviceInfo,
          message: `WLED device found: ${
            result.deviceInfo?.name || "Unknown"
          } via ${result.bestAddress} (${result.responseTime}ms)`,
          allResults: result.allResults,
        };
      } else {
        logger.log("❌ Device validation failed:", result.message);
        return {
          success: false,
          message: result.details || result.message,
        };
      }
    } catch (error) {
      logger.error("💥 Device validation error:", error);
      return {
        success: false,
        message: `Validation failed: ${error.message}`,
      };
    }
  };

  // IP address validation function
  const isValidIP = (ip) => {
    const ipPattern =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipPattern.test(ip);
  };

  // Helper to get the best device address (prioritizes bestAddress, falls back to IP)
  const getDeviceAddress = (device) => {
    if (!device) return null;
    return device.bestAddress || device.ip;
  };

  // Device management functions
  const addDevice = async () => {
    logger.log(
      "➕ Adding new device:",
      newDevice.name,
      "IP:",
      newDevice.ip,
      "mDNS:",
      newDevice.mdns
    );

    // Validate that we have name and at least one connection method
    if (!newDevice.name || (!newDevice.ip && !newDevice.mdns)) {
      setNewDevice((prev) => ({
        ...prev,
        validationMessage:
          "Please provide a device name and at least an IP address or mDNS name.",
        validationError: true,
      }));
      return;
    }

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

      // Check for duplicate IP address (if provided)
      if (newDevice.ip) {
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
      }

      // Check for duplicate mDNS name (if provided)
      if (newDevice.mdns) {
        const duplicateMdns = devices.find(
          (device) => device.mdns === newDevice.mdns
        );
        if (duplicateMdns) {
          setNewDevice((prev) => ({
            ...prev,
            validating: false,
            validationMessage: `mDNS name ${newDevice.mdns} is already in use by device "${duplicateMdns.name}".`,
            validationError: true,
          }));
          return;
        }
      }

      // Show connecting screen
      setNewDevice((prev) => ({
        ...prev,
        validating: true,
        validationMessage: "Testing device connectivity...",
        validationError: false,
      }));

      // Test device connectivity with both IP and mDNS
      const validation = await validateDevice(
        newDevice.ip,
        newDevice.mdns,
        newDevice.protocol
      );

      if (validation.success) {
        // Show success message briefly before adding device
        setNewDevice((prev) => ({
          ...prev,
          validationMessage: `WLED device confirmed via ${validation.bestAddress}! Adding to devices...`,
        }));

        // Short delay to show success message
        await new Promise((resolve) => setTimeout(resolve, 800));

        const device = {
          id: Date.now(),
          name: newDevice.name,
          ip: newDevice.ip || validation.bestAddress, // Use best address if no IP provided
          mdns: newDevice.mdns,
          bestAddress: validation.bestAddress, // Store the working address
          protocol: newDevice.protocol,
          description: newDevice.description,
          isConnected: true,
          autoBrightness: true,
          maxBrightness: 80,
          activePreset: null,
          isPlaying: false,
          wledInfo: validation.deviceInfo || null,
          responseTime: validation.responseTime,
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
          mdns: "",
          protocol: "http",
          description: "",
          validating: false,
          validationMessage: "",
        });
        setShowDeviceForm(false);

        logger.log(
          "✅ Device added successfully:",
          device.name,
          "via",
          device.bestAddress
        );
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
        validationMessage: "Unexpected error occurred during device validation",
        validationError: true,
      }));
      logger.error("💥 Device addition error:", error);
    }
  };

  const removeDevice = (deviceId) => {
    const deviceToRemove = devices.find((d) => d.id === deviceId);
    if (!deviceToRemove) return;

    logger.log("🗑️ Initiating device removal:", deviceToRemove.name);
    // Show confirmation modal instead of browser confirm
    setDeviceToDelete(deviceToRemove);
    setShowConfirmDelete(true);
  };

  const confirmRemoveDevice = () => {
    if (!deviceToDelete) return;

    logger.log("✅ Device removal confirmed:", deviceToDelete.name);

    const updatedDevices = devices.filter((d) => d.id !== deviceToDelete.id);
    setDevices(updatedDevices);

    // If we're removing the active device, set a new active device
    if (activeDeviceId === deviceToDelete.id) {
      setActiveDeviceId(
        updatedDevices.length > 0 ? updatedDevices[0].id : null
      );
    }

    // Clean up state
    setDeviceToDelete(null);
  };

  // Preset and playlist functions
  const applyPreset = async (presetId) => {
    logger.log(
      "🎨 Applying preset:",
      presetId,
      "to device:",
      activeDevice?.name
    );

    // Check if active device is connected
    if (!activeDevice) {
      logger.warn("No active device selected");
      return;
    }

    if (!activeDevice.isConnected) {
      logger.warn("Device not connected:", activeDevice.name);
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
        return;
      }

      // Call WLED API to activate preset
      const result = await activateWledPreset(
        getDeviceAddress(activeDevice),
        seasonalPreset.name,
        activeDevice.protocol || "http"
      );

      if (result.success) {
        updateDevice(activeDeviceId, { activePreset: seasonalPreset.id }); // Use seasonalPreset.id
        sendWebSocketCommand({ lv: true }); // Send live view command
      } else {
        logger.error(`Failed to activate preset: ${result.message}`);
      }
      return;
    }

    // Check custom effects
    const customEffect = customEffects.find((e) => e.id === presetId);

    if (customEffect) {
      if (!activeDevice) {
        return;
      }

      // Use preset ID if available, otherwise fall back to effect/palette activation
      let result;
      if (customEffect.presetId) {
        result = await activateWledPresetById(
          getDeviceAddress(activeDevice),
          customEffect.presetId,
          activeDevice.protocol || "http"
        );
      } else {
        // Fallback for effects created before preset integration
        result = await activateWledEffect(
          getDeviceAddress(activeDevice),
          customEffect.effectId,
          customEffect.paletteId,
          activeDevice.protocol || "http"
        );
      }

      if (result.success) {
        updateDevice(activeDeviceId, { activePreset: customEffect.id }); // Use customEffect.id
        sendWebSocketCommand({ lv: true }); // Send live view command
      } else {
        logger.error(`Failed to activate custom effect: ${result.message}`);
      }
      return;
    }

    // Unknown preset ID
    updateDevice(activeDeviceId, { activePreset: presetId });
  };

  const addToPlaylist = (preset) => {
    logger.log("➕ Adding to playlist:", preset.name);
    const playlistItem = {
      ...preset,
      duration: 30,
      playlistItemId: `${preset.id || preset.name}_${Date.now()}`,
    };
    setCurrentPlaylist([...currentPlaylist, playlistItem]);
  };

  const removeFromPlaylist = (index) => {
    const item = currentPlaylist[index];
    logger.log("➖ Removing from playlist:", item?.name || `item ${index}`);
    setCurrentPlaylist(currentPlaylist.filter((_, i) => i !== index));
  };

  const reorderPlaylist = (newPlaylist) => {
    setCurrentPlaylist(newPlaylist);
  };

  const showNotification = (type, title, message) => {
    logger.log("📢 Notification:", type, title, message);

    // Clear any existing notification first
    setNotification({
      isVisible: false,
      type: "success",
      title: "",
      message: "",
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

  const closeNotification = () => {
    setNotification({
      isVisible: false,
      type: "success",
      title: "",
      message: "",
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
  };

  const removePlaylist = async (playlistId) => {
    const playlist = savedPlaylists.find((p) => p.id === playlistId);
    if (!playlist) {
      logger.error("Playlist not found:", playlistId);
      return;
    }

    if (!activeDevice?.isConnected) {
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
          showNotification(
            "success",
            "Playlist Deleted",
            `"${playlist.name}" has been removed from your WLED device.`
          );
        } else {
          showNotification(
            "warning",
            "Partial Deletion",
            `"${playlist.name}" removed locally but may still exist on WLED device.`
          );
        }
      } else {
      }
    } catch (error) {
      logger.error("❌ Error deleting playlist from device:", error.message);
      showNotification(
        "warning",
        "Deletion Error",
        `Error removing "${playlist.name}" from device, but removed locally.`
      );
    }

    // Always remove from local state
    setSavedPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  };

  const applyPlaylist = async (playlistId) => {
    const playlistToActivate = savedPlaylists.find((p) => p.id === playlistId);

    if (!playlistToActivate) {
      logger.error("Playlist not found:", playlistId);
      showNotification(
        "error",
        "Playlist Error",
        "Selected playlist not found."
      );
      return;
    }

    if (!activeDevice?.isConnected) {
      showNotification(
        "error",
        "Device Offline",
        `${
          activeDevice?.name || "Device"
        } is disconnected. Please check your device connection.`
      );
      return;
    }

    if (
      playlistToActivate.presetId === undefined ||
      playlistToActivate.presetId === null
    ) {
      logger.error("Playlist has no associated preset ID:", playlistToActivate);
      showNotification(
        "error",
        "Playlist Error",
        "Selected playlist cannot be activated (missing preset ID)."
      );
      return;
    }

    try {
      const result = await activateWledPresetById(
        getDeviceAddress(activeDevice),
        playlistToActivate.presetId,
        activeDevice.protocol || "http"
      );

      if (result.success) {
        updateDevice(activeDeviceId, {
          activePreset: playlistToActivate.id,
          isPlaying: true,
        }); // Use playlistToActivate.id
        showNotification(
          "success",
          "Playlist Activated",
          `"${playlistToActivate.name}" is now playing.`
        );
        sendWebSocketCommand({ lv: true }); // Send live view command
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      logger.error("❌ Failed to activate playlist:", error.message);
      showNotification(
        "error",
        "Activation Failed",
        `Could not activate playlist: ${error.message}`
      );
    }
  };

  const savePlaylist = async (playlistName) => {
    if (currentPlaylist.length === 0) {
      showNotification(
        "error",
        "Empty Playlist",
        "Add some custom effects to your playlist before saving."
      );
      return;
    }

    if (!activeDevice?.isConnected) {
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
    const missingPresetIds = playlistItems.filter((item) => !item.presetId);
    if (missingPresetIds.length > 0) {
      logger.error("Some playlist items missing preset IDs:", missingPresetIds);
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
      const { savePlaylistViaWebSocket } = await import(
        "../utils/wledWebSocket.js"
      );

      // Generate playlist preset ID
      const timestamp = Date.now();
      const randomComponent = Math.floor(Math.random() * 100);
      const playlistPresetId = 50 + ((timestamp + randomComponent) % 200);

      const success = savePlaylistViaWebSocket(
        playlistPresetId,
        finalPlaylistName,
        playlistItems,
        {
          transition: 7, // 0.7 seconds transition
          repeat: 0, // Infinite repeat
        }
      );

      if (success) {
        const newSavedPlaylist = {
          id: Date.now(),
          name: finalPlaylistName,
          items: playlistItems,
          presetId: playlistPresetId,
          method: "websocket-only",
        };

        setSavedPlaylists((prev) => [...prev, newSavedPlaylist]);

        // Clear current playlist after saving
        setCurrentPlaylist([]);

        showNotification(
          "success",
          "Playlist Saved!",
          `"${finalPlaylistName}" has been saved to your WLED device via WebSocket.`
        );
      } else {
        throw new Error("WebSocket playlist save failed");
      }
    } catch (error) {
      logger.error("❌ Failed to save playlist via WebSocket:", error.message);
      showNotification(
        "error",
        "Save Failed",
        `Could not save playlist via WebSocket: ${
          error.message || "WebSocket not connected"
        }`
      );
    }
  };

  // Schedule functions
  const setSchedule = (mode) => {
    setScheduleMode(mode);
    // Reset last check time to allow immediate schedule application
    setLastScheduleCheck(null);
    // Force immediate schedule check when mode changes
    setTimeout(() => checkAndApplySchedule(), 100); // Small delay to ensure state update
  };

  // Manual override functions for testing
  const manualTurnOn = async () => {
    if (!activeDevice?.isConnected) {
      showNotification(
        "error",
        "Device Offline",
        "Cannot control disconnected device"
      );
      return;
    }

    const result = await turnWledOn(
      getDeviceAddress(activeDevice),
      activeDevice.protocol || "http"
    );
    if (result.success) {
      showNotification(
        "success",
        "Manual Control",
        "Lights turned ON manually"
      );
    } else {
      showNotification("error", "Control Failed", result.message);
    }
  };

  const manualTurnOff = async () => {
    if (!activeDevice?.isConnected) {
      showNotification(
        "error",
        "Device Offline",
        "Cannot control disconnected device"
      );
      return;
    }

    const result = await turnWledOff(
      getDeviceAddress(activeDevice),
      activeDevice.protocol || "http"
    );
    if (result.success) {
      showNotification(
        "success",
        "Manual Control",
        "Lights turned OFF manually"
      );
    } else {
      showNotification("error", "Control Failed", result.message);
    }
  };

  // Debug function to test schedule logic
  const testScheduleLogic = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const shouldBeOn = shouldLightsBeOn();

    showNotification(
      "info",
      "Schedule Debug",
      `Current hour: ${currentHour}, Should be: ${shouldBeOn ? "ON" : "OFF"}`
    );

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
    logger.log("✅ User agreement accepted");
    const agreementData = {
      accepted: true,
      timestamp: new Date().toISOString(),
      version: "1.0",
    };
    setUserAgreementAccepted(agreementData);
    saveToStorage(USER_AGREEMENT_STORAGE_KEY, agreementData);
  };

  const handleRejectAgreement = () => {
    logger.log("❌ User agreement rejected");
    // Clear any stored data and show rejection message
    localStorage.removeItem(USER_AGREEMENT_STORAGE_KEY);
    localStorage.removeItem(DEVICES_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_DEVICE_STORAGE_KEY);

    alert("You must accept the terms to use Kolori. The page will now close.");
    window.close();
  };

  const handleAcceptMixedContent = () => {
    logger.log("🔒 Mixed content protection accepted");
    setMixedContentAccepted(true);
    saveToStorage("kolori_mixed_content_accepted", true);
  };

  // Helper functions for custom effects management
  const CUSTOM_EFFECTS_STORAGE_KEY = "kolori_custom_effects";

  const loadCustomEffectsFromStorage = () => {
    try {
      const stored = localStorage.getItem(CUSTOM_EFFECTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.warn("Failed to load custom effects from localStorage:", error);
      return [];
    }
  };

  const saveCustomEffectsToStorage = (effects) => {
    try {
      localStorage.setItem(CUSTOM_EFFECTS_STORAGE_KEY, JSON.stringify(effects));
    } catch (error) {
      logger.warn("Failed to save custom effects to localStorage:", error);
    }
  };

  // Initialize custom effects from localStorage
  const [customEffects, setCustomEffects] = useState(() =>
    loadCustomEffectsFromStorage()
  );

  const handleAddCustomEffect = (newEffect) => {
    setCustomEffects((prevEffects) => {
      const updatedEffects = [...prevEffects, newEffect];
      saveCustomEffectsToStorage(updatedEffects);
      return updatedEffects;
    });
  };

  const handleRemoveCustomEffect = async (effectId) => {
    const effect = customEffects.find((e) => e.id === effectId);
    if (!effect) {
      logger.warn(`Cannot remove effect: No effect found with id ${effectId}`);
      return;
    }

    if (!activeDevice?.isConnected) {
      logger.warn("Device offline - removing effect locally only");
      // Still allow local removal even if device is offline
      setCustomEffects((prev) => {
        const updated = prev.filter((e) => e.id !== effectId);
        saveCustomEffectsToStorage(updated);
        return updated;
      });
      return;
    }

    try {
      // Try to delete from WLED device via WebSocket if it has a preset ID
      if (effect.presetId) {
        logger.log(`Attempting to delete WLED preset ${effect.presetId} via WebSocket for effect "${effect.name}"`);
        const result = await deleteWledPlaylistViaWebSocket(
          effect.presetId,
          effect.name
        );

        if (result.success) {
          logger.log(`Successfully deleted WLED preset ${effect.presetId} via WebSocket`);
        } else {
          logger.warn(`WebSocket deletion failed: ${result.message}`);
        }
      }
    } catch (error) {
      logger.error("Error deleting custom effect from WLED device:", error);
    }

    // Always remove from local state
    setCustomEffects((prev) => {
      const updated = prev.filter((e) => e.id !== effectId);
      logger.log(`Removed custom effect "${effect.name}" from local state`);
      saveCustomEffectsToStorage(updated);
      return updated;
    });
  };

  const handleUpdateCustomEffects = (updatedEffects) => {
    setCustomEffects(updatedEffects);
    saveCustomEffectsToStorage(updatedEffects);
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
        // Update custom effects with fetched presets and save to localStorage
        const EXCLUDE_PREFIXES = [
          "preset 0",
          "autumn-",
          "xmas-",
          "canada day-",
        ];

        const fetchedPresets = (result.presets || []).filter((effect) => {
          const effectNameLower = effect.name.toLowerCase();
          return !EXCLUDE_PREFIXES.some((prefix) =>
            effectNameLower.startsWith(prefix)
          );
        });
        setCustomEffects(fetchedPresets);
        saveCustomEffectsToStorage(fetchedPresets);

        // Update saved playlists with fetched playlists and save to localStorage
        const fetchedPlaylists = (result.playlists || []).filter((playlist) => {
          const playlistNameLower = playlist.name.toLowerCase();
          return !EXCLUDE_PREFIXES.some((prefix) =>
            playlistNameLower.startsWith(prefix)
          );
        });
        setSavedPlaylists(fetchedPlaylists);
        saveToStorage(PLAYLISTS_STORAGE_KEY, fetchedPlaylists);

        if (fetchedPresets.length > 0 || fetchedPlaylists.length > 0) {
          const totalItems =
            (fetchedPresets.length || 0) + (fetchedPlaylists.length || 0);
          const itemType =
            fetchedPresets.length > 0 && fetchedPlaylists.length > 0
              ? "presets and playlists"
              : fetchedPresets.length > 0
              ? "presets"
              : "playlists";

          showNotification(
            "success",
            "Presets Imported",
            `Successfully imported ${totalItems} ${itemType} from your WLED device.`
          );
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      logger.error("❌ Failed to fetch WLED presets:", error.message);
      showNotification(
        "error",
        "Import Failed",
        `Could not fetch presets: ${error.message}`
      );
    }
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

  // Show mixed content protection info after EULA
  if (!mixedContentAccepted) {
    return (
      <MixedContentProtection
        isDark={isDark}
        onAccept={handleAcceptMixedContent}
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
          onFetchWledPresets={fetchWledPresets}
        />
      </>
    );
  }

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}
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
          customEffects={customEffects}
          onAddCustomEffect={handleAddCustomEffect}
          onRemoveCustomEffect={handleRemoveCustomEffect}
          onCustomEffectUpdate={handleUpdateCustomEffects}
          savedPlaylists={savedPlaylists}
          onPlaylistEdit={editPlaylist}
          onPlaylistRemove={removePlaylist}
          onPlaylistSelect={applyPlaylist}
          setShowSettings={setShowSettings}
          filterTerm={filterTerm}
          setFilterTerm={setFilterTerm}
          liveLedData={liveLedData}
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
          onFetchWledPresets={fetchWledPresets}
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
          isDark={isDark}
        />
      </main>
    </div>
  );
}
