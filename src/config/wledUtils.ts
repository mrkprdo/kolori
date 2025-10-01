import { ApiResponse } from "../types";

/**
 * WLED API Utility Functions
 * Core utilities for making HTTP requests and formatting responses
 */

/**
 * Helper function to build WLED URLs with protocol support
 */
export const buildWledUrl = (
  deviceAddress: string,
  protocol = "http",
  path: string
): string => {
  // Handle mDNS names by appending .local if needed
  if (deviceAddress && !deviceAddress.includes(":")) {
    const ipPattern =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const isIP = ipPattern.test(deviceAddress);

    if (!isIP && !deviceAddress.endsWith(".local")) {
      deviceAddress = `${deviceAddress}.local`;
    }
  }
  return `${protocol}://${deviceAddress}${path}`;
};

/**
 * Performs an HTTP fetch with an abort timeout and returns a standardized result object.
 *
 * @param url - The request URL
 * @param options - Fetch options; supports an additional `timeout` (milliseconds, default 5000) to abort the request
 * @param parseResponse - Function that parses the Response into the expected value `T` (defaults to `response.json()`)
 * @returns An object with `success: true` and `data` when the request and parsing succeed; otherwise `success: false` with `error` and, when available, `status`
 */
export async function fetchWithTimeout<T = any>(
  url: string,
  options: RequestInit & { timeout?: number } = {},
  parseResponse: (response: Response) => Promise<T> = (r) => r.json()
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const { timeout = 5000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    try {
      const data = await parseResponse(response);
      return { success: true, data };
    } catch (parseError: any) {
      // Parse error - likely the response wasn't in expected format
      return {
        success: false,
        error: `Parse error: ${parseError.message}`,
      };
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    return {
      success: false,
      error:
        error.name === "AbortError"
          ? "Request timeout"
          : `Request failed: ${error.message}`,
    };
  }
}

/**
 * Create a standardized API response object.
 *
 * @param success - Whether the operation succeeded
 * @param message - Human-readable message describing the result
 * @param data - Optional payload to include in the response
 * @returns The ApiResponse object containing `success` and `message`, and `data` when provided
 */
export function formatApiResponse(
  success: boolean,
  message: string,
  data?: any
): ApiResponse {
  return { success, message, ...(data && { data }) };
}

/**
 * Helper function to parse time string (HH:MM) to hour and minute
 */
export const parseTimeString = (
  timeString: string
): { hour: number; minute: number } => {
  const [hourStr, minuteStr] = timeString.split(":");
  return {
    hour: parseInt(hourStr) || 0,
    minute: parseInt(minuteStr) || 0,
  };
};

/**
 * Helper function to convert day Set to WLED weekdays bitmask
 */
export const convertDaysToWledBitmask = (selectedDays: Set<number>): number => {
  if (selectedDays.size === 0) return 0;

  const uiDayToWledBit: Record<number, number> = {
    0: 7, // UI Sunday -> WLED bit 7
    1: 1, // UI Monday -> WLED bit 1
    2: 2, // UI Tuesday -> WLED bit 2
    3: 3, // UI Wednesday -> WLED bit 3
    4: 4, // UI Thursday -> WLED bit 4
    5: 5, // UI Friday -> WLED bit 5
    6: 6, // UI Saturday -> WLED bit 6
  };

  let result = 0;
  selectedDays.forEach((day) => {
    const bitPosition = uiDayToWledBit[day];
    if (bitPosition !== undefined) {
      result |= 1 << bitPosition;
    }
  });

  return result + 1; // Add enable bit
};

/**
 * Helper to extract numeric values from JavaScript response
 */
export const extractNumericValue = (
  jsText: string,
  fieldName: string
): number | null => {
  const match = jsText.match(
    new RegExp(`d\\.Sf\\.${fieldName}\\.value\\s*=\\s*(\\d+)`)
  );
  return match ? parseInt(match[1]) : null;
};

/**
 * Helper to extract string values from JavaScript response
 */
export const extractStringValue = (
  jsText: string,
  fieldName: string
): string | null => {
  const match = jsText.match(
    new RegExp(`d\\.Sf\\.${fieldName}\\.value\\s*=\\s*"([^"]*)"`)
  );
  return match ? match[1] : null;
};
