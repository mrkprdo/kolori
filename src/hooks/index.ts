/**
 * Hooks Index - Central export point for all custom hooks
 */

// App-level hooks
export { useDeviceManagement } from './useDeviceManagement';
export type { UseDeviceManagementReturn } from './useDeviceManagement';

export { useSettingsManagement } from './useSettingsManagement';
export type { UseSettingsManagementReturn } from './useSettingsManagement';

export { useModalManager } from './useModalManager';
export type { UseModalManagerReturn } from './useModalManager';

export { useAppInitialization } from './useAppInitialization';
export type { UseAppInitializationReturn } from './useAppInitialization';

// KoloriApp-level hooks
export { useDeviceCache } from './useDeviceCache';
export type { UseDeviceCacheReturn } from './useDeviceCache';

export { usePresetManager } from './usePresetManager';
export type { UsePresetManagerReturn } from './usePresetManager';

// useWebSocketManager - REMOVED (replaced by WledDeviceContext)

export { useDeviceMonitor } from './useDeviceMonitor';
export type { UseDeviceMonitorReturn } from './useDeviceMonitor';

export { useAudioReactive } from './useAudioReactive';
export type { UseAudioReactiveReturn, AudioReactiveConfig } from './useAudioReactive';