import { useState, useEffect } from 'react';
import { Device as WledDevice } from '../types';
import { deviceMonitor, DeviceStatus } from '../services/deviceMonitor';
import { logger } from '../utils/logger';

export interface UseDeviceMonitorReturn {
  deviceStatuses: DeviceStatus[];
}

interface UseDeviceMonitorProps {
  devices: WledDevice[];
  isAnyModalOpen: boolean;
  isCustomEffectsModalOpen: boolean;
  onDeviceUpdate: (id: number, updates: Partial<WledDevice>) => void;
}

/**
 * Custom hook to manage device connectivity monitoring
 *
 * Monitors device online/offline status and updates device connection state.
 * Pauses monitoring when modals are open (except CustomEffectsModal which needs
 * connectivity status for live view).
 */
export function useDeviceMonitor({
  devices,
  isAnyModalOpen,
  isCustomEffectsModalOpen,
  onDeviceUpdate
}: UseDeviceMonitorProps): UseDeviceMonitorReturn {
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);

  useEffect(() => {
    // Pause monitoring when modals are open (except CustomEffectsModal)
    if (devices.length === 0 || (isAnyModalOpen && !isCustomEffectsModalOpen)) {
      deviceMonitor.stop();
      logger.log(
        (isAnyModalOpen && !isCustomEffectsModalOpen)
          ? '⏸️ Device monitoring paused - modal open (not CustomEffectsModal)'
          : '⏸️ Device monitoring stopped - no devices'
      );
      return;
    }

    logger.log('▶️ Device monitoring started - no modals open');

    // Set up status callback
    const handleStatusUpdate = (statuses: DeviceStatus[]) => {
      // Skip updates if modal opened while monitoring was running
      if (isAnyModalOpen && !isCustomEffectsModalOpen) {
        logger.log('⏸️ Skipping device status update - modal open (not CustomEffectsModal)');
        return;
      }

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
  }, [devices, onDeviceUpdate, isAnyModalOpen, isCustomEffectsModalOpen]);

  return {
    deviceStatuses
  };
}
