import { Device as WledDevice } from "../types";
import { logger } from "./logger";

/**
 * Get the best available address for a device
 */
export function getDeviceAddress(
  device: WledDevice | undefined
): string | null {
  if (!device) return null;
  const address = device.bestAddress || device.ip || null;
  logger.log("🔍 getDeviceAddress for device:", {
    deviceId: device.id,
    deviceName: device.name,
    bestAddress: device.bestAddress,
    ip: device.ip,
    resolvedAddress: address,
  });
  return address;
}

/**
 * Get WebSocket protocol based on device protocol
 */
export function getWebSocketProtocol(
  device: WledDevice | undefined
): "ws" | "wss" {
  return device?.protocol === "https" ? "wss" : "ws";
}

/**
 * Check if device is online and has a valid address
 */
export function isDeviceReady(device: WledDevice | undefined): boolean {
  return !!(device?.isConnected && getDeviceAddress(device));
}

/**
 * Generate hash for data comparison (used in caching)
 */
export function generateDataHash(data: any[]): string {
  return JSON.stringify(
    data.map((item) => ({
      id: item.id,
      name: item.name,
      // Include key properties that indicate changes
      ...(item.items && { itemsLength: item.items.length }),
      ...(item.gradient && { gradient: item.gradient }),
      ...(item.isWledPreset !== undefined && {
        isWledPreset: item.isWledPreset,
      }),
    }))
  ).substring(0, 100); // Use first 100 chars as hash
}

/**
 * Check if data has changed by comparing hashes
 */
export function hasDataChanged(newData: any[], cachedHash: string): boolean {
  const newHash = generateDataHash(newData);
  return newHash !== cachedHash;
}

/**
 * Filter out seasonal/special presets
 */
export const EXCLUDE_PREFIXES = [
  "preset 0",
  "autumn-",
  "xmas-",
  "canada day-",
  "off-",
] as const;

export function filterSeasonalPresets<T extends { name: string }>(
  items: T[]
): T[] {
  return items.filter((item) => {
    const itemNameLower = item.name.toLowerCase();
    return !EXCLUDE_PREFIXES.some((prefix) => itemNameLower.startsWith(prefix));
  });
}
