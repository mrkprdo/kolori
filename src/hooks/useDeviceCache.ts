import { useRef, useCallback } from "react";
import { CustomEffect, SavedPlaylist } from "../types";
import { generateDataHash, hasDataChanged } from "../utils/deviceUtils";
import { logger } from "../utils/logger";

interface DeviceCache {
  [deviceId: number]: {
    presets: CustomEffect[];
    playlists: SavedPlaylist[];
    presetsHash: string;
    playlistsHash: string;
    lastFetched: number;
  };
}

export interface UseDeviceCacheReturn {
  loadCachedDataForDevice: (deviceId: number | undefined) => {
    presets: CustomEffect[];
    playlists: SavedPlaylist[];
  } | null;
  updateCache: (
    deviceId: number,
    presets: CustomEffect[],
    playlists: SavedPlaylist[]
  ) => { presetsChanged: boolean; playlistsChanged: boolean };
  clearCache: () => void;
}

/**
 * Custom hook to manage device-specific preset and playlist caching
 */
export function useDeviceCache(): UseDeviceCacheReturn {
  const deviceCacheRef = useRef<DeviceCache>({});

  /**
   * Load cached data for a specific device
   */
  const loadCachedDataForDevice = useCallback(
    (deviceId: number | undefined) => {
      if (!deviceId || !deviceCacheRef.current[deviceId]) {
        logger.log("📦 No cached data for device:", deviceId);
        return null;
      }

      const cached = deviceCacheRef.current[deviceId];
      const cacheAge = Date.now() - cached.lastFetched;

      logger.log(
        "📦 Loading cached data for device:",
        deviceId,
        `${cached.presets.length} presets, ${
          cached.playlists.length
        } playlists (${Math.round(cacheAge / 1000)}s old)`
      );

      return {
        presets: cached.presets,
        playlists: cached.playlists.map((playlist) => ({
          ...playlist,
          isActive: false,
        })),
      };
    },
    []
  );

  /**
   * Update cache for a device and return whether data changed
   */
  const updateCache = useCallback(
    (deviceId: number, presets: CustomEffect[], playlists: SavedPlaylist[]) => {
      const currentCache = deviceCacheRef.current[deviceId];

      const presetsChanged =
        !currentCache || hasDataChanged(presets, currentCache.presetsHash);
      const playlistsChanged =
        !currentCache || hasDataChanged(playlists, currentCache.playlistsHash);

      logger.log(
        "📦 Cache comparison:",
        `Device ${deviceId}:`,
        presetsChanged
          ? `presets changed (${currentCache?.presets.length || 0}→${
              presets.length
            })`
          : "presets unchanged",
        playlistsChanged
          ? `playlists changed (${currentCache?.playlists.length || 0}→${
              playlists.length
            })`
          : "playlists unchanged"
      );

      // Update cache
      deviceCacheRef.current[deviceId] = {
        presets,
        playlists,
        presetsHash: generateDataHash(presets),
        playlistsHash: generateDataHash(playlists),
        lastFetched: Date.now(),
      };

      return { presetsChanged, playlistsChanged };
    },
    []
  );

  /**
   * Clear all cached data
   */
  const clearCache = useCallback(() => {
    deviceCacheRef.current = {};
    logger.log("🧹 Device cache cleared");
  }, []);

  return {
    loadCachedDataForDevice,
    updateCache,
    clearCache,
  };
}
