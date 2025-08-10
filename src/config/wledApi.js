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
export const getWledInfo = async (deviceIp) => {
  const url = `http://${deviceIp}/json/info`;
  
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

// Function to create a playlist by setting up preset cycling
export const createWledPlaylist = async (deviceIp, playlistItems, playlistName) => {
  try {
    // First, create presets for each playlist item
    const createdPresets = [];
    
    for (let i = 0; i < playlistItems.length; i++) {
      const item = playlistItems[i];
      const presetResult = await createWledPreset(
        deviceIp, 
        item.effectId, 
        item.paletteId, 
        `${playlistName}_${i + 1}`,
        null // Let it find an available slot
      );
      
      if (!presetResult.success) {
        return { success: false, message: `Failed to create preset for ${item.name}: ${presetResult.message}` };
      }
      
      createdPresets.push({
        ...item,
        presetId: presetResult.presetId
      });
    }
    
    // Set up playlist cycling using the created presets
    const firstPresetId = createdPresets[0].presetId;
    const lastPresetId = createdPresets[createdPresets.length - 1].presetId;
    
    const setupUrl = `http://${deviceIp}/win&P1=${firstPresetId}&P2=${lastPresetId}&PL=${firstPresetId}`;
    
    const response = await fetch(setupUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return { success: false, message: `Failed to setup playlist: ${response.status}` };
    }
    
    return { 
      success: true, 
      message: 'Playlist created successfully',
      presets: createdPresets,
      firstPresetId,
      lastPresetId
    };
      
  } catch (error) {
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to start/play a playlist
export const startWledPlaylist = async (deviceIp, firstPresetId, lastPresetId) => {
  const url = `http://${deviceIp}/win&P1=${firstPresetId}&P2=${lastPresetId}&PL=${firstPresetId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok 
      ? { success: true, message: 'Playlist started' }
      : { success: false, message: `HTTP Error: ${response.status}` };
      
  } catch (error) {
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to advance to next preset in playlist
export const nextWledPlaylistItem = async (deviceIp) => {
  const url = `http://${deviceIp}/win&PL=~`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok 
      ? { success: true, message: 'Advanced to next preset' }
      : { success: false, message: `HTTP Error: ${response.status}` };
      
  } catch (error) {
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to stop playlist (turn off preset cycling)
export const stopWledPlaylist = async (deviceIp) => {
  const url = `http://${deviceIp}/win&P1=0&P2=0`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok 
      ? { success: true, message: 'Playlist stopped' }
      : { success: false, message: `HTTP Error: ${response.status}` };
      
  } catch (error) {
    return { 
      success: false, 
      message: error.name === 'TimeoutError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to delete a playlist (remove all its presets)
export const deleteWledPlaylist = async (deviceIp, presetIds) => {
  try {
    for (const presetId of presetIds) {
      const deleteResult = await deleteWledPreset(deviceIp, presetId);
      if (!deleteResult.success) {
        return { success: false, message: `Failed to delete preset ${presetId}: ${deleteResult.message}` };
      }
    }
    
    return { success: true, message: 'Playlist deleted successfully' };
      
  } catch (error) {
    return { 
      success: false, 
      message: `Request failed: ${error.message}`
    };
  }
};