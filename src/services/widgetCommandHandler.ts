/**
 * Widget Command Handler
 *
 * Handles commands sent from the Kolori Widgets app
 * Receives commands via BroadcastReceiver and executes them via WebSocket
 */

import { DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { wledWebSocketService } from './wled';
import { WledDevice } from '../types';
import { logger } from '../utils/logger';
import { getDeviceAddress, getWebSocketProtocol } from '../utils/deviceUtils';

interface WidgetCommand {
  deviceId: number;
  commandType: string;
  commandValue: string;
}

class WidgetCommandHandler {
  private initialized = false;
  private devices: WledDevice[] = [];

  /**
   * Initialize the widget command handler
   * Call this once when the app starts
   */
  initialize(): void {
    if (this.initialized) {
      logger.warn('⚠️ Widget command handler already initialized');
      return;
    }

    // Only initialize on Android
    if (Platform.OS !== 'android') {
      logger.log('📱 Widget commands only supported on Android');
      return;
    }

    this.initialized = true;
    logger.log('🔧 Widget command handler initialized');

    // Listen for commands from widgets
    DeviceEventEmitter.addListener('widgetCommand', this.handleCommand);

    // Load devices into memory
    this.loadDevices();
  }

  /**
   * Load devices from AsyncStorage
   */
  private async loadDevices(): Promise<void> {
    try {
      const devicesJson = await AsyncStorage.getItem('kolori_devices');
      if (devicesJson) {
        this.devices = JSON.parse(devicesJson);
        logger.log(`📦 Loaded ${this.devices.length} devices for widget commands`);
      }
    } catch (error) {
      logger.error('❌ Failed to load devices for widget handler:', error);
    }
  }

  /**
   * Handle incoming widget command
   */
  private handleCommand = async (event: WidgetCommand): Promise<void> => {
    const { deviceId, commandType, commandValue } = event;

    logger.log(`🎮 Widget command received: ${commandType} for device ${deviceId}`);

    try {
      // Reload devices to ensure we have latest data
      await this.loadDevices();

      // Find the device
      const device = this.devices.find(d => d.id === deviceId);
      if (!device) {
        logger.error(`❌ Device ${deviceId} not found`);
        return;
      }

      // Ensure device is connected
      if (!device.isConnected) {
        logger.warn(`⚠️ Device ${device.name} is offline, attempting to connect...`);
      }

      // Get device connection details
      const deviceAddress = getDeviceAddress(device);
      if (!deviceAddress) {
        logger.error(`❌ No valid address for device ${device.name}`);
        return;
      }

      const protocol = getWebSocketProtocol(device);

      // Check if we're already connected to this device
      const currentState = wledWebSocketService.getState();
      const isAlreadyConnected = wledWebSocketService['currentIp'] === deviceAddress;

      if (!isAlreadyConnected) {
        logger.log(`🔌 Connecting to device ${device.name} at ${deviceAddress}`);
        await wledWebSocketService.connect(deviceAddress, protocol);
        // Wait a bit for connection to establish
        await this.sleep(500);
      }

      // Execute the command
      await this.executeCommand(commandType, commandValue, device);

      logger.log(`✅ Widget command executed successfully`);
    } catch (error) {
      logger.error('❌ Error handling widget command:', error);
    }
  };

  /**
   * Execute a specific command
   */
  private async executeCommand(
    commandType: string,
    commandValue: string,
    device: WledDevice
  ): Promise<void> {
    switch (commandType) {
      case 'togglePower':
        this.handleTogglePower();
        break;

      case 'adjustBrightness':
        this.handleAdjustBrightness(commandValue);
        break;

      case 'activatePreset':
        this.handleActivatePreset(commandValue);
        break;

      case 'setPower':
        this.handleSetPower(commandValue);
        break;

      case 'setBrightness':
        this.handleSetBrightness(commandValue);
        break;

      default:
        logger.warn(`⚠️ Unknown widget command: ${commandType}`);
    }
  }

  /**
   * Toggle power on/off
   */
  private handleTogglePower(): void {
    logger.log('🔄 Toggling power');
    wledWebSocketService.sendCommand({ on: 't' }, 'urgent');
  }

  /**
   * Set power to specific state
   */
  private handleSetPower(value: string): void {
    const powerOn = value === 'true' || value === '1';
    logger.log(`⚡ Setting power to ${powerOn ? 'ON' : 'OFF'}`);
    wledWebSocketService.sendCommand({ on: powerOn }, 'urgent');
  }

  /**
   * Adjust brightness by delta
   */
  private handleAdjustBrightness(value: string): void {
    const delta = parseInt(value, 10);
    if (isNaN(delta)) {
      logger.error('❌ Invalid brightness delta:', value);
      return;
    }

    const currentState = wledWebSocketService.getState();
    const currentBrightness = currentState.brightness || 128;
    const newBrightness = Math.max(0, Math.min(255, currentBrightness + delta));

    logger.log(`🔆 Adjusting brightness: ${currentBrightness} → ${newBrightness} (${delta > 0 ? '+' : ''}${delta})`);
    wledWebSocketService.sendCommand({ bri: newBrightness }, 'urgent');
  }

  /**
   * Set brightness to absolute value
   */
  private handleSetBrightness(value: string): void {
    const brightness = parseInt(value, 10);
    if (isNaN(brightness) || brightness < 0 || brightness > 255) {
      logger.error('❌ Invalid brightness value:', value);
      return;
    }

    logger.log(`🔆 Setting brightness to ${brightness}`);
    wledWebSocketService.sendCommand({ bri: brightness }, 'urgent');
  }

  /**
   * Activate a preset
   */
  private handleActivatePreset(value: string): void {
    const presetId = parseInt(value, 10);
    if (isNaN(presetId)) {
      logger.error('❌ Invalid preset ID:', value);
      return;
    }

    logger.log(`🎨 Activating preset ${presetId}`);
    wledWebSocketService.sendCommand({ ps: presetId }, 'urgent');
  }

  /**
   * Helper sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.initialized) {
      DeviceEventEmitter.removeAllListeners('widgetCommand');
      this.initialized = false;
      logger.log('🧹 Widget command handler destroyed');
    }
  }
}

// Export singleton instance
export const widgetCommandHandler = new WidgetCommandHandler();

/**
 * Initialize widget command handler
 * Call this in your App.tsx useEffect
 */
export function initializeWidgetCommandHandler(): void {
  widgetCommandHandler.initialize();
}
