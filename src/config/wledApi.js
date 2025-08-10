// Simplified WLED API - Focus on preset activation only

// Simple preset mapping - maps preset names to WLED preset numbers
export const PRESET_MAPPING = {
  "Autumn": 1,
  "Canada Day": 20,
  "Christmas": 35,
  "Sunset Glow": 5,
  "Ocean Breeze": 6,
  "Candy Mix": 7,
  "Pastel Dreams": 8,
  "Fire Dance": 9,
  "Forest Mist": 10,
  "Arctic Ice": 11,
  "Galaxy": 12,
  "Coral Reef": 13,
  "Mint Fresh": 14,
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