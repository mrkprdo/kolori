import { useState, useCallback } from 'react';
import { Device, Settings } from '../types';
import {
  loadDevices,
  saveDevices,
  loadActiveDeviceId,
  saveActiveDeviceId,
  loadDeviceSeasonalPresets,
  saveDeviceSeasonalPresets,
  hasDeviceSeasonalPresets
} from '../utils/storage';
import { DEFAULT_SEASONAL_PRESETS } from '../constants/defaults';

export interface UseDeviceManagementReturn {
  devices: Device[];
  activeDeviceId: number | null;
  activeDevice: Device | null;
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  setActiveDeviceId: React.Dispatch<React.SetStateAction<number | null>>;
  handleAddDevice: (device: Device, settings: Settings | null, updateSettings: (newSettings: Settings) => void) => Promise<void>;
  handleUpdateDevice: (deviceId: number, updates: Partial<Device>) => void;
  handleDeleteDevice: (deviceId: number, settings: Settings | null, updateSettings: (newSettings: Settings) => void) => Promise<void>;
  handleSetActiveDeviceId: (id: number | null, settings: Settings | null, updateSettings: (newSettings: Settings) => void) => Promise<void>;
  loadInitialDevices: () => Promise<{ devices: Device[]; activeDeviceId: number | null }>;
}

/**
 * Custom hook to manage device state and operations
 */
export function useDeviceManagement(): UseDeviceManagementReturn {
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<number | null>(null);

  // Derive active device from devices and activeDeviceId
  const activeDevice = activeDeviceId
    ? devices.find(device => device.id === activeDeviceId) || null
    : null;

  /**
   * Load initial devices and active device ID from storage
   */
  const loadInitialDevices = useCallback(async () => {
    const [loadedDevices, loadedActiveId] = await Promise.all([
      loadDevices(),
      loadActiveDeviceId(),
    ]);

    setDevices(loadedDevices);
    setActiveDeviceId(loadedActiveId);

    return { devices: loadedDevices, activeDeviceId: loadedActiveId };
  }, []);

  /**
   * Add a new device and set it as active
   */
  const handleAddDevice = useCallback(async (
    device: Device,
    settings: Settings | null,
    updateSettings: (newSettings: Settings) => void
  ) => {
    // Update devices list
    setDevices(prevDevices => {
      const newDevices = [...prevDevices, device];
      saveDevices(newDevices);
      return newDevices;
    });

    try {
      // Check if device has existing seasonal presets
      const hasExistingPresets = await hasDeviceSeasonalPresets(device);
      let deviceSeasonalPresets;

      if (hasExistingPresets) {
        // Load existing presets
        deviceSeasonalPresets = await loadDeviceSeasonalPresets(device);
      } else {
        // Initialize with default presets
        await saveDeviceSeasonalPresets(device, DEFAULT_SEASONAL_PRESETS);
        deviceSeasonalPresets = DEFAULT_SEASONAL_PRESETS;
      }

      // Set as active device
      setActiveDeviceId(device.id);
      saveActiveDeviceId(device.id);

      // Update settings with device presets
      if (settings) {
        updateSettings({
          ...settings,
          seasonalPresets: deviceSeasonalPresets,
        });
      }
    } catch (error) {
      console.error('Failed to initialize seasonal presets for device:', error);

      // Fallback to defaults
      setActiveDeviceId(device.id);
      saveActiveDeviceId(device.id);

      if (settings) {
        updateSettings({
          ...settings,
          seasonalPresets: DEFAULT_SEASONAL_PRESETS,
        });
      }
    }
  }, []);

  /**
   * Update an existing device
   */
  const handleUpdateDevice = useCallback((deviceId: number, updates: Partial<Device>) => {
    setDevices(prevDevices => {
      const newDevices = prevDevices.map(d =>
        d.id === deviceId ? { ...d, ...updates } : d
      );
      saveDevices(newDevices);
      return newDevices;
    });
  }, []);

  /**
   * Delete a device
   */
  const handleDeleteDevice = useCallback(async (
    deviceId: number,
    settings: Settings | null,
    updateSettings: (newSettings: Settings) => void
  ) => {
    const deviceToDelete = devices.find(d => d.id === deviceId);

    setDevices(prevDevices => {
      const newDevices = prevDevices.filter(d => d.id !== deviceId);
      saveDevices(newDevices);
      return newDevices;
    });

    // Keep device-specific seasonal presets for future use
    // Reset seasonal presets to defaults if active device was deleted
    if (deviceId === activeDeviceId && settings) {
      updateSettings({
        ...settings,
        seasonalPresets: DEFAULT_SEASONAL_PRESETS,
      });
    }
  }, [devices, activeDeviceId]);

  /**
   * Set active device and load its seasonal presets
   */
  const handleSetActiveDeviceId = useCallback(async (
    id: number | null,
    settings: Settings | null,
    updateSettings: (newSettings: Settings) => void
  ) => {
    setActiveDeviceId(id);
    saveActiveDeviceId(id);

    // Load device-specific seasonal presets
    if (id && devices.length > 0) {
      const newActiveDevice = devices.find(device => device.id === id);
      if (newActiveDevice && settings) {
        const deviceSeasonalPresets = await loadDeviceSeasonalPresets(newActiveDevice);
        updateSettings({
          ...settings,
          seasonalPresets: deviceSeasonalPresets,
        });
      }
    }
  }, [devices]);

  return {
    devices,
    activeDeviceId,
    activeDevice,
    setDevices,
    setActiveDeviceId,
    handleAddDevice,
    handleUpdateDevice,
    handleDeleteDevice,
    handleSetActiveDeviceId,
    loadInitialDevices,
  };
}
