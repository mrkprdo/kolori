// Simplified WLED API - Focus on preset activation only
import { logger } from '../utils/logger.js';
import { WLED_PALETTES_DATA } from '../constants/palettes.js';

// Helper function to build WLED URLs with protocol support
const buildWledUrl = (deviceAddress, protocol = "http", path) => {
  // Handle mDNS names by appending .local if needed
  if (deviceAddress && !deviceAddress.includes(':')) {
    // Check if it's an IP address (contains 3 dots in IP format)
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const isIP = ipPattern.test(deviceAddress);
    
    // If it's not an IP and doesn't already end with .local, add .local
    if (!isIP && !deviceAddress.endsWith('.local')) {
      deviceAddress = `${deviceAddress}.local`;
    }
  }
  return `${protocol}://${deviceAddress}${path}`;
};

// Test connectivity for a device address (IP or mDNS)
export const testDeviceConnectivity = async (deviceAddress, protocol = "http") => {
  try {
    const startTime = Date.now();
    const url = buildWledUrl(deviceAddress, protocol, '/json/info');
    
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        address: deviceAddress,
        responseTime,
        deviceInfo: data,
        message: `Connected in ${responseTime}ms`
      };
    } else {
      return {
        success: false,
        address: deviceAddress,
        responseTime,
        message: `HTTP Error: ${response.status}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      address: deviceAddress,
      message: error.name === 'TimeoutError' ? 'Connection timeout' : `Connection failed: ${error.message}`
    };
  }
};

// Test both IP and mDNS addresses and return the best option
export const findBestDeviceAddress = async (ip, mdns, protocol = "http") => {
  const tests = [];
  
  // Add IP test if provided
  if (ip && ip.trim()) {
    tests.push(testDeviceConnectivity(ip.trim(), protocol));
  }
  
  // Add mDNS test if provided
  if (mdns && mdns.trim()) {
    tests.push(testDeviceConnectivity(mdns.trim(), protocol));
  }
  
  if (tests.length === 0) {
    return {
      success: false,
      message: 'No IP address or mDNS name provided'
    };
  }
  
  try {
    // Run all tests in parallel
    const results = await Promise.all(tests);
    const successfulResults = results.filter(result => result.success);
    
    if (successfulResults.length === 0) {
      return {
        success: false,
        message: 'All connection attempts failed',
        details: results.map(r => `${r.address}: ${r.message}`).join(', ')
      };
    }
    
    // Sort by response time (fastest first)
    successfulResults.sort((a, b) => a.responseTime - b.responseTime);
    const bestResult = successfulResults[0];
    
    return {
      success: true,
      bestAddress: bestResult.address,
      responseTime: bestResult.responseTime,
      deviceInfo: bestResult.deviceInfo,
      message: `Best connection: ${bestResult.address} (${bestResult.responseTime}ms)`,
      allResults: results
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Connectivity test failed: ${error.message}`
    };
  }
};

// Simple preset mapping - maps preset names to WLED preset numbers
export const PRESET_MAPPING = {
  "Autumn": 1,
  "Canada Day": 20,
  "Christmas": 35,
};

// Simple function to activate presets by name
export const activateWledPreset = async (deviceAddress, presetName, protocol = "http") => {
  const wledPresetNumber = PRESET_MAPPING[presetName];
  if (!wledPresetNumber) {
    return { success: false, message: `No preset mapping found for: ${presetName}` };
  }
  
  const url = buildWledUrl(deviceAddress, protocol, `/win&PL=${wledPresetNumber}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok 
      ? { success: true, message: 'Preset activated' }
      : { success: false, message: `HTTP Error: ${response.status}` };
      
  } catch (error) {
    // Check for mixed content errors
    if (error.message.includes('mixed content') || 
        (location.protocol === 'https:' && protocol === 'http')) {
      return {
        success: false,
        message: 'Mixed content blocked: Cannot access HTTP device from HTTPS page. Try accessing this page via HTTP instead.'
      };
    }
    
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to activate custom effects (effect + palette combination)
export const activateWledEffect = async (deviceAddress, effectId, paletteId, protocol = "http") => {
  const url = buildWledUrl(deviceAddress, protocol, `/win&FX=${effectId}&FP=${paletteId}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok 
      ? { success: true, message: 'Effect activated' }
      : { success: false, message: `HTTP Error: ${response.status}` };
      
  } catch (error) {
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to get WLED device info including presets
export const getWledInfo = async (deviceAddress, protocol = "http") => {
  const url = buildWledUrl(deviceAddress, protocol, '/json/info');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return { success: false, message: `HTTP Error: ${response.status}` };
    }
    
    const data = await response.json();
    return { success: true, data };
      
  } catch (error) {
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to get available effects from WLED device
export const getWledEffects = async (deviceAddress, protocol = "http") => {
  const url = buildWledUrl(deviceAddress, protocol, '/json/effects');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return { success: false, message: `HTTP Error: ${response.status}` };
    }
    
    const effects = await response.json();
    // Effects come as an array of strings, we need to map them to objects with IDs
    const effectsWithIds = effects.map((name, index) => ({
      id: index,
      name: name,
      effectId: index
    }));
    
    return { success: true, effects: effectsWithIds };
      
  } catch (error) {
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to get available palettes from WLED device
export const getWledPalettes = async (deviceAddress, protocol = "http") => {
  const url = buildWledUrl(deviceAddress, protocol, '/json/palettes');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return { success: false, message: `HTTP Error: ${response.status}` };
    }
    
    const palettes = await response.json();
    // Palettes come as an array of strings, we need to map them to objects with IDs
    const palettesWithIds = palettes.map((name, index) => ({
      id: index,
      name: name,
      paletteId: index
    }));
    
    return { success: true, palettes: palettesWithIds };
      
  } catch (error) {
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to get WLED device presets
export const getWledPresets = async (deviceAddress, protocol = "http") => {
  const url = buildWledUrl(deviceAddress, protocol, '/presets.json');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(10000) // Longer timeout for presets
    });
    
    if (!response.ok) {
      return { success: false, message: `HTTP Error: ${response.status}` };
    }
    
    const presets = await response.json();
    
    // Parse presets object into array format
    const parsedPresets = [];
    const playlists = [];
    
    Object.entries(presets).forEach(([presetId, presetData]) => {
      if (presetData && typeof presetData === 'object') {
        const preset = {
          id: `wled_${presetId}`,
          presetId: parseInt(presetId),
          name: presetData.n || `Preset ${presetId}`,
          isWledPreset: true
        };
        
        // Check if this is a playlist
        if (presetData.playlist && presetData.playlist.ps) {
          const playlist = {
            id: `playlist_${presetId}`,
            presetId: parseInt(presetId),
            name: presetData.n || `Playlist ${presetId}`,
            items: presetData.playlist.ps.map((psId, index) => ({
              name: `Preset ${psId}`,
              presetId: psId,
              duration: presetData.playlist.dur ? Math.floor(presetData.playlist.dur[index] / 10) : 30, // Convert tenths to seconds
              gradient: '#6366f1' // Default gradient
            })),
            isWledPlaylist: true,
            method: 'wled-device'
          };
          playlists.push(playlist);
        } else {
          // Regular preset
          if (presetData.seg && presetData.seg[0]) {
            const segment = presetData.seg[0];
            preset.effectId = segment.fx || 0;
            preset.effectName = `Effect ${segment.fx || 0}`;
            preset.paletteId = segment.pal || 0;
            preset.paletteName = `Palette ${segment.pal || 0}`;
            
            // Generate gradient based on palette
            preset.gradient = generatePresetGradient(segment.pal || 0);
          } else {
            preset.gradient = '#6366f1';
          }
          parsedPresets.push(preset);
        }
      }
    });
    
    
    return { 
      success: true, 
      presets: parsedPresets,
      playlists: playlists,
      totalCount: parsedPresets.length + playlists.length
    };
      
  } catch (error) {
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Helper function to generate gradient based on palette ID
const generatePresetGradient = (paletteId) => {
  // Create array of palette names in order (matching WLED palette IDs)
  const paletteNames = Object.keys(WLED_PALETTES_DATA);
  const paletteName = paletteNames[paletteId] || paletteNames[0]; // Fallback to first palette
  
  // Get palette color data
  const paletteData = WLED_PALETTES_DATA[paletteName];
  if (!paletteData || paletteData.length === 0) {
    return `linear-gradient(135deg, #888, #555)`;
  }

  // Convert color data to RGB strings - format is [position, r, g, b]
  const colorStops = paletteData.map((color) => `rgb(${color[1]}, ${color[2]}, ${color[3]})`).join(", ");
  return `linear-gradient(135deg, ${colorStops})`;
};

// Function to check if WLED device is online (heartbeat)
export const checkWledHeartbeat = async (deviceAddress, protocol = "http") => {
  const url = buildWledUrl(deviceAddress, protocol, '/json/info');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // Shorter timeout for heartbeat
    });
    
    if (response.ok) {
      return { success: true, online: true, message: 'Device online' };
    } else {
      return { success: false, online: false, message: `HTTP Error: ${response.status}` };
    }
      
  } catch (error) {
    return { 
      success: false, 
      online: false,
      message: error.name === 'TimeoutError' ? 'Connection timeout' : `Connection failed: ${error.message}`
    };
  }
};

// Function to get current WLED state
export const getWledState = async (deviceAddress, protocol = "http") => {
  const url = buildWledUrl(deviceAddress, protocol, '/json/state');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return { success: false, message: `HTTP Error: ${response.status}` };
    }
    
    const data = await response.json();
    return { success: true, data };
      
  } catch (error) {
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to create a WLED preset
export const createWledPreset = async (deviceAddress, effectId, paletteId, presetName, presetId = null, protocol = "http") => {
  // First, set the current effect and palette
  const setEffectUrl = buildWledUrl(deviceAddress, protocol, `/win&FX=${effectId}&FP=${paletteId}`);
  
  try {
    const setEffectResponse = await fetch(setEffectUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (!setEffectResponse.ok) {
      return { success: false, message: `Failed to set effect: ${setEffectResponse.status}` };
    }
    
    // Wait a moment for the effect to be applied
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate a unique preset ID if no specific ID provided
    let targetPresetId = presetId;
    if (!targetPresetId) {
      // Use timestamp + random component to ensure uniqueness
      const timestamp = Date.now();
      const randomComponent = Math.floor(Math.random() * 100);
      
      // Create ID in range 50-250 (WLED preset limit)
      // Combine timestamp and random for better distribution
      targetPresetId = 50 + ((timestamp + randomComponent) % 200);
    }
    
    // Create the preset using JSON API
    const presetData = {
      psave: targetPresetId,
      n: presetName || `Custom Effect ${targetPresetId}`,
      on: true,
      bri: 255,
      seg: [{
        id: 0,
        fx: effectId,
        pal: paletteId
      }]
    };
    
    const createPresetResponse = await fetch(buildWledUrl(deviceAddress, protocol, '/json/state'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(presetData),
      signal: AbortSignal.timeout(5000)
    });
    
    if (!createPresetResponse.ok) {
      return { success: false, message: `Failed to create preset: ${createPresetResponse.status}` };
    }
    
    return { 
      success: true, 
      message: 'Preset created successfully',
      presetId: targetPresetId
    };
      
  } catch (error) {
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to delete a WLED preset
export const deleteWledPreset = async (deviceAddress, presetId, protocol = "http") => {
  const url = buildWledUrl(deviceAddress, protocol, '/json/state');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdel: presetId
      }),
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok 
      ? { success: true, message: 'Preset deleted' }
      : { success: false, message: `HTTP Error: ${response.status}` };
      
  } catch (error) {
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to activate preset by ID
export const activateWledPresetById = async (deviceAddress, presetId, protocol = "http") => {
  const url = buildWledUrl(deviceAddress, protocol, `/win&PL=${presetId}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok 
      ? { success: true, message: 'Preset activated' }
      : { success: false, message: `HTTP Error: ${response.status}` };
      
  } catch (error) {
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// DEPRECATED: Old HTTP-based playlist creation - use createWledPlaylistViaWebSocket instead
// This function is kept for compatibility but should not be used
export const createWledPlaylist = async (deviceIp, playlistItems, playlistName) => {
  logger.warn('DEPRECATED: Use createWledPlaylistViaWebSocket instead of HTTP-based createWledPlaylist');
  return { 
    success: false, 
    message: 'HTTP playlist creation is deprecated. Use WebSocket-based playlist creation instead.'
  };
};

// DEPRECATED: Old HTTP-based playlist start - use WebSocket commands instead
export const startWledPlaylist = async (deviceIp, firstPresetId, lastPresetId) => {
  logger.warn('DEPRECATED: Use WebSocket playPlaylistViaWebSocket instead of HTTP-based startWledPlaylist');
  return { 
    success: false, 
    message: 'HTTP playlist control is deprecated. Use WebSocket-based playlist control instead.'
  };
};

// DEPRECATED: Use WebSocket commands instead
export const nextWledPlaylistItem = async (deviceIp) => {
  logger.warn('DEPRECATED: Use WebSocket commands instead of HTTP-based nextWledPlaylistItem');
  return { 
    success: false, 
    message: 'HTTP playlist control is deprecated. Use WebSocket-based commands instead.'
  };
};

// DEPRECATED: Use WebSocket commands instead
export const stopWledPlaylist = async (deviceIp) => {
  logger.warn('DEPRECATED: Use WebSocket commands instead of HTTP-based stopWledPlaylist');
  return { 
    success: false, 
    message: 'HTTP playlist control is deprecated. Use WebSocket-based commands instead.'
  };
};

// DEPRECATED: Use WebSocket deletePresetViaWebSocket instead
export const deleteWledPlaylist = async (deviceIp, presetIds) => {
  logger.warn('DEPRECATED: Use WebSocket deletePresetViaWebSocket instead of HTTP-based deleteWledPlaylist');
  return { 
    success: false, 
    message: 'HTTP playlist deletion is deprecated. Use WebSocket-based preset deletion instead.'
  };
};

// Function to turn WLED lights on globally
export const turnWledOn = async (deviceAddress, protocol = "http") => {
  // Try JSON API first (more reliable), fallback to HTTP API
  const jsonUrl = buildWledUrl(deviceAddress, protocol, '/json/state');
  const httpUrl = buildWledUrl(deviceAddress, protocol, '/win&T=1');
  
  
  try {
    // Try JSON API first
    const jsonResponse = await fetch(jsonUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ on: true }),
      signal: AbortSignal.timeout(5000)
    });
    
    if (jsonResponse.ok) {
      return { success: true, message: 'Lights turned on (JSON API)' };
    }
    
    
    // Fallback to HTTP API
    const httpResponse = await fetch(httpUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    
    return httpResponse.ok 
      ? { success: true, message: 'Lights turned on (HTTP API)' }
      : { success: false, message: `Both APIs failed. JSON: ${jsonResponse.status}, HTTP: ${httpResponse.status}` };
      
  } catch (error) {
    logger.error(`🔛 WLED API Error:`, error);
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to turn WLED lights off globally
export const turnWledOff = async (deviceAddress, protocol = "http") => {
  // Try JSON API first (more reliable), fallback to HTTP API
  const jsonUrl = buildWledUrl(deviceAddress, protocol, '/json/state');
  const httpUrl = buildWledUrl(deviceAddress, protocol, '/win&T=0');
  
  
  try {
    // Try JSON API first
    const jsonResponse = await fetch(jsonUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ on: false }),
      signal: AbortSignal.timeout(5000)
    });
    
    if (jsonResponse.ok) {
      return { success: true, message: 'Lights turned off (JSON API)' };
    }
    
    
    // Fallback to HTTP API
    const httpResponse = await fetch(httpUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    
    return httpResponse.ok 
      ? { success: true, message: 'Lights turned off (HTTP API)' }
      : { success: false, message: `Both APIs failed. JSON: ${jsonResponse.status}, HTTP: ${httpResponse.status}` };
      
  } catch (error) {
    logger.error(`🔴 WLED API Error:`, error);
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Create WLED preset via WebSocket (faster, real-time)
export const createWledPresetViaWebSocket = async (effectId, paletteId, presetName, presetId = null, options = {}) => {
  try {
    // Dynamically import WebSocket functions to avoid circular imports
    const { savePresetViaWebSocket, sendWebSocketCommand } = await import('../utils/wledWebSocket.js');
    
    // First, set the effect and palette
    const effectCommand = {
      seg: [{
        id: 0,
        fx: effectId,
        pal: paletteId
      }]
    };
    
    const effectSet = sendWebSocketCommand(effectCommand);
    if (!effectSet) {
      return { success: false, message: 'Failed to set effect via WebSocket' };
    }
    
    // Wait a moment for the effect to be applied
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate a unique preset ID if not provided
    let targetPresetId = presetId;
    if (!targetPresetId) {
      const timestamp = Date.now();
      const randomComponent = Math.floor(Math.random() * 100);
      targetPresetId = 50 + ((timestamp + randomComponent) % 200);
    }
    
    // Save the preset with the specified options
    const saveOptions = {
      includeBrightness: options.includeBrightness !== false,
      includeSegmentBrightness: options.includeSegmentBrightness !== false,
      includeSegmentColors: options.includeSegmentColors || false,
      ...options
    };
    
    const saved = savePresetViaWebSocket(targetPresetId, presetName, saveOptions);
    if (!saved) {
      return { success: false, message: 'Failed to save preset via WebSocket' };
    }
    
    return {
      success: true,
      message: 'Preset created via WebSocket',
      presetId: targetPresetId,
      method: 'websocket'
    };
    
  } catch (error) {
    return {
      success: false,
      message: `WebSocket preset creation failed: ${error.message}`
    };
  }
};

// Create WLED playlist via WebSocket (faster, real-time)
export const createWledPlaylistViaWebSocket = async (playlistItems, playlistName, options = {}) => {
  try {
    // Dynamically import WebSocket functions to avoid circular imports
    const { savePlaylistViaWebSocket } = await import('../utils/wledWebSocket.js');
    
    if (!playlistItems || playlistItems.length === 0) {
      return { success: false, message: 'Playlist cannot be empty' };
    }
    
    // Ensure all playlist items have preset IDs
    for (const item of playlistItems) {
      if (!item.presetId) {
        return { 
          success: false, 
          message: `Playlist item "${item.name}" missing preset ID. Create custom effects first.`
        };
      }
    }
    
    // Generate a unique preset ID for the playlist
    const timestamp = Date.now();
    const randomComponent = Math.floor(Math.random() * 100);
    const playlistPresetId = options.presetId || (50 + ((timestamp + randomComponent) % 200));
    
    // Default options
    const playlistOptions = {
      transition: 7, // 0.7 seconds transition
      repeat: 0, // Infinite repeat
      ...options
    };
    
    // Save the playlist via WebSocket
    const saved = savePlaylistViaWebSocket(
      playlistPresetId, 
      playlistName, 
      playlistItems, 
      playlistOptions
    );
    
    if (!saved) {
      return { success: false, message: 'Failed to save playlist via WebSocket' };
    }
    
    return {
      success: true,
      message: 'Playlist created via WebSocket',
      presetId: playlistPresetId,
      playlistItems: playlistItems.length,
      method: 'websocket'
    };
    
  } catch (error) {
    return {
      success: false,
      message: `WebSocket playlist creation failed: ${error.message}`
    };
  }
};

// Delete WLED playlist via WebSocket (faster, real-time)
export const deleteWledPlaylistViaWebSocket = async (presetId, playlistName = '') => {
  try {
    // Dynamically import WebSocket functions to avoid circular imports
    const { deletePlaylistViaWebSocket } = await import('../utils/wledWebSocket.js');
    
    if (!presetId || presetId < 1 || presetId > 250) {
      return { 
        success: false, 
        message: 'Invalid preset ID. Must be between 1 and 250.'
      };
    }
    
    // Delete the playlist via WebSocket
    const deleted = deletePlaylistViaWebSocket(presetId);
    
    if (!deleted) {
      return { success: false, message: 'Failed to delete playlist via WebSocket' };
    }
    
    return {
      success: true,
      message: `Playlist "${playlistName}" deleted via WebSocket`,
      presetId: presetId,
      method: 'websocket'
    };
    
  } catch (error) {
    return {
      success: false,
      message: `WebSocket playlist deletion failed: ${error.message}`
    };
  }
};