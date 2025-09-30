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

    const formData = new URLSearchParams();

    // NTP and time settings
    formData.append("NT", "on");
    formData.append("NS", "0.wled.pool.ntp.org");
    formData.append("CF", "on");
    formData.append("TZ", "4");
    formData.append("UO", "0");
    formData.append("LN", "0.00");
    formData.append("LT", "0.00");

    // Overlay/Macro settings
    formData.append("O1", "0");
    formData.append("O2", "29");
    formData.append("OM", "0");

    // Countdown settings
    formData.append("CY", "20");
    formData.append("CI", "1");
    formData.append("CD", "1");
    formData.append("CH", "0");
    formData.append("CM", "0");
    formData.append("CS", "0");
    formData.append("A0", "0");
    formData.append("A1", "0");

    // Alexa settings
    formData.append("MC", "0");
    formData.append("MN", "0");

    // Timer settings (all 8 timers with default values)
    for (let i = 0; i < 8; i++) {
      formData.append(`H${i}`, "0");
      formData.append(`N${i}`, "0");
      formData.append(`T${i}`, "0");
      formData.append(`W${i}`, "255");
      formData.append(`M${i}`, "1");
      formData.append(`P${i}`, "12");
      formData.append(`D${i}`, "1");
      formData.append(`E${i}`, "31");
    }

    formData.append("N8", "0");
    formData.append("T8", "0");
    formData.append("W8", "255");
    formData.append("N9", "0");
    formData.append("T9", "0");
    formData.append("W9", "255");

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
