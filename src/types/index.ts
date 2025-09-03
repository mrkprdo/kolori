export interface WledDevice {
  readonly id: number;
  readonly name: string;
  readonly ip: string;
  readonly mdns?: string;
  readonly protocol: 'http' | 'https';
  readonly bestAddress?: string;
  readonly isConnected: boolean;
  readonly activePreset?: string | null;
  readonly isPlaying: boolean;
  readonly wledInfo?: any;
  readonly lastHeartbeat?: string;
  readonly autoBrightness: boolean;
  readonly maxBrightness: number;
  readonly responseTime?: number;
}

export interface CustomEffect {
  readonly id: number;
  readonly name: string;
  readonly effectId: number;
  readonly effectName: string;
  readonly paletteId: number;
  readonly paletteName: string;
  readonly presetId?: number;
  readonly gradient: string;
  readonly isCustom: boolean;
  readonly isWledPreset?: boolean;
}

export interface PlaylistItem {
  readonly name: string;
  readonly presetId: number;
  readonly duration: number;
  readonly gradient: string;
  readonly playlistItemId?: string;
}

export interface SavedPlaylist {
  readonly id: number;
  readonly name: string;
  readonly items: PlaylistItem[];
  readonly presetId?: number;
  readonly method?: string;
  readonly isWledPlaylist?: boolean;
  readonly isActive?: boolean;
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
  readonly success: boolean;
  readonly bestAddress?: string;
  readonly responseTime?: number;
  readonly deviceInfo?: unknown;
  readonly message: string;
  readonly allResults?: readonly unknown[];
  readonly details?: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

export type ScheduleMode = 'all-day' | 'day' | 'night';
export type Theme = 'light' | 'dark' | 'system';

// Alias for compatibility with App.tsx
export type Device = WledDevice;

export interface Settings {
  readonly theme: Theme;
  readonly scheduleMode: ScheduleMode;
  readonly liveViewEnabled: boolean;
  readonly autoScan: boolean;
  readonly debugLogs: boolean;
  readonly scanTimeout: number;
  readonly maxDevices: number;
  readonly backgroundScanEnabled: boolean;
  readonly [key: string]: unknown;
}