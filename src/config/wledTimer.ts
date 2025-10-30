import { logger } from "../utils/logger";
import { ApiResponse } from "../types";
import {
  buildWledUrl,
  fetchWithTimeout,
  formatApiResponse,
  parseTimeString,
  convertDaysToWledBitmask,
  extractNumericValue,
  extractStringValue,
} from "./wledUtils";

/**
 * WLED Timer/Scheduler Functions
 * Functions for managing WLED timers and schedules
 */

export interface WledTimer {
  hour: number;
  minute: number;
  preset: number;
  weekdays: number;
  month: number;
  dayStart: number;
  dayEnd: number;
  enabled: boolean;
}

export interface WledTimerSettings {
  timers: WledTimer[];
  countdown: {
    enabled: boolean;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    preset1: number;
    preset2: number;
  };
  macro: {
    enabled: boolean;
    start: number;
    end: number;
    mode: number;
    sunrise: boolean;
    minutes: boolean;
    buttons: boolean;
  };
  alexa: {
    mode: number;
    name: string;
  };
}

/**
 * Parse WLED timer JavaScript response
 */
const parseWledTimerSettings = (jsText: string): WledTimerSettings | null => {
  try {
    const timers: WledTimer[] = [];

    for (let i = 0; i < 8; i++) {
      const timer: WledTimer = {
        hour: extractNumericValue(jsText, `H${i}`) || 0,
        minute: extractNumericValue(jsText, `N${i}`) || 0,
        preset: extractNumericValue(jsText, `T${i}`) || 0,
        weekdays: extractNumericValue(jsText, `W${i}`) || 255,
        month: extractNumericValue(jsText, `M${i}`) || 1,
        dayStart: extractNumericValue(jsText, `P${i}`) || 1,
        dayEnd: extractNumericValue(jsText, `D${i}`) || 31,
        enabled: (extractNumericValue(jsText, `E${i}`) || 0) === 1,
      };
      timers.push(timer);
    }

    return {
      timers,
      countdown: {
        enabled: /d\.Sf\.CE\.checked\s*=\s*1/.test(jsText),
        year: extractNumericValue(jsText, "CY") || 20,
        month: extractNumericValue(jsText, "CI") || 1,
        day: extractNumericValue(jsText, "CD") || 1,
        hour: extractNumericValue(jsText, "CH") || 0,
        minute: extractNumericValue(jsText, "CM") || 0,
        second: extractNumericValue(jsText, "CS") || 0,
        preset1: extractNumericValue(jsText, "A0") || 0,
        preset2: extractNumericValue(jsText, "A1") || 0,
      },
      macro: {
        enabled: /d\.Sf\.OL\.checked\s*=\s*1/.test(jsText),
        start: extractNumericValue(jsText, "O1") || 0,
        end: extractNumericValue(jsText, "O2") || 29,
        mode: extractNumericValue(jsText, "OM") || 0,
        sunrise: /d\.Sf\.OS\.checked\s*=\s*1/.test(jsText),
        minutes: /d\.Sf\.O5\.checked\s*=\s*1/.test(jsText),
        buttons: /d\.Sf\.OB\.checked\s*=\s*1/.test(jsText),
      },
      alexa: {
        mode: extractNumericValue(jsText, "MC") || 0,
        name: extractStringValue(jsText, "MN") || "",
      },
    };
  } catch (error) {
    logger.error("Failed to parse WLED timer settings:", error);
    return null;
  }
};

/**
 * Function to fetch WLED timer settings
 */
export const fetchWledTimerSettings = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse & { timerSettings?: WledTimerSettings }> => {
  const url = buildWledUrl(deviceAddress, protocol, "/settings/s.js?p=5");
  const result = await fetchWithTimeout(url, { method: "GET" }, (r) => r.text());

  if (!result.success) {
    return formatApiResponse(false, result.error || "Failed to fetch timer settings");
  }

  const timerSettings = parseWledTimerSettings(result.data || "");
  if (timerSettings) {
    logger.log(`✅ WLED timer settings fetched successfully`);
    return {
      success: true,
      message: "Timer settings retrieved successfully",
      timerSettings: timerSettings,
    };
  }

  return formatApiResponse(false, "Failed to parse timer settings");
};

/**
 * Function to parse WLED settings JavaScript to extract form values
 */
const parseWledSettingsJS = (jsText: string): Record<string, string> => {
  const formValues: Record<string, string> = {};

  try {
    // Extract checkbox values
    const checkboxMatches = jsText.matchAll(
      /d\.Sf\.(\w+)\.checked\s*=\s*(\d+)/g
    );
    for (const match of checkboxMatches) {
      formValues[match[1]] = match[2] === "1" ? "on" : "0";
    }

    // Extract input values
    const valueMatches = jsText.matchAll(
      /d\.Sf\.(\w+)\.value\s*=\s*"?([^";]*)"?/g
    );
    for (const match of valueMatches) {
      formValues[match[1]] = match[2];
    }

    // Extract selectedIndex values
    const indexMatches = jsText.matchAll(
      /d\.Sf\.(\w+)\.selectedIndex\s*=\s*(\d+)/g
    );
    for (const match of indexMatches) {
      formValues[match[1]] = match[2];
    }

    logger.log(
      `📋 Parsed ${Object.keys(formValues).length} WLED form fields from settings`
    );
    return formValues;
  } catch (error) {
    logger.error("Failed to parse WLED settings JS:", error);
    return {};
  }
};

/**
 * Function to convert parsed values to POST form data
 */
const convertToPostFormData = (
  parsedValues: Record<string, string>
): URLSearchParams => {
  const formData = new URLSearchParams();

  Object.entries(parsedValues).forEach(([fieldName, value]) => {
    // Checkbox fields - only add if checked
    const checkboxFields = ["NT", "CF", "OL", "OS", "O5", "OB", "CE"];
    if (checkboxFields.includes(fieldName)) {
      if (value === "on") formData.append(fieldName, "on");
      return;
    }

    // Value fields and timer fields
    if (
      ["NS", "TZ", "UO", "LN", "LT", "O1", "O2", "OM", "CY", "CI", "CD", "CH", "CM", "CS", "A0", "A1", "MC", "MN"].includes(fieldName) ||
      /^[HNTMWPDE]\d+$/.test(fieldName)
    ) {
      formData.append(fieldName, value);
    }
  });

  return formData;
};

/**
 * Function to save robust WLED timer schedule
 */
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

    // Fetch current settings
    const settingsUrl = buildWledUrl(deviceAddress, protocol, "/settings/s.js?p=5");
    const settingsResult = await fetchWithTimeout(
      settingsUrl,
      { method: "GET" },
      (r) => r.text()
    );

    if (!settingsResult.success) {
      throw new Error(`Failed to fetch current settings: ${settingsResult.error}`);
    }

    const jsText = settingsResult.data || "";
    logger.log(`📥 Fetched current WLED settings (${jsText.length} chars)`);

    // Parse and convert to form data
    const parsedValues = parseWledSettingsJS(jsText);
    const formData = convertToPostFormData(parsedValues);

    // Override timer fields
    const onTime = parseTimeString(turnOnTime);
    const offTime = parseTimeString(turnOffTime);
    const weekdaysBitmask = convertDaysToWledBitmask(selectedDays);

    // Timer 0: Turn ON
    formData.set("H0", onTime.hour.toString());
    formData.set("N0", onTime.minute.toString());
    formData.set("T0", targetPresetId.toString());
    formData.set("W0", weekdaysBitmask.toString());
    formData.set("M0", "1");
    formData.set("P0", "12");
    formData.set("D0", "1");
    formData.set("E0", "31");

    // Timer 1: Turn OFF
    formData.set("H1", offTime.hour.toString());
    formData.set("N1", offTime.minute.toString());
    formData.set("T1", "62");
    formData.set("W1", weekdaysBitmask.toString());
    formData.set("M1", "1");
    formData.set("P1", "12");
    formData.set("D1", "1");
    formData.set("E1", "31");

    logger.log(`📤 Posting ${formData.toString().split("&").length} form fields to WLED`);

    // Post the form data
    const postUrl = buildWledUrl(deviceAddress, protocol, "/settings/time");
    const postResult = await fetchWithTimeout(
      postUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
        timeout: 10000,
      },
      async (response) => {
        // /settings/time returns HTML, not JSON
        const text = await response.text();
        return text;
      }
    );

    if (postResult.success) {
      logger.log(`✅ WLED robust schedule saved successfully`);
      return formatApiResponse(true, "Schedule saved successfully");
    }

    logger.error(`❌ Failed to save WLED robust schedule`);
    return formatApiResponse(false, postResult.error || "Failed to save schedule");
  } catch (error: any) {
    logger.error("Failed to save WLED robust schedule:", error);
    return formatApiResponse(
      false,
      error.name === "AbortError" ? "Request timeout" : `Request failed: ${error.message}`
    );
  }
};

/**
 * Function to reset WLED timer settings to defaults
 */
export const resetWledTimerSettings = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse> => {
  try {
    logger.log(`🔄 Resetting WLED timer settings to defaults on ${deviceAddress}`);

    // Fetch current settings to preserve time/timezone settings
    const settingsUrl = buildWledUrl(deviceAddress, protocol, "/settings/s.js?p=5");
    const settingsResult = await fetchWithTimeout(
      settingsUrl,
      { method: "GET" },
      (r) => r.text()
    );

    if (!settingsResult.success) {
      throw new Error(`Failed to fetch current settings: ${settingsResult.error}`);
    }

    const jsText = settingsResult.data || "";
    const parsedValues = parseWledSettingsJS(jsText);
    const formData = convertToPostFormData(parsedValues);

    // Only reset timer-related fields, preserve NTP/timezone/time settings
    // Reset all 8 timers to default disabled state
    for (let i = 0; i < 8; i++) {
      formData.set(`H${i}`, "0");
      formData.set(`N${i}`, "0");
      formData.set(`T${i}`, "0");
      formData.set(`W${i}`, "255");
      formData.set(`M${i}`, "1");
      formData.set(`P${i}`, "12");
      formData.set(`D${i}`, "1");
      formData.set(`E${i}`, "31");
    }

    // Reset additional timer slots
    formData.set("N8", "0");
    formData.set("T8", "0");
    formData.set("W8", "255");
    formData.set("N9", "0");
    formData.set("T9", "0");
    formData.set("W9", "255");

    // Reset overlay/macro settings
    formData.set("O1", "0");
    formData.set("O2", "29");
    formData.set("OM", "0");
    formData.delete("OL"); // Disable overlay
    formData.delete("OS");
    formData.delete("O5");
    formData.delete("OB");

    // Reset countdown settings
    formData.delete("CE"); // Disable countdown
    formData.set("CY", "20");
    formData.set("CI", "1");
    formData.set("CD", "1");
    formData.set("CH", "0");
    formData.set("CM", "0");
    formData.set("CS", "0");
    formData.set("A0", "0");
    formData.set("A1", "0");

    logger.log(`📤 Resetting timer settings while preserving time/timezone configuration`);

    const url = buildWledUrl(deviceAddress, protocol, "/settings/time");
    const result = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
        timeout: 10000,
      },
      async (response) => {
        // /settings/time returns HTML, not JSON
        const text = await response.text();
        return text;
      }
    );

    if (result.success) {
      logger.log(`✅ WLED timer settings reset to defaults successfully`);
      return formatApiResponse(true, "Timer settings reset to defaults successfully");
    }

    logger.error(`❌ Failed to reset WLED timer settings`);
    return formatApiResponse(false, result.error || "Failed to reset timer settings");
  } catch (error: any) {
    logger.error("Failed to reset WLED timer settings:", error);
    return formatApiResponse(
      false,
      error.name === "AbortError" ? "Request timeout" : `Request failed: ${error.message}`
    );
  }
};

/**
 * Function to fetch current time from WLED device
 * Returns the device's current time by parsing the settings page
 */
export const fetchWledDeviceTime = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse & { deviceTime?: string; timestamp?: number }> => {
  try {
    logger.log(`🕐 Fetching current time from WLED device ${deviceAddress}`);

    // Fetch the time settings page to get the current device time
    const url = buildWledUrl(deviceAddress, protocol, "/settings/s.js?p=5");
    const result = await fetchWithTimeout(url, { method: "GET" }, (r) => r.text());

    if (!result.success || !result.data) {
      return formatApiResponse(false, result.error || "Failed to fetch device time");
    }

    const jsText = result.data;

    // Extract the time from: d.getElementsByClassName("times")[0].innerHTML = "2025-10-20, 12:50:46";
    const timeMatch = jsText.match(/d\.getElementsByClassName\("times"\)\[0\]\.innerHTML\s*=\s*"([^"]+)"/);

    if (timeMatch && timeMatch[1]) {
      const deviceTimeString = timeMatch[1]; // e.g., "2025-10-20, 12:50:46"

      // Parse the date string: "YYYY-MM-DD, HH:MM:SS"
      const dateTimeParts = deviceTimeString.split(', ');
      if (dateTimeParts.length === 2) {
        const [datePart, timePart] = dateTimeParts;

        // Create a Date object from the parsed string
        const deviceDate = new Date(`${datePart}T${timePart}`);

        // Check if date is valid
        if (!isNaN(deviceDate.getTime())) {
          const timeString = deviceDate.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          const dateString = deviceDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

          const timestamp = Math.floor(deviceDate.getTime() / 1000);
          logger.log(`✅ WLED device time: ${timeString} on ${dateString}`);
          return {
            success: true,
            message: "Device time retrieved successfully",
            deviceTime: `${dateString} ${timeString}`,
            timestamp: timestamp,
          };
        }
      }
    }

    // If we couldn't parse a valid time, return an error
    logger.warn(`⚠️ Could not parse valid time from WLED device (found: ${timeMatch?.[1] || 'none'})`);
    return formatApiResponse(false, "No valid time information available from device");
  } catch (error: any) {
    logger.error("Failed to fetch WLED device time:", error);
    return formatApiResponse(
      false,
      error.name === "AbortError" ? "Request timeout" : `Request failed: ${error.message}`
    );
  }
};

/**
 * Function to sync phone's current time to WLED device
 * This sets the device time to match the phone's current time and timezone
 */
export const syncPhoneTimeToWled = async (
  deviceAddress: string,
  protocol = "http"
): Promise<ApiResponse> => {
  try {
    logger.log(`🔄 Syncing phone time and timezone to WLED device ${deviceAddress}`);

    // Get current phone time
    const now = new Date();
    const unixTimestamp = Math.floor(now.getTime() / 1000);

    // Calculate timezone offset in seconds
    // getTimezoneOffset returns minutes WEST of UTC (negative for east of UTC)
    // WLED wants offset in seconds EAST of UTC, so we negate and convert to seconds
    const timezoneOffsetMinutes = -now.getTimezoneOffset();
    const timezoneOffsetSeconds = timezoneOffsetMinutes * 60;

    logger.log(`📍 Phone timezone offset: ${timezoneOffsetMinutes} minutes (${timezoneOffsetSeconds} seconds)`);

    // First, fetch current settings to preserve all existing time settings
    const settingsUrl = buildWledUrl(deviceAddress, protocol, "/settings/s.js?p=5");
    const settingsResult = await fetchWithTimeout(
      settingsUrl,
      { method: "GET" },
      (r) => r.text()
    );

    if (!settingsResult.success) {
      throw new Error(`Failed to fetch current settings: ${settingsResult.error}`);
    }

    const jsText = settingsResult.data || "";
    const parsedValues = parseWledSettingsJS(jsText);
    const formData = convertToPostFormData(parsedValues);

    // Override the RTC time with phone's current Unix timestamp
    // WLED uses UT field for Unix timestamp
    formData.set("UT", unixTimestamp.toString());

    // Set the timezone offset (UO field = UTC Offset in seconds)
    formData.set("UO", timezoneOffsetSeconds.toString());

    // Disable NTP sync to prevent it from overriding our manual time
    formData.delete("NT"); // Remove any existing NT field
    // NT checkbox is only added if checked, so by not adding it, it's unchecked

    logger.log(`📤 Setting WLED time to Unix timestamp: ${unixTimestamp} (${now.toLocaleString()})`);
    logger.log(`📤 Setting timezone offset: ${timezoneOffsetSeconds} seconds`);

    // Post the form data to /settings/time endpoint
    const postUrl = buildWledUrl(deviceAddress, protocol, "/settings/time");
    const result = await fetchWithTimeout(
      postUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
        timeout: 10000,
      },
      async (response) => {
        // /settings/time returns HTML, not JSON
        const text = await response.text();
        return text;
      }
    );

    if (result.success) {
      logger.log(`✅ Successfully synced phone time and timezone to WLED device`);
      return formatApiResponse(true, "Time and timezone synced successfully");
    }

    logger.error(`❌ Failed to sync time to WLED device`);
    return formatApiResponse(false, result.error || "Failed to sync time");
  } catch (error: any) {
    logger.error("Failed to sync time to WLED device:", error);
    return formatApiResponse(
      false,
      error.name === "AbortError" ? "Request timeout" : `Request failed: ${error.message}`
    );
  }
};
