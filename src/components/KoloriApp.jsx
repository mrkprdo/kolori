import React, { useState, useEffect } from "react";
import Header from "./Header";
import PresetGrid from "./PresetGrid";
import SchedulerView from "./SchedulerView";
import PlaylistModal from "./PlaylistModal";
import SettingsModal from "./SettingsModal";
import WelcomePage from "./WelcomePage";
import UserAgreement from "./UserAgreement";

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
  const [theme, setTheme] = useState("system");
  const [wledVersion, setWledVersion] = useState(() => 
    loadFromStorage(WLED_VERSION_STORAGE_KEY, "0.14.1")
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
      const activeDeviceExists = devices.some(device => device.id === activeDeviceId);
      if (!activeDeviceExists) {
        setActiveDeviceId(devices[0].id);
      }
    } else {
      setActiveDeviceId(null);
    }
  }, [devices, activeDeviceId]);

  // Device management functions
  const addDevice = () => {
    if (newDevice.name && newDevice.ip) {
      const device = {
        id: Date.now(),
        name: newDevice.name,
        ip: newDevice.ip,
        isConnected: false,
        autoBrightness: true,
        maxBrightness: 80,
        activePreset: null,
        isPlaying: false,
      };
      const updatedDevices = [...devices, device];
      setDevices(updatedDevices);
      
      // If this is the first device, make it active
      if (devices.length === 0) {
        setActiveDeviceId(device.id);
      }
      
      setNewDevice({ name: "", ip: "" });
      setShowDeviceForm(false);
      console.log(`Added device: ${device.name} at ${device.ip}`);
    }
  };

  const removeDevice = (deviceId) => {
    const updatedDevices = devices.filter((d) => d.id !== deviceId);
    setDevices(updatedDevices);
    
    // If we're removing the active device, set a new active device
    if (activeDeviceId === deviceId) {
      setActiveDeviceId(updatedDevices.length > 0 ? updatedDevices[0].id : null);
    }
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
  const applyPreset = (presetId) => {
    console.log(`Applying preset ${presetId} to device ${activeDeviceId}`);
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
      version: "1.0"
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
          onHideDeviceForm={() => setShowDeviceForm(false)}
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
        onClose={() => setShowSettings(false)}
        theme={theme}
        onThemeChange={setTheme}
        devices={devices}
        activeDeviceId={activeDeviceId}
        onSetActiveDevice={setActiveDeviceId}
        onConnectDevice={connectToDevice}
        onRemoveDevice={removeDevice}
        showDeviceForm={showDeviceForm}
        onShowDeviceForm={() => setShowDeviceForm(true)}
        onHideDeviceForm={() => setShowDeviceForm(false)}
        newDevice={newDevice}
        onNewDeviceChange={setNewDevice}
        onAddDevice={addDevice}
        isDark={isDark}
        wledVersion={wledVersion}
        onWledVersionChange={setWledVersion}
      />
    </div>
  );
}
