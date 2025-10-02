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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { logger } from "../utils/logger";
import { SeasonalPreset } from "../types";
import {
  Device as WledDevice,
  CustomEffect,
  SavedPlaylist,
  LEDColor,
} from "../types";
import { storage, STORAGE_KEYS } from "../utils/storage";
import {
  deleteWledPreset,
  deleteWledPlaylistViaWebSocket,
  createWledPreset,
  turnWledOn,
  turnWledOff,
  getWledBrightnessFromWin,
  setWledBrightness,
  fetchWledTimerSettings,
  generatePresetGradient,
} from "../config/wledApi";
import CustomEffectsModal from "./CustomEffectsModal";
import SchedulerModal from "./SchedulerModal";
import PlaylistCreationModal from "./PlaylistCreationModal";
import DeviceManagementModal from "./DeviceManagementModal";
import LEDVisualization from "./LEDVisualization";
import { WLEDEffectData, getEffectByName } from "../data/wledEffects";

// Animated playlist item component
interface AnimatedPlaylistItemProps {
  playlist: SavedPlaylist;
  index: number;
  onPress: (id: number) => void;
  isDeleteMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string | number) => void;
  wiggleAnim?: Animated.Value;
}

const AnimatedPlaylistItem = React.memo(
  function AnimatedPlaylistItem({
    playlist,
    index,
    onPress,
    isDeleteMode = false,
    isSelected = false,
    onToggleSelection,
    wiggleAnim,
  }: AnimatedPlaylistItemProps) {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    // Animate in when playlist appears
    useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        delay: index * 50, // Staggered animation
        useNativeDriver: true,
      }).start();
    }, [scaleAnim, index]);

    const handlePress = useCallback(() => {
      if (isDeleteMode && onToggleSelection) {
        onToggleSelection(playlist.id);
      } else if (!isDeleteMode) {
        onPress(playlist.id);
      }
    }, [playlist.id, onPress, isDeleteMode, onToggleSelection]);

    // Use LinearGradient colors for playlists if available
    const shouldUseGradient = playlist.gradient;
    const gradientColors = playlist.gradient ? parseGradientString(playlist.gradient).colors : null;

    // Ensure gradient colors are valid before using LinearGradient
    const hasValidGradient =
      gradientColors &&
      Array.isArray(gradientColors) &&
      gradientColors.length >= 2 &&
      gradientColors.every(
        (color: string) => typeof color === "string" && color.length > 0
      );

    const cardStyle = useMemo(
      () => [
        styles.playlistCard,
        shouldUseGradient && hasValidGradient
          ? { padding: 0 }
          : {
              backgroundColor: playlist.gradient
                ? extractPrimaryColor(playlist.gradient)
                : "#8b5cf6",
            },
        playlist.isActive &&
          !isDeleteMode && {
            borderWidth: 2,
            borderColor: "#3b82f6",
            borderRadius: 8,
          },
        isSelected && {
          borderWidth: 3,
          borderColor: "#ef4444",
          borderRadius: 8,
        },
      ],
      [
        playlist.isActive,
        isDeleteMode,
        isSelected,
        shouldUseGradient,
        hasValidGradient,
        playlist.gradient,
      ]
    );

    return (
      <Animated.View
        style={[
          styles.playlistItem,
          {
            transform: [
              { scale: scaleAnim },
              ...(isDeleteMode && wiggleAnim
                ? [
                    {
                      rotate: wiggleAnim.interpolate({
                        inputRange: [-1, 1],
                        outputRange: ["-2deg", "2deg"],
                      }),
                    },
                  ]
                : []),
            ],
          },
        ]}
      >
        <TouchableOpacity onPress={handlePress} style={styles.touchableArea}>
          <View style={cardStyle}>
            {shouldUseGradient && hasValidGradient && (
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBackground}
              />
            )}
            <View
              style={
                shouldUseGradient && hasValidGradient
                  ? styles.gradientContent
                  : styles.cardContent
              }
            >
              <Text style={styles.playlistName}>{playlist.name}</Text>
              <Text style={styles.playlistId}>ID: {playlist.id}</Text>
              <Text style={styles.playlistCount}>
                {playlist.items?.length || 0} effects
              </Text>
            </View>
            {playlist.isActive && !isDeleteMode && (
              <View style={styles.activeIndicator}>
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              </View>
            )}
            {isDeleteMode && (
              <View style={styles.deleteOverlay}>
                <View style={styles.deleteXButton}>
                  <Ionicons name="close" size={16} color="#ffffff" />
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.playlist.id === nextProps.playlist.id &&
      prevProps.playlist.name === nextProps.playlist.name &&
      prevProps.playlist.isActive === nextProps.playlist.isActive &&
      prevProps.playlist.items?.length === nextProps.playlist.items?.length &&
      prevProps.index === nextProps.index &&
      prevProps.isDeleteMode === nextProps.isDeleteMode &&
      prevProps.isSelected === nextProps.isSelected
    );
  }
);

// Helper function to extract primary color from gradient string - pure function for reusability
const extractPrimaryColor = (gradient: string): string => {
  if (!gradient || typeof gradient !== "string") {
    return "#6366f1"; // fallback color
  }

  // Extract first RGB/hex color from gradient string
  const colorMatch = gradient.match(
    /(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\(\d+,\s*\d+,\s*\d+\))/
  );
  return colorMatch ? colorMatch[0] : "#6366f1";
};

// Helper function to get seasonal gradient based on preset name
const getSeasonalGradient = (presetName: string): string => {
  const name = presetName.toLowerCase();

  if (
    name.includes("halloween") ||
    name.includes("fall") ||
    name.includes("autumn")
  ) {
    return "linear-gradient(135deg, #ff6600, #ff9933)";
  }
  if (name.includes("canada")) {
    return "linear-gradient(135deg, #ff0000, #ff4444)";
  }
  if (name.includes("christmas") || name.includes("holiday")) {
    return "linear-gradient(135deg, #228B22, #32CD32)";
  }
  if (name.includes("valentine")) {
    return "linear-gradient(135deg, #ff1493, #ff69b4)";
  }
  if (name.includes("easter") || name.includes("spring")) {
    return "linear-gradient(135deg, #98fb98, #ffb6c1)";
  }
  if (name.includes("july") || name.includes("independence")) {
    return "linear-gradient(135deg, #0066cc, #ff0000)";
  }

  // Default gradient
  return "linear-gradient(135deg, #6366f1, #8b5cf6)";
};

// Helper function to parse gradient string and extract colors for LinearGradient - pure function
const parseGradientString = (
  gradientString: string
): { colors: string[]; locations?: number[] } => {
  if (!gradientString || typeof gradientString !== "string") {
    return { colors: ["#6366f1", "#8b5cf6"] }; // default gradient
  }

  // Extract colors from gradient string like "linear-gradient(135deg, rgb(255, 170, 0), rgb(255, 0, 0), rgb(0, 255, 0))"
  const colorMatches = gradientString.match(
    /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g
  );

  if (colorMatches && colorMatches.length > 0) {
    // Ensure at least 2 colors for LinearGradient
    if (colorMatches.length === 1) {
      return { colors: [colorMatches[0], colorMatches[0]] };
    }
    return { colors: colorMatches };
  }

  // Fallback: try to extract hex colors
  const hexMatches = gradientString.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g);
  if (hexMatches && hexMatches.length > 0) {
    // Ensure at least 2 colors for LinearGradient
    if (hexMatches.length === 1) {
      return { colors: [hexMatches[0], hexMatches[0]] };
    }
    return { colors: hexMatches };
  }

  // Final fallback
  return { colors: ["#6366f1", "#8b5cf6"] };
};

interface PresetCardProps {
  preset: any;
  animationDelay?: number;
  isActive: boolean;
  onClick: (id: string | number) => void;
  showIcon?: boolean;
  isDark?: boolean;
  isDeleteMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string | number) => void;
  wiggleAnim?: Animated.Value;
}

const PresetCard = React.memo(
  function PresetCard({
    preset,
    animationDelay = 0,
    isActive,
    onClick,
    showIcon = false,
    isDark = false,
    isDeleteMode = false,
    isSelected = false,
    onToggleSelection,
    wiggleAnim,
  }: PresetCardProps) {
    // Simplified animation values - only native driver animations
    const scaleAnim = useRef(new Animated.Value(0)).current;

    // Track if animation has been started to prevent re-animating
    const hasAnimated = useRef(false);

    // Entrance animation - only run once
    useEffect(() => {
      if (!hasAnimated.current) {
        hasAnimated.current = true;
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          delay: animationDelay || Math.random() * 200, // Staggered animation
          useNativeDriver: true,
        }).start();
      }
    }, [scaleAnim, animationDelay]);

    // Memoize gradient calculations to prevent expensive re-computations
    const { shouldUseGradient, gradientColors, hasValidGradient } =
      useMemo(() => {
        const shouldUse = preset.isWledPreset && preset.gradient;
        const colors = preset.gradient ? parseGradientString(preset.gradient).colors : null;

        const hasValid =
          colors &&
          Array.isArray(colors) &&
          colors.length >= 2 &&
          colors.every(
            (color) => typeof color === "string" && color.length > 0
          );

        return {
          shouldUseGradient: shouldUse,
          gradientColors: colors,
          hasValidGradient: hasValid,
        };
      }, [preset.isWledPreset, preset.gradient]);

    const handleCardPress = useCallback(() => {
      if (isDeleteMode && onToggleSelection) {
        onToggleSelection(preset.id);
      } else if (!isDeleteMode) {
        onClick(preset.id);
      }
    }, [preset.id, onClick, isDeleteMode, onToggleSelection]);

    const animatedTransformStyle = useMemo(
      () => ({
        transform: [
          { scale: scaleAnim },
          ...(isDeleteMode && wiggleAnim
            ? [
                {
                  rotate: wiggleAnim.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ["-2deg", "2deg"],
                  }),
                },
              ]
            : []),
        ],
      }),
      [scaleAnim, isDeleteMode, wiggleAnim]
    );

    const cardItemStyle = useMemo(
      () => ({
        flexBasis: '22%',
        maxWidth: '22%',
        marginHorizontal: '1.5%',
        marginVertical: 6,
      }),
      []
    );

    const cardViewStyle = useMemo(
      () => [
        styles.presetCard,
        shouldUseGradient && hasValidGradient
          ? { padding: 0 }
          : {
              backgroundColor: preset.gradient
                ? extractPrimaryColor(preset.gradient)
                : "#6366f1",
            },
        isActive &&
          !isDeleteMode && {
            borderWidth: 2,
            borderColor: "#3b82f6",
            borderRadius: 8,
          },
        isSelected && {
          borderWidth: 3,
          borderColor: "#ef4444",
          borderRadius: 8,
        },
      ],
      [
        shouldUseGradient,
        hasValidGradient,
        preset.gradient,
        isActive,
        isDeleteMode,
        isSelected,
      ]
    );

    // Use unified structure for all preset cards (with gradient support)
    return (
      <Animated.View style={[animatedTransformStyle, cardItemStyle]}>
        <TouchableOpacity
          onPress={handleCardPress}
          style={styles.touchableArea}
        >
          <View style={cardViewStyle}>
            {shouldUseGradient && hasValidGradient && (
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBackground}
              />
            )}
            <View
              style={
                shouldUseGradient && hasValidGradient
                  ? styles.gradientContent
                  : styles.cardContent
              }
            >
              {showIcon && <Text style={styles.cardIcon}>{preset.icon}</Text>}
              <Text style={styles.cardTitle}>{preset.name}</Text>
              <Text style={styles.cardPresetId}>
                ID: {preset.presetId || preset.id}
              </Text>
              {preset.effectName && (
                <Text style={styles.cardSubtitle}>{preset.effectName}</Text>
              )}
            </View>
            {isActive && !isDeleteMode && (
              <View style={styles.activeIndicator}>
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              </View>
            )}
            {isDeleteMode && (
              <View style={styles.deleteOverlay}>
                <View style={styles.deleteXButton}>
                  <Ionicons name="close" size={16} color="#ffffff" />
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.preset.id === nextProps.preset.id &&
      prevProps.preset.name === nextProps.preset.name &&
      prevProps.preset.presetId === nextProps.preset.presetId &&
      prevProps.preset.effectName === nextProps.preset.effectName &&
      prevProps.animationDelay === nextProps.animationDelay &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.isDeleteMode === nextProps.isDeleteMode &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.showIcon === nextProps.showIcon &&
      prevProps.isDark === nextProps.isDark
    );
  }
);

// Memoized wrapper for PresetCard to prevent unnecessary re-renders
const MemoizedPresetCard = React.memo(
  function MemoizedPresetCard({
    preset,
    index,
    activePreset,
    onPresetSelect,
    isDark,
    isDeleteMode,
    isSelected,
    onToggleSelection,
    wiggleAnim,
    showIcon = false,
  }: {
    preset: any;
    index: number;
    activePreset: string | number | null;
    onPresetSelect: (id: string | number) => void;
    isDark: boolean;
    isDeleteMode: boolean;
    isSelected: boolean;
    onToggleSelection: (id: string | number) => void;
    wiggleAnim?: Animated.Value;
    showIcon?: boolean;
  }) {
    const isActive = useMemo(
      () => activePreset?.toString() === preset.id.toString(),
      [activePreset, preset.id]
    );

    const handleClick = useCallback(() => {
      onPresetSelect(preset.id);
    }, [onPresetSelect, preset.id]);

    return (
      <PresetCard
        preset={preset}
        animationDelay={index * 50}
        isActive={isActive}
        onClick={handleClick}
        showIcon={showIcon}
        isDark={isDark}
        isDeleteMode={isDeleteMode}
        isSelected={isSelected}
        onToggleSelection={onToggleSelection}
        wiggleAnim={wiggleAnim}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.preset.id === nextProps.preset.id &&
      prevProps.preset.name === nextProps.preset.name &&
      prevProps.preset.presetId === nextProps.preset.presetId &&
      prevProps.preset.effectName === nextProps.preset.effectName &&
      prevProps.index === nextProps.index &&
      prevProps.activePreset === nextProps.activePreset &&
      prevProps.isDark === nextProps.isDark &&
      prevProps.isDeleteMode === nextProps.isDeleteMode &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.showIcon === nextProps.showIcon
    );
  }
);

// Seasonal preset wrapper
const MemoizedSeasonalPresetCard = React.memo(
  function MemoizedSeasonalPresetCard({
    preset,
    index,
    activePreset,
    onPresetSelect,
    isDark,
  }: {
    preset: any;
    index: number;
    activePreset: string | number | null;
    onPresetSelect: (id: string | number) => void;
    isDark: boolean;
  }) {
    const presetObj = useMemo(
      () => ({
        id: preset.presetId,
        name: preset.name,
        icon: preset.icon,
        gradient: getSeasonalGradient(preset.name),
      }),
      [preset.presetId, preset.name, preset.icon]
    );

    const isActive = useMemo(
      () => activePreset?.toString() === preset.presetId.toString(),
      [activePreset, preset.presetId]
    );

    const handleClick = useCallback(() => {
      onPresetSelect(preset.presetId);
    }, [onPresetSelect, preset.presetId]);

    return (
      <PresetCard
        preset={presetObj}
        animationDelay={index * 50}
        isActive={isActive}
        onClick={handleClick}
        showIcon={true}
        isDark={isDark}
        isDeleteMode={false}
        isSelected={false}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.preset.presetId === nextProps.preset.presetId &&
      prevProps.preset.name === nextProps.preset.name &&
      prevProps.preset.icon === nextProps.preset.icon &&
      prevProps.index === nextProps.index &&
      prevProps.activePreset === nextProps.activePreset &&
      prevProps.isDark === nextProps.isDark
    );
  }
);

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
  // Simple brightness state
  const [sliderBrightness, setSliderBrightness] = useState<number>(
    activeDevice?.wledInfo?.bri || 0
  );

  // Function to fetch brightness from device
  const fetchDeviceBrightness = useCallback(async () => {
    if (!activeDevice?.ip || !activeDevice?.isConnected) return;

    try {
      const result = await getWledBrightnessFromWin(
        activeDevice.ip,
        activeDevice.protocol || "http"
      );
      if (result.success && result.brightness !== undefined) {
        setSliderBrightness(result.brightness);
        logger.log(`💡 Fetched brightness from device: ${result.brightness}`);
      }
    } catch (error) {
      logger.error("Failed to fetch device brightness:", error);
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
  const fadeAnim = useRef(new Animated.Value(liveViewEnabled ? 1 : 1)).current;
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

  // Update slider when device changes or fetch brightness on device switch
  useEffect(() => {
    if (activeDevice?.wledInfo?.bri !== undefined) {
      setSliderBrightness(Math.round(activeDevice.wledInfo.bri));
    } else if (activeDevice?.isConnected) {
      // If no brightness info in wledInfo, fetch it from device
      fetchDeviceBrightness();
    }
  }, [
    activeDevice?.id,
    activeDevice?.wledInfo?.bri,
    activeDevice?.isConnected,
    fetchDeviceBrightness,
  ]);

  const activePresetData = [...seasonalPresets, ...memoizedCustomEffects].find(
    (p) => p.presetId?.toString() === activePreset?.toString()
  );

  const handleLiveViewToggle = () => {
    const newValue = !liveViewEnabled;

    // Animate the content transition
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
      if (onLiveViewToggle) {
        onLiveViewToggle(newValue);
      }

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
        const result = turnOn
          ? await turnWledOn(activeDevice.ip)
          : await turnWledOff(activeDevice.ip);

        if (!result.success) {
          Alert.alert(
            "Error",
            `Failed to ${turnOn ? "turn on" : "turn off"} device: ${
              result.message
            }`
          );
        }
      } catch (error) {
        Alert.alert(
          "Error",
          `Failed to ${turnOn ? "turn on" : "turn off"} device`
        );
      } finally {
        setIsTogglingDevice(false);
        // Refresh device state after toggle
        if (onRefreshPresets) {
          onRefreshPresets();
        }
      }
    },
    [activeDevice?.ip, isTogglingDevice, onRefreshPresets]
  );

  const handleRefresh = useCallback(async () => {
    if (!onRefreshPresets || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefreshPresets();
      // Also fetch current brightness from device after refresh
      await fetchDeviceBrightness();
    } catch (error) {
      logger.error("Failed to refresh presets:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    onRefreshPresets,
    isRefreshing,
    fetchDeviceBrightness,
  ]);

  // Animation coordination (non-blocking)
  const fabAnimationInProgress = useRef(false);

  // Improved animation system with proper sequencing
  const animateFabOpen = useCallback(() => {
    // if (fabAnimationInProgress.current) return;
    // fabAnimationInProgress.current = true;
    console.log("animateFabOpen called");

    // Ensure animations start from 0 (closed state)
    fabRotateAnim.setValue(0);
    fabScaleAnim1.setValue(0);
    fabScaleAnim2.setValue(0);
    fabScaleAnim3.setValue(0);
    fabScaleAnim4.setValue(0);
    fabScaleAnim5.setValue(0);

    console.log("Animation values reset to 0, starting animations...");

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
    ]).start(() => {
      // fabAnimationInProgress.current = false;
      console.log("animateFabOpen completed");
    });
  }, [
    fabRotateAnim,
    fabScaleAnim1,
    fabScaleAnim2,
    fabScaleAnim3,
    fabScaleAnim4,
    fabScaleAnim5,
  ]);

  const animateFabClose = useCallback(() => {
    // if (fabAnimationInProgress.current) return;
    // fabAnimationInProgress.current = true;
    console.log("animateFabClose called");

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
      // fabAnimationInProgress.current = false;
      setShowFabOptions(false);
      console.log("animateFabClose completed");
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
    console.log(
      "🔵 FAB toggle called, current showFabOptions:",
      showFabOptions
    );
    console.log("🔵 Function entering with showFabOptions:", showFabOptions);

    if (showFabOptions) {
      console.log("🔴 Closing FAB - setting state to false");
      setShowFabOptions(false);
      console.log("🔴 Reset animations to closed state");
      // Reset animations to closed state
      fabRotateAnim.setValue(0);
      fabScaleAnim1.setValue(0);
      fabScaleAnim2.setValue(0);
      fabScaleAnim3.setValue(0);
      fabScaleAnim4.setValue(0);
      fabScaleAnim5.setValue(0);
      console.log("🔴 FAB close complete");
    } else {
      console.log("🟢 Opening FAB - setting state to true");
      setShowFabOptions(true);
      console.log("🟢 Setting animations to open state (no animation)");
      // Set animations to open state immediately
      fabRotateAnim.setValue(1);
      fabScaleAnim1.setValue(1);
      fabScaleAnim2.setValue(1);
      fabScaleAnim3.setValue(1);
      fabScaleAnim4.setValue(1);
      fabScaleAnim5.setValue(1);
      console.log("🟢 FAB open complete");
    }
  }, [
    showFabOptions,
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
        console.log("Animation progress flag stuck, resetting...");
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
                console.log(
                  `🗑️ Deleting effect "${item.name}" (preset ID: ${effect.presetId})`
                );
                const result = await deleteWledPreset(
                  activeDevice.ip,
                  effect.presetId,
                  activeDevice.protocol || "http"
                );

                if (result.success) {
                  onRemoveCustomEffect(item.id as number);
                  results.success.push(item.name);
                  console.log(`✅ Successfully deleted effect "${item.name}"`);
                } else {
                  results.failed.push(
                    `${item.name}: ${result.message || "Unknown error"}`
                  );
                  console.error(
                    `❌ Failed to delete effect "${item.name}":`,
                    result.message
                  );
                }
              } else {
                // Local effect only, remove from local state
                onRemoveCustomEffect(item.id as number);
                results.success.push(item.name);
              }
            } else if (item.type === "playlist") {
              const playlist = savedPlaylists.find((p) => p.id === item.id);
              if (playlist?.id) {
                console.log(`🗑️ Deleting playlist "${item.name}":`);
                console.log(`   - Playlist ID: ${playlist.id}`);
                console.log(`   - Preset ID: ${playlist.presetId}`);
                console.log(
                  `   - Is WLED Playlist: ${playlist.isWledPlaylist}`
                );
                console.log(`   - Active Device IP: ${activeDevice?.ip}`);
                console.log(`   - Protocol: ${activeDevice?.protocol}`);

                let deletionResult = null;

                // Try WebSocket deletion first for WLED playlists
                if (playlist.isWledPlaylist) {
                  try {
                    // Use presetId if available, otherwise use id
                    const idToDelete = playlist.presetId || playlist.id;
                    console.log(`   - Using ID for deletion: ${idToDelete}`);

                    deletionResult = await deleteWledPlaylistViaWebSocket(
                      idToDelete as number,
                      activeDevice?.ip,
                      activeDevice?.protocol || "http"
                    );
                  } catch (error) {
                    console.error(
                      `⚠️ Error during playlist deletion for "${item.name}":`,
                      error
                    );
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
                  results.success.push(item.name);
                  console.log(
                    `✅ Successfully deleted playlist "${item.name}"`
                  );

                  // Refresh presets to ensure UI is in sync with device
                  if (onRefreshPresets) {
                    try {
                      await onRefreshPresets();
                      console.log(
                        `🔄 Refreshed presets after deleting playlist "${item.name}"`
                      );
                    } catch (refreshError) {
                      console.warn(
                        `⚠️ Failed to refresh presets after deleting playlist "${item.name}":`,
                        refreshError
                      );
                    }
                  }
                } else {
                  results.failed.push(
                    `${item.name}: ${
                      deletionResult?.message || "Unknown error"
                    }`
                  );
                  console.error(
                    `❌ Failed to delete playlist "${item.name}":`,
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
            console.error(
              `💥 Unexpected error deleting "${item.name}":`,
              error
            );
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
      console.log("🎲 Generating random custom effect...");

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

      console.log(`🎲 Device dimensions: ${deviceDimensions}`);
      console.log(`🎲 Available effects: ${deviceEffects.length}`);
      console.log(`🎲 Available palettes: ${devicePalettes.length}`);

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
      console.log(
        `🎲 Selected random effect: "${randomEffect.name}" (ID: ${randomEffect.id})`
      );

      // Select random palette if effect supports palettes
      let randomPalette = null;
      let presetName = randomEffect.name;

      if (randomEffect.supportsPalette && devicePalettes.length > 0) {
        const randomPaletteIndex = Math.floor(
          Math.random() * devicePalettes.length
        );
        randomPalette = {
          id: randomPaletteIndex,
          name: devicePalettes[randomPaletteIndex],
        };
        presetName = `${randomEffect.name}+${randomPalette.name}`;
        console.log(
          `🎲 Selected random palette: "${randomPalette.name}" (ID: ${randomPalette.id})`
        );
      }

      console.log(`🎲 Generated preset name: "${presetName}"`);

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
        console.log(
          `🎲 Successfully created random custom effect with preset ID: ${result.presetId}`
        );

        const gradientData = generatePresetGradient(
          randomPalette?.name
        );

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
          gradient: `linear-gradient(135deg, ${gradientData.colors.join(
            ", "
          )})`,
          isCustom: false,
        };

        onAddCustomEffect(newCustomEffect);

        // Apply the effect immediately
        onPresetSelect(result.presetId);

        // Directly update device active preset to ensure UI shows it as active
        if (onDeviceUpdate && activeDevice?.id) {
          onDeviceUpdate(activeDevice.id, { activePreset: result.presetId });
        }

        // Note: Not calling onRefreshPresets() here to avoid overwriting our custom gradient

        console.log(
          `🎲 Random effect created: "${presetName}" with effect "${
            randomEffect.name
          }"${randomPalette ? ` and palette "${randomPalette.name}"` : ""}.`
        );
      } else {
        throw new Error(result.message || "Failed to create preset");
      }
    } catch (error) {
      console.error("🎲 Error generating random custom effect:", error);
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
      <ScrollView
        style={styles.scrollContainer}
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
        {/* Live View Section */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBackground, borderColor },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="play" size={20} color={textColor} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Live View
              </Text>
            </View>

            {/* Toggle Switch */}
            <TouchableOpacity
              onPress={handleLiveViewToggle}
              style={[
                styles.toggleSwitch,
                { backgroundColor: liveViewEnabled ? "#3b82f6" : borderColor },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: "#ffffff",
                    marginLeft: liveViewEnabled ? 22 : 2,
                  },
                ]}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionContent}>
            <View
              style={[
                styles.innerCard,
                {
                  backgroundColor: isDark ? "#374151" : "#f9fafb",
                  borderColor: isDark ? "#4b5563" : "#e5e7eb",
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.cardContent,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                {activePresetData && (
                  <Text style={[styles.activePresetText, { color: textColor }]}>
                    Active: {activePresetData.name}
                  </Text>
                )}

                {/* Live LED Data */}
                {liveViewEnabled && !activeDevice?.isConnected && (
                  <View style={styles.disabledContainer}>
                    <Text style={[styles.disabledText, { color: "#ef4444" }]}>
                      Device offline - Connect to view LED data
                    </Text>
                  </View>
                )}
                {liveViewEnabled &&
                  activeDevice?.isConnected &&
                  liveLedData.length > 0 && (
                    <LEDVisualization
                      ledData={liveLedData}
                      subtextColor={subtextColor}
                      liveViewLedSize={liveViewLedSize}
                      showLedCount={true}
                      wledInfo={activeDevice?.wledInfo}
                    />
                  )}

                {!liveViewEnabled && (
                  <View style={styles.disabledContainer}>
                    {!activeDevice?.isConnected ? (
                      <Text style={[styles.disabledText, { color: "#ef4444" }]}>
                        Device offline - Connect to view LED data
                      </Text>
                    ) : (
                      <Text
                        style={[styles.disabledText, { color: subtextColor }]}
                      >
                        Live view disabled
                      </Text>
                    )}
                    {(() => {
                      // Don't show LED count if device is offline
                      if (!activeDevice?.isConnected) {
                        return null;
                      }

                      // Check for LED count in WLED device info
                      const ledCount = activeDevice?.wledInfo?.leds?.count;

                      if (ledCount) {
                        return (
                          <View>
                            <Text
                              style={[
                                styles.ledCount,
                                { color: subtextColor, marginTop: 4 },
                              ]}
                            >
                              {ledCount} LED{ledCount !== 1 ? "s" : ""}{" "}
                              available
                            </Text>
                            {activeDevice?.wledInfo?.leds?.rgbw && (
                              <Text
                                style={[
                                  styles.ledCount,
                                  {
                                    color: subtextColor,
                                    fontSize: 10,
                                    marginTop: 2,
                                  },
                                ]}
                              >
                                RGBW LEDs supported
                              </Text>
                            )}
                          </View>
                        );
                      } else if (activeDevice?.isConnected) {
                        return (
                          <Text
                            style={[
                              styles.ledCount,
                              {
                                color: subtextColor,
                                marginTop: 4,
                                fontSize: 12,
                              },
                            ]}
                          >
                            Device connected - LED count not available
                          </Text>
                        );
                      } else {
                        return (
                          <Text
                            style={[
                              styles.ledCount,
                              {
                                color: subtextColor,
                                marginTop: 4,
                                fontSize: 12,
                              },
                            ]}
                          >
                            Device offline
                          </Text>
                        );
                      }
                    })()}
                  </View>
                )}
              </Animated.View>

              {/* Brightness Slider - Always visible when device is connected */}
              {activeDevice?.isConnected && (
                <View style={styles.sliderContainer}>
                  <Ionicons
                    name="sunny-outline"
                    size={20}
                    color={subtextColor}
                  />
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    step={1}
                    value={sliderBrightness}
                    onValueChange={(value) => {
                      setSliderBrightness(Math.round(value));
                    }}
                    onSlidingComplete={async (value) => {
                      const finalValue = Math.round(value);

                      // Use direct API call for setting brightness
                      if (activeDevice?.ip) {
                        try {
                          const result = await setWledBrightness(
                            activeDevice.ip,
                            finalValue,
                            activeDevice.protocol || "http"
                          );
                          if (result.success) {
                            logger.log(`💡 Brightness set to ${finalValue}`);
                          } else {
                            logger.error(
                              "Failed to set brightness:",
                              result.message
                            );
                            // Revert slider to previous value on failure
                            setSliderBrightness(
                              activeDevice?.wledInfo?.bri || 0
                            );
                          }
                        } catch (error) {
                          logger.error("Error setting brightness:", error);
                          // Revert slider to previous value on error
                          setSliderBrightness(activeDevice?.wledInfo?.bri || 0);
                        }
                      }

                      // Also call the original callback if provided
                      onBrightnessChange?.(finalValue);
                    }}
                    minimumTrackTintColor="#3b82f6"
                    maximumTrackTintColor={isDark ? "#4b5563" : "#e5e7eb"}
                    thumbTintColor={isDark ? "#ffffff" : "#3b82f6"}
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Seasonal Presets */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBackground, borderColor },
          ]}
        >
          <TouchableOpacity
            onPress={() => setIsSeasonalCollapsed(!isSeasonalCollapsed)}
            style={styles.sectionHeader}
          >
            <View style={styles.headerLeft}>
              <Ionicons name="calendar" size={20} color={textColor} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Seasonal Presets
              </Text>
            </View>
            <Ionicons
              name={isSeasonalCollapsed ? "chevron-down" : "chevron-up"}
              size={20}
              color={subtextColor}
            />
          </TouchableOpacity>

          {!isSeasonalCollapsed && (
            <View style={styles.sectionContent}>
              <View style={styles.presetGrid}>
                {seasonalPresets.map((preset, index) => (
                  <MemoizedSeasonalPresetCard
                    key={`seasonal-${preset.id}-${index}`}
                    preset={preset}
                    index={index}
                    activePreset={activePreset}
                    onPresetSelect={onPresetSelect}
                    isDark={isDark}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Custom Effects */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBackground, borderColor },
          ]}
        >
          <TouchableOpacity
            onPress={() =>
              setIsCustomEffectsCollapsed(!isCustomEffectsCollapsed)
            }
            style={styles.sectionHeader}
          >
            <View style={styles.headerLeft}>
              <Ionicons name="color-palette" size={20} color={textColor} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Custom Effects ({memoizedCustomEffects.length})
              </Text>
            </View>
            <Ionicons
              name={isCustomEffectsCollapsed ? "chevron-down" : "chevron-up"}
              size={20}
              color={subtextColor}
            />
          </TouchableOpacity>

          {!isCustomEffectsCollapsed && (
            <View style={styles.sectionContent}>
              {/* Random Custom Effect Button */}
              {activeDevice?.isConnected && (
                <View
                  style={[styles.randomEffectContainer, { marginBottom: 16 }]}
                >
                  <TouchableOpacity
                    onPress={
                      isCooldownActive ? undefined : generateRandomCustomEffect
                    }
                    disabled={isCooldownActive}
                    style={[
                      styles.randomEffectButton,
                      {
                        backgroundColor: isCooldownActive
                          ? isDark
                            ? "#4b5563"
                            : "#e5e7eb"
                          : isDark
                          ? "#374151"
                          : "#f3f4f6",
                        borderColor: isDark ? "#6b7280" : "#d1d5db",
                        opacity: isCooldownActive ? 0.6 : 1,
                      },
                    ]}
                  >
                    <View style={styles.randomEffectButtonContent}>
                      <Ionicons
                        name="dice"
                        size={18}
                        color={isCooldownActive ? subtextColor : textColor}
                      />
                      <Text
                        style={[
                          styles.randomEffectButtonText,
                          {
                            color: isCooldownActive ? subtextColor : textColor,
                          },
                        ]}
                      >
                        {isCooldownActive
                          ? `Cooldown (${Math.ceil(3 - cooldownProgress * 3)}s)`
                          : "Generate Random Effect"}
                      </Text>
                    </View>
                    {isCooldownActive && (
                      <Animated.View
                        style={[
                          styles.cooldownProgress,
                          {
                            width: cooldownAnimRef.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0%", "100%"],
                            }),
                            backgroundColor: "#3b82f6",
                          },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              )}
              {!activeDevice?.isConnected ? (
                <View style={styles.infoCard}>
                  <Ionicons
                    name="wifi-outline"
                    size={24}
                    color={subtextColor}
                    style={styles.infoIcon}
                  />
                  <Text style={[styles.infoText, { color: subtextColor }]}>
                    Connect to a WLED device to load available effects
                  </Text>
                </View>
              ) : (
                <View>
                  {memoizedCustomEffects.length > 0 ? (
                    <View style={styles.presetGrid}>
                      {memoizedCustomEffects.map((preset, index) => (
                        <MemoizedPresetCard
                          key={`device-${preset.id}-${index}`}
                          preset={preset}
                          index={index}
                          activePreset={activePreset}
                          onPresetSelect={onPresetSelect}
                          isDark={isDark}
                          isDeleteMode={isDeleteMode}
                          isSelected={selectedForDelete.has(preset.id)}
                          onToggleSelection={toggleCardSelection}
                          wiggleAnim={wiggleAnim}
                          showIcon={false}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.infoCard}>
                      <Ionicons
                        name="color-palette-outline"
                        size={24}
                        color={subtextColor}
                        style={styles.infoIcon}
                      />
                      <Text style={[styles.infoText, { color: subtextColor }]}>
                        No presets or custom effects found.
                      </Text>
                      <Text
                        style={[styles.infoSubtext, { color: subtextColor }]}
                      >
                        Save presets on your WLED device or create custom
                        effects here.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Playlists */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBackground, borderColor },
          ]}
        >
          <TouchableOpacity
            onPress={() => setIsPlaylistsCollapsed(!isPlaylistsCollapsed)}
            style={styles.sectionHeader}
          >
            <View style={styles.headerLeft}>
              <Ionicons name="list" size={20} color={textColor} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Playlists ({savedPlaylists.length})
              </Text>
            </View>
            <Ionicons
              name={isPlaylistsCollapsed ? "chevron-down" : "chevron-up"}
              size={20}
              color={subtextColor}
            />
          </TouchableOpacity>

          {!isPlaylistsCollapsed && (
            <View style={styles.sectionContent}>
              {isLoadingPlaylists ? (
                // Loading state - brief empty state for smooth transition
                <View
                  style={{
                    height: 120,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {/* Empty space during loading for smooth transition */}
                </View>
              ) : savedPlaylists && savedPlaylists.length > 0 ? (
                <View style={styles.playlistGrid}>
                  {savedPlaylists.map((playlist, index) => (
                    <AnimatedPlaylistItem
                      key={`playlist-${playlist.id}-${index}`}
                      playlist={playlist}
                      index={index}
                      onPress={onPlaylistSelect}
                      isDeleteMode={isDeleteMode}
                      isSelected={selectedForDelete.has(playlist.id)}
                      onToggleSelection={toggleCardSelection}
                      wiggleAnim={wiggleAnim}
                    />
                  ))}
                </View>
              ) : (
                memoizedCustomEffects.length === 0 && (
                  <View style={styles.infoCard}>
                    <Ionicons
                      name="play-outline"
                      size={24}
                      color={subtextColor}
                      style={styles.infoIcon}
                    />
                    <Text style={[styles.infoText, { color: subtextColor }]}>
                      No playlists saved yet
                    </Text>
                    <Text style={[styles.infoSubtext, { color: subtextColor }]}>
                      Create custom effects first to build playlists
                    </Text>
                  </View>
                )
              )}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Floating Device Controls - Hidden in delete mode */}
      {!isDeleteMode && (
        <View
          style={[
            styles.floatingDropdown,
            { backgroundColor: `${cardBackground}CC`, borderColor },
          ]}
        >
          {/* On/Off Button */}
          <TouchableOpacity
            onPress={() => handleDeviceToggle(!activeDevice?.wledInfo?.on)}
            disabled={!activeDevice?.isConnected || isTogglingDevice}
            style={[
              styles.powerButton,
              {
                backgroundColor: activeDevice?.wledInfo?.on
                  ? "#10b981"
                  : "#6b7280",
                opacity:
                  !activeDevice?.isConnected || isTogglingDevice ? 0.5 : 1,
              },
            ]}
          >
            {isTogglingDevice ? (
              <Ionicons
                name="refresh"
                size={20}
                color="#ffffff"
                style={{ transform: [{ rotate: "180deg" }] }}
              />
            ) : (
              <Ionicons
                name={activeDevice?.wledInfo?.on ? "power" : "power-outline"}
                size={20}
                color="#ffffff"
              />
            )}
          </TouchableOpacity>

          {/* Device Dropdown */}
          <TouchableOpacity
            onPress={() => setShowDeviceDropdown(!showDeviceDropdown)}
            style={styles.dropdownButton}
          >
            <View style={styles.dropdownContent}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: activeDevice?.isConnected
                      ? "#10b981"
                      : "#ef4444",
                  },
                ]}
              />
              <Text
                style={[styles.dropdownText, { color: textColor }]}
                numberOfLines={1}
              >
                {activeDevice?.name || "No Device"}
              </Text>
              <Ionicons
                name={showDeviceDropdown ? "chevron-up" : "chevron-down"}
                size={16}
                color={subtextColor}
              />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Delete Mode Action Buttons */}
      {isDeleteMode && (
        <View style={styles.deleteActionContainer}>
          <TouchableOpacity
            onPress={exitDeleteMode}
            style={[
              styles.deleteActionButton,
              styles.cancelButton,
              { backgroundColor: isDark ? "#4b5563" : "#f3f4f6" },
            ]}
          >
            <Text
              style={[
                styles.deleteActionText,
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
              styles.deleteActionButton,
              {
                backgroundColor:
                  selectedForDelete.size === 0 ? "#9ca3af" : "#ef4444",
                opacity: selectedForDelete.size === 0 ? 0.5 : 1,
              },
            ]}
          >
            <Text style={[styles.deleteActionText, { color: "white" }]}>
              Delete ({selectedForDelete.size})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Device Selection Modal */}
      {showDeviceDropdown && devices.length > 1 && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowDeviceDropdown(false)}
          style={styles.dropdownOverlay}
        >
          <View
            style={[styles.dropdownModal, { backgroundColor: cardBackground }]}
          >
            <Text style={[styles.dropdownTitle, { color: textColor }]}>
              Select Device
            </Text>
            <ScrollView
              style={styles.deviceScrollContainer}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {devices.map((device, index) => (
                <TouchableOpacity
                  key={`device-option-${device.id}-${index}`}
                  onPress={() => {
                    if (onSetActiveDeviceId) {
                      onSetActiveDeviceId(device.id);
                    }
                    setShowDeviceDropdown(false);
                  }}
                  style={[
                    styles.deviceOption,
                    index < devices.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: borderColor }
                      : { borderBottomWidth: 0 },
                    device.id === activeDeviceId && {
                      backgroundColor: isDark ? "#374151" : "#f3f4f6",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: device.isConnected
                          ? "#10b981"
                          : "#ef4444",
                      },
                    ]}
                  />
                  <View style={styles.deviceInfo}>
                    <Text
                      style={[styles.deviceOptionText, { color: textColor }]}
                    >
                      {device.name}
                    </Text>
                    <Text
                      style={[
                        styles.deviceOptionSubtext,
                        { color: subtextColor },
                      ]}
                    >
                      {device.mdns || "Unknown"} · {device.ip}
                    </Text>
                  </View>
                  {device.id === activeDeviceId && (
                    <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      )}

      {/* FAB Overlay - Close when touching outside */}
      {!isDeleteMode && showFabOptions && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={toggleFabOptions}
          style={[styles.fabOverlay, { backgroundColor: "transparent" }]}
        />
      )}

      {/* Floating Action Buttons - Hidden in delete mode */}
      {!isDeleteMode && (
        <View style={styles.fabContainer}>
          {/* Mini FAB 1 - Create New */}
          <Animated.View
            style={[
              styles.miniFab,
              {
                transform: [{ scale: fabScaleAnim1 }],
                bottom: 320,
              },
            ]}
            pointerEvents={showFabOptions ? "auto" : "none"}
          >
            <TouchableOpacity
              onPress={() => {
                closeFabAndOpenModal(() => setShowCreateNewOptions(true));
              }}
              style={[
                styles.miniFabButton,
                {
                  backgroundColor: "#10b981",
                  shadowColor: isDark ? "#000" : "#10b981",
                },
              ]}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>

          {/* Mini FAB 2 - Device Management */}
          <Animated.View
            style={[
              styles.miniFab,
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
                styles.miniFabButton,
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
              styles.miniFab,
              {
                transform: [{ scale: fabScaleAnim3 }],
                bottom: 140,
              },
            ]}
            pointerEvents={showFabOptions ? "auto" : "none"}
          >
            <TouchableOpacity
              onPress={() => {
                closeFabAndOpenModal(() => enterDeleteMode());
              }}
              style={[
                styles.miniFabButton,
                {
                  backgroundColor: "#ef4444",
                  shadowColor: isDark ? "#000" : "#ef4444",
                },
              ]}
            >
              <Ionicons name="trash" size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>

          {/* Mini FAB 4 - Settings */}
          <Animated.View
            style={[
              styles.miniFab,
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
                styles.miniFabButton,
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
              styles.miniFab,
              {
                transform: [{ scale: fabScaleAnim5 }],
                bottom: 260,
              },
            ]}
            pointerEvents={showFabOptions ? "auto" : "none"}
          >
            <TouchableOpacity
              onPress={() => {
                closeFabAndOpenModal(() => setShowSchedulerModal(true));
              }}
              style={[
                styles.miniFabButton,
                {
                  backgroundColor: "#8b5cf6",
                  shadowColor: isDark ? "#000" : "#8b5cf6",
                },
              ]}
            >
              <Ionicons name="time-outline" size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>

          {/* Main FAB */}
          <Animated.View
            style={[
              styles.floatingButton,
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
                styles.mainFabButton,
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
          style={styles.fabOverlay}
        >
          <View
            style={[
              styles.fabOptionsContainer,
              { backgroundColor: cardBackground },
            ]}
          >
            <Text style={[styles.fabTitle, { color: textColor }]}>
              Create New
            </Text>

            <TouchableOpacity
              onPress={() => {
                setShowCreateNewOptions(false);
                closeFabAndOpenModal(() => setShowCustomEffectsModal(true));
              }}
              style={styles.fabOption}
            >
              <Ionicons name="color-palette" size={20} color={textColor} />
              <Text style={[styles.fabOptionText, { color: textColor }]}>
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
                style={styles.fabOption}
              >
                <Ionicons name="play" size={20} color={textColor} />
                <Text style={[styles.fabOptionText, { color: textColor }]}>
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
        <View style={styles.deletionProgressOverlay}>
          <View
            style={[
              styles.deletionProgressModal,
              { backgroundColor: cardBackground },
            ]}
          >
            <Text style={[styles.deletionProgressTitle, { color: textColor }]}>
              Deleting Items...
            </Text>
            <Text
              style={[styles.deletionProgressText, { color: subtextColor }]}
            >
              {deletionProgress.current} of {deletionProgress.total}
            </Text>
            {deletionProgress.currentItem && (
              <Text
                style={[styles.deletionProgressItem, { color: subtextColor }]}
                numberOfLines={1}
              >
                {deletionProgress.currentItem}
              </Text>
            )}
            <View
              style={[
                styles.progressBar,
                { backgroundColor: isDark ? "#374151" : "#f3f4f6" },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionCard: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "visible",
  },
  sectionContent: {
    marginTop: 8,
    overflow: "visible",
  },
  innerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingVertical: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 8,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  enableToggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  enableToggleCard: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  enableToggleText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24, // Match toggle switch height
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
  },
  activePresetText: {
    fontWeight: "500",
    fontSize: 14,
    marginBottom: 8,
  },
  ledContainer: {
    marginTop: 12,
  },
  ledGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    minHeight: 20, // Revert to original minHeight
  },
  ledPill: {
    width: 6,
    height: 11,
    marginRight: 2,
    marginBottom: 2,
    borderRadius: 2,
    borderWidth: 0.2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    elevation: 5, // Keep a default elevation for Android shadow
  },
  ledCount: {
    fontSize: 12,
    marginTop: 8,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  dynamicLedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    minHeight: 20,
  },
  disabledText: {
    fontSize: 14,
    marginTop: 8,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    justifyContent: "flex-start",
  },
  presetCard: {
    borderRadius: 8,
    padding: 8,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledContainer: {
    alignItems: "center",
  },
  cardIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  cardTitle: {
    fontWeight: "500",
    fontSize: 10,
    color: "white",
    textAlign: "center",
    marginBottom: 1,
  },
  cardPresetId: {
    fontSize: 8,
    color: "white",
    textAlign: "center",
    opacity: 0.8,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 8,
    opacity: 0.75,
    color: "white",
    textAlign: "center",
  },
  activeIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  infoCard: {
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  infoIcon: {
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    textAlign: "center",
  },
  infoSubtext: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  playlistGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    justifyContent: "flex-start",
  },
  playlistItem: {
    flexBasis: '22%',
    maxWidth: '22%',
    marginHorizontal: '1.5%',
    marginVertical: 6,
  },
  playlistCard: {
    borderRadius: 8,
    padding: 8,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playlistName: {
    color: "white",
    fontSize: 10,
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 1,
  },
  playlistId: {
    color: "white",
    fontSize: 8,
    textAlign: "center",
    opacity: 0.8,
    marginBottom: 2,
  },
  playlistCount: {
    color: "white",
    fontSize: 8,
    opacity: 0.75,
    textAlign: "center",
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },
  gradientContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  touchableArea: {
    flex: 1,
  },
  floatingDropdown: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 100,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 28,
    paddingLeft: 7,
    paddingRight: 10,
    zIndex: 999,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  powerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownButton: {
    flex: 1,
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1002,
  },
  dropdownModal: {
    borderRadius: 12,
    padding: 16,
    minWidth: 320,
    maxWidth: 400,
    maxHeight: 400, // Limit modal height to prevent overflow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  deviceScrollContainer: {
    maxHeight: 300, // Allow for title + padding while limiting device list height
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  deviceOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 8,
  },
  deviceOptionText: {
    fontSize: 16,
    fontWeight: "600",
  },
  deviceOptionSubtext: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    alignItems: "center",
    zIndex: 1002,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  mainFabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  miniFab: {
    position: "absolute",
    right: 8,
  },
  miniFabButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1001,
  },
  fabOptionsContainer: {
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  fabTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  fabOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  fabOptionText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 12,
  },
  deleteOverlay: {
    position: "absolute",
    top: -8,
    right: -8,
    zIndex: 10,
  },
  deleteXButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteActionContainer: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    zIndex: 1000,
  },
  deleteActionButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  deleteActionText: {
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "rgba(107, 114, 128, 0.3)",
  },
  diceButton: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(107, 114, 128, 0.3)",
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  deletionProgressOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1003,
  },
  deletionProgressModal: {
    borderRadius: 12,
    padding: 24,
    minWidth: 280,
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  deletionProgressTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  deletionProgressText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  deletionProgressItem: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
    fontStyle: "italic",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  randomEffectContainer: {
    alignItems: "center",
  },
  randomEffectButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    minWidth: 200,
  },
  randomEffectButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  randomEffectButtonText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  cooldownProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#3b82f6",
    opacity: 0.2,
    zIndex: 0,
  },
  // Scheduler styles
  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 4,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  presetInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  presetInputLabel: {
    fontSize: 14,
    fontWeight: "500",
    width: 60,
  },
  presetInputContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    marginHorizontal: 12,
  },
  presetInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: "center",
  },
  presetSelectionSubtext: {
    fontSize: 12,
    fontStyle: "italic",
  },
  currentPresetButton: {
    width: 90,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  timeContainer: {
    marginBottom: 20,
  },
  timeRowInline: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  timeInputGroup: {
    flex: 1,
    alignItems: "center",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    textAlign: "center",
  },
  timeInputContainer: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  timeInput: {
    fontSize: 16,
    textAlign: "center",
    minWidth: 50,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  resetButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 100,
  },
  resetButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  timerStatusText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});
