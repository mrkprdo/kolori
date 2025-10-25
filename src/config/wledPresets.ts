import { logger } from "../utils/logger";
import { ApiResponse } from "../types";
import { buildWledUrl, fetchWithTimeout, formatApiResponse } from "./wledUtils";
import {
  generatePlaylistGradient,
  generatePresetGradient,
  generateLinearGradientColors,
} from "./wledGradients";

/**
 * WLED Preset & Playlist Operations
 * Functions for managing presets, playlists, and effects
 */

/**
 * Function to activate effect by ID (for custom effects)
 */
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

  // The /win endpoint returns HTML, not JSON
  const result = await fetchWithTimeout(
    url,
    { method: "GET" },
    async (response) => {
      const text = await response.text();
      return text;
    }
  );

  return formatApiResponse(
    result.success,
    result.success
      ? "Effect activated"
      : result.error || "Failed to activate effect"
  );
};

/**
 * Function to activate preset by ID
 */
export const activateWledPresetById = async (
  deviceAddress: string,
  presetId: number,
  protocol = "http"
): Promise<ApiResponse> => {
  const url = buildWledUrl(deviceAddress, protocol, `/win&PL=${presetId}`);

  // The /win endpoint returns HTML, not JSON
  // We use a custom parser that won't try to parse as JSON
  const result = await fetchWithTimeout(
    url,
    { method: "GET" },
    async (response) => {
      // Just read the text - we don't care about parsing it
      const text = await response.text();
      return text;
    }
  );

  return formatApiResponse(
    result.success,
    result.success
      ? "Preset activated"
      : result.error || "Failed to activate preset"
  );
};

/**
 * Function to fetch all available presets from WLED device
 */
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
  const result = await fetchWithTimeout(url, { method: "GET", timeout: 10000 });

  if (!result.success) {
    return {
      success: false,
      presets: [],
      playlists: [],
      message: result.error || "Failed to fetch presets",
    };
  }

  const presets = result.data || {};
  logger.log("📡 WLED API: Fetched", Object.keys(presets).length, "presets");

  const parsedPresets: any[] = [];
  const playlists: any[] = [];

  Object.entries(presets).forEach(([presetId, presetData]) => {
    if (presetData && typeof presetData === "object") {
      const preset: any = {
        id: `wled_${presetId}`,
        presetId: parseInt(presetId),
        name: (presetData as any).n || `Preset ${presetId}`,
        isWledPreset: true,
        data: presetData,
      };

      // Check if this is a playlist
      if ((presetData as any).playlist && (presetData as any).playlist.ps) {
        const playlistName = (presetData as any).n || `Playlist ${presetId}`;
        const playlistItems = (presetData as any).playlist.ps.map(
          (psId: number, index: number) => ({
            name: `Preset ${psId}`,
            presetId: psId,
            duration: (presetData as any).playlist.dur
              ? Math.floor((presetData as any).playlist.dur[index] / 10)
              : 30,
            gradient: "#6366f1",
            playlistItemId: `${psId}_${index}`,
          })
        );

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
        };
        playlists.push(playlist);
      } else {
        // Regular preset
        if ((presetData as any).seg && (presetData as any).seg[0]) {
          const segment = (presetData as any).seg[0];
          preset.effectId = segment.fx || 0;
          preset.effectName = `Effect ${segment.fx || 0}`;
          preset.paletteId = segment.pal || 0;
          preset.paletteName = `Palette ${segment.pal || 0}`;

          preset.gradient = generatePresetGradient(segment.pal || 0);
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
};

// Alias for backward compatibility
export const getWledPresets = fetchWledPresets;

/**
 * Function to fetch available effects from WLED device
 */
export const fetchWledEffects = async (
  deviceAddress: string,
  protocol = "http"
): Promise<{ success: boolean; effects: any[]; message: string }> => {
  const url = buildWledUrl(deviceAddress, protocol, "/json/effects");
  const result = await fetchWithTimeout(url, { method: "GET" });

  if (!result.success) {
    return {
      success: false,
      effects: [],
      message: result.error || "Failed to fetch effects",
    };
  }

  const effectsArray = result.data || [];
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
};

/**
 * Function to create/save a WLED preset
 */
export const createWledPreset = async (
  deviceAddress: string,
  effectId: number,
  paletteId: number,
  presetName: string,
  presetId?: number,
  protocol = "http"
): Promise<ApiResponse & { presetId?: number }> => {
  if (!presetName || presetName.trim().length === 0) {
    return formatApiResponse(false, "Preset name cannot be empty");
  }

  const sanitizedName = presetName.trim().substring(0, 32);
  const targetPresetId = presetId || 50 + Math.floor(Math.random() * 200);

  const applyUrl = buildWledUrl(deviceAddress, protocol, `/json/state`);

  // Apply effect and palette
  const applyResult = await fetchWithTimeout(applyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seg: { fx: effectId, pal: paletteId },
    }),
  });

  if (!applyResult.success) {
    return formatApiResponse(
      false,
      `Failed to apply effect: ${applyResult.error}`
    );
  }

  // Wait for effect to be applied
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Save as preset
  const savePayload = {
    psave: targetPresetId,
    n: sanitizedName,
    ib: true,
    sb: true,
  };

  const saveResult = await fetchWithTimeout(
    applyUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(savePayload),
      timeout: 10000,
    },
    async (response) => {
      // Try to parse as JSON, but don't fail if it's not JSON
      try {
        return await response.json();
      } catch {
        // Return empty object if not JSON - we still got a 200 OK
        return {};
      }
    }
  );

  if (saveResult.success) {
    return {
      success: true,
      message: "Preset saved successfully",
      presetId: targetPresetId,
    };
  }

  return formatApiResponse(false, saveResult.error || "Failed to save preset");
};

/**
 * Function to create/save a WLED playlist
 */
export const createWledPlaylist = async (
  deviceAddress: string,
  playlistItems: { presetId: number; duration: number }[],
  playlistName: string,
  protocol = "http"
): Promise<ApiResponse & { presetId?: number }> => {
  if (!playlistItems || playlistItems.length === 0) {
    return formatApiResponse(false, "Playlist cannot be empty");
  }

  // Validate preset IDs
  for (const item of playlistItems) {
    if (!item.presetId || item.presetId < 1 || item.presetId > 250) {
      return formatApiResponse(
        false,
        `Invalid preset ID: ${item.presetId}. Must be between 1 and 250.`
      );
    }
  }

  const playlistPresetId = 51 + Math.floor(Math.random() * 199);

  const playlistData = {
    psave: playlistPresetId,
    n: playlistName,
    playlist: {
      ps: playlistItems.map((item) => item.presetId),
      dur: playlistItems.map((item) => item.duration * 10),
      transition: playlistItems.map(() => 7),
      repeat: 0,
      r: true,
      end: 0,
    },
    on: true,
    o: true,
    v: true,
    time: Math.floor(Date.now() / 1000),
  };

  const url = buildWledUrl(deviceAddress, protocol, "/json/state");

  // Note: WLED sometimes returns HTML or empty response on successful saves
  // We'll treat a 200 OK as success even if parsing fails
  const result = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(playlistData),
      timeout: 10000,
    },
    async (response) => {
      // Try to parse as JSON, but don't fail if it's not JSON
      try {
        return await response.json();
      } catch {
        // Return empty object if not JSON - we still got a 200 OK
        return {};
      }
    }
  );

  if (result.success) {
    return {
      success: true,
      message: "Playlist saved successfully",
      presetId: playlistPresetId,
    };
  }

  return formatApiResponse(false, result.error || "Failed to save playlist");
};

/**
 * Function to delete a WLED preset
 */
export const deleteWledPreset = async (
  deviceAddress: string,
  presetId: number,
  protocol = "http"
): Promise<ApiResponse> => {
  if (!presetId || presetId < 1 || presetId > 250) {
    return formatApiResponse(
      false,
      `Invalid preset ID: ${presetId}. Must be between 1 and 250.`
    );
  }

  const url = buildWledUrl(deviceAddress, protocol, "/json/state");
  const result = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdel: presetId }),
  });

  logger.log(
    result.success
      ? "✅ WLED API: Preset deleted successfully"
      : "❌ WLED API: Preset deletion failed"
  );

  return formatApiResponse(
    result.success,
    result.success
      ? "Preset deleted successfully"
      : result.error || "Failed to delete preset"
  );
};

/**
 * Function to delete a WLED playlist (playlists are stored as presets in WLED)
 */
export const deleteWledPlaylistViaWebSocket = async (
  presetId: number,
  deviceAddress?: string,
  protocol = "http"
): Promise<ApiResponse> => {
  if (!presetId || presetId < 1 || presetId > 250) {
    return formatApiResponse(
      false,
      `Invalid preset ID: ${presetId}. Must be between 1 and 250.`
    );
  }

  if (!deviceAddress) {
    return formatApiResponse(
      false,
      "Device address required for playlist deletion"
    );
  }

  logger.log(
    "🗑️ WLED API: Deleting playlist/preset",
    presetId,
    "from",
    deviceAddress
  );

  return await deleteWledPreset(deviceAddress, presetId, protocol);
};

/**
 * Function to fetch current active preset ID from WLED device
 */
export const fetchWledCurrentPreset = async (
  deviceAddress: string,
  protocol = "http"
): Promise<{ success: boolean; presetId?: number; message: string }> => {
  const url = buildWledUrl(deviceAddress, protocol, "/json/state");
  const result = await fetchWithTimeout(url, { method: "GET" });

  if (!result.success) {
    return {
      success: false,
      message: result.error || "Failed to get current preset",
    };
  }

  const presetId = result.data?.ps;
  if (presetId && presetId > 0) {
    logger.log(`✅ Current active preset: ${presetId}`);
    return {
      success: true,
      presetId,
      message: `Current active preset: ${presetId}`,
    };
  }

  return {
    success: false,
    message: "No active preset (ps: 0 or undefined)",
  };
};

/**
 * Check if the OFF- preset (preset 62) exists on the WLED device
 * If it doesn't exist, create it with all LEDs set to black (#000000)
 * This preset is used by the scheduler to turn off the LEDs
 */
export const ensureOffPresetExists = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse & { presetExists?: boolean; presetId?: number }> => {
  try {
    logger.log(`🔍 Checking for OFF- preset (ID: 62) on ${deviceAddress}`);

    // Fetch all presets to check if preset 62 exists
    const presetsResult = await fetchWledPresets(deviceAddress, protocol);

    if (!presetsResult.success || !presetsResult.presets) {
      return {
        success: false,
        message: "Failed to fetch presets from device",
      };
    }

    // Check if preset 62 exists and is named "OFF-"
    const offPreset = presetsResult.presets.find((p) => p.presetId === 62);

    if (offPreset && offPreset.name.startsWith("OFF-")) {
      logger.log(`✅ OFF- preset already exists at slot 62`);
      return {
        success: true,
        presetExists: true,
        presetId: 62,
        message: "OFF- preset exists",
      };
    }

    // Preset doesn't exist or has wrong name, create it
    logger.log(`📝 Creating OFF- preset at slot 62`);

    const applyUrl = buildWledUrl(deviceAddress, protocol, `/json/state`);

    // First, turn off all segments by setting brightness to 0 and color to black
    const offState = {
      on: false,
      bri: 0,
      seg: [
        {
          col: [[0, 0, 0]], // Black color
          fx: 0, // Solid effect
        },
      ],
    };

    const applyResult = await fetchWithTimeout(applyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(offState),
    });

    if (!applyResult.success) {
      return {
        success: false,
        message: `Failed to apply OFF state: ${applyResult.error}`,
      };
    }

    // Wait for state to be applied
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Save as preset 62 with name "OFF-"
    const savePayload = {
      psave: 62,
      n: "OFF-",
      ib: true, // Include brightness
      sb: true, // Include segments
    };

    const saveResult = await fetchWithTimeout(applyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(savePayload),
    });

    if (!saveResult.success) {
      return {
        success: false,
        message: `Failed to save OFF- preset: ${saveResult.error}`,
      };
    }

    logger.log(`✅ OFF- preset created successfully at slot 62`);
    return {
      success: true,
      presetExists: false,
      presetId: 62,
      message: "OFF- preset created successfully",
    };
  } catch (error: any) {
    logger.error("Failed to ensure OFF- preset exists:", error);
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
};
