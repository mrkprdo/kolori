import { logger } from "../utils/logger";
import { ApiResponse } from "../types";
import { buildWledUrl, fetchWithTimeout, formatApiResponse } from "./wledUtils";

/**
 * WLED Device Operations
 * Functions for device control, state management, and device info
 */

/**
 * Check if WLED device is online (heartbeat)
 */
export const checkWledHeartbeat = async (
  deviceAddress: string,
  protocol = "http"
): Promise<{ success: boolean; online: boolean; message: string }> => {
  const url = buildWledUrl(deviceAddress, protocol, "/json/info");
  const result = await fetchWithTimeout(url, { method: "GET", timeout: 3000 });

  return {
    success: result.success,
    online: result.success,
    message: result.success
      ? "Device online"
      : result.error || "Device offline",
  };
};

/**
 * Function to turn WLED lights on globally
 */
export const turnWledOn = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse> => {
  const jsonUrl = buildWledUrl(deviceAddress, protocol, "/json/state");

  const result = await fetchWithTimeout(jsonUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ on: true }),
  });

  if (result.success) {
    return formatApiResponse(true, "Lights turned on");
  }

  // Fallback to HTTP API
  const httpUrl = buildWledUrl(deviceAddress, protocol, "/win&T=1");
  const fallbackResult = await fetchWithTimeout(httpUrl, { method: "GET" });

  return formatApiResponse(
    fallbackResult.success,
    fallbackResult.success
      ? "Lights turned on (HTTP API)"
      : fallbackResult.error || "Failed"
  );
};

/**
 * Function to turn WLED lights off globally
 */
export const turnWledOff = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse> => {
  const jsonUrl = buildWledUrl(deviceAddress, protocol, "/json/state");

  const result = await fetchWithTimeout(jsonUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ on: false }),
  });

  if (result.success) {
    return formatApiResponse(true, "Lights turned off");
  }

  // Fallback to HTTP API
  const httpUrl = buildWledUrl(deviceAddress, protocol, "/win&T=0");
  const fallbackResult = await fetchWithTimeout(httpUrl, { method: "GET" });

  return formatApiResponse(
    fallbackResult.success,
    fallbackResult.success
      ? "Lights turned off (HTTP API)"
      : fallbackResult.error || "Failed"
  );
};

/**
 * Function to set WLED device brightness
 */
export const setWledBrightness = async (
  deviceAddress: string,
  brightness: number,
  protocol = "http"
): Promise<ApiResponse> => {
  if (brightness < 0 || brightness > 255) {
    return formatApiResponse(
      false,
      `Invalid brightness value: ${brightness}. Must be between 0 and 255.`
    );
  }

  const url = buildWledUrl(deviceAddress, protocol, "/json/state");
  const result = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bri: brightness }),
  });

  logger.log(
    result.success
      ? `✅ WLED brightness set successfully: ${brightness}`
      : `❌ Failed to set WLED brightness`
  );

  return formatApiResponse(
    result.success,
    result.success
      ? `Brightness set to ${brightness}`
      : result.error || "Failed"
  );
};

/**
 * Function to get WLED brightness from /win endpoint (XML response)
 */
export const getWledBrightnessFromWin = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse & { brightness?: number }> => {
  const url = buildWledUrl(deviceAddress, protocol, "/win");
  const result = await fetchWithTimeout(url, { method: "GET" }, (r) =>
    r.text()
  );

  if (!result.success) {
    return formatApiResponse(false, result.error || "Failed to get brightness");
  }

  const brightnessMatch = result.data?.match(/<ac>(\d+)<\/ac>/);
  if (brightnessMatch) {
    const brightness = parseInt(brightnessMatch[1], 10);
    logger.log(`✅ WLED brightness retrieved from /win: ${brightness}`);
    return {
      success: true,
      message: `Brightness retrieved: ${brightness}`,
      brightness: brightness,
      data: { brightness },
    };
  }

  logger.warn("⚠️ Could not find brightness value in /win response");
  return formatApiResponse(false, "Brightness value not found in XML response");
};

/**
 * Function to detect WLED device dimensions (1D or 2D matrix)
 */
export const detectWledDimensions = async (
  deviceAddress: string,
  protocol = "http"
): Promise<"1D" | "2D" | null> => {
  const url = buildWledUrl(deviceAddress, protocol, "/settings/s.js?p=10");
  const result = await fetchWithTimeout(url, { method: "GET" }, (r) =>
    r.text()
  );

  if (!result.success) {
    logger.error("Failed to detect WLED dimensions:", result.error);
    return null;
  }

  const sompMatch = result.data?.match(/d\.Sf\.SOMP\.value\s*=\s*(\d+)/);
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
};

/**
 * Function to get WLED matrix dimensions (width × height) from device info
 */
export const getWledMatrixDimensions = async (
  deviceAddress: string,
  protocol = "http"
): Promise<{ is2D: boolean; width: number; height: number } | null> => {
  const url = buildWledUrl(deviceAddress, protocol, "/json/info");
  const result = await fetchWithTimeout(url, { method: "GET" });

  if (!result.success) {
    logger.error("Failed to get WLED matrix dimensions:", result.error);
    return null;
  }

  const deviceInfo = result.data;

  // Check for 2D matrix info in various locations
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
};

/**
 * Function to get current WLED device state (including brightness)
 */
export const getWledState = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse> => {
  const url = buildWledUrl(deviceAddress, protocol, "/json/state");
  const result = await fetchWithTimeout(url, { method: "GET" });

  if (result.success) {
    logger.log(`✅ WLED state retrieved successfully:`, {
      brightness: result.data?.bri,
      on: result.data?.on,
      preset: result.data?.ps,
    });
    return {
      success: true,
      message: "State retrieved successfully",
      data: result.data,
    };
  }

  // Only log non-timeout errors
  if (result.error !== "Request timeout") {
    logger.error(`❌ Failed to get WLED state: ${result.error}`);
  }
  return formatApiResponse(false, result.error || "Failed to get state");
};
