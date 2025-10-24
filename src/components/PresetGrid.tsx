/**
 * PresetGrid Component
 *
 * Main preset selection and device control interface for WLED devices.
 *
 * Features:
 * - Device selection and management
 * - Brightness control (via WebSocket)
 * - Live View LED visualization
 * - Seasonal presets
 * - Custom effects
 * - Playlists
 * - Audio reactive controls (page 2)
 * - FAB (Floating Action Button) for actions
 *
 * Architecture:
 * - Uses WledDeviceContext for WebSocket state management
 * - Brightness automatically syncs via WebSocket (no local state)
 * - Live View toggle sends WebSocket command immediately
 * - Audio Reactive overlay disables presets when active
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Animated,
  Alert,
  Modal,
  BackHandler,
  ToastAndroid,
  Platform,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { logger } from "../utils/logger";
import { SeasonalPreset } from "../types";
import {
  Device as WledDevice,
  CustomEffect,
  SavedPlaylist,
  LEDColor,
} from "../types";
import { storage, STORAGE_KEYS } from "../utils/storage";
import { useWledDevice } from "../contexts/WledDeviceContext";
import {
  deleteWledPreset,
  deleteWledPlaylistViaWebSocket,
  createWledPreset,
  getWledBrightnessFromWin,
  fetchWledTimerSettings,
  generatePresetGradient,
} from "../config/wledApi";
import CustomEffectsModal from "./CustomEffectsModal";
import SchedulerModal from "./SchedulerModal";
import PlaylistCreationModal from "./PlaylistCreationModal";
import DeviceManagementModal from "./DeviceManagementModal";
import { WLEDEffectData, getEffectByName } from "../data/wledEffects";
import { WLED_PALETTES_DEF } from "../constants/palettes";
import DeviceSelection from "./PresetGrid/DeviceSelection";
import LiveViewSection from "./PresetGrid/LiveViewSection";
import SeasonalPresetsSection from "./PresetGrid/SeasonalPresetsSection";
import CustomEffectsSection from "./PresetGrid/CustomEffectsSection";
import PlaylistsSection from "./PresetGrid/PlaylistsSection";
import AudioReactiveSection from "./PresetGrid/AudioReactiveSection";
import PresetCard from "./PresetGrid/PresetCard";
import MemoizedPresetCard from "./PresetGrid/MemoizedPresetCard";
import { fabStyles } from "./PresetGrid/FABStyles";
import { deleteModeStyles } from "./PresetGrid/DeleteModeStyles";
import { checkWLEDAudioReactiveConfig } from "../utils/wledConfigChecker";

interface PresetGridProps {
  activePreset: string | number | null;
  onPresetSelect: (presetId: string | number) => void;
  isDark: boolean;
  activeDevice: WledDevice | undefined;
  devices: WledDevice[];
  activeDeviceId?: number | null;
  onSetActiveDeviceId?: (id: number) => void;
  customEffects: CustomEffect[];
  onAddCustomEffect: (effect: CustomEffect) => void;
  onRemoveCustomEffect: (effectId: number) => void;
  savedPlaylists: SavedPlaylist[];
  isLoadingPlaylists: boolean;
  onPlaylistRemove: (playlistId: number) => void;
  onPlaylistSelect: (playlistId: number) => void;
  setShowSettings: (show: boolean) => void;
  onDeviceRemove: (deviceId: number) => void;
  onAddDevice: () => void;
  onScanForDevices: () => void;
  liveLedData: LEDColor[];
  liveViewEnabled: boolean;
  onLiveViewToggle: (enabled: boolean) => void;
  onRefreshPresets?: () => Promise<void>;
  onSavePlaylist?: (playlist: SavedPlaylist) => void;
  seasonalPresets: SeasonalPreset[];
  onBrightnessChange?: (brightness: number) => void;
  liveViewLedSize?: "compact" | "normal" | "large" | "extra-large";
  updateChildModalState: (modalName: string, isOpen: boolean) => void;
  onDeviceUpdate?: (id: number, updates: Partial<WledDevice>) => void;
}

/**
 * Render the presets interface including live view, seasonal presets, custom effects, playlists, and device controls.
 *
 * @param activePreset - ID of the currently active preset
 * @param onPresetSelect - Callback invoked with a preset ID when a preset is selected
 * @param isDark - Whether the UI should render in dark mode
 * @param activeDevice - The currently selected device and its WLED info
 * @param devices - List of available devices
 * @param activeDeviceId - ID of the active device
 * @param onSetActiveDeviceId - Callback to change the active device by ID
 * @param customEffects - Array of custom effect presets (device presets)
 * @param onAddCustomEffect - Callback to add a custom effect to local state
 * @param onRemoveCustomEffect - Callback to remove a custom effect from local state
 * @param savedPlaylists - Array of saved playlists
 * @param isLoadingPlaylists - Whether playlists are currently loading
 * @param onPlaylistRemove - Callback invoked to remove a playlist
 * @param onPlaylistSelect - Callback invoked with a playlist ID when a playlist is selected
 * @param setShowSettings - Callback to open the settings UI
 * @param onDeviceRemove - Callback to remove a device
 * @param onAddDevice - Callback to add a device
 * @param onScanForDevices - Callback to trigger device scanning
 * @param liveLedData - Latest LED data used for live visualization
 * @param liveViewEnabled - Whether live LED visualization is enabled
 * @param onLiveViewToggle - Callback invoked when the live view toggle is changed
 * @param onRefreshPresets - Callback to refresh presets and device state
 * @param onSavePlaylist - Callback invoked to save a new playlist
 * @param seasonalPresets - Array of seasonal preset definitions
 * @param onBrightnessChange - Callback invoked when device brightness is changed (value 0–255)
 * @param liveViewLedSize - Visual size mode for live LEDs ('small' | 'normal' | 'large')
 * @param updateChildModalState - Function used to report child modal visibility to parent for performance
 * @param onDeviceUpdate - Callback to update device metadata (e.g., activePreset) by device ID
 * @returns The rendered PresetGrid component tree
 */
export default function PresetGrid({
  activePreset,
  onPresetSelect,
  isDark,
  activeDevice,
  devices = [],
  activeDeviceId,
  onSetActiveDeviceId,
  customEffects = [],
  onAddCustomEffect,
  onRemoveCustomEffect,
  savedPlaylists = [],
  isLoadingPlaylists,
  onPlaylistRemove,
  onPlaylistSelect,
  setShowSettings,
  onDeviceRemove,
  onAddDevice,
  onScanForDevices,
  liveLedData,
  liveViewEnabled,
  onLiveViewToggle,
  onRefreshPresets,
  onSavePlaylist,
  seasonalPresets,
  onBrightnessChange,
  liveViewLedSize = "normal",
  updateChildModalState,
  onDeviceUpdate,
}: PresetGridProps) {
  // New WebSocket system
  const {
    state: wledState,
    setBrightness: setWledBrightnessWS,
    activatePreset: activatePresetWS,
    togglePower: togglePowerWS,
    toggleLiveView: toggleLiveViewWS,
    isConnected: wsConnected,
    liveViewEnabled: liveViewEnabledWS,
    liveLedData: liveLedDataWS
  } = useWledDevice();

  const [currentPage, setCurrentPage] = useState(0); // 0 = Presets, 1 = Audio Reactive
  const [isAudioReactiveActive, setIsAudioReactiveActive] = useState(false);
  const [isSeasonalCollapsed, setIsSeasonalCollapsed] = useState(true);

  const [isCustomEffectsCollapsed, setIsCustomEffectsCollapsed] =
    useState(true);
  const [isPlaylistsCollapsed, setIsPlaylistsCollapsed] = useState(false);
  const [showCustomEffectsModal, setShowCustomEffectsModal] = useState(false);
  const [showPlaylistCreationModal, setShowPlaylistCreationModal] =
    useState(false);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [showFabOptions, setShowFabOptions] = useState(false);
  const [showCreateNewOptions, setShowCreateNewOptions] = useState(false);
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  const [showDeviceManagementModal, setShowDeviceManagementModal] =
    useState(false);

  // Report modal states to parent for performance optimization
  React.useEffect(() => {
    updateChildModalState("showCustomEffectsModal", showCustomEffectsModal);
  }, [showCustomEffectsModal, updateChildModalState]);

  React.useEffect(() => {
    updateChildModalState(
      "showPlaylistCreationModal",
      showPlaylistCreationModal
    );
  }, [showPlaylistCreationModal, updateChildModalState]);

  React.useEffect(() => {
    updateChildModalState(
      "showDeviceManagementModal",
      showDeviceManagementModal
    );
  }, [showDeviceManagementModal, updateChildModalState]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTogglingDevice, setIsTogglingDevice] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<
    Set<string | number>
  >(new Set());
  const [isDeletionInProgress, setIsDeletionInProgress] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState({
    current: 0,
    total: 0,
    currentItem: "",
  });
  // Brightness from WebSocket state (automatic sync!)
  const sliderBrightness = wledState.brightness || activeDevice?.wledInfo?.bri || 0;

  // Debug logging for brightness
  useEffect(() => {
    logger.log('💡 Brightness state - wledState.brightness:', wledState.brightness, 'device.bri:', activeDevice?.wledInfo?.bri, 'final:', sliderBrightness);
  }, [wledState.brightness, activeDevice?.wledInfo?.bri, sliderBrightness]);

  const [isFetchingBrightness, setIsFetchingBrightness] = useState(false);
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState(0);

  // Ref for horizontal scroll view
  const horizontalScrollRef = useRef<ScrollView>(null);

  // Function to fetch brightness from device
  const fetchDeviceBrightness = useCallback(async () => {
    if (!activeDevice?.ip || !activeDevice?.isConnected) return;

    setIsFetchingBrightness(true);
    try {
      const result = await getWledBrightnessFromWin(
        activeDevice.ip,
        activeDevice.protocol || "http"
      );
      if (result.success && result.brightness !== undefined) {
        // Brightness is now automatically synced via WebSocket state
        setLastRefreshTimestamp(Date.now()); // Mark that we just refreshed
        logger.log(`💡 Fetched brightness from device: ${result.brightness}`);
      }
    } catch (error) {
      logger.error("Failed to fetch device brightness:", error);
    } finally {
      setIsFetchingBrightness(false);
    }
  }, [activeDevice?.ip, activeDevice?.isConnected, activeDevice?.protocol]);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const [cooldownProgress, setCooldownProgress] = useState(0);
  const cooldownAnimRef = useRef<Animated.Value>(new Animated.Value(0)).current;

  // Scheduler state
  const [schedulerEnabled, setSchedulerEnabled] = useState(true);
  const [schedulerExpanded, setSchedulerExpanded] = useState(true);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4, 5, 6])
  ); // All days selected by default
  const [turnOnTime, setTurnOnTime] = useState("20:00");
  const [turnOffTime, setTurnOffTime] = useState("07:00");
  const [isSchedulerSaving, setIsSchedulerSaving] = useState(false);
  const [targetPresetId, setTargetPresetId] = useState<number>(62);

  // Separate state for actual configured schedule (for status display)
  const [configuredSchedule, setConfiguredSchedule] = useState<{
    onTime: string;
    offTime: string;
    presetId: number;
  } | null>(null);

  // Helper function to format and validate time input with colon separator
  const formatTimeInput = (input: string): string => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, "");

    if (digits.length === 0) return "";
    if (digits.length <= 2) {
      // Validate hours as we type
      const hours = parseInt(digits);
      if (hours > 23) return "23"; // Cap at 23 hours
      return digits;
    }
    if (digits.length <= 4) {
      let hours = digits.slice(0, 2);
      let minutes = digits.slice(2);

      // Validate hours (00-23)
      const hoursNum = parseInt(hours);
      if (hoursNum > 23) hours = "23";

      // Validate minutes as we type (00-59)
      if (minutes.length > 0) {
        const minutesNum = parseInt(minutes);
        if (minutesNum > 59) minutes = "59";
        // If first digit of minutes is > 5, cap it
        if (minutes.length === 1 && parseInt(minutes) > 5) minutes = "5";
      }

      return `${hours}:${minutes}`;
    }

    // Limit to 4 digits (HHMM) with validation
    let hours = digits.slice(0, 2);
    let minutes = digits.slice(2, 4);

    // Validate hours (00-23)
    const hoursNum = parseInt(hours);
    if (hoursNum > 23) hours = "23";

    // Validate minutes (00-59)
    const minutesNum = parseInt(minutes);
    if (minutesNum > 59) minutes = "59";

    return `${hours}:${minutes}`;
  };

  // Helper function to validate complete time format
  const validateTime = (time: string): boolean => {
    const timePattern = /^([01]?[0-9]|2[0-3]):([0-5]?[0-9])$/;
    if (!timePattern.test(time)) return false;

    const [hours, minutes] = time.split(":").map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  };

  // Helper function to handle time input with validation feedback
  const handleTimeInput = (
    text: string,
    setter: (value: string) => void,
    currentValue: string
  ) => {
    const formatted = formatTimeInput(text);

    // If user deletes and leaves incomplete time, allow it for editing
    if (formatted.length < 5 && formatted.length > 0) {
      setter(formatted);
      return;
    }

    // For complete times, validate
    if (formatted.length === 5) {
      if (validateTime(formatted)) {
        setter(formatted);
      } else {
        // Keep the current valid value if new input is invalid
        setter(currentValue);
      }
    } else {
      setter(formatted);
    }
  };

  // Function to handle disabling scheduler on device
  const handleDisableScheduler = useCallback(async () => {
    if (!activeDevice?.ip || !activeDevice?.isConnected) {
      logger.log(`⚠️ Cannot disable scheduler: device not connected`);
      return;
    }

    try {
      logger.log(`🔄 Disabling timers on device ${activeDevice.ip}...`);

      // Fetch current timer settings
      const result = await fetchWledTimerSettings(
        activeDevice.ip,
        activeDevice.protocol || "http"
      );

      if (result.success && result.timerSettings) {
        const timers = result.timerSettings.timers;

        // First, get the complete current settings using the same method as save
        const settingsResult = await fetchWledTimerSettings(
          activeDevice.ip,
          activeDevice.protocol || "http"
        );

        if (!settingsResult.success) {
          logger.error(
            `❌ Failed to fetch complete settings for disable operation`
          );
          return;
        }

        // Parse the raw JavaScript response to get ALL current values
        const response = await fetch(
          `${activeDevice.protocol || "http"}://${
            activeDevice.ip
          }/settings/s.js?p=5`
        );
        const jsText = await response.text();

        // Use the same parsing approach as in wledApi.ts
        const formValues: Record<string, string> = {};

        // Extract all form values using regex (same pattern as in wledApi.ts)
        const matches = jsText.matchAll(
          /d\.Sf\.(\w+)\.(?:value|checked)\s*=\s*(?:"([^"]*)"|(\d+)|([^;]+))/g
        );
        for (const match of matches) {
          const fieldName = match[1];
          const value = match[2] || match[3] || match[4] || "";
          formValues[fieldName] = value.toString();
        }

        // Convert to form data
        const formData = new URLSearchParams();
        Object.entries(formValues).forEach(([key, value]) => {
          formData.append(key, value);
        });

        // Now modify only the weekdays values for active timers
        timers.forEach((timer, index) => {
          if (timer.preset > 0) {
            const disabledValue = Math.max(timer.weekdays - 1, 0); // Subtract 1 to disable
            logger.log(
              `📴 Disabling Timer ${index}: W${index}=${timer.weekdays} -> ${disabledValue}`
            );
            formData.set(`W${index}`, disabledValue.toString()); // Update only weekdays, preserve everything else
          }
        });

        logger.log(
          `📤 Sending complete disable payload with ${
            formData.toString().split("&").length
          } fields`
        );

        // Post the form data to disable timers
        const saveResult = await fetch(
          `${activeDevice.protocol || "http"}://${
            activeDevice.ip
          }/settings/time`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData,
          }
        );

        if (saveResult.ok) {
          logger.log(`✅ Successfully disabled timers on device`);
        } else {
          logger.error(
            `❌ Failed to disable timers: ${saveResult.status} ${saveResult.statusText}`
          );
        }
      }
    } catch (error) {
      logger.error("❌ Exception while disabling scheduler:", error);
    }
  }, [activeDevice]);
  // Back handler for "press twice to exit"
  const backPressedOnce = useRef(false);
  const backHandlerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(liveViewEnabledWS ? 1 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fabRotateAnim = useRef(new Animated.Value(0)).current;
  const fabScaleAnim1 = useRef(new Animated.Value(0)).current;
  const fabScaleAnim2 = useRef(new Animated.Value(0)).current;
  const fabScaleAnim3 = useRef(new Animated.Value(0)).current;
  const fabScaleAnim4 = useRef(new Animated.Value(0)).current;
  const fabScaleAnim5 = useRef(new Animated.Value(0)).current;
  const wiggleAnim = useRef(new Animated.Value(0)).current;

  // Cleanup animations on unmount to prevent memory leaks and race conditions
  useEffect(() => {
    return () => {
      // Stop all running animations
      fabRotateAnim.stopAnimation();
      fabScaleAnim1.stopAnimation();
      fabScaleAnim2.stopAnimation();
      fabScaleAnim3.stopAnimation();
      fabScaleAnim4.stopAnimation();
      fabScaleAnim5.stopAnimation();
      wiggleAnim.stopAnimation();
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();

      // Animation cleanup completed
    };
  }, [
    fabRotateAnim,
    fabScaleAnim1,
    fabScaleAnim2,
    fabScaleAnim3,
    fabScaleAnim4,
    fabScaleAnim5,
    wiggleAnim,
    fadeAnim,
    scaleAnim,
  ]);

  // Memoize customEffects to prevent unnecessary re-renders when parent recreates array
  const memoizedCustomEffects = useMemo(() => {
    // Create a stable reference if the actual content hasn't changed
    return customEffects;
  }, [
    customEffects.length,
    // Create a stable hash of the essential properties
    customEffects
      .map(
        (effect) =>
          `${effect.id}:${effect.name}:${effect.presetId}:${effect.effectName}`
      )
      .join("|"),
  ]);

  // Device presets are now passed via customEffects prop from parent
  const devicePresets = memoizedCustomEffects; // Use memoized customEffects
  const loadingPresets =
    memoizedCustomEffects.length === 0 && activeDevice?.isConnected;

  // Theme colors
  const backgroundColor = isDark ? "#111827" : "#f9fafb";
  const cardBackground = isDark ? "#1f2937" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#111827";
  const subtextColor = isDark ? "#9ca3af" : "#6b7280";
  const borderColor = isDark ? "#374151" : "#e5e7eb";

  // Load collapse states from storage
  useEffect(() => {
    const loadCollapseStates = async () => {
      try {
        const [seasonal, customEffectsState, playlists] = await Promise.all([
          storage.loadFromStorage(STORAGE_KEYS.SEASONAL_COLLAPSED, true),
          storage.loadFromStorage(STORAGE_KEYS.CUSTOM_EFFECTS_COLLAPSED, true),
          storage.loadFromStorage(STORAGE_KEYS.PLAYLISTS_COLLAPSED, false),
        ]);

        setIsSeasonalCollapsed(seasonal);
        setIsCustomEffectsCollapsed(customEffectsState);
        setIsPlaylistsCollapsed(playlists);
      } catch (error) {
        logger.error("Failed to load collapse states:", error);
      }
    };

    loadCollapseStates();
  }, []);

  // Save collapse states
  useEffect(() => {
    storage.saveToStorage(STORAGE_KEYS.SEASONAL_COLLAPSED, isSeasonalCollapsed);
  }, [isSeasonalCollapsed]);

  useEffect(() => {
    storage.saveToStorage(
      STORAGE_KEYS.CUSTOM_EFFECTS_COLLAPSED,
      isCustomEffectsCollapsed
    );
  }, [isCustomEffectsCollapsed]);

  useEffect(() => {
    storage.saveToStorage(
      STORAGE_KEYS.PLAYLISTS_COLLAPSED,
      isPlaylistsCollapsed
    );
  }, [isPlaylistsCollapsed]);

  // Handle Android back button - press twice to exit
  useEffect(() => {
    const handleBackPress = () => {
      // Handle device dropdown specifically (it's not a real Modal)
      if (showDeviceDropdown) {
        setShowDeviceDropdown(false);
        return true;
      }

      // If any other modal is open, don't handle back press (let modal handle it)
      if (
        showCustomEffectsModal ||
        showPlaylistCreationModal ||
        showCreateNewOptions ||
        showDeviceManagementModal
      ) {
        return false;
      }

      // If in delete mode, exit delete mode instead of showing exit prompt
      if (isDeleteMode) {
        exitDeleteMode();
        return true;
      }

      if (Platform.OS === "android") {
        if (backPressedOnce.current) {
          // Second press - exit app
          BackHandler.exitApp();
          return true;
        } else {
          // First press - show toast and set flag
          backPressedOnce.current = true;
          ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);

          // Reset flag after 2 seconds
          if (backHandlerTimeoutRef.current) {
            clearTimeout(backHandlerTimeoutRef.current);
          }
          backHandlerTimeoutRef.current = setTimeout(() => {
            backPressedOnce.current = false;
          }, 2000);

          return true;
        }
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );

    return () => {
      backHandler.remove();
      if (backHandlerTimeoutRef.current) {
        clearTimeout(backHandlerTimeoutRef.current);
      }
    };
  }, [
    showCustomEffectsModal,
    showPlaylistCreationModal,
    showCreateNewOptions,
    showDeviceManagementModal,
    showDeviceDropdown,
    isDeleteMode,
    exitDeleteMode,
  ]);

  // Track previous device ID for immediate updates on device switch
  const prevDeviceId = useRef(activeDevice?.id);

  // Update slider ONLY when device ID actually changes (not on connection state changes)
  useEffect(() => {
    const currentDeviceId = activeDevice?.id;

    // Only update if device ID actually changed
    if (prevDeviceId.current !== currentDeviceId) {
      prevDeviceId.current = currentDeviceId;

      // Brightness is now automatically synced via WebSocket state
      if (!activeDevice?.wledInfo?.bri && activeDevice?.isConnected) {
        // If no brightness info in wledInfo, fetch it from device
        fetchDeviceBrightness();
      }
    }
  }, [
    activeDevice?.id, // Only watch device ID changes
    activeDevice?.isConnected,
    activeDevice?.wledInfo?.bri,
    fetchDeviceBrightness,
  ]);

  const activePresetData = useMemo(() => {
    if (!activePreset) return null;

    const allPresets = [...seasonalPresets, ...memoizedCustomEffects];

    const found = allPresets.find((p) => {
      // Match by presetId (for seasonal and WLED presets)
      if (p.presetId?.toString() === activePreset?.toString()) {
        return true;
      }
      // Match by id (for WLED presets with "wled_X" format)
      if (p.id?.toString() === activePreset?.toString()) {
        return true;
      }
      // Match by numeric part of id (e.g., "wled_60" matches activePreset 60)
      if (typeof p.id === 'string' && p.id.startsWith('wled_')) {
        const numericId = parseInt(p.id.replace('wled_', ''));
        if (numericId.toString() === activePreset?.toString()) {
          return true;
        }
      }
      return false;
    });

    if (found) {
      return found;
    }

    // If not found, create a placeholder object for display
    return {
      id: activePreset,
      presetId: typeof activePreset === 'number' ? activePreset : parseInt(activePreset.toString()),
      name: `Preset ${activePreset}`,
      isUnknown: true
    };
  }, [activePreset, seasonalPresets, memoizedCustomEffects]);

  const handleLiveViewToggle = () => {
    const newValue = !liveViewEnabledWS;

    // Toggle WebSocket live view (this updates context state AND sends WS command)
    toggleLiveViewWS(newValue);

    // Also update settings for persistence
    if (onLiveViewToggle) {
      onLiveViewToggle(newValue);
    }

    // Animate the content transition (for visual feedback only)
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start(() => {
      // Animate back to normal
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    });
  };

  const handleDeviceToggle = useCallback(
    async (turnOn: boolean) => {
      if (!activeDevice?.ip || isTogglingDevice) return;

      setIsTogglingDevice(true);
      try {
        // Use WebSocket instead of HTTP
        togglePowerWS(turnOn);
        logger.log(`Device ${turnOn ? 'turned on' : 'turned off'} via WebSocket`);

        // Optimistic UI update: immediately update the local device state
        if (onDeviceUpdate && activeDevice?.id) {
          onDeviceUpdate(activeDevice.id, {
            wledInfo: {
              ...activeDevice.wledInfo,
              on: turnOn,
            },
          });
        }
      } catch (error) {
        Alert.alert(
          "Error",
          `Failed to ${turnOn ? "turn on" : "turn off"} device`
        );
        // Revert optimistic update on error
        if (onDeviceUpdate && activeDevice?.id) {
          onDeviceUpdate(activeDevice.id, {
            wledInfo: {
              ...activeDevice.wledInfo,
              on: !turnOn,
            },
          });
        }
      } finally {
        setIsTogglingDevice(false);
        // Refresh device state after toggle to sync with actual device state
        if (onRefreshPresets) {
          onRefreshPresets();
        }
      }
    },
    [activeDevice?.ip, activeDevice?.id, activeDevice?.wledInfo, isTogglingDevice, onRefreshPresets, onDeviceUpdate, togglePowerWS]
  );

  // Use ref to always get latest device info
  const activeDeviceRef = useRef(activeDevice);
  useEffect(() => {
    activeDeviceRef.current = activeDevice;
  }, [activeDevice]);

  const handleRefresh = useCallback(async () => {
    if (!onRefreshPresets || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefreshPresets();
      // After refresh completes, wledInfo.bri is updated by refreshDeviceState
      // Read from the ref to get the latest value
      const currentDevice = activeDeviceRef.current;
      if (currentDevice?.wledInfo?.bri !== undefined) {
        const newBrightness = Math.round(currentDevice.wledInfo.bri);
        setLastRefreshTimestamp(Date.now());
        logger.log(`💡 Brightness updated from refresh: ${newBrightness}`);
      }

      // Also check UDP Realtime status after refresh
      if (currentDevice?.ip && currentDevice?.isConnected) {
        try {
          const status = await checkWLEDAudioReactiveConfig(currentDevice.ip);
          // If UDP Realtime is enabled, block presets access
          if (status.udpRealtimeEnabled) {
            logger.log('⚠️ UDP Realtime detected as enabled after refresh - blocking access');
            setIsAudioReactiveActive(true);
          } else if (!status.udpRealtimeEnabled && isAudioReactiveActive) {
            // If UDP Realtime is disabled but we're showing the overlay, hide it
            logger.log('✅ UDP Realtime is disabled after refresh - allowing preset access');
            setIsAudioReactiveActive(false);
          }
        } catch (error) {
          logger.error('Failed to check UDP Realtime status on refresh:', error);
        }
      }
    } catch (error) {
      logger.error("Failed to refresh presets:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    onRefreshPresets,
    isRefreshing,
    sliderBrightness,
    isAudioReactiveActive,
  ]);

  // Check UDP Realtime status when switching to presets page (page 0)
  useEffect(() => {
    const checkUdpStatusOnPageChange = async () => {
      // Only check when on page 0 (presets) and device is connected
      if (currentPage === 0 && activeDevice?.ip && activeDevice?.isConnected) {
        try {
          const status = await checkWLEDAudioReactiveConfig(activeDevice.ip);

          // If UDP Realtime is enabled, block presets access
          if (status.udpRealtimeEnabled) {
            logger.log('⚠️ UDP Realtime is enabled when navigating to presets page - blocking access');
            setIsAudioReactiveActive(true);
          } else if (!status.udpRealtimeEnabled && isAudioReactiveActive) {
            // If UDP Realtime is disabled but we're showing the overlay, hide it
            logger.log('✅ UDP Realtime is disabled - allowing preset access');
            setIsAudioReactiveActive(false);
          }
        } catch (error) {
          logger.error('Failed to check UDP Realtime status on page change:', error);
        }
      }
    };

    checkUdpStatusOnPageChange();
  }, [currentPage, activeDevice?.ip, activeDevice?.isConnected, isAudioReactiveActive]);

  // Animation coordination (non-blocking)
  const fabAnimationInProgress = useRef(false);

  // FAB open animation - staggered sequence for smooth reveal
  const animateFabOpen = useCallback(() => {
    // Ensure animations start from 0 (closed state)
    fabRotateAnim.setValue(0);
    fabScaleAnim1.setValue(0);
    fabScaleAnim2.setValue(0);
    fabScaleAnim3.setValue(0);
    fabScaleAnim4.setValue(0);
    fabScaleAnim5.setValue(0);

    Animated.parallel([
      Animated.timing(fabRotateAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.stagger(60, [
        Animated.timing(fabScaleAnim5, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fabScaleAnim4, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fabScaleAnim3, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fabScaleAnim2, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fabScaleAnim1, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    fabRotateAnim,
    fabScaleAnim1,
    fabScaleAnim2,
    fabScaleAnim3,
    fabScaleAnim4,
    fabScaleAnim5,
  ]);

  // FAB close animation - reverse stagger for smooth collapse
  const animateFabClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fabRotateAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      // Stagger closing animation in reverse order (top to bottom) for smooth "folding" effect
      Animated.stagger(50, [
        Animated.timing(fabScaleAnim1, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fabScaleAnim2, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fabScaleAnim3, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fabScaleAnim4, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fabScaleAnim5, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setShowFabOptions(false);
    });
  }, [
    fabRotateAnim,
    fabScaleAnim1,
    fabScaleAnim2,
    fabScaleAnim3,
    fabScaleAnim4,
    fabScaleAnim5,
  ]);

  const toggleFabOptions = useCallback(() => {
    if (showFabOptions) {
      setShowFabOptions(false);
      // Reset animations to closed state
      fabRotateAnim.setValue(0);
      fabScaleAnim1.setValue(0);
      fabScaleAnim2.setValue(0);
      fabScaleAnim3.setValue(0);
      fabScaleAnim4.setValue(0);
      fabScaleAnim5.setValue(0);
    } else {
      // Close device dropdown when opening FAB
      if (showDeviceDropdown) {
        setShowDeviceDropdown(false);
      }
      setShowFabOptions(true);
      // Set animations to open state immediately
      fabRotateAnim.setValue(1);
      fabScaleAnim1.setValue(1);
      fabScaleAnim2.setValue(1);
      fabScaleAnim3.setValue(1);
      fabScaleAnim4.setValue(1);
      fabScaleAnim5.setValue(1);
    }
  }, [
    showFabOptions,
    showDeviceDropdown,
    fabRotateAnim,
    fabScaleAnim1,
    fabScaleAnim2,
    fabScaleAnim3,
    fabScaleAnim4,
    fabScaleAnim5,
  ]);

  // Safety mechanism to reset stuck animation flag
  useEffect(() => {
    if (fabAnimationInProgress.current) {
      const timeout = setTimeout(() => {
        // fabAnimationInProgress.current = false;
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [showFabOptions]);

  // Simple function to close FAB and open modal immediately
  const closeFabAndOpenModal = useCallback(
    (modalOpenFunction: () => void) => {
      // Hide FAB options immediately to prevent background visibility
      setShowFabOptions(false);
      // Reset animations to closed state immediately
      fabRotateAnim.setValue(0);
      fabScaleAnim1.setValue(0);
      fabScaleAnim2.setValue(0);
      fabScaleAnim3.setValue(0);
      fabScaleAnim4.setValue(0);
      fabScaleAnim5.setValue(0);
      // Open modal immediately
      modalOpenFunction();
    },
    [fabRotateAnim, fabScaleAnim1, fabScaleAnim2, fabScaleAnim3, fabScaleAnim4, fabScaleAnim5]
  );

  const startWiggleAnimation = useCallback(() => {
    const wiggle = () => {
      Animated.sequence([
        Animated.timing(wiggleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(wiggleAnim, {
          toValue: -1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(wiggleAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isDeleteMode) {
          setTimeout(wiggle, 200);
        }
      });
    };
    wiggle();
  }, [wiggleAnim, isDeleteMode]);

  const enterDeleteMode = useCallback(() => {
    setIsDeleteMode(true);
    setShowFabOptions(false);
    setSelectedForDelete(new Set());
    startWiggleAnimation();
  }, [startWiggleAnimation]);

  const exitDeleteMode = useCallback(() => {
    setIsDeleteMode(false);
    setSelectedForDelete(new Set());
    wiggleAnim.setValue(0);
    animateFabClose();
  }, [wiggleAnim, animateFabClose]);

  const toggleCardSelection = useCallback((id: string | number) => {
    setSelectedForDelete((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Process deletion queue with proper error handling and progress tracking
  const processDeletionQueue = useCallback(
    async (
      selectedItems: Array<{ id: string | number; name: string; type: string }>
    ) => {
      if (selectedItems.length === 0) return;

      setIsDeletionInProgress(true);
      setDeletionProgress({
        current: 0,
        total: selectedItems.length,
        currentItem: "",
      });

      const results = {
        success: [] as string[],
        failed: [] as string[],
      };

      try {
        // Process each item in the deletion queue
        for (let i = 0; i < selectedItems.length; i++) {
          const item = selectedItems[i];
          setDeletionProgress({
            current: i + 1,
            total: selectedItems.length,
            currentItem: item.name,
          });

          try {
            if (item.type === "effect") {
              const effect = memoizedCustomEffects.find(
                (e) => e.id === item.id
              );
              if (effect?.presetId && activeDevice?.ip) {
                const result = await deleteWledPreset(
                  activeDevice.ip,
                  effect.presetId,
                  activeDevice.protocol || "http"
                );

                if (result.success) {
                  // Remove from local state immediately
                  onRemoveCustomEffect(item.id as number);
                  // Remove from selection immediately
                  setSelectedForDelete(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(item.id);
                    return newSet;
                  });
                  results.success.push(item.name);
                } else {
                  results.failed.push(
                    `${item.name}: ${result.message || "Unknown error"}`
                  );
                  console.error(
                    `Failed to delete effect "${item.name}":`,
                    result.message
                  );
                }
              } else {
                // Local effect only, remove from local state
                onRemoveCustomEffect(item.id as number);
                // Remove from selection immediately
                setSelectedForDelete(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(item.id);
                  return newSet;
                });
                results.success.push(item.name);
              }
            } else if (item.type === "playlist") {
              const playlist = savedPlaylists.find((p) => p.id === item.id);
              if (playlist?.id) {

                let deletionResult = null;

                // Try WebSocket deletion first for WLED playlists
                if (playlist.isWledPlaylist) {
                  try {
                    // Use presetId if available, otherwise use id
                    const idToDelete = playlist.presetId || playlist.id;

                    deletionResult = await deleteWledPlaylistViaWebSocket(
                      idToDelete as number,
                      activeDevice?.ip,
                      activeDevice?.protocol || "http"
                    );
                  } catch (error) {
                    console.error(`Error deleting playlist "${item.name}":`, error);
                    deletionResult = {
                      success: false,
                      message:
                        error instanceof Error
                          ? error.message
                          : "Unknown error",
                    };
                  }
                } else {
                  // Local playlist only
                  deletionResult = { success: true };
                }

                if (deletionResult?.success) {
                  onPlaylistRemove(item.id as number);
                  // Remove from selection immediately
                  setSelectedForDelete(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(item.id);
                    return newSet;
                  });
                  results.success.push(item.name);
                } else {
                  results.failed.push(
                    `${item.name}: ${
                      deletionResult?.message || "Unknown error"
                    }`
                  );
                  console.error(
                    `Failed to delete playlist "${item.name}":`,
                    deletionResult?.message
                  );
                }
              } else {
                results.failed.push(`${item.name}: Playlist not found`);
              }
            }

            // Add small delay between deletions to prevent overwhelming the device
            if (i < selectedItems.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error occurred";
            results.failed.push(`${item.name}: ${errorMessage}`);
            console.error(`Unexpected error deleting "${item.name}":`, error);
          }
        }

        // Show results summary
        let alertTitle = "Deletion Complete";
        let alertMessage = "";

        if (results.success.length > 0) {
          alertMessage += `✅ Successfully deleted ${
            results.success.length
          } item${results.success.length !== 1 ? "s" : ""}`;
          if (results.failed.length === 0) {
            alertMessage += ".";
          } else {
            alertMessage += "\n\n";
          }
        }

        if (results.failed.length > 0) {
          alertTitle =
            results.success.length > 0
              ? "Deletion Partially Complete"
              : "Deletion Failed";
          alertMessage += `❌ Failed to delete ${results.failed.length} item${
            results.failed.length !== 1 ? "s" : ""
          }:\n`;
          alertMessage += results.failed.map((item) => `• ${item}`).join("\n");
        }

        // Refresh presets from device to update UI with latest state
        if (onRefreshPresets && results.success.length > 0) {
          await onRefreshPresets();
        }

        Alert.alert(alertTitle, alertMessage, [{ text: "OK" }]);
      } catch (error) {
        console.error("💥 Critical error in deletion queue:", error);
        Alert.alert(
          "Deletion Error",
          "A critical error occurred during deletion. Some items may not have been deleted.",
          [{ text: "OK" }]
        );
      } finally {
        setIsDeletionInProgress(false);
        setDeletionProgress({ current: 0, total: 0, currentItem: "" });
        exitDeleteMode();
      }
    },
    [
      memoizedCustomEffects,
      savedPlaylists,
      activeDevice,
      onRemoveCustomEffect,
      onPlaylistRemove,
      exitDeleteMode,
    ]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedForDelete.size === 0) return;

    const selectedItems: Array<{
      id: string | number;
      name: string;
      type: "effect" | "playlist";
    }> = [];

    // Collect selected playlists FIRST (delete playlists before effects they depend on)
    savedPlaylists.forEach((playlist) => {
      if (selectedForDelete.has(playlist.id)) {
        selectedItems.push({
          id: playlist.id,
          name: playlist.name,
          type: "playlist",
        });
      }
    });

    // Collect selected custom effects AFTER playlists
    memoizedCustomEffects.forEach((effect) => {
      if (selectedForDelete.has(effect.id)) {
        selectedItems.push({
          id: effect.id,
          name: effect.name,
          type: "effect",
        });
      }
    });

    if (selectedItems.length === 0) return;

    const itemList = selectedItems
      .map((item) => `• ${item.name} (${item.type})`)
      .join("\n");

    Alert.alert(
      "Delete Confirmation",
      `Are you sure you want to delete the following items?\n\n${itemList}`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => processDeletionQueue(selectedItems),
        },
      ]
    );
  }, [
    selectedForDelete,
    memoizedCustomEffects,
    savedPlaylists,
    onRemoveCustomEffect,
    onPlaylistRemove,
    exitDeleteMode,
    activeDevice,
    processDeletionQueue,
  ]);

  // Start wiggle animation when entering delete mode
  useEffect(() => {
    if (isDeleteMode) {
      startWiggleAnimation();
    }
  }, [isDeleteMode, startWiggleAnimation]);

  // Random Custom Effect Generator
  const generateRandomCustomEffect = useCallback(async () => {
    if (!activeDevice?.isConnected || isCooldownActive) return;

    // Start cooldown
    setIsCooldownActive(true);
    setCooldownProgress(0);

    // Animate cooldown progress
    Animated.timing(cooldownAnimRef, {
      toValue: 1,
      duration: 3000, // 3 seconds
      useNativeDriver: false,
    }).start(() => {
      // Reset cooldown after animation completes
      setIsCooldownActive(false);
      setCooldownProgress(0);
      cooldownAnimRef.setValue(0);
    });

    // Update progress counter every 100ms for display
    const progressInterval = setInterval(() => {
      setCooldownProgress((prev) => {
        const newProgress = prev + 100 / 3000; // increment by 100ms/3000ms
        if (newProgress >= 1) {
          clearInterval(progressInterval);
          return 1;
        }
        return newProgress;
      });
    }, 100);

    try {
      // Detect WLED device dimensions first
      const detectWledDimensions = async (
        deviceIp: string
      ): Promise<"1D" | "2D" | null> => {
        try {
          const response = await fetch(
            `http://${deviceIp}/settings/s.js?p=10`,
            {
              timeout: 5000,
            }
          );

          if (!response.ok) {
            throw new Error(
              `HTTP ${response.status}: ${
                response.statusText || "Unknown error"
              }`
            );
          }

          const responseText = await response.text();
          const sompMatch = responseText.match(
            /d\.Sf\.SOMP\.value\s*=\s*(\d+)/
          );

          if (sompMatch) {
            const sompValue = parseInt(sompMatch[1]);
            return sompValue === 0 ? "1D" : "2D";
          }
          return null;
        } catch (error) {
          console.error("Failed to detect WLED dimensions:", error);
          return null;
        }
      };

      // Get device effects and palettes
      const [effectsResponse, palettesResponse, deviceDimensions] =
        await Promise.all([
          fetch(`http://${activeDevice.ip}/json/eff`, { timeout: 8000 }),
          fetch(`http://${activeDevice.ip}/json/pal`, { timeout: 8000 }),
          detectWledDimensions(activeDevice.ip),
        ]);

      if (!effectsResponse.ok || !palettesResponse.ok) {
        throw new Error("Failed to fetch device data");
      }

      const [deviceEffects, devicePalettes] = await Promise.all([
        effectsResponse.json(),
        palettesResponse.json(),
      ]);


      // Filter effects based on device dimensions and lookup table
      const availableEffects: WLEDEffectData[] = [];
      deviceEffects.forEach((effectName: string, index: number) => {
        const lookupEffect = getEffectByName(effectName);

        if (lookupEffect) {
          // Filter based on device dimensions
          let shouldInclude = true;

          if (deviceDimensions === "1D" && !lookupEffect.supports1D) {
            shouldInclude = false;
          } else if (deviceDimensions === "2D" && !lookupEffect.supports2D) {
            shouldInclude = false;
          }

          if (shouldInclude) {
            availableEffects.push(lookupEffect);
          }
        }
      });

      if (availableEffects.length === 0) {
        Alert.alert(
          "No Effects Available",
          "No compatible effects found for this device."
        );
        return;
      }

      // Select random effect
      const randomEffect =
        availableEffects[Math.floor(Math.random() * availableEffects.length)];

      // Select random palette if effect supports palettes
      let randomPalette = null;
      let presetName = randomEffect.name;

      if (randomEffect.supportsPalette && devicePalettes.length > 0) {
        // Filter out unwanted palettes
        const excludedPalettes = [
          'Default',
          'Random Cycle',
          'Color 1',
          'Color 1&2',
          'Color Gradient',
          'Colors Only'
        ];

        const validPalettes = devicePalettes.filter(
          paletteName => !excludedPalettes.includes(paletteName)
        );

        // Only proceed if we have valid palettes
        if (validPalettes.length > 0) {
          const randomPaletteIndex = Math.floor(
            Math.random() * validPalettes.length
          );
          const paletteName = validPalettes[randomPaletteIndex];

          // Find the actual palette ID from WLED_PALETTES_DEF
          const paletteDef = WLED_PALETTES_DEF.find(p => p.name === paletteName);

          if (!paletteDef) {
            console.warn(`Palette "${paletteName}" not found in WLED_PALETTES_DEF`);
          }

          const paletteId = paletteDef?.id ?? 0;

          randomPalette = {
            id: paletteId,
            name: paletteName,
          };
          presetName = `${randomEffect.name}+${randomPalette.name}`;
        }
      }

      // Create the random custom effect preset
      const result = await createWledPreset(
        activeDevice.ip,
        randomEffect.id,
        randomPalette?.id || 0,
        presetName,
        undefined, // Let it auto-generate preset ID
        activeDevice.protocol || "http"
      );

      if (result.success && result.presetId) {
        const gradient = generatePresetGradient(randomPalette?.id || 0);

        // Add to local custom effects
        const newCustomEffect: CustomEffect = {
          id: result.presetId,
          presetId: result.presetId,
          name: presetName,
          effectName: randomEffect.name,
          effectId: randomEffect.id,
          paletteId: randomPalette?.id || 0,
          paletteName: randomPalette?.name || "",
          isWledPreset: true,
          gradient: gradient,
          isCustom: false,
        };

        onAddCustomEffect(newCustomEffect);

        // Apply the effect immediately
        onPresetSelect(result.presetId);

        // Directly update device active preset to ensure UI shows it as active
        if (onDeviceUpdate && activeDevice?.id) {
          onDeviceUpdate(activeDevice.id, { activePreset: result.presetId });
        }
      } else {
        throw new Error(result.message || "Failed to create preset");
      }
    } catch (error) {
      console.error("Error generating random custom effect:", error);
      Alert.alert(
        "Failed to Generate Random Effect",
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
    }
  }, [
    activeDevice,
    onAddCustomEffect,
    onPresetSelect,
    onRefreshPresets,
    isCooldownActive,
    cooldownAnimRef,
  ]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Sticky Live View Section */}
      <View style={styles.stickyHeader}>
        <LiveViewSection
          activeDevice={activeDevice}
          activePresetData={activePresetData}
          liveViewEnabled={liveViewEnabledWS}
          liveLedData={liveLedDataWS}
          liveViewLedSize={liveViewLedSize}
          sliderBrightness={sliderBrightness}
          isFetchingBrightness={isFetchingBrightness}
          lastRefreshTimestamp={lastRefreshTimestamp}
          fadeAnim={fadeAnim}
          scaleAnim={scaleAnim}
          isDark={isDark}
          cardBackground={cardBackground}
          borderColor={borderColor}
          textColor={textColor}
          subtextColor={subtextColor}
          onLiveViewToggle={handleLiveViewToggle}
          onBrightnessChange={onBrightnessChange}
        />
      </View>

      {/* Page Indicators */}
      <View style={styles.pageIndicatorContainer}>
        <View style={styles.pageIndicators}>
          <TouchableOpacity
            onPress={() => {
              // Scroll to presets page
              const scrollView = horizontalScrollRef.current;
              if (scrollView) {
                scrollView.scrollTo({ x: 0, animated: true });
              }
            }}
            style={styles.pageIndicatorButton}
          >
            <View style={[
              styles.pageIndicatorDot,
              currentPage === 0 && styles.pageIndicatorDotActive,
              { backgroundColor: currentPage === 0 ? '#3b82f6' : (isDark ? '#6b7280' : '#d1d5db') }
            ]} />
            <Text style={[styles.pageIndicatorLabel, { color: currentPage === 0 ? textColor : subtextColor }]}>
              Presets
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              // Scroll to audio reactive page
              const scrollView = horizontalScrollRef.current;
              if (scrollView) {
                const { width } = Dimensions.get('window');
                scrollView.scrollTo({ x: width, animated: true });
              }
            }}
            style={styles.pageIndicatorButton}
          >
            <View style={[
              styles.pageIndicatorDot,
              currentPage === 1 && styles.pageIndicatorDotActive,
              { backgroundColor: currentPage === 1 ? '#3b82f6' : (isDark ? '#6b7280' : '#d1d5db') }
            ]} />
            <Text style={[styles.pageIndicatorLabel, { color: currentPage === 1 ? textColor : subtextColor }]}>
              Audio
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal Scrollable Pages */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const { width } = Dimensions.get('window');
          const page = Math.round(offsetX / width);
          setCurrentPage(page);
        }}
        style={styles.horizontalScrollView}
      >
        {/* Page 1: Presets */}
        <ScrollView
          style={[styles.scrollContainer, { width: Dimensions.get('window').width }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={textColor}
              colors={["#3b82f6"]}
              progressBackgroundColor={cardBackground}
            />
          }
        >
          {/* Seasonal Presets */}
          <SeasonalPresetsSection
            seasonalPresets={seasonalPresets}
            activePreset={activePreset}
            isCollapsed={isSeasonalCollapsed}
            isBlocked={!activeDevice?.isConnected || isAudioReactiveActive}
            blockReason={!activeDevice?.isConnected ? 'offline' : 'audioReactive'}
            isDark={isDark}
            cardBackground={cardBackground}
            borderColor={borderColor}
            textColor={textColor}
            subtextColor={subtextColor}
            onToggleCollapse={() => setIsSeasonalCollapsed(!isSeasonalCollapsed)}
            onPresetSelect={onPresetSelect}
            PresetCard={PresetCard}
          />

          {/* Custom Effects */}
          <CustomEffectsSection
            customEffects={memoizedCustomEffects}
            activePreset={activePreset}
            activeDevice={activeDevice}
            isCollapsed={isCustomEffectsCollapsed}
            isBlocked={!activeDevice?.isConnected || isAudioReactiveActive}
            blockReason={!activeDevice?.isConnected ? 'offline' : 'audioReactive'}
            isDeleteMode={isDeleteMode}
            selectedForDelete={selectedForDelete}
            wiggleAnim={wiggleAnim}
            isCooldownActive={isCooldownActive}
            cooldownProgress={cooldownProgress}
            cooldownAnimRef={cooldownAnimRef}
            isDark={isDark}
            cardBackground={cardBackground}
            borderColor={borderColor}
            textColor={textColor}
            subtextColor={subtextColor}
            onToggleCollapse={() => setIsCustomEffectsCollapsed(!isCustomEffectsCollapsed)}
            onPresetSelect={onPresetSelect}
            onToggleSelection={toggleCardSelection}
            onGenerateRandom={generateRandomCustomEffect}
            PresetCard={MemoizedPresetCard}
          />

          {/* Playlists */}
          <PlaylistsSection
            savedPlaylists={savedPlaylists}
            customEffectsCount={memoizedCustomEffects.length}
            isCollapsed={isPlaylistsCollapsed}
            isBlocked={!activeDevice?.isConnected || isAudioReactiveActive}
            blockReason={!activeDevice?.isConnected ? 'offline' : 'audioReactive'}
            isDeleteMode={isDeleteMode}
            isLoadingPlaylists={isLoadingPlaylists}
            selectedForDelete={selectedForDelete}
            wiggleAnim={wiggleAnim}
            isDark={isDark}
            cardBackground={cardBackground}
            borderColor={borderColor}
            textColor={textColor}
            subtextColor={subtextColor}
            onToggleCollapse={() => setIsPlaylistsCollapsed(!isPlaylistsCollapsed)}
            onPlaylistSelect={onPlaylistSelect}
            onToggleSelection={toggleCardSelection}
          />
        </ScrollView>

        {/* Page 2: Audio Reactive */}
        <ScrollView
          style={[styles.scrollContainer, { width: Dimensions.get('window').width }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <AudioReactiveSection
            isDark={isDark}
            cardBackground={cardBackground}
            borderColor={borderColor}
            textColor={textColor}
            subtextColor={subtextColor}
            onBrightnessChange={onBrightnessChange}
            activeDeviceIp={activeDevice?.ip}
            isDeviceConnected={activeDevice?.isConnected}
            onAudioReactiveChange={setIsAudioReactiveActive}
          />
        </ScrollView>

      </ScrollView>

      {/* Device Selection */}
      <DeviceSelection
        activeDevice={activeDevice}
        activeDeviceId={activeDeviceId}
        devices={devices}
        isDeleteMode={isDeleteMode}
        isTogglingDevice={isTogglingDevice}
        showDeviceDropdown={showDeviceDropdown}
        devicePowerState={wledState.on}
        isDark={isDark}
        cardBackground={cardBackground}
        borderColor={borderColor}
        textColor={textColor}
        subtextColor={subtextColor}
        onDeviceToggle={handleDeviceToggle}
        onSetShowDeviceDropdown={setShowDeviceDropdown}
        onSetActiveDeviceId={onSetActiveDeviceId}
        onOpenDeviceManagement={() => setShowDeviceManagementModal(true)}
      />

      {/* Delete Mode Action Buttons */}
      {isDeleteMode && (
        <View style={deleteModeStyles.deleteActionContainer}>
          <TouchableOpacity
            onPress={exitDeleteMode}
            style={[
              deleteModeStyles.deleteActionButton,
              deleteModeStyles.cancelButton,
              { backgroundColor: isDark ? "#4b5563" : "#f3f4f6" },
            ]}
          >
            <Text
              style={[
                deleteModeStyles.deleteActionText,
                { color: isDark ? "#9ca3af" : "#6b7280" },
              ]}
            >
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteSelected}
            disabled={selectedForDelete.size === 0}
            style={[
              deleteModeStyles.deleteActionButton,
              {
                backgroundColor:
                  selectedForDelete.size === 0 ? "#9ca3af" : "#ef4444",
                opacity: selectedForDelete.size === 0 ? 0.5 : 1,
              },
            ]}
          >
            <Text style={[deleteModeStyles.deleteActionText, { color: "white" }]}>
              Delete ({selectedForDelete.size})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB Overlay - Close when touching outside */}
      {!isDeleteMode && showFabOptions && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={toggleFabOptions}
          style={[fabStyles.fabOverlay, { backgroundColor: "transparent" }]}
        />
      )}

      {/* Floating Action Buttons - Hidden in delete mode */}
      {!isDeleteMode && (
        <View style={fabStyles.fabContainer}>
          {/* Mini FAB 1 - Create New */}
          <Animated.View
            style={[
              fabStyles.miniFab,
              {
                transform: [{ scale: fabScaleAnim1 }],
                bottom: 320,
              },
            ]}
            pointerEvents={showFabOptions && activeDevice?.isConnected ? "auto" : "none"}
          >
            <TouchableOpacity
              onPress={() => {
                if (!activeDevice?.isConnected) return;
                closeFabAndOpenModal(() => setShowCreateNewOptions(true));
              }}
              disabled={!activeDevice?.isConnected}
              style={[
                fabStyles.miniFabButton,
                {
                  backgroundColor: activeDevice?.isConnected ? "#10b981" : "#6b7280",
                  shadowColor: isDark ? "#000" : (activeDevice?.isConnected ? "#10b981" : "#6b7280"),
                  opacity: activeDevice?.isConnected ? 1 : 0.5,
                },
              ]}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>

          {/* Mini FAB 2 - Device Management */}
          <Animated.View
            style={[
              fabStyles.miniFab,
              {
                transform: [{ scale: fabScaleAnim2 }],
                bottom: 200,
              },
            ]}
            pointerEvents={showFabOptions ? "auto" : "none"}
          >
            <TouchableOpacity
              onPress={() => {
                closeFabAndOpenModal(() => setShowDeviceManagementModal(true));
              }}
              style={[
                fabStyles.miniFabButton,
                {
                  backgroundColor: "#f59e0b",
                  shadowColor: isDark ? "#000" : "#f59e0b",
                },
              ]}
            >
              <Ionicons name="hardware-chip-outline" size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>

          {/* Mini FAB 3 - Delete */}
          <Animated.View
            style={[
              fabStyles.miniFab,
              {
                transform: [{ scale: fabScaleAnim3 }],
                bottom: 140,
              },
            ]}
            pointerEvents={showFabOptions && activeDevice?.isConnected ? "auto" : "none"}
          >
            <TouchableOpacity
              onPress={() => {
                if (!activeDevice?.isConnected) return;
                closeFabAndOpenModal(() => enterDeleteMode());
              }}
              disabled={!activeDevice?.isConnected}
              style={[
                fabStyles.miniFabButton,
                {
                  backgroundColor: activeDevice?.isConnected ? "#ef4444" : "#6b7280",
                  shadowColor: isDark ? "#000" : (activeDevice?.isConnected ? "#ef4444" : "#6b7280"),
                  opacity: activeDevice?.isConnected ? 1 : 0.5,
                },
              ]}
            >
              <Ionicons name="trash" size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>

          {/* Mini FAB 4 - Settings */}
          <Animated.View
            style={[
              fabStyles.miniFab,
              {
                transform: [{ scale: fabScaleAnim4 }],
                bottom: 80,
              },
            ]}
            pointerEvents={showFabOptions ? "auto" : "none"}
          >
            <TouchableOpacity
              onPress={() => {
                closeFabAndOpenModal(() => setShowSettings(true));
              }}
              style={[
                fabStyles.miniFabButton,
                {
                  backgroundColor: "#6b7280",
                  shadowColor: isDark ? "#000" : "#6b7280",
                },
              ]}
            >
              <Ionicons name="settings" size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>

          {/* Mini FAB 5 - Scheduler */}
          <Animated.View
            style={[
              fabStyles.miniFab,
              {
                transform: [{ scale: fabScaleAnim5 }],
                bottom: 260,
              },
            ]}
            pointerEvents={showFabOptions && activeDevice?.isConnected ? "auto" : "none"}
          >
            <TouchableOpacity
              onPress={() => {
                if (!activeDevice?.isConnected) return;
                closeFabAndOpenModal(() => setShowSchedulerModal(true));
              }}
              disabled={!activeDevice?.isConnected}
              style={[
                fabStyles.miniFabButton,
                {
                  backgroundColor: activeDevice?.isConnected ? "#8b5cf6" : "#6b7280",
                  shadowColor: isDark ? "#000" : (activeDevice?.isConnected ? "#8b5cf6" : "#6b7280"),
                  opacity: activeDevice?.isConnected ? 1 : 0.5,
                },
              ]}
            >
              <Ionicons name="time-outline" size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>

          {/* Main FAB */}
          <Animated.View
            style={[
              fabStyles.floatingButton,
              {
                transform: [
                  {
                    rotate: fabRotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "45deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              onPress={toggleFabOptions}
              disabled={false}
              activeOpacity={0.8}
              style={[
                fabStyles.mainFabButton,
                {
                  backgroundColor: "#3b82f6",
                  shadowColor: isDark ? "#000" : "#3b82f6",
                  opacity: 1,
                },
              ]}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="white" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Create New Options Modal */}
      <Modal
        visible={showCreateNewOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateNewOptions(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowCreateNewOptions(false)}
          style={fabStyles.fabOverlay}
        >
          <View
            style={[
              fabStyles.fabOptionsContainer,
              { backgroundColor: cardBackground },
            ]}
          >
            <Text style={[fabStyles.fabTitle, { color: textColor }]}>
              Create New
            </Text>

            <TouchableOpacity
              onPress={() => {
                setShowCreateNewOptions(false);
                closeFabAndOpenModal(() => setShowCustomEffectsModal(true));
              }}
              style={fabStyles.fabOption}
            >
              <Ionicons name="color-palette" size={20} color={textColor} />
              <Text style={[fabStyles.fabOptionText, { color: textColor }]}>
                Custom Effect
              </Text>
            </TouchableOpacity>

            {memoizedCustomEffects.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setShowCreateNewOptions(false);
                  closeFabAndOpenModal(() =>
                    setShowPlaylistCreationModal(true)
                  );
                }}
                style={fabStyles.fabOption}
              >
                <Ionicons name="play" size={20} color={textColor} />
                <Text style={[fabStyles.fabOptionText, { color: textColor }]}>
                  Playlist
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom Effects Modal */}
      <CustomEffectsModal
        visible={showCustomEffectsModal}
        isDark={isDark}
        onClose={() => setShowCustomEffectsModal(false)}
        selectedDevices={activeDevice ? [activeDevice] : []}
        liveLedData={liveLedData}
        liveViewEnabled={liveViewEnabled}
        onLiveViewToggle={onLiveViewToggle}
        onRefreshPresets={onRefreshPresets}
      />

      {/* Playlist Creation Modal */}
      <PlaylistCreationModal
        visible={showPlaylistCreationModal}
        isDark={isDark}
        onClose={() => setShowPlaylistCreationModal(false)}
        customEffects={customEffects}
        onSavePlaylist={(playlist) => {
          if (onSavePlaylist) {
            onSavePlaylist(playlist);
          }
        }}
        onRefreshPresets={onRefreshPresets}
        device={
          activeDevice || {
            id: 0,
            ip: "",
            name: "Unknown Device",
            protocol: "http",
            isConnected: false,
            isPlaying: false,
            autoBrightness: false,
            maxBrightness: 255,
          }
        }
        savedPlaylists={savedPlaylists}
      />

      {/* Device Management Modal */}
      <DeviceManagementModal
        isVisible={showDeviceManagementModal}
        onClose={() => setShowDeviceManagementModal(false)}
        isDark={isDark}
        devices={devices}
        onDeviceRemove={onDeviceRemove}
        onAddDevice={onAddDevice}
        onScanForDevices={onScanForDevices}
      />

      {/* Scheduler Modal */}
      <SchedulerModal
        visible={showSchedulerModal}
        onClose={() => setShowSchedulerModal(false)}
        isDark={isDark}
        activeDevice={activeDevice}
        configuredSchedule={configuredSchedule}
        setConfiguredSchedule={setConfiguredSchedule}
        schedulerEnabled={schedulerEnabled}
        setSchedulerEnabled={setSchedulerEnabled}
      />

      {/* Deletion Progress Modal */}
      {isDeletionInProgress && (
        <View style={deleteModeStyles.deletionProgressOverlay}>
          <View
            style={[
              deleteModeStyles.deletionProgressModal,
              { backgroundColor: cardBackground },
            ]}
          >
            <Text style={[deleteModeStyles.deletionProgressTitle, { color: textColor }]}>
              Deleting Items...
            </Text>
            <Text
              style={[deleteModeStyles.deletionProgressText, { color: subtextColor }]}
            >
              {deletionProgress.current} of {deletionProgress.total}
            </Text>
            {deletionProgress.currentItem && (
              <Text
                style={[deleteModeStyles.deletionProgressItem, { color: subtextColor }]}
                numberOfLines={1}
              >
                {deletionProgress.currentItem}
              </Text>
            )}
            <View
              style={[
                deleteModeStyles.progressBar,
                { backgroundColor: isDark ? "#374151" : "#f3f4f6" },
              ]}
            >
              <View
                style={[
                  deleteModeStyles.progressBarFill,
                  {
                    width: `${
                      (deletionProgress.current / deletionProgress.total) * 100
                    }%`,
                    backgroundColor: "#3b82f6",
                  },
                ]}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// Layout styles - simple container styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyHeader: {
    zIndex: 10,
    elevation: 4,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pageIndicatorContainer: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    zIndex: 5,
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  pageIndicatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  pageIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pageIndicatorDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pageIndicatorLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  horizontalScrollView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0, // Remove top padding since sticky header has it
    paddingBottom: 100,
  },
});
