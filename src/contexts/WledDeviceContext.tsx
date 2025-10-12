/**
 * WLED Device Context
 *
 * Global state management for WLED device using WebSocket service
 * Provides device state, live LED data, and control actions to all components
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { wledWebSocketService, LEDColor, DeviceState } from '../services/wled';
import { Device as WledDevice } from '../types';
import { getDeviceAddress, getWebSocketProtocol } from '../utils/deviceUtils';
import { logger } from '../utils/logger';
import { useLEDFrameBuffer } from '../hooks/useLEDFrameBuffer';

interface WledDeviceContextValue {
  // Current device
  device: WledDevice | null;
  setDevice: (device: WledDevice | null) => void;

  // Device state (from WebSocket)
  state: DeviceState;

  // Live data (from WebSocket)
  liveLedData: LEDColor[];
  liveViewEnabled: boolean;
  matrixDimensions: { width: number; height: number } | null;

  // Connection
  isConnected: boolean;

  // Actions (send WebSocket commands)
  setBrightness: (value: number) => void;
  activatePreset: (id: number) => void;
  togglePower: (on: boolean) => void;
  toggleLiveView: (enabled: boolean) => void;
  sendCommand: (command: object, priority?: 'normal' | 'urgent') => void;
}

const WledDeviceContext = createContext<WledDeviceContextValue | undefined>(undefined);

export function WledDeviceProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<WledDevice | null>(null);
  const [state, setState] = useState<DeviceState>({
    on: false,
    brightness: 128,
    activePreset: null
  });
  const [liveViewEnabled, setLiveViewEnabled] = useState(false);
  const [matrixDimensions, setMatrixDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const previousDeviceId = useRef<number | null>(null);

  // Buffered LED data for rendering (FIFO queue prevents infinite loops)
  const { currentFrame: liveLedData, queueFrame } = useLEDFrameBuffer({
    enabled: liveViewEnabled && isConnected,
  });

  // Connect/disconnect when device changes
  useEffect(() => {
    if (!device) {
      wledWebSocketService.disconnect();
      setIsConnected(false);
      setMatrixDimensions(null);
      previousDeviceId.current = null;
      return;
    }

    // Only reconnect if device actually changed
    if (device.id === previousDeviceId.current) {
      return;
    }

    previousDeviceId.current = device.id;

    const deviceAddress = getDeviceAddress(device);
    if (!deviceAddress) {
      logger.warn('No device address available');
      return;
    }

    const protocol = getWebSocketProtocol(device);

    // Disconnect old connection
    wledWebSocketService.disconnect();

    // Small delay before connecting to new device
    const connectTimeout = setTimeout(() => {
      logger.log('🔌 Connecting to device:', device.name, 'at', deviceAddress, protocol);
      wledWebSocketService.connect(deviceAddress, protocol);
    }, 100);

    return () => {
      clearTimeout(connectTimeout);
      wledWebSocketService.disconnect();
    };
  }, [device?.id]);

  // Send live view command when device changes and live view is enabled
  useEffect(() => {
    if (!device || !isConnected || !liveViewEnabled) {
      return;
    }

    // Send live view command to the newly connected device
    const sendLiveViewTimeout = setTimeout(() => {
      logger.log('📡 Sending {lv:true} to newly connected device');
      wledWebSocketService.sendCommand({ lv: true }, 'urgent');
    }, 300);

    return () => clearTimeout(sendLiveViewTimeout);
  }, [device?.id, isConnected, liveViewEnabled]);

  // Subscribe to WebSocket events
  useEffect(() => {
    const handleState = (newState: DeviceState) => {
      logger.log('📥 WebSocket state update:', newState);
      setState(newState);
    };

    const handleLeds = (leds: LEDColor[], dims?: { width: number; height: number }) => {
      if (liveViewEnabled) {
        // Queue frame directly - no state update, no re-render
        queueFrame(leds);
      }
      if (dims) {
        setMatrixDimensions(dims);
      }
    };

    const handleConnected = (connected: boolean) => {
      setIsConnected(connected);
      // Buffer will auto-clear when disabled
    };

    const handleInfo = (info: any) => {
      logger.log('📥 Device info received:', info);
      // Could update device info here if needed
    };

    wledWebSocketService.on('state', handleState);
    wledWebSocketService.on('leds', handleLeds);
    wledWebSocketService.on('connected', handleConnected);
    wledWebSocketService.on('info', handleInfo);

    return () => {
      wledWebSocketService.off('state', handleState);
      wledWebSocketService.off('leds', handleLeds);
      wledWebSocketService.off('connected', handleConnected);
      wledWebSocketService.off('info', handleInfo);
    };
  }, [liveViewEnabled, queueFrame]);

  // Actions
  const setBrightness = useCallback((value: number) => {
    logger.log(`🔆 Setting brightness to ${value} via WebSocket`);
    wledWebSocketService.sendCommand({ bri: value });
  }, []);

  const activatePreset = useCallback((id: number) => {
    wledWebSocketService.sendCommand({ ps: id });
  }, []);

  const togglePower = useCallback((on: boolean) => {
    wledWebSocketService.sendCommand({ on });
  }, []);

  const toggleLiveView = useCallback((enabled: boolean) => {
    setLiveViewEnabled(enabled);
    wledWebSocketService.sendCommand({ lv: enabled }, 'urgent');
    // Buffer will auto-clear when disabled via useEffect in hook
  }, []);

  const sendCommand = useCallback((command: object, priority: 'normal' | 'urgent' = 'normal') => {
    wledWebSocketService.sendCommand(command, priority);
  }, []);

  const value: WledDeviceContextValue = {
    device,
    setDevice,
    state,
    liveLedData,
    liveViewEnabled,
    matrixDimensions,
    isConnected,
    setBrightness,
    activatePreset,
    togglePower,
    toggleLiveView,
    sendCommand
  };

  return (
    <WledDeviceContext.Provider value={value}>
      {children}
    </WledDeviceContext.Provider>
  );
}

export function useWledDevice(): WledDeviceContextValue {
  const context = useContext(WledDeviceContext);
  if (!context) {
    throw new Error('useWledDevice must be used within WledDeviceProvider');
  }
  return context;
}
