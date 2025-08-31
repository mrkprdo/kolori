// WLED WebSocket Integration for React Native
// Migrated from kolori_old/src/utils/wledWebSocket.js

import { logger } from './logger';

interface WebSocketCallbacks {
  onOpen?: (event: Event) => void;
  onMessage?: (data: any) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
}

class WledWebSocketManager {
  private wledSocket: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private onMessageCallback: ((data: any) => void) | null = null;
  private onOpenCallback: ((event: Event) => void) | null = null;
  private onCloseCallback: ((event: CloseEvent) => void) | null = null;
  private onErrorCallback: ((error: Event) => void) | null = null;
  private currentIp: string | null = null;
  private currentProtocol: string | null = null;
  private isManualDisconnect = false;

  connectWebSocket = (ip: string, protocol = 'ws') => {
    // Clean up any existing connection first
    if (this.wledSocket) {
      if (this.wledSocket.readyState === WebSocket.OPEN || this.wledSocket.readyState === WebSocket.CONNECTING) {
        this.isManualDisconnect = true;
        this.wledSocket.close();
      }
    }

    // Clear any existing reconnect attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.currentIp = ip;
    this.currentProtocol = protocol;
    this.isManualDisconnect = false;

    const wsUrl = `${protocol}://${ip}/ws`;

    try {
      this.wledSocket = new WebSocket(wsUrl);
    } catch (error) {
      logger.error("Failed to create WebSocket:", error);
      if (this.onErrorCallback) this.onErrorCallback(error as Event);
      return;
    }

    this.wledSocket.onopen = (event) => {
      this.isManualDisconnect = false;
      if (this.onOpenCallback) this.onOpenCallback(event);
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      logger.log('WebSocket connected to:', wsUrl);
    };

    this.wledSocket.onmessage = async (event) => {
      try {
        if (event.data instanceof ArrayBuffer) {
          if (this.onMessageCallback) this.onMessageCallback(event.data);
        } else if (typeof event.data === 'string') {
          // Parse JSON data
          const jsonData = JSON.parse(event.data);
          if (this.onMessageCallback) this.onMessageCallback(jsonData);
        }
      } catch (error) {
        logger.error("Error processing WebSocket message:", error);
      }
    };

    this.wledSocket.onclose = (event) => {
      if (this.onCloseCallback) this.onCloseCallback(event);
      
      // Only attempt reconnection if it wasn't a manual disconnect
      if (!this.isManualDisconnect && !this.reconnectTimeout) {
        this.reconnectTimeout = setTimeout(() => {
          if (this.currentIp && this.currentProtocol) {
            logger.log('Attempting WebSocket reconnection...');
            this.connectWebSocket(this.currentIp, this.currentProtocol);
          }
        }, 5000);
      }
      
      // Reset manual disconnect flag
      if (this.isManualDisconnect) {
        this.isManualDisconnect = false;
      }
    };

    this.wledSocket.onerror = (error) => {
      logger.error("WebSocket Error:", error);
      if (this.onErrorCallback) this.onErrorCallback(error);
    };
  };

  disconnectWebSocket = () => {
    logger.log('Manually disconnecting WebSocket');
    
    // Set flag to prevent reconnection
    this.isManualDisconnect = true;
    
    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Close the socket
    if (this.wledSocket) {
      if (this.wledSocket.readyState === WebSocket.OPEN || this.wledSocket.readyState === WebSocket.CONNECTING) {
        this.wledSocket.close(1000, "Manual disconnect");
      }
      this.wledSocket = null;
    }
    
    // Clear stored connection info
    this.currentIp = null;
    this.currentProtocol = null;
  };

  sendWebSocketCommand = (command: any): boolean => {
    if (this.wledSocket && this.wledSocket.readyState === WebSocket.OPEN) {
      try {
        const commandString = JSON.stringify(command);
        this.wledSocket.send(commandString);
        logger.log('WebSocket command sent:', command);
        return true;
      } catch (error) {
        logger.error("Failed to send WebSocket command:", error);
        return false;
      }
    } else {
      logger.warn("WebSocket not open. Command not sent:", command);
      logger.warn("WebSocket state:", this.wledSocket ? this.wledSocket.readyState : "null");
      return false;
    }
  };

  setWebSocketCallbacks = (callbacks: WebSocketCallbacks) => {
    this.onMessageCallback = callbacks.onMessage || null;
    this.onOpenCallback = callbacks.onOpen || null;
    this.onCloseCallback = callbacks.onClose || null;
    this.onErrorCallback = callbacks.onError || null;
  };

  // Save preset via WebSocket using WLED JSON API format
  savePresetViaWebSocket = (presetId: number, presetName: string, options: any = {}): boolean => {
    if (!this.wledSocket || this.wledSocket.readyState !== WebSocket.OPEN) {
      logger.warn("WebSocket not open. Cannot save preset.");
      return false;
    }

    if (!presetId || presetId < 1 || presetId > 250) {
      logger.error("Invalid preset ID. Must be between 1 and 250.");
      return false;
    }

    // Build preset save command based on WLED JSON API
    const presetCommand: any = {
      ib: options.includeBrightness !== false, // Include brightness (default: true)
      sb: options.includeSegmentBrightness !== false, // Include segment brightness (default: true) 
      sc: options.includeSegmentColors || false, // Include segment colors (default: false)
      psave: presetId, // Preset slot to save to (1-250)
      n: presetName || `Preset ${presetId}`, // Preset name
      v: true, // Visible/valid preset (default: true)
      time: Math.floor(Date.now() / 1000) // Unix timestamp
    };

    // Add any additional options
    if (options.quick) {
      presetCommand.ql = options.quickLoad || presetName; // Quick load label
    }

    return this.sendWebSocketCommand(presetCommand);
  };

  // Load/activate preset via WebSocket
  loadPresetViaWebSocket = (presetId: number): boolean => {
    if (!this.wledSocket || this.wledSocket.readyState !== WebSocket.OPEN) {
      logger.warn("WebSocket not open. Cannot load preset.");
      return false;
    }

    if (!presetId || presetId < 1 || presetId > 250) {
      logger.error("Invalid preset ID. Must be between 1 and 250.");
      return false;
    }

    const loadCommand = {
      ps: presetId // Load preset by ID
    };

    return this.sendWebSocketCommand(loadCommand);
  };

  // Delete preset via WebSocket
  deletePresetViaWebSocket = (presetId: number): boolean => {
    if (!this.wledSocket || this.wledSocket.readyState !== WebSocket.OPEN) {
      logger.warn("WebSocket not open. Cannot delete preset.");
      return false;
    }

    if (!presetId || presetId < 1 || presetId > 250) {
      logger.error("Invalid preset ID. Must be between 1 and 250.");
      return false;
    }

    const deleteCommand = {
      pdel: presetId // Delete preset by ID
    };

    return this.sendWebSocketCommand(deleteCommand);
  };

  // Save playlist via WebSocket using exact WLED JSON API format
  savePlaylistViaWebSocket = (
    presetId: number, 
    playlistName: string, 
    playlistItems: any[], 
    options: any = {}
  ): boolean => {
    if (!this.wledSocket || this.wledSocket.readyState !== WebSocket.OPEN) {
      logger.warn("WebSocket not open. Cannot save playlist.");
      return false;
    }

    if (!presetId || presetId < 1 || presetId > 250) {
      logger.error("Invalid preset ID. Must be between 1 and 250.");
      return false;
    }

    if (!playlistItems || !Array.isArray(playlistItems) || playlistItems.length === 0) {
      logger.error("Invalid playlist items. Must be a non-empty array.");
      return false;
    }

    // Extract preset IDs and durations from playlist items
    const presetIds = playlistItems.map(item => item.presetId || item.id);
    const durations = playlistItems.map(item => {
      // Convert seconds to tenths of seconds (WLED format)
      const seconds = item.duration || 30; // Default 30 seconds
      return seconds * 10; // Convert to tenths
    });
    
    // Default transition time in tenths of seconds (0.7 seconds = 7 tenths)
    const transitions = playlistItems.map(() => options.transition || 7);

    // Build playlist save command using exact WLED JSON API format
    const playlistCommand = {
      playlist: {
        ps: presetIds, // Array of preset IDs
        dur: durations, // Array of durations in tenths of seconds
        transition: transitions, // Array of transition times in tenths of seconds
        repeat: options.repeat || 0, // 0 = infinite repeat, or number of times to repeat
        r: true // Enable playlist repeat/cycling
      },
      on: true, // Turn on lights
      o: true, // Save on state
      psave: presetId, // Preset slot to save playlist to
      n: playlistName || `Playlist ${presetId}`, // Playlist name
      v: true, // Preset is visible/valid
      time: Math.floor(Date.now() / 1000) // Unix timestamp
    };

    return this.sendWebSocketCommand(playlistCommand);
  };

  // Start/play playlist via WebSocket
  playPlaylistViaWebSocket = (presetId: number): boolean => {
    if (!this.wledSocket || this.wledSocket.readyState !== WebSocket.OPEN) {
      logger.warn("WebSocket not open. Cannot play playlist.");
      return false;
    }

    if (!presetId || presetId < 1 || presetId > 250) {
      logger.error("Invalid preset ID. Must be between 1 and 250.");
      return false;
    }

    const playCommand = {
      ps: presetId, // Load and start playlist
      on: true // Turn on lights
    };

    return this.sendWebSocketCommand(playCommand);
  };

  // Delete playlist via WebSocket (deletes the preset containing the playlist)
  deletePlaylistViaWebSocket = (presetId: number): boolean => {
    return this.deletePresetViaWebSocket(presetId);
  };
}

// Export singleton instance
export const wledWebSocketManager = new WledWebSocketManager();

// Export individual functions for backward compatibility
export const connectWebSocket = wledWebSocketManager.connectWebSocket;
export const disconnectWebSocket = wledWebSocketManager.disconnectWebSocket;
export const sendWebSocketCommand = wledWebSocketManager.sendWebSocketCommand;
export const setWebSocketCallbacks = wledWebSocketManager.setWebSocketCallbacks;
export const savePresetViaWebSocket = wledWebSocketManager.savePresetViaWebSocket;
export const loadPresetViaWebSocket = wledWebSocketManager.loadPresetViaWebSocket;
export const deletePresetViaWebSocket = wledWebSocketManager.deletePresetViaWebSocket;
export const savePlaylistViaWebSocket = wledWebSocketManager.savePlaylistViaWebSocket;
export const playPlaylistViaWebSocket = wledWebSocketManager.playPlaylistViaWebSocket;
export const deletePlaylistViaWebSocket = wledWebSocketManager.deletePlaylistViaWebSocket;