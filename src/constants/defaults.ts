/**
 * Default values and constants used across the application
 */

import { Settings } from '../types';

/**
 * Default seasonal presets configuration
 */
export const DEFAULT_SEASONAL_PRESETS = [
  { id: '1', name: 'Halloween', icon: '🎃', presetId: 1 },
  { id: '2', name: 'Canada Day', icon: '🇨🇦', presetId: 2 },
  { id: '3', name: 'Holidays', icon: '🎄', presetId: 3 },
];

/**
 * Default application settings
 */
export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  scheduleMode: 'all-day',
  liveViewEnabled: false,
  autoScan: true,
  debugLogs: false,
  scanTimeout: 15,
  maxDevices: 10,
  backgroundScanEnabled: true,
  seasonalPresets: [...DEFAULT_SEASONAL_PRESETS],
};

/**
 * Timing constants
 */
export const TIMING = {
  MIN_LOADING_SCREEN_DURATION: 2000, // 2 seconds
  SCREEN_TRANSITION_FADE_OUT: 200,    // milliseconds
  SCREEN_TRANSITION_FADE_IN: 300,     // milliseconds
} as const;
