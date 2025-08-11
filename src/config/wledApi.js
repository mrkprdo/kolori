// Simplified WLED API - Focus on preset activation only

// Helper function to build WLED URLs with protocol support
const buildWledUrl = (deviceIp, protocol = "http", path) => {
  return `${protocol}://${deviceIp}${path}`;
};

// Simple preset mapping - maps preset names to WLED preset numbers
export const PRESET_MAPPING = {
  "Autumn": 1,
  "Canada Day": 20,
  "Christmas": 35,
};

// Simple function to activate presets by name
export const activateWledPreset = async (deviceIp, presetName, protocol = "http") => {
  const wledPresetNumber = PRESET_MAPPING[presetName];
  if (!wledPresetNumber) {
    return { success: false, message: `No preset mapping found for: ${presetName}` };
  }
  
  const url = buildWledUrl(deviceIp, protocol, `/win&PL=${wledPresetNumber}`);
  
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

// Function to activate custom effects (effect + palette combination)
export const activateWledEffect = async (deviceIp, effectId, paletteId, protocol = "http") => {
  const url = buildWledUrl(deviceIp, protocol, `/win&FX=${effectId}&FP=${paletteId}`);
  
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
export const getWledInfo = async (deviceIp, protocol = "http") => {
  const url = buildWledUrl(deviceIp, protocol, '/json/info');
  
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
export const getWledEffects = async (deviceIp, protocol = "http") => {
  const url = buildWledUrl(deviceIp, protocol, '/json/effects');
  
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
export const getWledPalettes = async (deviceIp, protocol = "http") => {
  const url = buildWledUrl(deviceIp, protocol, '/json/palettes');
  
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
export const getWledPresets = async (deviceIp, protocol = "http") => {
  const url = buildWledUrl(deviceIp, protocol, '/presets.json');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(10000) // Longer timeout for presets
    });
    
    if (!response.ok) {
      return { success: false, message: `HTTP Error: ${response.status}` };
    }
    
    const presets = await response.json();
    console.log('Raw WLED presets.json response:', presets);
    
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
    
    console.log('Parsed Presets:', parsedPresets);
    console.log('Parsed Playlists:', playlists);
    
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
  // Simple gradient generation based on palette ID
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Default
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Random Cycle
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Primary Color
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Based on Primary
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Set Colors
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Based on Set
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)', // Party
    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', // Cloud
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Lava
    'linear-gradient(135deg, #08fdd8 0%, #6c93ff 100%)', // Ocean
    'linear-gradient(135deg, #52c234 0%, #061700 100%)', // Forest
    'linear-gradient(135deg, #ff0084 0%, #33001b 100%)', // Rainbow
  ];
  
  return gradients[paletteId % gradients.length] || gradients[0];
};

// Function to check if WLED device is online (heartbeat)
export const checkWledHeartbeat = async (deviceIp, protocol = "http") => {
  const url = buildWledUrl(deviceIp, protocol, '/json/info');
  
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
export const getWledState = async (deviceIp) => {
  const url = `http://${deviceIp}/json/state`;
  
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
export const createWledPreset = async (deviceIp, effectId, paletteId, presetName, presetId = null, protocol = "http") => {
  // First, set the current effect and palette
  const setEffectUrl = buildWledUrl(deviceIp, protocol, `/win&FX=${effectId}&FP=${paletteId}`);
  
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
    
    const createPresetResponse = await fetch(buildWledUrl(deviceIp, protocol, '/json/state'), {
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
export const deleteWledPreset = async (deviceIp, presetId, protocol = "http") => {
  const url = buildWledUrl(deviceIp, protocol, '/json/state');
  
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
export const activateWledPresetById = async (deviceIp, presetId, protocol = "http") => {
  const url = buildWledUrl(deviceIp, protocol, `/win&PL=${presetId}`);
  
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
  console.warn('DEPRECATED: Use createWledPlaylistViaWebSocket instead of HTTP-based createWledPlaylist');
  return { 
    success: false, 
    message: 'HTTP playlist creation is deprecated. Use WebSocket-based playlist creation instead.'
  };
};

// DEPRECATED: Old HTTP-based playlist start - use WebSocket commands instead
export const startWledPlaylist = async (deviceIp, firstPresetId, lastPresetId) => {
  console.warn('DEPRECATED: Use WebSocket playPlaylistViaWebSocket instead of HTTP-based startWledPlaylist');
  return { 
    success: false, 
    message: 'HTTP playlist control is deprecated. Use WebSocket-based playlist control instead.'
  };
};

// DEPRECATED: Use WebSocket commands instead
export const nextWledPlaylistItem = async (deviceIp) => {
  console.warn('DEPRECATED: Use WebSocket commands instead of HTTP-based nextWledPlaylistItem');
  return { 
    success: false, 
    message: 'HTTP playlist control is deprecated. Use WebSocket-based commands instead.'
  };
};

// DEPRECATED: Use WebSocket commands instead
export const stopWledPlaylist = async (deviceIp) => {
  console.warn('DEPRECATED: Use WebSocket commands instead of HTTP-based stopWledPlaylist');
  return { 
    success: false, 
    message: 'HTTP playlist control is deprecated. Use WebSocket-based commands instead.'
  };
};

// DEPRECATED: Use WebSocket deletePresetViaWebSocket instead
export const deleteWledPlaylist = async (deviceIp, presetIds) => {
  console.warn('DEPRECATED: Use WebSocket deletePresetViaWebSocket instead of HTTP-based deleteWledPlaylist');
  return { 
    success: false, 
    message: 'HTTP playlist deletion is deprecated. Use WebSocket-based preset deletion instead.'
  };
};

// Function to turn WLED lights on globally
export const turnWledOn = async (deviceIp, protocol = "http") => {
  // Try JSON API first (more reliable), fallback to HTTP API
  const jsonUrl = buildWledUrl(deviceIp, protocol, '/json/state');
  const httpUrl = buildWledUrl(deviceIp, protocol, '/win&T=1');
  
  console.log(`🔛 WLED API: Turning lights ON`);
  console.log(`🔛 JSON API: ${jsonUrl}`);
  console.log(`🔛 HTTP API Fallback: ${httpUrl}`);
  
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
      console.log(`🔛 JSON API Success: ${jsonResponse.status} ${jsonResponse.statusText}`);
      return { success: true, message: 'Lights turned on (JSON API)' };
    }
    
    console.log(`🔛 JSON API Failed: ${jsonResponse.status}, trying HTTP API...`);
    
    // Fallback to HTTP API
    const httpResponse = await fetch(httpUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`🔛 HTTP API Response: ${httpResponse.status} ${httpResponse.statusText}`);
    
    return httpResponse.ok 
      ? { success: true, message: 'Lights turned on (HTTP API)' }
      : { success: false, message: `Both APIs failed. JSON: ${jsonResponse.status}, HTTP: ${httpResponse.status}` };
      
  } catch (error) {
    console.error(`🔛 WLED API Error:`, error);
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to turn WLED lights off globally
export const turnWledOff = async (deviceIp, protocol = "http") => {
  // Try JSON API first (more reliable), fallback to HTTP API
  const jsonUrl = buildWledUrl(deviceIp, protocol, '/json/state');
  const httpUrl = buildWledUrl(deviceIp, protocol, '/win&T=0');
  
  console.log(`🔴 WLED API: Turning lights OFF`);
  console.log(`🔴 JSON API: ${jsonUrl}`);
  console.log(`🔴 HTTP API Fallback: ${httpUrl}`);
  
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
      console.log(`🔴 JSON API Success: ${jsonResponse.status} ${jsonResponse.statusText}`);
      return { success: true, message: 'Lights turned off (JSON API)' };
    }
    
    console.log(`🔴 JSON API Failed: ${jsonResponse.status}, trying HTTP API...`);
    
    // Fallback to HTTP API
    const httpResponse = await fetch(httpUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`🔴 HTTP API Response: ${httpResponse.status} ${httpResponse.statusText}`);
    
    return httpResponse.ok 
      ? { success: true, message: 'Lights turned off (HTTP API)' }
      : { success: false, message: `Both APIs failed. JSON: ${jsonResponse.status}, HTTP: ${httpResponse.status}` };
      
  } catch (error) {
    console.error(`🔴 WLED API Error:`, error);
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