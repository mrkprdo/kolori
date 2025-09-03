import { checkWledHeartbeat } from '../config/wledApi';
import { logger } from '../utils/logger';
import { WledDevice } from '../types';

export interface DeviceStatus {
  deviceId: number;
  isOnline: boolean;
  lastChecked: number;
  responseTime?: number;
  consecutiveFailures: number;
}

export type DeviceStatusCallback = (statuses: DeviceStatus[]) => void;

class DeviceMonitorService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private devices: readonly WledDevice[] = [];
  private readonly statusCallbacks: DeviceStatusCallback[] = [];
  private readonly currentStatuses = new Map<number, DeviceStatus>();
  private readonly CHECK_INTERVAL = 10000; // 10 seconds
  private readonly REQUEST_TIMEOUT = 5000; // 5 seconds
  private readonly MAX_CONSECUTIVE_FAILURES = 3; // 3 failures before marking offline
  private isMonitoring = false;

  /**
   * Start monitoring devices
   */
  readonly start = (devices: readonly WledDevice[]): void => {
    if (this.isMonitoring) {
      this.stop();
    }

    this.devices = devices;
    this.isMonitoring = true;

    logger.log('🔍 Device monitor started with', devices.length, 'devices');

    // Initial check
    this.checkAllDevices();

    // Set up periodic checks
    this.monitoringInterval = setInterval(() => {
      this.checkAllDevices();
    }, this.CHECK_INTERVAL);
  };

  /**
   * Stop monitoring devices
   */
  readonly stop = (): void => {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.log('⏹️ Device monitor stopped');
  };

  /**
   * Update the device list being monitored
   */
  readonly updateDevices = (devices: readonly WledDevice[]): void => {
    this.devices = devices;
    if (this.isMonitoring) {
      // Trigger immediate check for new devices
      this.checkAllDevices();
    }
  };

  /**
   * Add a callback to receive status updates
   */
  readonly addStatusCallback = (callback: DeviceStatusCallback): void => {
    this.statusCallbacks.push(callback);
    // Send current statuses immediately
    if (this.currentStatuses.size > 0) {
      callback(Array.from(this.currentStatuses.values()));
    }
  };

  /**
   * Remove a status callback
   */
  readonly removeStatusCallback = (callback: DeviceStatusCallback): void => {
    const index = this.statusCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusCallbacks.splice(index, 1);
    }
  };

  /**
   * Get current status for a specific device
   */
  readonly getDeviceStatus = (deviceId: number): DeviceStatus | null => {
    return this.currentStatuses.get(deviceId) || null;
  };

  /**
   * Get all current statuses
   */
  readonly getAllStatuses = (): DeviceStatus[] => {
    return Array.from(this.currentStatuses.values());
  };

  /**
   * Force an immediate check of all devices
   */
  readonly forceCheck = async (): Promise<DeviceStatus[]> => {
    await this.checkAllDevices();
    return this.getAllStatuses();
  };

  /**
   * Check connectivity for all devices
   */
  private readonly checkAllDevices = async (): Promise<void> => {
    if (this.devices.length === 0) {
      return;
    }

    logger.log('🔍 Checking', this.devices.length, 'devices...');
    const startTime = Date.now();

    // Create promises for all device checks
    const checkPromises = this.devices.map(device => this.checkSingleDevice(device));

    try {
      // Run all checks in parallel
      const results = await Promise.allSettled(checkPromises);
      const statuses: DeviceStatus[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          statuses.push(result.value);
        } else {
          // Handle failed check
          const device = this.devices[index];
          const previousStatus = this.currentStatuses.get(device.id);
          const failedStatus: DeviceStatus = {
            deviceId: device.id,
            isOnline: false,
            lastChecked: Date.now(),
            consecutiveFailures: (previousStatus?.consecutiveFailures || 0) + 1
          };
          statuses.push(failedStatus);
          logger.error('Device check failed for', device.name, ':', result.reason);
        }
      });

      // Update internal status map
      statuses.forEach(status => {
        this.currentStatuses.set(status.deviceId, status);
      });

      // Notify all callbacks
      this.notifyCallbacks(statuses);

      const totalTime = Date.now() - startTime;
      const onlineCount = statuses.filter(s => s.isOnline).length;
      logger.log(`✅ Device check complete: ${onlineCount}/${statuses.length} online (${totalTime}ms)`);

    } catch (error) {
      logger.error('Device monitoring error:', error);
    }
  }

  /**
   * Check connectivity for a single device with retry logic
   */
  private readonly checkSingleDevice = async (device: WledDevice): Promise<DeviceStatus> => {
    const startTime = Date.now();
    const deviceAddress = device.bestAddress || device.ip;
    const previousStatus = this.currentStatuses.get(device.id);

    if (!deviceAddress) {
      const failures = (previousStatus?.consecutiveFailures || 0) + 1;
      return {
        deviceId: device.id,
        isOnline: false,
        lastChecked: Date.now(),
        consecutiveFailures: failures
      };
    }

    try {
      const result = await checkWledHeartbeat(deviceAddress);
      const responseTime = Date.now() - startTime;

      if (result.online) {
        // Device is online - reset failure count
        return {
          deviceId: device.id,
          isOnline: true,
          lastChecked: Date.now(),
          responseTime,
          consecutiveFailures: 0
        };
      } else {
        // Device check failed - increment failure count
        const failures = (previousStatus?.consecutiveFailures || 0) + 1;
        const shouldMarkOffline = failures >= this.MAX_CONSECUTIVE_FAILURES;
        
        // If we haven't reached max failures yet, keep the device as online if it was previously online
        const isOnline = shouldMarkOffline ? false : (previousStatus?.isOnline || false);
        
        logger.log(`Device ${device.name} failed check ${failures}/${this.MAX_CONSECUTIVE_FAILURES}${shouldMarkOffline ? ' - marking offline' : ''}`);

        return {
          deviceId: device.id,
          isOnline,
          lastChecked: Date.now(),
          consecutiveFailures: failures
        };
      }
    } catch (error) {
      // Network error or timeout - increment failure count
      const failures = (previousStatus?.consecutiveFailures || 0) + 1;
      const shouldMarkOffline = failures >= this.MAX_CONSECUTIVE_FAILURES;
      
      // If we haven't reached max failures yet, keep the device as online if it was previously online
      const isOnline = shouldMarkOffline ? false : (previousStatus?.isOnline || false);
      
      logger.log(`Device ${device.name} connection error ${failures}/${this.MAX_CONSECUTIVE_FAILURES}${shouldMarkOffline ? ' - marking offline' : ''}:`, error);

      return {
        deviceId: device.id,
        isOnline,
        lastChecked: Date.now(),
        consecutiveFailures: failures
      };
    }
  }

  /**
   * Notify all registered callbacks with status updates
   */
  private readonly notifyCallbacks = (statuses: readonly DeviceStatus[]): void => {
    this.statusCallbacks.forEach(callback => {
      try {
        callback([...statuses]);
      } catch (error) {
        logger.error('Status callback error:', error);
      }
    });
  };

  /**
   * Get monitoring statistics
   */
  readonly getStats = (): {
    isMonitoring: boolean;
    deviceCount: number;
    onlineCount: number;
    lastCheckTime: number | null;
  } => {
    const statuses = Array.from(this.currentStatuses.values());
    const onlineCount = statuses.filter(status => status.isOnline).length;
    
    const lastCheckTimes = statuses.map(status => status.lastChecked);
    
    const lastCheckTime = lastCheckTimes.length > 0 
      ? Math.max(...lastCheckTimes) 
      : null;

    return {
      isMonitoring: this.isMonitoring,
      deviceCount: this.devices.length,
      onlineCount,
      lastCheckTime
    };
  };
}

// Export singleton instance
export const deviceMonitor = new DeviceMonitorService();