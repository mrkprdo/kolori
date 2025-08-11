// src/utils/wledWebSocket.js
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
      console.log("Closing existing WebSocket connection before creating new one.");
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
  console.log(`Attempting to connect to WLED WebSocket: ${wsUrl}`);

  try {
    wledSocket = new WebSocket(wsUrl);
  } catch (error) {
    console.error("Failed to create WebSocket:", error);
    if (onErrorCallback) onErrorCallback(error);
    return;
  }

  wledSocket.onopen = (event) => {
    console.log("Successfully connected to WLED WebSocket.");
    isManualDisconnect = false;
    if (onOpenCallback) onOpenCallback(event);
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };

  wledSocket.onmessage = (event) => {
    try {
      const jsonData = JSON.parse(event.data);
      if (onMessageCallback) onMessageCallback(jsonData);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  };

  wledSocket.onclose = (event) => {
    console.log("WLED WebSocket connection closed.", event.code, event.reason);
    if (onCloseCallback) onCloseCallback(event);
    
    // Only attempt reconnection if it wasn't a manual disconnect
    if (!isManualDisconnect && !reconnectTimeout) {
      console.log("Attempting to reconnect to WLED WebSocket in 5 seconds...");
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
    console.error("WebSocket Error: ", error);
    if (onErrorCallback) onErrorCallback(error);
  };
};

const disconnectWebSocket = () => {
  console.log("Manually disconnecting WLED WebSocket.");
  
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
      console.log("Sending WebSocket command:", commandString);
      wledSocket.send(commandString);
      return true;
    } catch (error) {
      console.error("Failed to send WebSocket command:", error);
      return false;
    }
  } else {
    console.warn("WebSocket not open. Command not sent:", command);
    console.warn("WebSocket state:", wledSocket ? wledSocket.readyState : "null");
    return false;
  }
};

const setWebSocketCallbacks = (callbacks) => {
  onMessageCallback = callbacks.onMessage;
  onOpenCallback = callbacks.onOpen;
  onCloseCallback = callbacks.onClose;
  onErrorCallback = callbacks.onError;
};

export { connectWebSocket, disconnectWebSocket, sendWebSocketCommand, setWebSocketCallbacks };
