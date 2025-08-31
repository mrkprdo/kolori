// Device Storage Utility for React Native
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kolori_devices';

export interface StoredDevice {
  id: number;
  name: string;
  ip: string;
  protocol: 'http' | 'https';
  isConnected: boolean;
  isPlaying: boolean;
  autoBrightness: boolean;
  maxBrightness: number;
  version?: string;
  addedAt: string;
}

export const deviceStorage = {
  // Load devices from storage
  async loadDevices(): Promise<StoredDevice[]> {
    try {
      const devicesJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (devicesJson) {
        return JSON.parse(devicesJson);
      }
      return [];
    } catch (error) {
      console.error('Failed to load devices:', error);
      return [];
    }
  },

  // Save devices to storage
  async saveDevices(devices: StoredDevice[]): Promise<boolean> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
      return true;
    } catch (error) {
      console.error('Failed to save devices:', error);
      return false;
    }
  },

  // Add a new device
  async addDevice(device: Omit<StoredDevice, 'addedAt'>): Promise<boolean> {
    try {
      const devices = await this.loadDevices();
      const newDevice: StoredDevice = {
        ...device,
        addedAt: new Date().toISOString(),
      };
      devices.push(newDevice);
      return await this.saveDevices(devices);
    } catch (error) {
      console.error('Failed to add device:', error);
      return false;
    }
  },

  // Remove a device
  async removeDevice(deviceId: number): Promise<boolean> {
    try {
      const devices = await this.loadDevices();
      const filteredDevices = devices.filter(d => d.id !== deviceId);
      return await this.saveDevices(filteredDevices);
    } catch (error) {
      console.error('Failed to remove device:', error);
      return false;
    }
  },

  // Update a device
  async updateDevice(deviceId: number, updates: Partial<StoredDevice>): Promise<boolean> {
    try {
      const devices = await this.loadDevices();
      const deviceIndex = devices.findIndex(d => d.id === deviceId);
      if (deviceIndex >= 0) {
        devices[deviceIndex] = { ...devices[deviceIndex], ...updates };
        return await this.saveDevices(devices);
      }
      return false;
    } catch (error) {
      console.error('Failed to update device:', error);
      return false;
    }
  },

  // Clear all devices (for testing/reset)
  async clearDevices(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear devices:', error);
      return false;
    }
  },
};