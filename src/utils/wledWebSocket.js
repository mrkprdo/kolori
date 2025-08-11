// src/utils/wledWebSocket.js
import logger from './logger.js';
let wledSocket = null;
let reconnectTimeout = null;
let onMessageCallback = null;
let onOpenCallback = null;
let onCloseCallback = null;
let onErrorCallback = null;
let currentIp = null;
let currentProtocol = null;
let isManualDisconnect = false;

const connectWebSocket = (ip, protocol = 'ws') => {
  // Clean up any existing connection first
  if (wledSocket) {
    if (wledSocket.readyState === WebSocket.OPEN || wledSocket.readyState === WebSocket.CONNECTING) {
      isManualDisconnect = true;
      wledSocket.close();
    }
  }

  // Clear any existing reconnect attempts
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  currentIp = ip;
  currentProtocol = protocol;
  isManualDisconnect = false;

  const wsUrl = `${protocol}://${ip}/ws`;

  try {
    wledSocket = new WebSocket(wsUrl);
  } catch (error) {
    logger.error("Failed to create WebSocket:", error);
    if (onErrorCallback) onErrorCallback(error);
    return;
  }

  wledSocket.onopen = (event) => {
    isManualDisconnect = false;
    if (onOpenCallback) onOpenCallback(event);
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };

  wledSocket.onmessage = async (event) => {
    try {
      if (event.data instanceof ArrayBuffer) {
        if (onMessageCallback) onMessageCallback(event.data); // Pass ArrayBuffer directly
      } else if (event.data instanceof Blob) {
        const arrayBuffer = await event.data.arrayBuffer(); // Convert Blob to ArrayBuffer
        if (onMessageCallback) onMessageCallback(arrayBuffer);
      } else {
        // Assume it's JSON data
        const jsonData = JSON.parse(event.data);
        if (onMessageCallback) onMessageCallback(jsonData);
      }
    } catch (error) {
      logger.error("Error processing WebSocket message:", error);
    }
  };

  wledSocket.onclose = (event) => {
    if (onCloseCallback) onCloseCallback(event);
    
    // Only attempt reconnection if it wasn't a manual disconnect
    if (!isManualDisconnect && !reconnectTimeout) {
      reconnectTimeout = setTimeout(() => {
        if (currentIp && currentProtocol) {
          connectWebSocket(currentIp, currentProtocol);
        }
      }, 5000);
    }
    
    // Reset manual disconnect flag
    if (isManualDisconnect) {
      isManualDisconnect = false;
    }
  };

  wledSocket.onerror = (error) => {
    logger.error("WebSocket Error: ", error);
    if (onErrorCallback) onErrorCallback(error);
  };
};

const disconnectWebSocket = () => {
  
  // Set flag to prevent reconnection
  isManualDisconnect = true;
  
  // Clear reconnection timeout
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  // Close the socket
  if (wledSocket) {
    if (wledSocket.readyState === WebSocket.OPEN || wledSocket.readyState === WebSocket.CONNECTING) {
      wledSocket.close(1000, "Manual disconnect");
    }
    wledSocket = null;
  }
  
  // Clear stored connection info
  currentIp = null;
  currentProtocol = null;
};

const sendWebSocketCommand = (command) => {
  if (wledSocket && wledSocket.readyState === WebSocket.OPEN) {
    try {
      const commandString = JSON.stringify(command);
      wledSocket.send(commandString);
      return true;
    } catch (error) {
      logger.error("Failed to send WebSocket command:", error);
      return false;
    }
  } else {
    logger.warn("WebSocket not open. Command not sent:", command);
    logger.warn("WebSocket state:", wledSocket ? wledSocket.readyState : "null");
    return false;
  }
};

const setWebSocketCallbacks = (callbacks) => {
  onMessageCallback = callbacks.onMessage;
  onOpenCallback = callbacks.onOpen;
  onCloseCallback = callbacks.onClose;
  onErrorCallback = callbacks.onError;
};

// Save preset via WebSocket using WLED JSON API format
const savePresetViaWebSocket = (presetId, presetName, options = {}) => {
  if (!wledSocket || wledSocket.readyState !== WebSocket.OPEN) {
    logger.warn("WebSocket not open. Cannot save preset.");
    return false;
  }

  if (!presetId || presetId < 1 || presetId > 250) {
    logger.error("Invalid preset ID. Must be between 1 and 250.");
    return false;
  }

  // Build preset save command based on WLED JSON API
  const presetCommand = {
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

  try {
    const commandString = JSON.stringify(presetCommand);
    wledSocket.send(commandString);
    return true;
  } catch (error) {
    logger.error("Failed to save preset via WebSocket:", error);
    return false;
  }
};

// Load/activate preset via WebSocket
const loadPresetViaWebSocket = (presetId) => {
  if (!wledSocket || wledSocket.readyState !== WebSocket.OPEN) {
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

  try {
    const commandString = JSON.stringify(loadCommand);
    wledSocket.send(commandString);
    return true;
  } catch (error) {
    logger.error("Failed to load preset via WebSocket:", error);
    return false;
  }
};

// Delete preset via WebSocket
const deletePresetViaWebSocket = (presetId) => {
  if (!wledSocket || wledSocket.readyState !== WebSocket.OPEN) {
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

  try {
    const commandString = JSON.stringify(deleteCommand);
    wledSocket.send(commandString);
    return true;
  } catch (error) {
    logger.error("Failed to delete preset via WebSocket:", error);
    return false;
  }
};

// Save playlist via WebSocket using exact WLED JSON API format
const savePlaylistViaWebSocket = (presetId, playlistName, playlistItems, options = {}) => {
  if (!wledSocket || wledSocket.readyState !== WebSocket.OPEN) {
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

  try {
    const commandString = JSON.stringify(playlistCommand);
    wledSocket.send(commandString);
    return true;
  } catch (error) {
    logger.error("Failed to save playlist via WebSocket:", error);
    return false;
  }
};

// Start/play playlist via WebSocket
const playPlaylistViaWebSocket = (presetId) => {
  if (!wledSocket || wledSocket.readyState !== WebSocket.OPEN) {
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

  try {
    const commandString = JSON.stringify(playCommand);
    wledSocket.send(commandString);
    return true;
  } catch (error) {
    logger.error("Failed to play playlist via WebSocket:", error);
    return false;
  }
};

// Delete playlist via WebSocket (deletes the preset containing the playlist)
const deletePlaylistViaWebSocket = (presetId) => {
  if (!wledSocket || wledSocket.readyState !== WebSocket.OPEN) {
    logger.warn("WebSocket not open. Cannot delete playlist.");
    return false;
  }

  if (!presetId || presetId < 1 || presetId > 250) {
    logger.error("Invalid preset ID. Must be between 1 and 250.");
    return false;
  }

  const deleteCommand = {
    pdel: presetId // Delete preset (and its playlist) by ID
  };

  try {
    const commandString = JSON.stringify(deleteCommand);
    wledSocket.send(commandString);
    return true;
  } catch (error) {
    logger.error("Failed to delete playlist via WebSocket:", error);
    return false;
  }
};

export { 
  connectWebSocket, 
  disconnectWebSocket, 
  sendWebSocketCommand, 
  setWebSocketCallbacks,
  savePresetViaWebSocket,
  loadPresetViaWebSocket,
  deletePresetViaWebSocket,
  savePlaylistViaWebSocket,
  playPlaylistViaWebSocket,
  deletePlaylistViaWebSocket
};
