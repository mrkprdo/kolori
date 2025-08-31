// WLED API Integration for React Native
// Migrated from kolori_old/src/config/wledApi.js with React Native specific modifications

import { logger } from '../utils/logger';
import { WLED_PALETTES_DATA, PaletteColor } from '../constants/palettes';
import { ApiResponse, DeviceValidationResult, WledDevice } from '../types';

// Helper function to build WLED URLs with protocol support
const buildWledUrl = (deviceAddress: string, protocol = "http", path: string): string => {
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
export const testDeviceConnectivity = async (
  deviceAddress: string, 
  protocol = "http"
): Promise<DeviceValidationResult> => {
  try {
    const startTime = Date.now();
    const url = buildWledUrl(deviceAddress, protocol, '/json/info');
    
    // React Native fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        bestAddress: deviceAddress,
        responseTime,
        deviceInfo: data,
        message: `Connected in ${responseTime}ms`
      };
    } else {
      return {
        success: false,
        bestAddress: deviceAddress,
        responseTime,
        message: `HTTP Error: ${response.status}`
      };
    }
    
  } catch (error: any) {
    return {
      success: false,
      bestAddress: deviceAddress,
      message: error.name === 'AbortError' ? 'Connection timeout' : `Connection failed: ${error.message}`
    };
  }
};

// Test both IP and mDNS addresses and return the best option
export const findBestDeviceAddress = async (
  ip?: string, 
  mdns?: string, 
  protocol = "http"
): Promise<DeviceValidationResult> => {
  const tests: Promise<DeviceValidationResult>[] = [];
  
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
        details: results.map(r => `${r.bestAddress}: ${r.message}`).join(', ')
      };
    }
    
    // Sort by response time (fastest first)
    successfulResults.sort((a, b) => (a.responseTime || 0) - (b.responseTime || 0));
    const bestResult = successfulResults[0];
    
    return {
      success: true,
      bestAddress: bestResult.bestAddress,
      responseTime: bestResult.responseTime,
      deviceInfo: bestResult.deviceInfo,
      message: `Best connection: ${bestResult.bestAddress} (${bestResult.responseTime}ms)`,
      allResults: results
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: `Connectivity test failed: ${error.message}`
    };
  }
};

// Simple preset mapping - maps preset names to WLED preset numbers
export const PRESET_MAPPING: { [key: string]: number } = {
  "Autumn": 1,
  "Canada Day": 20,
  "Christmas": 35,
};

// Simple function to activate presets by name
export const activateWledPreset = async (
  deviceAddress: string, 
  presetName: string, 
  protocol = "http"
): Promise<ApiResponse> => {
  const wledPresetNumber = PRESET_MAPPING[presetName];
  if (!wledPresetNumber) {
    return { success: false, message: `No preset mapping found for: ${presetName}` };
  }
  
  const url = buildWledUrl(deviceAddress, protocol, `/win&PL=${wledPresetNumber}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return response.ok 
      ? { success: true, message: 'Preset activated' }
      : { success: false, message: `HTTP Error: ${response.status}` };
      
  } catch (error: any) {
    return { 
      success: false, 
      message: error.name === 'AbortError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to activate custom effects (effect + palette combination)
export const activateWledEffect = async (
  deviceAddress: string, 
  effectId: number, 
  paletteId: number, 
  protocol = "http"
): Promise<ApiResponse> => {
  const url = buildWledUrl(deviceAddress, protocol, `/win&FX=${effectId}&FP=${paletteId}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return response.ok 
      ? { success: true, message: 'Effect activated' }
      : { success: false, message: `HTTP Error: ${response.status}` };
      
  } catch (error: any) {
    return { 
      success: false, 
      message: error.name === 'AbortError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to activate preset by ID
export const activateWledPresetById = async (
  deviceAddress: string, 
  presetId: number, 
  protocol = "http"
): Promise<ApiResponse> => {
  const url = buildWledUrl(deviceAddress, protocol, `/win&PL=${presetId}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return response.ok 
      ? { success: true, message: 'Preset activated' }
      : { success: false, message: `HTTP Error: ${response.status}` };
      
  } catch (error: any) {
    return { 
      success: false, 
      message: error.name === 'AbortError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to check if WLED device is online (heartbeat)
export const checkWledHeartbeat = async (
  deviceAddress: string, 
  protocol = "http"
): Promise<{ success: boolean; online: boolean; message: string }> => {
  const url = buildWledUrl(deviceAddress, protocol, '/json/info');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return { success: true, online: true, message: 'Device online' };
    } else {
      return { success: false, online: false, message: `HTTP Error: ${response.status}` };
    }
      
  } catch (error: any) {
    return { 
      success: false, 
      online: false,
      message: error.name === 'AbortError' ? 'Connection timeout' : `Connection failed: ${error.message}`
    };
  }
};

// Function to turn WLED lights on globally
export const turnWledOn = async (
  deviceAddress: string, 
  protocol = "http"
): Promise<ApiResponse> => {
  // Try JSON API first (more reliable), fallback to HTTP API
  const jsonUrl = buildWledUrl(deviceAddress, protocol, '/json/state');
  const httpUrl = buildWledUrl(deviceAddress, protocol, '/win&T=1');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    // Try JSON API first
    const jsonResponse = await fetch(jsonUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ on: true }),
      signal: controller.signal
    });
    
    if (jsonResponse.ok) {
      clearTimeout(timeoutId);
      return { success: true, message: 'Lights turned on (JSON API)' };
    }
    
    // Fallback to HTTP API
    const httpResponse = await fetch(httpUrl, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return httpResponse.ok 
      ? { success: true, message: 'Lights turned on (HTTP API)' }
      : { success: false, message: `Both APIs failed. JSON: ${jsonResponse.status}, HTTP: ${httpResponse.status}` };
      
  } catch (error: any) {
    logger.error('🔛 WLED API Error:', error);
    return { 
      success: false, 
      message: error.name === 'AbortError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Function to turn WLED lights off globally
export const turnWledOff = async (
  deviceAddress: string, 
  protocol = "http"
): Promise<ApiResponse> => {
  // Try JSON API first (more reliable), fallback to HTTP API
  const jsonUrl = buildWledUrl(deviceAddress, protocol, '/json/state');
  const httpUrl = buildWledUrl(deviceAddress, protocol, '/win&T=0');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    // Try JSON API first
    const jsonResponse = await fetch(jsonUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ on: false }),
      signal: controller.signal
    });
    
    if (jsonResponse.ok) {
      clearTimeout(timeoutId);
      return { success: true, message: 'Lights turned off (JSON API)' };
    }
    
    // Fallback to HTTP API
    const httpResponse = await fetch(httpUrl, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return httpResponse.ok 
      ? { success: true, message: 'Lights turned off (HTTP API)' }
      : { success: false, message: `Both APIs failed. JSON: ${jsonResponse.status}, HTTP: ${httpResponse.status}` };
      
  } catch (error: any) {
    logger.error('🔴 WLED API Error:', error);
    return { 
      success: false, 
      message: error.name === 'AbortError' ? 'Request timeout' : `Request failed: ${error.message}`
    };
  }
};

// Helper function to generate gradient based on palette ID
export const generatePresetGradient = (paletteId: number): string => {
  // Create array of palette names in order (matching WLED palette IDs)
  const paletteNames = Object.keys(WLED_PALETTES_DATA);
  const paletteName = paletteNames[paletteId] || paletteNames[0]; // Fallback to first palette
  
  // Get palette color data
  const paletteData = WLED_PALETTES_DATA[paletteName];
  if (!paletteData || paletteData.length === 0) {
    return `linear-gradient(135deg, #888888, #555555)`;
  }

  // Convert color data to RGB strings
  const colorStops = paletteData
    .map((color: PaletteColor) => `rgb(${color.red}, ${color.green}, ${color.blue})`)
    .join(", ");
  
  return `linear-gradient(135deg, ${colorStops})`;
};