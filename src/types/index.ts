// TypeScript type definitions for Kolori React Native app
// Based on the original React app structures

export interface WledDevice {
  id: number;
  name: string;
  ip: string;
  mdns?: string;
  protocol: 'http' | 'https';
  bestAddress?: string;
  isConnected: boolean;
  activePreset?: string | null;
  isPlaying: boolean;
  wledInfo?: any;
  lastHeartbeat?: string;
  autoBrightness: boolean;
  maxBrightness: number;
  responseTime?: number;
}

export interface CustomEffect {
  id: number;
  name: string;
  effectId: number;
  effectName: string;
  paletteId: number;
  paletteName: string;
  presetId?: number;
  gradient: string;
  isCustom: boolean;
  isWledPreset?: boolean;
}

export interface PlaylistItem {
  name: string;
  presetId: number;
  duration: number;
  gradient: string;
  playlistItemId?: string;
}

export interface SavedPlaylist {
  id: number;
  name: string;
  items: PlaylistItem[];
  presetId?: number;
  method?: string;
  isWledPlaylist?: boolean;
  isActive?: boolean;
}

export interface WledEffect {
  id: number;
  name: string;
  effectId: number;
}

export interface WledPalette {
  id: number;
  name: string;
  paletteId: number;
}

export interface LEDColor {
  r: number;
  g: number;
  b: number;
  w?: number;
}

export interface NotificationState {
  isVisible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export interface DeviceValidationResult {
  success: boolean;
  bestAddress?: string;
  responseTime?: number;
  deviceInfo?: any;
  message: string;
  allResults?: any[];
  details?: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

export type ScheduleMode = 'all-day' | 'day' | 'night';
export type Theme = 'light' | 'dark' | 'system';