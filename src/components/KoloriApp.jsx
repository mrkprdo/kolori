import React, { useState, useEffect } from "react";
import Header from "./Header";
import PresetGrid from "./PresetGrid";
import SchedulerView from "./SchedulerView";
import PlaylistModal from "./PlaylistModal";
import SettingsModal from "./SettingsModal";
import WelcomePage from "./WelcomePage";
import UserAgreement from "./UserAgreement";
import ConfirmModal from "./ConfirmModal";
import { activateWledPreset, activateWledPresetById, activateWledEffect } from "../config/wledApi";
import { SEASONAL_PRESETS } from "../constants/presets";

export default function KoloriApp() {
  // LocalStorage keys
  const DEVICES_STORAGE_KEY = "kolori_devices";
  const ACTIVE_DEVICE_STORAGE_KEY = "kolori_active_device";
  const WLED_VERSION_STORAGE_KEY = "kolori_wled_version";
  const USER_AGREEMENT_STORAGE_KEY = "kolori_user_agreement";

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
  const [currentView, setCurrentView] = useState("presets");
  const [customEffects, setCustomEffects] = useState([]);
  const [theme, setTheme] = useState("system");
  const [wledVersion, setWledVersion] = useState(() =>
    loadFromStorage(WLED_VERSION_STORAGE_KEY, "0.15.x")
  );
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
  const [scheduleMode, setScheduleMode] = useState("off");
  const [showSettings, setShowSettings] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [newDevice, setNewDevice] = useState({
    name: "",
    ip: "",
  });

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

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(DEVICES_STORAGE_KEY, devices);
  }, [devices]);

  useEffect(() => {
    saveToStorage(ACTIVE_DEVICE_STORAGE_KEY, activeDeviceId);
  }, [activeDeviceId]);

  useEffect(() => {
    saveToStorage(WLED_VERSION_STORAGE_KEY, wledVersion);
  }, [wledVersion]);

  useEffect(() => {
    saveToStorage(USER_AGREEMENT_STORAGE_KEY, userAgreementAccepted);
  }, [userAgreementAccepted]);

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

  // Device validation function
  const validateDeviceUrl = async (ip) => {
    try {
      // First check basic HTTP connectivity
      const connectivityResponse = await fetch(`http://${ip}`, {
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
      const wledResponse = await fetch(`http://${ip}/json/info`, {
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
        const validation = await validateDeviceUrl(newDevice.ip);

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

  const updateDevice = (deviceId, updates) => {
    setDevices(
      devices.map((d) => (d.id === deviceId ? { ...d, ...updates } : d))
    );
  };

  const connectToDevice = async (deviceId) => {
    updateDevice(deviceId, {
      isConnected: !devices.find((d) => d.id === deviceId)?.isConnected,
    });
    console.log(`Toggling connection to device ${deviceId}`);
  };

  // Preset and playlist functions
  const applyPreset = async (presetId) => {
    // First check seasonal presets
    const seasonalPreset = SEASONAL_PRESETS.find(p => p.id === presetId);
    
    if (seasonalPreset) {
      if (!activeDevice) {
        console.log(`No active device`);
        return;
      }

      console.log(`Applying preset "${seasonalPreset.name}" to device ${activeDevice.ip}`);
      
      // Call WLED API to activate preset
      const result = await activateWledPreset(activeDevice.ip, seasonalPreset.name);
      
      if (result.success) {
        updateDevice(activeDeviceId, { activePreset: presetId });
        console.log(`Successfully activated preset: ${seasonalPreset.name}`);
      } else {
        console.error(`Failed to activate preset: ${result.message}`);
      }
      return;
    }

    // Check custom effects
    const customEffect = customEffects.find(e => e.id === presetId);
    
    if (customEffect) {
      if (!activeDevice) {
        console.log(`No active device`);
        return;
      }

      console.log(`Applying custom effect "${customEffect.name}" to device ${activeDevice.ip}`);
      
      // Use preset ID if available, otherwise fall back to effect/palette activation
      let result;
      if (customEffect.presetId) {
        result = await activateWledPresetById(activeDevice.ip, customEffect.presetId);
      } else {
        // Fallback for effects created before preset integration
        result = await activateWledEffect(activeDevice.ip, customEffect.effectId, customEffect.paletteId);
      }
      
      if (result.success) {
        updateDevice(activeDeviceId, { activePreset: presetId });
        console.log(`Successfully activated custom effect: ${customEffect.name}`);
      } else {
        console.error(`Failed to activate custom effect: ${result.message}`);
      }
      return;
    }

    // Unknown preset ID
    console.log(`Unknown preset ID: ${presetId}`);
    updateDevice(activeDeviceId, { activePreset: presetId });
  };

  const togglePlaylist = () => {
    const newPlayingState = !isPlaying;
    updateDevice(activeDeviceId, { isPlaying: newPlayingState });
  };

  const addToPlaylist = (preset) => {
    setCurrentPlaylist([...currentPlaylist, { ...preset, duration: 30 }]);
  };

  const removeFromPlaylist = (index) => {
    setCurrentPlaylist(currentPlaylist.filter((_, i) => i !== index));
  };

  // Schedule functions
  const setSchedule = (mode) => {
    setScheduleMode(mode);
    console.log(`Schedule set to: ${mode}`);
  };

  // View navigation
  const showScheduler = () => setCurrentView("scheduler");
  const showPresets = () => setCurrentView("presets");

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
    localStorage.removeItem(WLED_VERSION_STORAGE_KEY);

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
          onConnectDevice={connectToDevice}
          onRemoveDevice={removeDevice}
          showDeviceForm={showDeviceForm}
          onShowDeviceForm={() => setShowDeviceForm(true)}
          onHideDeviceForm={() => {
            setShowDeviceForm(false);
            setNewDevice({
              name: "",
              ip: "",
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
          wledVersion={wledVersion}
          onWledVersionChange={setWledVersion}
        />
      </>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
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
      {currentView === "presets" && (
        <>
          <PresetGrid
            activePreset={activePreset}
            onPresetSelect={applyPreset}
            isDark={isDark}
            isPlaying={isPlaying}
            currentPlaylist={currentPlaylist}
            onShowPlaylist={() => setShowPlaylist(true)}
            onShowScheduler={showScheduler}
            activeDevice={activeDevice}
            onCustomEffectUpdate={setCustomEffects}
          />
        </>
      )}

      {currentView === "scheduler" && (
        <SchedulerView
          scheduleMode={scheduleMode}
          onScheduleChange={setSchedule}
          onBack={showPresets}
          isDark={isDark}
        />
      )}

      {/* Modals */}
      <PlaylistModal
        isOpen={showPlaylist}
        onClose={() => setShowPlaylist(false)}
        currentPlaylist={currentPlaylist}
        isPlaying={isPlaying}
        onTogglePlaylist={togglePlaylist}
        onAddToPlaylist={addToPlaylist}
        onRemoveFromPlaylist={removeFromPlaylist}
        isDark={isDark}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          setNewDevice({
            name: "",
            ip: "",
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
        onConnectDevice={connectToDevice}
        onRemoveDevice={removeDevice}
        showDeviceForm={showDeviceForm}
        onShowDeviceForm={() => setShowDeviceForm(true)}
        onHideDeviceForm={() => {
          setShowDeviceForm(false);
          setNewDevice({
            name: "",
            ip: "",
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
        wledVersion={wledVersion}
        onWledVersionChange={setWledVersion}
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
    </div>
  );
}
