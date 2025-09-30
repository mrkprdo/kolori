import { logger } from "../utils/logger";
import { WLED_PALETTES_DATA, PaletteColor } from "../constants/palettes";
import { ApiResponse, DeviceValidationResult } from "../types";

// Generate gradient for playlists based on name and content
const generatePlaylistGradient = (
  playlistName: string,
  itemCount: number
): { colors: string[]; gradient: string } => {
  const name = playlistName.toLowerCase();

  // Name-based gradients
  if (name.includes("fire") || name.includes("flame")) {
    return {
      colors: ["#ff4500", "#ff6500", "#ffb347"],
      gradient: "linear-gradient(135deg, #ff4500, #ff6500, #ffb347)",
    };
  }
  if (name.includes("rainbow") || name.includes("colorful")) {
    return {
      colors: [
        "#ff0000",
        "#ff7700",
        "#ffff00",
        "#00ff00",
        "#0077ff",
        "#4b0082",
      ],
      gradient:
        "linear-gradient(135deg, #ff0000, #ff7700, #ffff00, #00ff00, #0077ff, #4b0082)",
    };
  }
  if (
    name.includes("ocean") ||
    name.includes("blue") ||
    name.includes("water")
  ) {
    return {
      colors: ["#006994", "#47b5d6", "#87ceeb"],
      gradient: "linear-gradient(135deg, #006994, #47b5d6, #87ceeb)",
    };
  }
  if (name.includes("sunset") || name.includes("orange")) {
    return {
      colors: ["#ff4500", "#ff6347", "#ffa500"],
      gradient: "linear-gradient(135deg, #ff4500, #ff6347, #ffa500)",
    };
  }
  if (name.includes("forest") || name.includes("green")) {
    return {
      colors: ["#228b22", "#32cd32", "#90ee90"],
      gradient: "linear-gradient(135deg, #228b22, #32cd32, #90ee90)",
    };
  }
  if (name.includes("party") || name.includes("dance")) {
    return {
      colors: ["#ff1493", "#00ffff", "#9400d3", "#ff4500"],
      gradient: "linear-gradient(135deg, #ff1493, #00ffff, #9400d3, #ff4500)",
    };
  }
  if (name.includes("chill") || name.includes("relax")) {
    return {
      colors: ["#6a5acd", "#87ceeb", "#dda0dd"],
      gradient: "linear-gradient(135deg, #6a5acd, #87ceeb, #dda0dd)",
    };
  }

  // Fallback: Generate gradient based on playlist name hash and item count
  const hash = name.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hash + itemCount * 30) % 360;
  const hue3 = (hash + itemCount * 60) % 360;

  const colors = [
    `hsl(${hue1}, 70%, 50%)`,
    `hsl(${hue2}, 70%, 60%)`,
    `hsl(${hue3}, 70%, 55%)`,
  ];

  return {
    colors,
    gradient: `linear-gradient(135deg, ${colors.join(", ")})`,
  };
};

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
          const playlistName = (presetData as any).n || `Playlist ${presetId}`;
          const playlistItems = (presetData as any).playlist.ps.map(
            (psId: number, index: number) => ({
              name: `Preset ${psId}`,
              presetId: psId,
              duration: (presetData as any).playlist.dur
                ? Math.floor((presetData as any).playlist.dur[index] / 10)
                : 30, // Convert tenths to seconds
              gradient: "#6366f1", // Default gradient for individual items
              playlistItemId: `${psId}_${index}`,
            })
          );

          // Generate gradient for the playlist based on name and content
          const playlistGradientData = generatePlaylistGradient(
            playlistName,
            playlistItems.length
          );

          const playlist = {
            id: `playlist_${presetId}`,
            presetId: parseInt(presetId),
            name: playlistName,
            items: playlistItems,
            isActive: false,
            isWledPlaylist: true,
            method: "wled-device",
            gradient: playlistGradientData.gradient,
            linearGradientColors: playlistGradientData.colors,
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

// Function to create/save a WLED preset
export const createWledPreset = async (
  deviceAddress: string,
  effectId: number,
  paletteId: number,
  presetName: string,
  presetId?: number,
  protocol = "http"
): Promise<ApiResponse & { presetId?: number }> => {
  // Validate and sanitize preset name
  if (!presetName || presetName.trim().length === 0) {
    return {
      success: false,
      message: "Preset name cannot be empty",
    };
  }

  // Trim and limit preset name length (WLED has limits)
  const sanitizedName = presetName.trim().substring(0, 32);
  console.log("📝 Using preset name:", sanitizedName);

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

    const savePayload = {
      psave: targetPresetId,
      n: sanitizedName,
      // Include current brightness and segment settings
      ib: true, // Include brightness
      sb: true, // Include segment brightness
    };

    console.log(
      "💾 Saving WLED preset with payload:",
      JSON.stringify(savePayload, null, 2)
    );

    const saveResponse = await fetch(saveUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(savePayload),
      signal: saveController.signal,
    });

    clearTimeout(saveTimeoutId);

    if (saveResponse.ok) {
      // Try to get the response text to see what WLED returned
      try {
        const responseText = await saveResponse.text();
        console.log("✅ WLED preset save response:", responseText);
      } catch (parseError) {
        console.log("✅ WLED preset saved successfully (no response body)");
      }

      return {
        success: true,
        message: "Preset saved successfully",
        presetId: targetPresetId,
      };
    } else {
      let errorMessage = `Failed to save preset: ${saveResponse.status}`;
      try {
        const errorText = await saveResponse.text();
        if (errorText) {
          errorMessage += ` - ${errorText}`;
          console.error("❌ WLED preset save error response:", errorText);
        }
      } catch (parseError) {
        // Ignore parse errors for error responses
      }

      return {
        success: false,
        message: errorMessage,
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
    pdel: presetId, // Delete preset command - this is the verified working method
  };

  try {
    logger.log("🗑️ WLED API: Deleting preset", presetId, "from", deviceAddress);
    logger.log("🗑️ Delete request data:", JSON.stringify(deleteData));

    const url = buildWledUrl(deviceAddress, protocol, "/json/state");
    logger.log("🗑️ Request URL:", url);

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
      // Try to parse response to get more details
      try {
        const responseData = await response.json();
        logger.log(
          "✅ WLED API: Preset deleted successfully, response:",
          responseData
        );
      } catch (parseError) {
        logger.log(
          "✅ WLED API: Preset deleted successfully (no JSON response)"
        );
      }

      return {
        success: true,
        message: "Preset deleted successfully",
      };
    } else {
      let errorMessage = `Failed to delete preset: ${response.status}`;
      try {
        const errorData = await response.text();
        if (errorData) {
          errorMessage += ` - ${errorData}`;
        }
      } catch (parseError) {
        // Ignore parse errors for error responses
      }

      logger.error("❌ WLED API: Preset deletion failed:", errorMessage);
      return {
        success: false,
        message: errorMessage,
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

// Function to delete a WLED playlist (playlists are stored as presets in WLED)
export const deleteWledPlaylistViaWebSocket = async (
  presetId: number,
  deviceAddress?: string,
  protocol = "http"
): Promise<ApiResponse> => {
  if (!presetId || presetId < 1 || presetId > 250) {
    return {
      success: false,
      message: `Invalid preset ID: ${presetId}. Must be between 1 and 250.`,
    };
  }

  if (!deviceAddress) {
    return {
      success: false,
      message: "Device address required for playlist deletion",
    };
  }

  // In WLED, playlists are stored as presets, so we use the same deletion method
  logger.log(
    "🗑️ WLED API: Deleting playlist/preset",
    presetId,
    "from",
    deviceAddress
  );
  return await deleteWledPreset(deviceAddress, presetId, protocol);
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

// Function to get WLED brightness from /win endpoint (XML response)
export const getWledBrightnessFromWin = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse & { brightness?: number }> => {
  try {
    const url = buildWledUrl(deviceAddress, protocol, "/win");
    logger.log(
      `💡 Getting WLED brightness from /win endpoint: ${deviceAddress}`
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const xmlText = await response.text();

      // Parse brightness from XML response - look for <ac>#</ac> pattern
      const brightnessMatch = xmlText.match(/<ac>(\d+)<\/ac>/);

      if (brightnessMatch) {
        const brightness = parseInt(brightnessMatch[1], 10);
        logger.log(`✅ WLED brightness retrieved from /win: ${brightness}`);

        return {
          success: true,
          message: `Brightness retrieved: ${brightness}`,
          brightness: brightness,
          data: { brightness },
        };
      } else {
        logger.warn("⚠️ Could not find brightness value in /win response");
        return {
          success: false,
          message: "Brightness value not found in XML response",
        };
      }
    } else {
      const errorText = await response.text();
      logger.error(
        `❌ Failed to get WLED brightness from /win: ${response.status} - ${errorText}`
      );
      return {
        success: false,
        message: `Failed to get brightness: ${response.status}`,
      };
    }
  } catch (error: any) {
    logger.error("Failed to get WLED brightness from /win:", error);
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};

// Function to detect WLED device dimensions (1D or 2D matrix)
export const detectWledDimensions = async (
  deviceAddress: string,
  protocol = "http"
): Promise<"1D" | "2D" | null> => {
  try {
    const url = buildWledUrl(deviceAddress, protocol, "/settings/s.js?p=10");
    logger.log(`🔍 Detecting WLED dimensions for ${deviceAddress}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${response.statusText || "Unknown error"}`
      );
    }

    const responseText = await response.text();
    const sompMatch = responseText.match(/d\.Sf\.SOMP\.value\s*=\s*(\d+)/);

    if (sompMatch) {
      const sompValue = parseInt(sompMatch[1]);
      const dimensions = sompValue === 0 ? "1D" : "2D";
      logger.log(
        `✅ WLED dimensions detected: ${dimensions} (SOMP=${sompValue})`
      );
      return dimensions;
    }

    logger.warn("⚠️ Could not find SOMP value in WLED settings");
    return null;
  } catch (error: any) {
    logger.error("Failed to detect WLED dimensions:", error);
    return null;
  }
};

// Function to get WLED matrix dimensions (width × height) from device info
export const getWledMatrixDimensions = async (
  deviceAddress: string,
  protocol = "http"
): Promise<{ is2D: boolean; width: number; height: number } | null> => {
  try {
    const url = buildWledUrl(deviceAddress, protocol, "/json/info");
    logger.log(`📐 Getting WLED matrix dimensions for ${deviceAddress}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${response.statusText || "Unknown error"}`
      );
    }

    const deviceInfo = await response.json();

    // Check for 2D matrix info in WLED device info
    if (deviceInfo.leds?.matrix?.w && deviceInfo.leds?.matrix?.h) {
      const dimensions = {
        is2D: true,
        width: deviceInfo.leds.matrix.w,
        height: deviceInfo.leds.matrix.h,
      };
      logger.log(
        `✅ WLED matrix dimensions: ${dimensions.width}×${dimensions.height}`
      );
      return dimensions;
    }

    // Check alternative matrix locations
    if (deviceInfo.matrix?.w && deviceInfo.matrix?.h) {
      const dimensions = {
        is2D: true,
        width: deviceInfo.matrix.w,
        height: deviceInfo.matrix.h,
      };
      logger.log(
        `✅ WLED matrix dimensions (alt): ${dimensions.width}×${dimensions.height}`
      );
      return dimensions;
    }

    // Check segment-based 2D configuration
    if (deviceInfo.leds?.seglc && Array.isArray(deviceInfo.leds.seglc)) {
      for (const segment of deviceInfo.leds.seglc) {
        if (segment.m && segment.m !== 0 && segment.w && segment.h) {
          // m = matrix mode
          const dimensions = {
            is2D: true,
            width: segment.w,
            height: segment.h,
          };
          logger.log(
            `✅ WLED matrix dimensions (segment): ${dimensions.width}×${dimensions.height}`
          );
          return dimensions;
        }
      }
    }

    logger.log("📏 No 2D matrix configuration found - device is 1D");
    return { is2D: false, width: 0, height: 0 };
  } catch (error: any) {
    logger.error("Failed to get WLED matrix dimensions:", error);
    return null;
  }
};

// WLED Timer interfaces and types
export interface WledTimer {
  hour: number; // H0-H7: Hour value (0-23)
  minute: number; // N0-N7: Minute value (0-59)
  preset: number; // T0-T7: Target preset ID
  weekdays: number; // W0-W7: Weekday bitmask (0-255, bit 0=Monday, bit 1=Tuesday, bit 2=Wednesday, bit 3=Thursday, bit 4=Friday, bit 5=Saturday, bit 6=Sunday)
  month: number; // M0-M7: Month value (1-12, 1=January, 2=February, etc.)
  dayStart: number; // P0-P7: Start day of month (1-31)
  dayEnd: number; // D0-D7: End day of month (1-31)
  enabled: boolean; // E0-E7: Timer enabled state
}

export interface WledTimerSettings {
  timers: WledTimer[];
  countdown: {
    enabled: boolean; // CE: Countdown enabled
    year: number; // CY: Countdown year
    month: number; // CI: Countdown month
    day: number; // CD: Countdown day
    hour: number; // CH: Countdown hour
    minute: number; // CM: Countdown minute
    second: number; // CS: Countdown second
    preset1: number; // A0: Countdown preset 1
    preset2: number; // A1: Countdown preset 2
  };
  macro: {
    enabled: boolean; // OL: Overlay enabled
    start: number; // O1: Overlay start
    end: number; // O2: Overlay end
    mode: number; // OM: Overlay mode
    sunrise: boolean; // OS: Sunrise simulation
    minutes: boolean; // O5: Minutes mode
    buttons: boolean; // OB: Button overlays
  };
  alexa: {
    mode: number; // MC: Alexa mode
    name: string; // MN: Alexa name (would need parsing)
  };
}

// Function to fetch WLED timer settings
export const fetchWledTimerSettings = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse & { timerSettings?: WledTimerSettings }> => {
  try {
    const url = buildWledUrl(deviceAddress, protocol, "/settings/s.js?p=5");
    logger.log(`⏰ Fetching WLED timer settings from ${deviceAddress}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${response.statusText || "Unknown error"}`
      );
    }

    const jsText = await response.text();

    // Parse the JavaScript response to extract timer values
    const timerSettings = parseWledTimerSettings(jsText);

    if (timerSettings) {
      logger.log(`✅ WLED timer settings fetched successfully`);
      return {
        success: true,
        message: "Timer settings retrieved successfully",
        timerSettings: timerSettings,
      };
    } else {
      return {
        success: false,
        message: "Failed to parse timer settings",
      };
    }
  } catch (error: any) {
    logger.error("Failed to fetch WLED timer settings:", error);
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};

// Helper function to parse WLED timer JavaScript response
const parseWledTimerSettings = (jsText: string): WledTimerSettings | null => {
  try {
    const timers: WledTimer[] = [];

    // Parse 8 timer slots (0-7)
    for (let i = 0; i < 8; i++) {
      // Extract values using regex patterns
      const hourMatch = jsText.match(
        new RegExp(`d\\.Sf\\.H${i}\\.value\\s*=\\s*(\\d+)`)
      );
      const minuteMatch = jsText.match(
        new RegExp(`d\\.Sf\\.N${i}\\.value\\s*=\\s*(\\d+)`)
      );
      const presetMatch = jsText.match(
        new RegExp(`d\\.Sf\\.T${i}\\.value\\s*=\\s*(\\d+)`)
      );
      const weekdaysMatch = jsText.match(
        new RegExp(`d\\.Sf\\.W${i}\\.value\\s*=\\s*(\\d+)`)
      );
      const monthMatch = jsText.match(
        new RegExp(`d\\.Sf\\.M${i}\\.value\\s*=\\s*(\\d+)`)
      );
      const dayStartMatch = jsText.match(
        new RegExp(`d\\.Sf\\.P${i}\\.value\\s*=\\s*(\\d+)`)
      );
      const dayEndMatch = jsText.match(
        new RegExp(`d\\.Sf\\.D${i}\\.value\\s*=\\s*(\\d+)`)
      );
      const enabledMatch = jsText.match(
        new RegExp(`d\\.Sf\\.E${i}\\.value\\s*=\\s*(\\d+)`)
      );

      if (i === 0) {
        logger.log(`🔍 Timer ${i} regex matches:`, {
          hour: hourMatch ? hourMatch[1] : "null",
          minute: minuteMatch ? minuteMatch[1] : "null",
          preset: presetMatch ? presetMatch[1] : "null",
          weekdays: weekdaysMatch ? weekdaysMatch[1] : "null",
          enabled: enabledMatch ? enabledMatch[1] : "null",
        });
      }

      const timer: WledTimer = {
        hour: hourMatch ? parseInt(hourMatch[1]) : 0,
        minute: minuteMatch ? parseInt(minuteMatch[1]) : 0,
        preset: presetMatch ? parseInt(presetMatch[1]) : 0,
        weekdays: weekdaysMatch ? parseInt(weekdaysMatch[1]) : 255, // 255 = all days
        month: monthMatch ? parseInt(monthMatch[1]) : 1, // Default to 1 (January) if not found
        dayStart: dayStartMatch ? parseInt(dayStartMatch[1]) : 1,
        dayEnd: dayEndMatch ? parseInt(dayEndMatch[1]) : 31,
        enabled: enabledMatch ? parseInt(enabledMatch[1]) === 1 : false,
      };

      timers.push(timer);
    }

    // Parse countdown settings
    const countdownSettings = {
      enabled: /d\.Sf\.CE\.checked\s*=\s*1/.test(jsText),
      year: extractNumericValue(jsText, "CY") || 20,
      month: extractNumericValue(jsText, "CI") || 1,
      day: extractNumericValue(jsText, "CD") || 1,
      hour: extractNumericValue(jsText, "CH") || 0,
      minute: extractNumericValue(jsText, "CM") || 0,
      second: extractNumericValue(jsText, "CS") || 0,
      preset1: extractNumericValue(jsText, "A0") || 0,
      preset2: extractNumericValue(jsText, "A1") || 0,
    };

    // Parse macro/overlay settings
    const macroSettings = {
      enabled: /d\.Sf\.OL\.checked\s*=\s*1/.test(jsText),
      start: extractNumericValue(jsText, "O1") || 0,
      end: extractNumericValue(jsText, "O2") || 29,
      mode: extractNumericValue(jsText, "OM") || 0,
      sunrise: /d\.Sf\.OS\.checked\s*=\s*1/.test(jsText),
      minutes: /d\.Sf\.O5\.checked\s*=\s*1/.test(jsText),
      buttons: /d\.Sf\.OB\.checked\s*=\s*1/.test(jsText),
    };

    // Parse Alexa settings
    const alexaSettings = {
      mode: extractNumericValue(jsText, "MC") || 0,
      name: extractStringValue(jsText, "MN") || "",
    };

    return {
      timers,
      countdown: countdownSettings,
      macro: macroSettings,
      alexa: alexaSettings,
    };
  } catch (error) {
    logger.error("Failed to parse WLED timer settings:", error);
    return null;
  }
};

// Helper function to extract numeric values from JavaScript response
const extractNumericValue = (
  jsText: string,
  fieldName: string
): number | null => {
  const match = jsText.match(
    new RegExp(`d\\.Sf\\.${fieldName}\\.value\\s*=\\s*(\\d+)`)
  );
  return match ? parseInt(match[1]) : null;
};

// Helper function to extract string values from JavaScript response
const extractStringValue = (
  jsText: string,
  fieldName: string
): string | null => {
  const match = jsText.match(
    new RegExp(`d\\.Sf\\.${fieldName}\\.value\\s*=\\s*"([^"]*)"`)
  );
  return match ? match[1] : null;
};

// Function to parse WLED settings JavaScript to extract form values
const parseWledSettingsJS = (jsText: string): Record<string, string> => {
  const formValues: Record<string, string> = {};

  try {
    // Extract checkbox values (checked = 1, unchecked = 0)
    const checkboxMatches = jsText.matchAll(
      /d\.Sf\.(\w+)\.checked\s*=\s*(\d+)/g
    );
    for (const match of Array.from(checkboxMatches)) {
      const fieldName = match[1];
      const value = match[2] === "1" ? "on" : "0";
      formValues[fieldName] = value;
    }

    // Extract input values
    const valueMatches = jsText.matchAll(
      /d\.Sf\.(\w+)\.value\s*=\s*"?([^";]*)"?/g
    );
    for (const match of Array.from(valueMatches)) {
      const fieldName = match[1];
      const value = match[2];
      formValues[fieldName] = value;
    }

    // Extract selectedIndex values for dropdowns
    const indexMatches = jsText.matchAll(
      /d\.Sf\.(\w+)\.selectedIndex\s*=\s*(\d+)/g
    );
    for (const match of Array.from(indexMatches)) {
      const fieldName = match[1];
      const value = match[2];
      formValues[fieldName] = value;
    }

    logger.log(
      `📋 Parsed ${
        Object.keys(formValues).length
      } WLED form fields from settings`
    );
    return formValues;
  } catch (error) {
    logger.error("Failed to parse WLED settings JS:", error);
    return {};
  }
};

// Function to convert parsed values to POST form data
const convertToPostFormData = (
  parsedValues: Record<string, string>
): URLSearchParams => {
  const formData = new URLSearchParams();

  // Convert parsed field names to POST parameter names
  Object.entries(parsedValues).forEach(([fieldName, value]) => {
    switch (fieldName) {
      // Checkbox fields - only add if checked (value = 'on')
      case "NT":
        if (value === "on") formData.append("NT", "on");
        break;
      case "CF":
        if (value === "on") formData.append("CF", "on");
        break;
      case "OL":
        if (value === "on") formData.append("OL", "on");
        break;
      case "OS":
        if (value === "on") formData.append("OS", "on");
        break;
      case "O5":
        if (value === "on") formData.append("O5", "on");
        break;
      case "OB":
        if (value === "on") formData.append("OB", "on");
        break;
      case "CE":
        if (value === "on") formData.append("CE", "on");
        break;

      // Value fields - map to POST parameter names
      case "NS":
        formData.append("NS", value);
        break;
      case "TZ":
        formData.append("TZ", value);
        break;
      case "UO":
        formData.append("UO", value);
        break;
      case "LN":
        formData.append("LN", value);
        break;
      case "LT":
        formData.append("LT", value);
        break;
      case "O1":
        formData.append("O1", value);
        break;
      case "O2":
        formData.append("O2", value);
        break;
      case "OM":
        formData.append("OM", value);
        break;
      case "CY":
        formData.append("CY", value);
        break;
      case "CI":
        formData.append("CI", value);
        break;
      case "CD":
        formData.append("CD", value);
        break;
      case "CH":
        formData.append("CH", value);
        break;
      case "CM":
        formData.append("CM", value);
        break;
      case "CS":
        formData.append("CS", value);
        break;
      case "A0":
        formData.append("A0", value);
        break;
      case "A1":
        formData.append("A1", value);
        break;
      case "MC":
        formData.append("MC", value);
        break;
      case "MN":
        formData.append("MN", value);
        break;

      // Timer fields H0-H7, N0-N7, T0-T7, W0-W7, M0-M7, P0-P7, D0-D7, E0-E7
      default:
        if (/^[HNTMWPDE]\d+$/.test(fieldName)) {
          formData.append(fieldName, value);
        }
        break;
    }
  });

  return formData;
};

// Function to save robust WLED timer schedule (fetches current settings first)
export const saveWledRobustSchedule = async (
  deviceAddress: string,
  turnOnTime: string,
  turnOffTime: string,
  targetPresetId: number,
  selectedDays: Set<number>,
  protocol = "http"
): Promise<ApiResponse> => {
  try {
    logger.log(
      `⏰ Saving robust WLED schedule to ${deviceAddress}: ON at ${turnOnTime}, OFF at ${turnOffTime}, preset ${targetPresetId}`
    );

    // Step 1: Fetch current settings
    const settingsUrl = buildWledUrl(
      deviceAddress,
      protocol,
      "/settings/s.js?p=5"
    );
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const settingsResponse = await fetch(settingsUrl, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!settingsResponse.ok) {
      throw new Error(
        `Failed to fetch current settings: ${settingsResponse.status}`
      );
    }

    const jsText = await settingsResponse.text();
    logger.log(`📥 Fetched current WLED settings (${jsText.length} chars)`);

    // Step 2: Parse current settings to form data
    const parsedValues = parseWledSettingsJS(jsText);
    const formData = convertToPostFormData(parsedValues);

    // Step 3: Override only our timer fields
    const onTime = parseTimeString(turnOnTime);
    const offTime = parseTimeString(turnOffTime);
    const weekdaysBitmask = convertDaysToWledBitmask(selectedDays);

    logger.log(`📤 Timer payload preparation:`, {
      turnOnTime,
      turnOffTime,
      selectedDays: Array.from(selectedDays),
      onTime,
      offTime,
      weekdaysBitmask,
      targetPresetId,
    });

    // Timer 0: Turn ON - override specific fields
    formData.set("H0", onTime.hour.toString()); // ON hour
    formData.set("N0", onTime.minute.toString()); // ON minute
    formData.set("T0", targetPresetId.toString()); // ON preset id
    formData.set("W0", weekdaysBitmask.toString()); // ON days of the week
    formData.set("M0", "1"); // ON start month
    formData.set("P0", "12"); // ON start date
    formData.set("D0", "1"); // ON end month
    formData.set("E0", "31"); // ON end date

    // Timer 1: Turn OFF - override specific fields
    formData.set("H1", offTime.hour.toString()); // OFF hour
    formData.set("N1", offTime.minute.toString()); // OFF minute
    formData.set("T1", "62"); // OFF preset id - use preset 62
    formData.set("W1", weekdaysBitmask.toString()); // OFF days of the week
    formData.set("M1", "1"); // OFF start month
    formData.set("P1", "12"); // OFF start date
    formData.set("D1", "1"); // OFF end month
    formData.set("E1", "31"); // OFF end date

    // Log the complete form data being sent
    const formEntries: Record<string, string> = {};
    for (const [key, value] of Array.from(formData.entries())) {
      formEntries[key] = value;
    }
    logger.log(`📤 Complete WLED form data payload:`, formEntries);

    logger.log(
      `📤 Posting ${formData.toString().split("&").length} form fields to WLED`
    );

    // Step 4: Post the complete form data
    const postUrl = buildWledUrl(deviceAddress, protocol, "/settings/time");
    const postController = new AbortController();
    const postTimeoutId = setTimeout(() => postController.abort(), 10000);

    const postResponse = await fetch(postUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      signal: postController.signal,
    });

    clearTimeout(postTimeoutId);

    if (postResponse.ok) {
      logger.log(`✅ WLED robust schedule saved successfully`);
      return {
        success: true,
        message: "Schedule saved successfully",
      };
    } else {
      const errorText = await postResponse.text();
      logger.error(
        `❌ Failed to save WLED robust schedule: ${postResponse.status} - ${errorText}`
      );
      return {
        success: false,
        message: `Failed to save schedule: ${postResponse.status}`,
      };
    }
  } catch (error: any) {
    logger.error("Failed to save WLED robust schedule:", error);
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};

// Function to reset WLED timer settings to defaults
export const resetWledTimerSettings = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse> => {
  try {
    logger.log(
      `🔄 Resetting WLED timer settings to defaults on ${deviceAddress}`
    );

    // Build form data with WLED default values from the GetV() function
    const formData = new URLSearchParams();

    // NTP and time settings
    formData.append("NT", "on"); // d.Sf.NT.checked = 1
    formData.append("NS", "0.wled.pool.ntp.org"); // d.Sf.NS.value = "0.wled.pool.ntp.org"
    formData.append("CF", "on"); // d.Sf.CF.checked = 1
    formData.append("TZ", "4"); // d.Sf.TZ.selectedIndex = 4
    formData.append("UO", "0"); // d.Sf.UO.value = 0
    formData.append("LN", "0.00"); // d.Sf.LN.value = "0.00"
    formData.append("LT", "0.00"); // d.Sf.LT.value = "0.00"

    // Overlay/Macro settings
    // d.Sf.OL.checked = 0 (no OL field needed when unchecked)
    formData.append("O1", "0"); // d.Sf.O1.value = 0
    formData.append("O2", "29"); // d.Sf.O2.value = 29
    formData.append("OM", "0"); // d.Sf.OM.value = 0
    // d.Sf.OS.checked = 0 (no OS field needed when unchecked)
    // d.Sf.O5.checked = 0 (no O5 field needed when unchecked)
    // d.Sf.OB.checked = 0 (no OB field needed when unchecked)

    // Countdown settings
    // d.Sf.CE.checked = 0 (no CE field needed when unchecked)
    formData.append("CY", "20"); // d.Sf.CY.value = 20
    formData.append("CI", "1"); // d.Sf.CI.value = 1
    formData.append("CD", "1"); // d.Sf.CD.value = 1
    formData.append("CH", "0"); // d.Sf.CH.value = 0
    formData.append("CM", "0"); // d.Sf.CM.value = 0
    formData.append("CS", "0"); // d.Sf.CS.value = 0
    formData.append("A0", "0"); // d.Sf.A0.value = 0
    formData.append("A1", "0"); // d.Sf.A1.value = 0

    // Alexa settings
    formData.append("MC", "0"); // d.Sf.MC.value = 0
    formData.append("MN", "0"); // d.Sf.MN.value = 0

    // Timer settings (all 8 timers with default values)
    for (let i = 0; i < 8; i++) {
      formData.append(`H${i}`, "0"); // d.Sf.H0.value = 0
      formData.append(`N${i}`, "0"); // d.Sf.N0.value = 0
      formData.append(`T${i}`, "0"); // d.Sf.T0.value = 0
      formData.append(`W${i}`, "255"); // d.Sf.W0.value = 255
      formData.append(`M${i}`, "1"); // d.Sf.M0.value = 1
      formData.append(`P${i}`, "12"); // d.Sf.P0.value = 12
      formData.append(`D${i}`, "1"); // d.Sf.D0.value = 1
      formData.append(`E${i}`, "31"); // d.Sf.E0.value = 31
    }

    // Additional timer fields (8 and 9)
    formData.append("N8", "0"); // d.Sf.N8.value = 0
    formData.append("T8", "0"); // d.Sf.T8.value = 0
    formData.append("W8", "255"); // d.Sf.W8.value = 255
    formData.append("N9", "0"); // d.Sf.N9.value = 0
    formData.append("T9", "0"); // d.Sf.T9.value = 0
    formData.append("W9", "255"); // d.Sf.W9.value = 255

    const url = buildWledUrl(deviceAddress, protocol, "/settings/time");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      logger.log(`✅ WLED timer settings reset to defaults successfully`);
      return {
        success: true,
        message: "Timer settings reset to defaults successfully",
      };
    } else {
      const errorText = await response.text();
      logger.error(
        `❌ Failed to reset WLED timer settings: ${response.status} - ${errorText}`
      );
      return {
        success: false,
        message: `Failed to reset timer settings: ${response.status}`,
      };
    }
  } catch (error: any) {
    logger.error("Failed to reset WLED timer settings:", error);
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};

// Helper function to convert day Set to WLED weekdays bitmask
export const convertDaysToWledBitmask = (selectedDays: Set<number>): number => {
  // If no days selected, return 0 (no days enabled)
  if (selectedDays.size === 0) {
    return 0;
  }

  // Based on WLED source: pure bitwise mapping, no base value
  // WLED checkbox order: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday
  // Our UI indexes: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

  // Map UI day indexes to WLED checkbox positions
  // WLED checkbox structure: j=0 is control bit, j=1=Monday, j=2=Tuesday, j=3=Wednesday, etc.
  // UI Wednesday (3) -> should map to WLED j=3 (bit 3, value 8), not j=2 (bit 2, value 4)
  const uiDayToWledBit = {
    0: 7, // UI Sunday -> WLED j=7 = bit 7 = value 128
    1: 1, // UI Monday -> WLED j=1 = bit 1 = value 2
    2: 2, // UI Tuesday -> WLED j=2 = bit 2 = value 4
    3: 3, // UI Wednesday -> WLED j=3 = bit 3 = value 8 (correct!)
    4: 4, // UI Thursday -> WLED j=4 = bit 4 = value 16
    5: 5, // UI Friday -> WLED j=5 = bit 5 = value 32
    6: 6, // UI Saturday -> WLED j=6 = bit 6 = value 64
  };

  let result = 0;
  selectedDays.forEach((day) => {
    const bitPosition = uiDayToWledBit[day as keyof typeof uiDayToWledBit];
    const bitValue = 1 << bitPosition;
    result |= bitValue; // Set the corresponding bit
    logger.log(
      `📅 UI day ${day} -> WLED bit ${bitPosition} -> value ${bitValue}`
    );
  });

  // Add the enable bit (+1) to enable the timer
  const finalResult = result + 1;

  logger.log(
    `📅 Final WLED weekdays bitmask: ${result} + 1 (enable) = ${finalResult} (binary: ${finalResult.toString(
      2
    )})`
  );
  return finalResult;
};

// Helper function to convert WLED weekdays bitmask to day Set
export const convertWledBitmaskToDays = (weekdays: number): Set<number> => {
  const days = new Set<number>();

  // WLED uses 127 to mean "all days" (bits 0-6 set)
  if (weekdays === 127) {
    return new Set([0, 1, 2, 3, 4, 5, 6]);
  }

  // WLED uses 0 to mean "no dates"
  if (weekdays === 0) {
    return new Set<number>();
  }

  // WLED uses 1 to mean "timer enabled but no days selected"
  if (weekdays === 1) {
    return new Set<number>();
  }

  // Remove the enable bit (-1) before processing day bits
  const dayBits = weekdays - 1;

  // Map WLED bit positions back to UI day indexes
  const wledBitToUiDay = {
    1: 1, // WLED bit 1 -> UI Monday
    2: 2, // WLED bit 2 -> UI Tuesday
    3: 3, // WLED bit 3 -> UI Wednesday
    4: 4, // WLED bit 4 -> UI Thursday
    5: 5, // WLED bit 5 -> UI Friday
    6: 6, // WLED bit 6 -> UI Saturday
    7: 0, // WLED bit 7 -> UI Sunday
  };

  // Check each bit position (bits 1-7, skip bit 0)
  for (let bit = 1; bit <= 7; bit++) {
    if (dayBits & (1 << bit)) {
      const uiDay = wledBitToUiDay[bit as keyof typeof wledBitToUiDay];
      if (uiDay !== undefined) {
        days.add(uiDay);
      }
    }
  }

  return days;
};

// Helper function to parse time string (HH:MM) to hour and minute
export const parseTimeString = (
  timeString: string
): { hour: number; minute: number } => {
  const [hourStr, minuteStr] = timeString.split(":");
  return {
    hour: parseInt(hourStr) || 0,
    minute: parseInt(minuteStr) || 0,
  };
};

// Helper function to format time to HH:MM string
export const formatTimeString = (hour: number, minute: number): string => {
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
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

export const fetchWledCurrentPreset = async (
  deviceAddress: string,
  protocol = "http"
): Promise<{ success: boolean; presetId?: number; message: string }> => {
  try {
    const url = buildWledUrl(deviceAddress, protocol, "/json/state");
    logger.log(`🎯 Getting current active preset from ${deviceAddress}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const presetId = data.ps;

    if (presetId && presetId > 0) {
      logger.log(`✅ Current active preset: ${presetId}`);
      return {
        success: true,
        presetId,
        message: `Current active preset: ${presetId}`,
      };
    } else {
      return {
        success: false,
        message: "No active preset (ps: 0 or undefined)",
      };
    }
  } catch (error: any) {
    logger.error("Failed to get current preset:", error);
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
};
