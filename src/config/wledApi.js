// WLED API Configuration by Version
// Each version contains endpoint mappings for different WLED API operations

export const WLED_API_CONFIG = {
  "0.14.1": {
    // State API endpoints
    state: "/json/state",
    info: "/json/info",
    effects: "/json/effects",
    palettes: "/json/palettes",
    
    // Control endpoints
    setBrightness: "/json/state",
    setEffect: "/json/state",
    setPalette: "/json/state",
    setColor: "/json/state",
    setPower: "/json/state",
    
    // Segment control
    setSegment: "/json/state",
    
    // Preset management
    presets: "/json/presets",
    savePreset: "/json/presets",
    loadPreset: "/json/state",
    
    // Playlist control
    playlist: "/json/playlist",
    setPlaylist: "/json/playlist",
    
    // Live control (UDP)
    live: "/json/live",
    
    // Configuration
    config: "/json/cfg",
    
    // WebSocket endpoint for real-time updates
    websocket: "/ws",
    
    // File system
    edit: "/edit",
    upload: "/upload",
    
    // Network endpoints
    wifi: "/json/wifi",
    
    // Custom API endpoints specific to v0.14.1
    nodes: "/json/nodes",
    fxdata: "/json/fxdata",
  },
  
  "0.13.3": {
    // State API endpoints
    state: "/json/state",
    info: "/json/info",
    effects: "/json/effects",
    palettes: "/json/palettes",
    
    // Control endpoints
    setBrightness: "/json/state",
    setEffect: "/json/state",
    setPalette: "/json/state",
    setColor: "/json/state",
    setPower: "/json/state",
    
    // Segment control (limited in this version)
    setSegment: "/json/state",
    
    // Preset management
    presets: "/json/presets",
    savePreset: "/json/presets",
    loadPreset: "/json/state",
    
    // Configuration
    config: "/json/cfg",
    
    // WebSocket endpoint
    websocket: "/ws",
    
    // File system
    edit: "/edit",
    
    // Network endpoints
    wifi: "/json/wifi",
  },
  
  "0.12.0": {
    // State API endpoints (older format)
    state: "/json",
    info: "/json/info",
    effects: "/json/effects",
    palettes: "/json/palettes",
    
    // Control endpoints
    setBrightness: "/json",
    setEffect: "/json",
    setPalette: "/json",
    setColor: "/json",
    setPower: "/json",
    
    // Limited preset management
    presets: "/json/presets",
    loadPreset: "/json",
    
    // Configuration
    config: "/json/cfg",
    
    // File system
    edit: "/edit",
  }
};

// Helper function to get API endpoints for a specific version
export const getWledApi = (version) => {
  return WLED_API_CONFIG[version] || WLED_API_CONFIG["0.14.1"];
};

// Helper function to build full URL
export const buildWledUrl = (deviceIp, endpoint, version = "0.14.1") => {
  const api = getWledApi(version);
  const baseUrl = `http://${deviceIp}`;
  return `${baseUrl}${endpoint}`;
};

// Common WLED API payload structures for different versions
export const WLED_PAYLOADS = {
  "0.14.1": {
    setBrightness: (brightness) => ({ bri: brightness }),
    setEffect: (effectId) => ({ seg: [{ fx: effectId }] }),
    setPalette: (paletteId) => ({ seg: [{ pal: paletteId }] }),
    setColor: (r, g, b) => ({ seg: [{ col: [[r, g, b]] }] }),
    setPower: (on) => ({ on }),
    setPreset: (presetId) => ({ ps: presetId }),
  },
  
  "0.13.3": {
    setBrightness: (brightness) => ({ bri: brightness }),
    setEffect: (effectId) => ({ seg: [{ fx: effectId }] }),
    setPalette: (paletteId) => ({ seg: [{ pal: paletteId }] }),
    setColor: (r, g, b) => ({ seg: [{ col: [[r, g, b]] }] }),
    setPower: (on) => ({ on }),
    setPreset: (presetId) => ({ ps: presetId }),
  },
  
  "0.12.0": {
    setBrightness: (brightness) => ({ bri: brightness }),
    setEffect: (effectId) => ({ fx: effectId }),
    setPalette: (paletteId) => ({ pal: paletteId }),
    setColor: (r, g, b) => ({ col: [r, g, b] }),
    setPower: (on) => ({ on }),
    setPreset: (presetId) => ({ ps: presetId }),
  }
};

// Helper function to get payload structure for a specific version
export const getWledPayload = (version) => {
  return WLED_PAYLOADS[version] || WLED_PAYLOADS["0.14.1"];
};