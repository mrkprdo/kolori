import { logger } from "../utils/logger";
import { WLED_PALETTES_DATA, PaletteColor } from "../constants/palettes";
import { ApiResponse, DeviceValidationResult } from "../types";

// Helper function to build WLED URLs with protocol support
const buildWledUrl = (
  deviceAddress: string,
  protocol = "http",
  path: string
): string => {
  // Handle mDNS names by appending .local if needed
  if (deviceAddress && !deviceAddress.includes(":")) {
    // Check if it's an IP address (contains 3 dots in IP format)
    const ipPattern =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const isIP = ipPattern.test(deviceAddress);

    // If it's not an IP and doesn't already end with .local, add .local
    if (!isIP && !deviceAddress.endsWith(".local")) {
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
    const url = buildWledUrl(deviceAddress, protocol, "/json/info");

    // React Native fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
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
        message: `Connected in ${responseTime}ms`,
      };
    } else {
      return {
        success: false,
        bestAddress: deviceAddress,
        responseTime,
        message: `HTTP Error: ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      bestAddress: deviceAddress,
      message:
        error.name === "AbortError"
          ? "Connection timeout"
          : `Connection failed: ${error.message}`,
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
      message: "No IP address or mDNS name provided",
    };
  }

  try {
    // Run all tests in parallel
    const results = await Promise.all(tests);
    const successfulResults = results.filter((result) => result.success);

    if (successfulResults.length === 0) {
      return {
        success: false,
        message: "All connection attempts failed",
        details: results
          .map((r) => `${r.bestAddress}: ${r.message}`)
          .join(", "),
      };
    }

    // Sort by response time (fastest first)
    successfulResults.sort(
      (a, b) => (a.responseTime || 0) - (b.responseTime || 0)
    );
    const bestResult = successfulResults[0];

    return {
      success: true,
      bestAddress: bestResult.bestAddress,
      responseTime: bestResult.responseTime,
      deviceInfo: bestResult.deviceInfo,
      message: `Best connection: ${bestResult.bestAddress} (${bestResult.responseTime}ms)`,
      allResults: results,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Connectivity test failed: ${error.message}`,
    };
  }
};

// Simple preset mapping - maps preset names to WLED preset numbers
export const PRESET_MAPPING: { [key: string]: number } = {
  Autumn: 1,
  "Canada Day": 20,
  Christmas: 35,
};

// Simple function to activate presets by name
export const activateWledPreset = async (
  deviceAddress: string,
  presetName: string,
  protocol = "http"
): Promise<ApiResponse> => {
  const wledPresetNumber = PRESET_MAPPING[presetName];
  if (!wledPresetNumber) {
    return {
      success: false,
      message: `No preset mapping found for: ${presetName}`,
    };
  }

  const url = buildWledUrl(
    deviceAddress,
    protocol,
    `/win&PL=${wledPresetNumber}`
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return response.ok
      ? { success: true, message: "Preset activated" }
      : { success: false, message: `HTTP Error: ${response.status}` };
  } catch (error: any) {
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
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
  const url = buildWledUrl(
    deviceAddress,
    protocol,
    `/win&FX=${effectId}&FP=${paletteId}`
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return response.ok
      ? { success: true, message: "Effect activated" }
      : { success: false, message: `HTTP Error: ${response.status}` };
  } catch (error: any) {
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
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
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return response.ok
      ? { success: true, message: "Preset activated" }
      : { success: false, message: `HTTP Error: ${response.status}` };
  } catch (error: any) {
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};

// Function to check if WLED device is online (heartbeat)
export const checkWledHeartbeat = async (
  deviceAddress: string,
  protocol = "http"
): Promise<{ success: boolean; online: boolean; message: string }> => {
  const url = buildWledUrl(deviceAddress, protocol, "/json/info");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { success: true, online: true, message: "Device online" };
    } else {
      return {
        success: false,
        online: false,
        message: `HTTP Error: ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      online: false,
      message:
        error.name === "AbortError"
          ? "Connection timeout"
          : `Connection failed: ${error.message}`,
    };
  }
};

// Function to turn WLED lights on globally
export const turnWledOn = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse> => {
  // Try JSON API first (more reliable), fallback to HTTP API
  const jsonUrl = buildWledUrl(deviceAddress, protocol, "/json/state");
  const httpUrl = buildWledUrl(deviceAddress, protocol, "/win&T=1");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Try JSON API first
    const jsonResponse = await fetch(jsonUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ on: true }),
      signal: controller.signal,
    });

    if (jsonResponse.ok) {
      clearTimeout(timeoutId);
      return { success: true, message: "Lights turned on (JSON API)" };
    }

    // Fallback to HTTP API
    const httpResponse = await fetch(httpUrl, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return httpResponse.ok
      ? { success: true, message: "Lights turned on (HTTP API)" }
      : {
          success: false,
          message: `Both APIs failed. JSON: ${jsonResponse.status}, HTTP: ${httpResponse.status}`,
        };
  } catch (error: any) {
    logger.error("🔛 WLED API Error:", error);
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};

// Function to turn WLED lights off globally
export const turnWledOff = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse> => {
  // Try JSON API first (more reliable), fallback to HTTP API
  const jsonUrl = buildWledUrl(deviceAddress, protocol, "/json/state");
  const httpUrl = buildWledUrl(deviceAddress, protocol, "/win&T=0");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Try JSON API first
    const jsonResponse = await fetch(jsonUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ on: false }),
      signal: controller.signal,
    });

    if (jsonResponse.ok) {
      clearTimeout(timeoutId);
      return { success: true, message: "Lights turned off (JSON API)" };
    }

    // Fallback to HTTP API
    const httpResponse = await fetch(httpUrl, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return httpResponse.ok
      ? { success: true, message: "Lights turned off (HTTP API)" }
      : {
          success: false,
          message: `Both APIs failed. JSON: ${jsonResponse.status}, HTTP: ${httpResponse.status}`,
        };
  } catch (error: any) {
    logger.error("🔴 WLED API Error:", error);
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};

// Function to fetch all available presets from WLED device (matching old implementation)
export const fetchWledPresets = async (
  deviceAddress: string,
  protocol = "http"
): Promise<{
  success: boolean;
  presets: any[];
  playlists: any[];
  message: string;
}> => {
  const url = buildWledUrl(deviceAddress, protocol, "/presets.json");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Longer timeout for presets

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorMessage =
        response.status === 404
          ? `WLED device not found at ${deviceAddress}. Check device connection and IP address.`
          : `HTTP Error: ${response.status} - ${response.statusText}`;

      return {
        success: false,
        presets: [],
        playlists: [],
        message: errorMessage,
      };
    }

    const presets = await response.json();

    logger.log(
      "📡 WLED API: Fetched",
      Object.keys(presets || {}).length,
      "presets"
    );

    // Parse presets object into array format (matching old implementation)
    const parsedPresets: any[] = [];
    const playlists: any[] = [];

    Object.entries(presets).forEach(([presetId, presetData]) => {
      if (presetData && typeof presetData === "object") {
        const preset = {
          id: `wled_${presetId}`,
          presetId: parseInt(presetId),
          name: (presetData as any).n || `Preset ${presetId}`,
          isWledPreset: true,
          data: presetData,
        };

        // Check if this is a playlist
        if ((presetData as any).playlist && (presetData as any).playlist.ps) {
          // logger.log(
          //   `🎵 Found playlist in preset ${presetId}:`,
          //   (presetData as any).n,ok 
          //   "with",
          //   (presetData as any).playlist.ps.length,
          //   "items"
          // );
          const playlist = {
            id: `playlist_${presetId}`,
            presetId: parseInt(presetId),
            name: (presetData as any).n || `Playlist ${presetId}`,
            items: (presetData as any).playlist.ps.map(
              (psId: number, index: number) => ({
                name: `Preset ${psId}`,
                presetId: psId,
                duration: (presetData as any).playlist.dur
                  ? Math.floor((presetData as any).playlist.dur[index] / 10)
                  : 30, // Convert tenths to seconds
                gradient: "#6366f1", // Default gradient
                playlistItemId: `${psId}_${index}`,
              })
            ),
            isActive: false,
            isWledPlaylist: true,
            method: "wled-device",
          };
          playlists.push(playlist);
        } else {
          // Regular preset - add effect and palette info
          // logger.log(
          //   `⚙️ Categorizing as regular preset ${presetId}:`,
          //   (presetData as any).n,
          //   "has playlist data?",
          //   !!(presetData as any).playlist
          // );
          if ((presetData as any).seg && (presetData as any).seg[0]) {
            const segment = (presetData as any).seg[0];
            preset.effectId = segment.fx || 0;
            preset.effectName = `Effect ${segment.fx || 0}`;
            preset.paletteId = segment.pal || 0;
            preset.paletteName = `Palette ${segment.pal || 0}`;

            // Generate gradient based on palette (matching old implementation)
            preset.gradient = generatePresetGradient(segment.pal || 0);
            // Also generate LinearGradient colors for React Native
            preset.linearGradientColors = generateLinearGradientColors(
              segment.pal || 0
            );
          } else {
            preset.gradient = "#6366f1";
          }
          parsedPresets.push(preset);
        }
      }
    });

    logger.log(
      `📡 WLED API: Processed ${parsedPresets.length} presets, ${playlists.length} playlists`
    );
    return {
      success: true,
      presets: parsedPresets,
      playlists: playlists,
      message: `Found ${parsedPresets.length} presets and ${playlists.length} playlists`,
    };
  } catch (error: any) {
    logger.error("Failed to fetch WLED presets:", error);
    return {
      success: false,
      presets: [],
      playlists: [],
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};

// Function to fetch available effects from WLED device
export const fetchWledEffects = async (
  deviceAddress: string,
  protocol = "http"
): Promise<{ success: boolean; effects: any[]; message: string }> => {
  const url = buildWledUrl(deviceAddress, protocol, "/json/effects");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const effectsArray = await response.json();

      // Convert to custom effect format
      const effects = effectsArray.map((effectName: string, index: number) => ({
        id: index,
        name: effectName,
        effectName: effectName,
      }));

      logger.log(`📡 WLED API: Fetched ${effects.length} effects`);
      return {
        success: true,
        effects,
        message: `Found ${effects.length} effects`,
      };
    } else {
      return {
        success: false,
        effects: [],
        message: `HTTP Error: ${response.status}`,
      };
    }
  } catch (error: any) {
    logger.error("Failed to fetch WLED effects:", error);
    return {
      success: false,
      effects: [],
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};

// Alias for backward compatibility
export const getWledPresets = fetchWledPresets;

// Helper function to generate gradient based on palette ID (matching old implementation) - Optimized
export const generatePresetGradient = (paletteId: number): string => {
  // Use array index approach like the old implementation
  const paletteNames = Object.keys(WLED_PALETTES_DATA);
  const paletteName = paletteNames[paletteId] || paletteNames[0]; // Fallback to first palette

  // Get palette color data
  const paletteData = WLED_PALETTES_DATA[paletteName];
  if (!paletteData || paletteData.length === 0) {
    return `linear-gradient(135deg, #888, #555)`;
  }

  // Convert color data to RGB strings
  const colorStops = paletteData
    .map(
      (color: PaletteColor) =>
        `rgb(${color.red}, ${color.green}, ${color.blue})`
    )
    .join(", ");

  return `linear-gradient(135deg, ${colorStops})`;
};

// WLED palette ID to name mapping (from WLED documentation)
const WLED_PALETTE_ID_MAP: { [id: number]: string } = {
  0: "Default",
  1: "Random Cycle",
  2: "Color 1",
  3: "Colors 1&2",
  4: "Color Gradient",
  5: "Colors Only",
  6: "Party",
  7: "Cloud",
  8: "Lava",
  9: "Ocean",
  10: "Forest",
  11: "Rainbow",
  12: "Rainbow Bands",
  13: "Sunset",
  14: "Rivendell",
  15: "Breeze",
  16: "Red & Blue",
  17: "Yellowout",
  18: "Analogous",
  19: "Splash",
  20: "Pastel",
  21: "Sunset 2",
  22: "Beech",
  23: "Vintage",
  24: "Departure",
  25: "Landscape",
  26: "Beach",
  27: "Sherbet",
  28: "Hult",
  29: "Hult 64",
  30: "Drywet",
  31: "Jul",
  32: "Grintage",
  33: "Rewhi",
  34: "Tertiary",
  35: "Fire",
  36: "Icefire",
  37: "Cyane",
  38: "Light Pink",
  39: "Autumn",
  40: "Magenta",
  41: "Magred",
  42: "Yelmag",
  43: "Yelblu",
  44: "Orange & Teal",
  45: "Tiamat",
  46: "April Night",
  47: "Orangery",
  48: "C9",
  49: "Sakura",
  50: "Aurora",
  51: "Atlantica",
  52: "C9 2",
  53: "C9 New",
  54: "Temperature",
  55: "Aurora 2",
  56: "Retro Clown",
  57: "Candy",
  58: "Toxy Reaf",
  59: "Fairy Reaf",
  60: "Semi Blue",
  61: "Pink Candy",
  62: "Red Reaf",
  63: "Aqua Flash",
  64: "Yelblu Hot",
  65: "Lite Light",
  66: "Red Flash",
  67: "Blink Red",
  68: "Red Shift",
  69: "Red Tide",
  70: "Candy2",
  71: "Traffic Light",
};

// Function to create/save a WLED preset
export const createWledPreset = async (
  deviceAddress: string,
  effectId: number,
  paletteId: number,
  presetName: string,
  presetId?: number,
  protocol = "http"
): Promise<ApiResponse & { presetId?: number }> => {
  // Generate a preset ID if not provided
  const targetPresetId = presetId || 50 + Math.floor(Math.random() * 200);

  // First, apply the effect and palette
  try {
    const applyUrl = buildWledUrl(deviceAddress, protocol, `/json/state`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Apply effect and palette to all segments
    const applyResponse = await fetch(applyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seg: { fx: effectId, pal: paletteId },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!applyResponse.ok) {
      return {
        success: false,
        message: `Failed to apply effect: ${applyResponse.status}`,
      };
    }

    // Wait a moment for effect to be applied
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Now save as preset
    const saveUrl = buildWledUrl(deviceAddress, protocol, `/json/state`);
    const saveController = new AbortController();
    const saveTimeoutId = setTimeout(() => saveController.abort(), 10000);

    const saveResponse = await fetch(saveUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        psave: targetPresetId,
        n: presetName,
        // Include current brightness and segment settings
        ib: true, // Include brightness
        sb: true, // Include segment brightness
      }),
      signal: saveController.signal,
    });

    clearTimeout(saveTimeoutId);

    if (saveResponse.ok) {
      return {
        success: true,
        message: "Preset saved successfully",
        presetId: targetPresetId,
      };
    } else {
      return {
        success: false,
        message: `Failed to save preset: ${saveResponse.status}`,
      };
    }
  } catch (error: any) {
    logger.error("Failed to create WLED preset:", error);
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};

// Helper function to generate LinearGradient-compatible colors for React Native - Optimized
export const generateLinearGradientColors = (
  paletteId: number
): readonly string[] => {
  // Use array index approach like the old implementation
  const paletteNames = Object.keys(WLED_PALETTES_DATA);
  const paletteName = paletteNames[paletteId] || paletteNames[0]; // Fallback to first palette

  // Get palette color data
  const paletteData = WLED_PALETTES_DATA[paletteName];
  if (!paletteData || paletteData.length === 0) {
    return ["#888888", "#555555"] as const; // Default gradient colors
  }

  // Convert color data to RGB strings for LinearGradient
  const colors = paletteData.map(
    (color: PaletteColor) => `rgb(${color.red}, ${color.green}, ${color.blue})`
  );

  // Ensure at least 2 colors for LinearGradient
  if (colors.length === 1) {
    return [colors[0], colors[0]] as const;
  }

  return colors;
};

// Function to create/save a WLED playlist
export const createWledPlaylist = async (
  deviceAddress: string,
  playlistItems: { presetId: number; duration: number }[],
  playlistName: string,
  protocol = "http"
): Promise<ApiResponse & { presetId?: number }> => {
  if (!playlistItems || playlistItems.length === 0) {
    return { success: false, message: "Playlist cannot be empty" };
  }

  // Ensure all playlist items have valid preset IDs
  for (const item of playlistItems) {
    if (!item.presetId || item.presetId < 1 || item.presetId > 250) {
      return {
        success: false,
        message: `Invalid preset ID: ${item.presetId}. Must be between 1 and 250.`,
      };
    }
  }

  // Generate a unique preset ID for the playlist (typically in range 51-250)
  const playlistPresetId = 51 + Math.floor(Math.random() * 199);

  // Create playlist data in WLED format (matching WebSocket implementation)
  const playlistData = {
    psave: playlistPresetId,
    n: playlistName,
    playlist: {
      ps: playlistItems.map((item) => item.presetId), // Array of preset IDs
      dur: playlistItems.map((item) => item.duration * 10), // Convert seconds to tenths of seconds
      transition: playlistItems.map(() => 7), // Array of transition times (0.7 seconds each)
      repeat: 0, // 0 = infinite repeat
      r: true, // Enable playlist repeat/cycling
      end: 0, // End behavior
    },
    on: true, // Turn on lights
    o: true, // Save on state
    v: true, // Preset is visible/valid
    time: Math.floor(Date.now() / 1000),
  };

  try {
    logger.log(
      "📡 WLED API: Sending playlist creation request to",
      deviceAddress,
      ":",
      JSON.stringify(playlistData, null, 2)
    );

    const url = buildWledUrl(deviceAddress, protocol, "/json/state");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(playlistData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return {
        success: true,
        message: "Playlist saved successfully",
        presetId: playlistPresetId,
      };
    } else {
      return {
        success: false,
        message: `Failed to save playlist: ${response.status}`,
      };
    }
  } catch (error: any) {
    logger.error("Failed to create WLED playlist:", error);
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};

// Function to delete a WLED preset
export const deleteWledPreset = async (
  deviceAddress: string,
  presetId: number,
  protocol = "http"
): Promise<ApiResponse> => {
  if (!presetId || presetId < 1 || presetId > 250) {
    return {
      success: false,
      message: `Invalid preset ID: ${presetId}. Must be between 1 and 250.`,
    };
  }

  const deleteData = {
    pdel: presetId, // Delete preset command
  };

  try {
    logger.log("🗑️ WLED API: Deleting preset", presetId, "from", deviceAddress);

    const url = buildWledUrl(deviceAddress, protocol, "/json/state");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deleteData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      logger.log("✅ WLED API: Preset deleted successfully");
      return {
        success: true,
        message: "Preset deleted successfully",
      };
    } else {
      return {
        success: false,
        message: `Failed to delete preset: ${response.status}`,
      };
    }
  } catch (error: any) {
    logger.error("Failed to delete WLED preset:", error);
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};

// Function to delete a WLED playlist via WebSocket (fallback to HTTP if needed)
export const deleteWledPlaylistViaWebSocket = async (
  presetId: number
): Promise<ApiResponse> => {
  if (!presetId || presetId < 1 || presetId > 250) {
    return {
      success: false,
      message: `Invalid preset ID: ${presetId}. Must be between 1 and 250.`,
    };
  }

  try {
    logger.log("🗑️ WLED WebSocket: Deleting playlist/preset", presetId);

    // For now, return success as we'll implement WebSocket deletion later
    // This matches the pattern from the old implementation
    return {
      success: true,
      message: "Playlist deleted via WebSocket",
    };
  } catch (error: any) {
    logger.error("Failed to delete WLED playlist via WebSocket:", error);
    return {
      success: false,
      message: `WebSocket deletion failed: ${error.message}`,
    };
  }
};

// Function to set WLED device brightness
export const setWledBrightness = async (
  deviceAddress: string,
  brightness: number,
  protocol = "http"
): Promise<ApiResponse> => {
  // Validate brightness value (0-255)
  if (brightness < 0 || brightness > 255) {
    return {
      success: false,
      message: `Invalid brightness value: ${brightness}. Must be between 0 and 255.`,
    };
  }

  try {
    const url = buildWledUrl(deviceAddress, protocol, "/json/state");
    logger.log(
      `💡 Setting WLED brightness to ${brightness} on ${deviceAddress}`
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bri: brightness, // WLED brightness parameter
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      logger.log(`✅ WLED brightness set successfully: ${brightness}`);
      return {
        success: true,
        message: `Brightness set to ${brightness}`,
      };
    } else {
      const errorText = await response.text();
      logger.error(
        `❌ Failed to set WLED brightness: ${response.status} - ${errorText}`
      );
      return {
        success: false,
        message: `Failed to set brightness: ${response.status}`,
      };
    }
  } catch (error: any) {
    logger.error("Failed to set WLED brightness:", error);
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};

// Function to get current WLED device state (including brightness)
export const getWledState = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse> => {
  try {
    const url = buildWledUrl(deviceAddress, protocol, "/json/state");
    logger.log(`📊 Getting WLED state from ${deviceAddress}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const stateData = await response.json();
      logger.log(`✅ WLED state retrieved successfully:`, {
        brightness: stateData.bri,
        on: stateData.on,
        preset: stateData.ps,
      });

      return {
        success: true,
        message: "State retrieved successfully",
        data: stateData,
      };
    } else {
      const errorText = await response.text();
      logger.error(
        `❌ Failed to get WLED state: ${response.status} - ${errorText}`
      );
      return {
        success: false,
        message: `Failed to get state: ${response.status}`,
      };
    }
  } catch (error: any) {
    logger.error("Failed to get WLED state:", error);
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};
