import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "kolori_devices";

export interface StoredDevice {
  id: number;
  name: string;
  ip: string;
  protocol: "http" | "https";
  isConnected: boolean;
  isPlaying: boolean;
  autoBrightness: boolean;
  maxBrightness: number;
  version?: string;
  addedAt: string;
}

class DeviceStorage {
  private readonly parseDevices = (
    jsonString: string | null
  ): StoredDevice[] => {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Load devices from storage
  readonly loadDevices = async (): Promise<StoredDevice[]> => {
    try {
      const devicesJson = await AsyncStorage.getItem(STORAGE_KEY);
      return this.parseDevices(devicesJson);
    } catch (error) {
      console.error("Failed to load devices:", error);
      return [];
    }
  };

  // Save devices to storage
  readonly saveDevices = async (
    devices: readonly StoredDevice[]
  ): Promise<boolean> => {
    try {
      const serialized = JSON.stringify(devices);
      await AsyncStorage.setItem(STORAGE_KEY, serialized);
      return true;
    } catch (error) {
      console.error("Failed to save devices:", error);
      return false;
    }
  };

  // Add a new device
  readonly addDevice = async (
    device: Omit<StoredDevice, "addedAt">
  ): Promise<boolean> => {
    try {
      const devices = await this.loadDevices();
      const newDevice: StoredDevice = {
        ...device,
        addedAt: new Date().toISOString(),
      };
      const updatedDevices = [...devices, newDevice];
      return await this.saveDevices(updatedDevices);
    } catch (error) {
      console.error("Failed to add device:", error);
      return false;
    }
  };

  // Remove a device
  readonly removeDevice = async (deviceId: number): Promise<boolean> => {
    try {
      const devices = await this.loadDevices();
      const filteredDevices = devices.filter((d) => d.id !== deviceId);
      return await this.saveDevices(filteredDevices);
    } catch (error) {
      console.error("Failed to remove device:", error);
      return false;
    }
  };

  // Update a device
  readonly updateDevice = async (
    deviceId: number,
    updates: Partial<StoredDevice>
  ): Promise<boolean> => {
    try {
      const devices = await this.loadDevices();
      const deviceIndex = devices.findIndex((d) => d.id === deviceId);
      if (deviceIndex >= 0) {
        const updatedDevices = [...devices];
        updatedDevices[deviceIndex] = { ...devices[deviceIndex], ...updates };
        return await this.saveDevices(updatedDevices);
      }
      return false;
    } catch (error) {
      console.error("Failed to update device:", error);
      return false;
    }
  };

  // Clear all devices (for testing/reset)
  readonly clearDevices = async (): Promise<boolean> => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("Failed to clear devices:", error);
      return false;
    }
  };
}

export const deviceStorage = new DeviceStorage();
