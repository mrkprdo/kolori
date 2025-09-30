/**
 * WLED API - Main Entry Point
 *
 * This module serves as the main entry point for all WLED API operations.
 * All functionality is organized into separate modules for better maintainability:
 *
 * - wledUtils: Core utilities (fetch, formatting, time parsing, bitmask conversion)
 * - wledGradients: Gradient generation for presets and playlists
 * - wledDevice: Device control and state management
 * - wledPresets: Preset and playlist operations
 * - wledTimer: Timer and scheduler functions
 */

// ============================================================================
// RE-EXPORTS - All public APIs
// ============================================================================

// Utility Functions
export { formatTimeString, convertWledBitmaskToDays } from "./wledUtils";

// Device Operations
export {
  checkWledHeartbeat,
  turnWledOn,
  turnWledOff,
  setWledBrightness,
  getWledBrightnessFromWin,
  detectWledDimensions,
  getWledMatrixDimensions,
  getWledState,
} from "./wledDevice";

// Preset & Playlist Operations
export {
  activateWledEffect,
  activateWledPresetById,
  fetchWledPresets,
  getWledPresets,
  fetchWledEffects,
  createWledPreset,
  createWledPlaylist,
  deleteWledPreset,
  deleteWledPlaylistViaWebSocket,
  fetchWledCurrentPreset,
} from "./wledPresets";

// Timer & Scheduler Operations
export {
  fetchWledTimerSettings,
  saveWledRobustSchedule,
  resetWledTimerSettings,
} from "./wledTimer";

// Timer Types
export type { WledTimer, WledTimerSettings } from "./wledTimer";

// Gradient Generation
export { generatePlaylistGradient } from "./wledGradients";
