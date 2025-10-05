import { useState, useEffect, useRef, useCallback } from 'react';
import { Device as WledDevice, Settings, LEDColor } from '../types';
import {
  connectWebSocket,
  disconnectWebSocket,
  setWebSocketCallbacks,
  sendWebSocketCommand
} from '../utils/wledWebSocket';
import { getDeviceAddress, getWebSocketProtocol } from '../utils/deviceUtils';
import { logger } from '../utils/logger';

export interface UseWebSocketManagerReturn {
  liveLedData: LEDColor[];
  currentWebSocketDeviceId: number | null;
  setLiveLedData: React.Dispatch<React.SetStateAction<LEDColor[]>>;
}

interface UseWebSocketManagerProps {
  activeDevice: WledDevice | undefined;
  settings: Settings;
  isAnyModalOpen: boolean;
  isCustomEffectsModalOpen: boolean;
  onDeviceUpdate: (id: number, updates: Partial<WledDevice>) => void;
  onLoadDevicePresets: () => void;
  onRefreshDeviceState: () => void;
  onFetchDeviceInfoViaHttp: () => void;
}

/**
 * Custom hook to manage WebSocket connections to WLED devices
 *
 * Handles:
 * - WebSocket connection lifecycle
 * - Device switching with proper cleanup
 * - Live LED data streaming
 * - Message routing (info, state, effects, presets)
 * - Automatic reconnection
 * - Modal state awareness
 * - HTTP fallback mechanisms
 */
export function useWebSocketManager({
  activeDevice,
  settings,
  isAnyModalOpen,
  isCustomEffectsModalOpen,
  onDeviceUpdate,
  onLoadDevicePresets,
  onRefreshDeviceState,
  onFetchDeviceInfoViaHttp
}: UseWebSocketManagerProps): UseWebSocketManagerReturn {
  const [liveLedData, setLiveLedData] = useState<LEDColor[]>([]);
  const [currentWebSocketDeviceId, setCurrentWebSocketDeviceId] = useState<number | null>(null);

  // Refs to avoid stale closures
  const activeDeviceRef = useRef<WledDevice | undefined>(undefined);
  const settingsRef = useRef<Settings>(settings);
  const matrixDimensionsSavedRef = useRef<boolean>(false); // Track if we've already saved matrix dimensions

  // Update refs when props change
  useEffect(() => {
    activeDeviceRef.current = activeDevice;
    // Reset matrix dimensions saved flag when device changes
    matrixDimensionsSavedRef.current = false;
  }, [activeDevice?.id, activeDevice?.name, activeDevice?.isConnected]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Ensure WebSocket connects immediately on app mount if there's an active device
  useEffect(() => {
    if (activeDevice && activeDevice.isConnected) {
      logger.log('WebSocket: App mounted with device:', activeDevice.name);
    }
  }, []); // Empty dependency array - runs once on mount

  // Global WebSocket connection manager
  useEffect(() => {
    let isMounted = true;

    // WebSocket reconnection triggered

    // Pause WebSocket operations when modals are open (except CustomEffectsModal)
    if (isAnyModalOpen && !isCustomEffectsModalOpen) {
      logger.log('⏸️ WebSocket paused - modal open (not CustomEffectsModal)');
      if (currentWebSocketDeviceId !== null) {
        sendWebSocketCommand({ lv: false });
      }
      return;
    }

    // Disable live view and disconnect previous device
    if (currentWebSocketDeviceId !== null) {
      sendWebSocketCommand({ lv: false });
      setTimeout(() => {
        disconnectWebSocket();
      }, 100);
    } else {
      disconnectWebSocket();
    }

    // Clear lingering callbacks
    setWebSocketCallbacks({
      onMessage: () => {},
      onOpen: () => {},
      onClose: () => {},
      onError: () => {}
    });

    // Clear UI state for device switch
    setLiveLedData([]);
    setCurrentWebSocketDeviceId(null);

    const deviceAddress = getDeviceAddress(activeDevice);

    if (activeDevice && activeDevice.isConnected && deviceAddress) {
      const wsProtocol = getWebSocketProtocol(activeDevice);
      const connectionDelay = currentWebSocketDeviceId !== null ? 1200 : 1000;

      logger.log('WebSocket: Connecting to', activeDevice.name, `(${wsProtocol}://${deviceAddress}/ws)`);

      setTimeout(() => {
        if (!isMounted) {
          logger.warn('Component unmounted, skipping reconnection');
          return;
        }

        const connectingDeviceId = activeDevice.id;
        const connectingDeviceName = activeDevice.name;

        connectWebSocket(deviceAddress, wsProtocol);

        // Setup WebSocket callbacks
        setWebSocketCallbacks({
          onMessage: (message) => {
            if (!isMounted) return;

            const currentActiveDevice = activeDeviceRef.current;
            if (!currentActiveDevice) {
              logger.warn('🚫 Ignoring WebSocket message - no active device');
              return;
            }

            if (message.type === 'liveLedData') {
              const currentLiveViewEnabled = settingsRef.current?.liveViewEnabled || false;

              if (isMounted && currentLiveViewEnabled) {
                setLiveLedData(message.data);
              } else {
                setLiveLedData([]);
              }

              // CRITICAL FIX: Extract and persist 2D matrix metadata from binary WebSocket data
              // When binary data contains matrix dimensions, save them to wledInfo
              if (message.matrixDimensions && !matrixDimensionsSavedRef.current) {
                const currentWledInfo = currentActiveDevice.wledInfo || {};
                const { width, height } = message.matrixDimensions;

                // Only update if we don't already have matrix info OR if dimensions changed
                const existingMatrix = currentWledInfo.ledMatrix || currentWledInfo.leds?.matrix;

                // Check if update is truly needed (missing or different dimensions)
                const needsUpdate = !existingMatrix ||
                                   existingMatrix.w !== width ||
                                   existingMatrix.h !== height;

                if (needsUpdate) {
                  logger.log(`📐 Matrix dimensions detected from WebSocket: ${width}×${height} - saving to device info`);

                  const matrixData = {
                    w: width,
                    h: height,
                    serpentine: true, // Default for most matrices
                    transpose: false,
                    vertical: false
                  };

                  const updatedInfo = {
                    ...currentWledInfo,
                    ledMatrix: matrixData,
                    leds: {
                      ...currentWledInfo.leds,
                      matrix: matrixData
                    }
                  };

                  // Mark as saved to prevent repeated updates
                  matrixDimensionsSavedRef.current = true;
                  onDeviceUpdate(currentActiveDevice.id, { wledInfo: updatedInfo });
                }
              }
            } else if (typeof message === 'object' && message !== null) {
              // Handle device info response
              if (message.info) {
                logger.log('📥 Device info received:', message.info.name, `(${message.info.leds?.count} LEDs)`);

                const currentWledInfo = currentActiveDevice.wledInfo || {};

                // Get matrix data from multiple sources
                let matrixData = null;
                if (message.ledMatrix) {
                  matrixData = message.ledMatrix;
                } else if (message.info.leds?.matrix) {
                  matrixData = message.info.leds.matrix;
                }

                const mergedInfo = {
                  ...currentWledInfo,
                  ...message.info,
                  ...(matrixData && { ledMatrix: matrixData }),
                  ...(matrixData && {
                    leds: {
                      ...currentWledInfo.leds,
                      ...message.info.leds,
                      matrix: matrixData
                    }
                  })
                };

                onDeviceUpdate(currentActiveDevice.id, { wledInfo: mergedInfo });
              }

              // Handle device state updates
              if (message.state) {
                const currentWledInfo = currentActiveDevice.wledInfo || {};

                // Preserve nested matrix/LED info when updating state
                const updatedWledInfo = {
                  ...currentWledInfo,
                  // Don't update brightness from WebSocket - only from manual refresh
                  // bri: message.state.bri,
                  on: message.state.on,
                  ps: message.state.ps || currentWledInfo.ps,
                  // Explicitly preserve matrix info
                  ledMatrix: currentWledInfo.ledMatrix,
                  leds: currentWledInfo.leds
                };

                // Build device updates object
                const deviceUpdates: Partial<WledDevice> = { wledInfo: updatedWledInfo };

                // Update activePreset if ps changed (preset changed from WLED UI or other source)
                // Note: We store ps as numeric value, the UI will handle matching it properly
                if (message.state.ps !== undefined && message.state.ps !== null) {
                  const currentPs = currentWledInfo.ps;
                  if (message.state.ps !== currentPs) {
                    logger.log(`🎯 Active preset changed via WebSocket: ${message.state.ps}`);
                    // Store the numeric preset ID - UI components will match it correctly
                    deviceUpdates.activePreset = message.state.ps;
                  }
                }

                onDeviceUpdate(currentActiveDevice.id, deviceUpdates);
              }
            }
          },

          onOpen: () => {
            if (!isMounted) return;

            const currentActiveDevice = activeDeviceRef.current;
            if (!currentActiveDevice) {
              logger.warn('WebSocket opened but no current active device');
              return;
            }

            setCurrentWebSocketDeviceId(currentActiveDevice.id);
            logger.log('✅ WebSocket connected:', currentActiveDevice.name);

            // Request device info and state
            sendWebSocketCommand({ info: {} });
            sendWebSocketCommand({ state: {} });

            // Enable live view if needed
            const currentLiveViewEnabled = settingsRef.current?.liveViewEnabled || false;
            if (currentLiveViewEnabled) {
              const enableLiveView = () => {
                const success = sendWebSocketCommand({ lv: true });
                if (!success) {
                  setTimeout(() => sendWebSocketCommand({ lv: true }), 500);
                }
              };
              setTimeout(enableLiveView, 150);
            }

            // HTTP fallback for device info (if needed)
            setTimeout(() => {
              if (isMounted) {
                setTimeout(() => {
                  if (isMounted && activeDevice && !activeDevice.wledInfo) {
                    logger.warn('Device info not received via WebSocket, trying HTTP fallback');
                    onFetchDeviceInfoViaHttp();
                  }
                }, 3000);
              }
            }, 500);
          },

          onClose: () => {
            const currentActiveDevice = activeDeviceRef.current;
            logger.log('❌ WebSocket closed:', currentActiveDevice?.name || 'unknown');
            setCurrentWebSocketDeviceId(null);
            if (isMounted) {
              setLiveLedData([]);
            }
          },

          onError: (error) => {
            const currentActiveDevice = activeDeviceRef.current;
            const errorMessage = (error as any)?.message || '';

            // Filter out non-critical masking errors
            if (errorMessage.includes('Server-sent frames must not be masked')) {
              logger.warn(
                'WebSocket masking warning for device:',
                currentActiveDevice?.name || 'unknown',
                '(functionality not affected)'
              );
              return;
            }

            if (isMounted) {
              setLiveLedData([]);
            }
          }
        });
      }, connectionDelay);
    } else {
      disconnectWebSocket();
      if (isMounted) {
        setLiveLedData([]);
      }
    }

    return () => {
      isMounted = false;
      logger.log('WebSocket: Cleanup');
      setCurrentWebSocketDeviceId(null);
      disconnectWebSocket();
    };
  }, [
    activeDevice?.id,
    activeDevice?.isConnected,
    isAnyModalOpen,
    isCustomEffectsModalOpen
    // Note: Removed currentWebSocketDeviceId to prevent infinite loop
    // Note: Callbacks are stable refs, don't need to be in deps
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle live view toggle for existing connection
  useEffect(() => {
    if (activeDevice?.isConnected) {
      const sendLiveViewCommand = () => {
        const command = { lv: settings.liveViewEnabled };
        const success = sendWebSocketCommand(command);

        if (!success) {
          setTimeout(() => {
            sendWebSocketCommand(command);
          }, 1000);
        }

        if (!settings.liveViewEnabled) {
          setLiveLedData([]);
        }
      };

      setTimeout(sendLiveViewCommand, 100);
    } else if (!settings.liveViewEnabled) {
      setLiveLedData([]);
    }
  }, [settings.liveViewEnabled, activeDevice?.isConnected, activeDevice?.id, activeDevice?.name]);

  return {
    liveLedData,
    currentWebSocketDeviceId,
    setLiveLedData
  };
}
