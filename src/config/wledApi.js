// Simplified WLED API - Focus on preset activation only

// Simple preset mapping - maps preset names to WLED preset numbers
export const PRESET_MAPPING = {
  "Autumn": 1,
  "Canada Day": 20,
  "Christmas": 35,
};

// Simple function to activate presets by name
export const activateWledPreset = async (deviceIp, presetName) => {
  const wledPresetNumber = PRESET_MAPPING[presetName];
  if (!wledPresetNumber) {
    return { success: false, message: `No preset mapping found for: ${presetName}` };
  }
  
  const url = `http://${deviceIp}/win&PL=${wledPresetNumber}`;
  
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
export const activateWledEffect = async (deviceIp, effectId, paletteId) => {
  const url = `http://${deviceIp}/win&FX=${effectId}&FP=${paletteId}`;
  
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
export const createWledPreset = async (deviceIp, effectId, paletteId, presetName, presetId = null) => {
  // First, set the current effect and palette
  const setEffectUrl = `http://${deviceIp}/win&FX=${effectId}&FP=${paletteId}`;
  
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
    
    // Find an available preset slot if no specific ID provided
    let targetPresetId = presetId;
    if (!targetPresetId) {
      const stateResult = await getWledState(deviceIp);
      if (!stateResult.success) {
        return { success: false, message: 'Failed to get device state' };
      }
      
      // Find next available preset slot (starting from 50 to avoid conflicts with seasonal presets)
      targetPresetId = 50;
      const existingPresets = stateResult.data.presets || {};
      while (existingPresets[targetPresetId]) {
        targetPresetId++;
        if (targetPresetId > 250) {
          return { success: false, message: 'No available preset slots' };
        }
      }
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
    
    const createPresetResponse = await fetch(`http://${deviceIp}/json/state`, {
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
export const deleteWledPreset = async (deviceIp, presetId) => {
  const url = `http://${deviceIp}/win&PD=${presetId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
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
export const activateWledPresetById = async (deviceIp, presetId) => {
  const url = `http://${deviceIp}/win&PL=${presetId}`;
  
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