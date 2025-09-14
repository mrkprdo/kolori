import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  RefreshControl,
  Dimensions,
  StyleSheet,
  Animated,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { logger } from '../utils/logger';
import { SeasonalPreset } from '../types';
import { 
  Device as WledDevice, 
  CustomEffect, 
  SavedPlaylist, 
  LEDColor 
} from '../types';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { deleteWledPreset, deleteWledPlaylistViaWebSocket, createWledPreset, turnWledOn, turnWledOff } from '../config/wledApi';
import CustomEffectsModal from './CustomEffectsModal';
import PlaylistCreationModal from './PlaylistCreationModal';
import DeviceManagementModal from './DeviceManagementModal';
import LEDVisualization from './LEDVisualization';
import { WLEDEffectData, getEffectByName } from '../data/wledEffects';

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

const AnimatedPlaylistItem = React.memo(function AnimatedPlaylistItem({ 
  playlist, 
  index, 
  onPress,
  isDeleteMode = false,
  isSelected = false,
  onToggleSelection,
  wiggleAnim
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
  const shouldUseGradient = playlist.linearGradientColors || playlist.gradient;
  const gradientColors = playlist.linearGradientColors || 
    (playlist.gradient ? parseGradientString(playlist.gradient).colors : null);
  
  // Ensure gradient colors are valid before using LinearGradient
  const hasValidGradient = gradientColors && 
    Array.isArray(gradientColors) && 
    gradientColors.length >= 2 && 
    gradientColors.every((color: string) => typeof color === 'string' && color.length > 0);

  const cardStyle = useMemo(() => [
    styles.playlistCard,
    shouldUseGradient && hasValidGradient ? { padding: 0 } : { backgroundColor: playlist.gradient ? extractPrimaryColor(playlist.gradient) : '#8b5cf6' },
    playlist.isActive && !isDeleteMode && { borderWidth: 2, borderColor: '#3b82f6', borderRadius: 8 },
    isSelected && { borderWidth: 3, borderColor: '#ef4444', borderRadius: 8 }
  ], [playlist.isActive, isDeleteMode, isSelected, shouldUseGradient, hasValidGradient, playlist.gradient]);
  
  return (
    <Animated.View
      style={[
        styles.playlistItem,
        {
          transform: [
            { scale: scaleAnim },
            ...(isDeleteMode && wiggleAnim ? [{
              rotate: wiggleAnim.interpolate({
                inputRange: [-1, 1],
                outputRange: ['-2deg', '2deg']
              })
            }] : [])
          ]
        }
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        style={styles.touchableArea}
      >
        <View style={cardStyle}>
          {shouldUseGradient && hasValidGradient && (
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBackground}
            />
          )}
          <View style={shouldUseGradient && hasValidGradient ? styles.gradientContent : styles.cardContent}>
            <Text style={styles.playlistName}>
              {playlist.name}
            </Text>
            <Text style={styles.playlistId}>
              ID: {playlist.id}
            </Text>
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
}, (prevProps, nextProps) => {
  return prevProps.playlist.id === nextProps.playlist.id &&
         prevProps.playlist.name === nextProps.playlist.name &&
         prevProps.playlist.isActive === nextProps.playlist.isActive &&
         prevProps.playlist.items?.length === nextProps.playlist.items?.length &&
         prevProps.index === nextProps.index &&
         prevProps.isDeleteMode === nextProps.isDeleteMode &&
         prevProps.isSelected === nextProps.isSelected;
});

// Helper function to extract primary color from gradient string - pure function for reusability
const extractPrimaryColor = (gradient: string): string => {
  if (!gradient || typeof gradient !== 'string') {
    return '#6366f1'; // fallback color
  }
  
  // Extract first RGB/hex color from gradient string
  const colorMatch = gradient.match(/(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\(\d+,\s*\d+,\s*\d+\))/);
  return colorMatch ? colorMatch[0] : '#6366f1';
};

// Helper function to get seasonal gradient based on preset name
const getSeasonalGradient = (presetName: string): string => {
  const name = presetName.toLowerCase();
  
  if (name.includes('halloween') || name.includes('fall') || name.includes('autumn')) {
    return 'linear-gradient(135deg, #ff6600, #ff9933)';
  }
  if (name.includes('canada')) {
    return 'linear-gradient(135deg, #ff0000, #ff4444)';
  }
  if (name.includes('christmas') || name.includes('holiday')) {
    return 'linear-gradient(135deg, #228B22, #32CD32)';
  }
  if (name.includes('valentine')) {
    return 'linear-gradient(135deg, #ff1493, #ff69b4)';
  }
  if (name.includes('easter') || name.includes('spring')) {
    return 'linear-gradient(135deg, #98fb98, #ffb6c1)';
  }
  if (name.includes('july') || name.includes('independence')) {
    return 'linear-gradient(135deg, #0066cc, #ff0000)';
  }
  
  // Default gradient
  return 'linear-gradient(135deg, #6366f1, #8b5cf6)';
};

// Helper function to parse gradient string and extract colors for LinearGradient - pure function
const parseGradientString = (gradientString: string): { colors: string[], locations?: number[] } => {
  if (!gradientString || typeof gradientString !== 'string') {
    return { colors: ['#6366f1', '#8b5cf6'] }; // default gradient
  }

  // Extract colors from gradient string like "linear-gradient(135deg, rgb(255, 170, 0), rgb(255, 0, 0), rgb(0, 255, 0))"
  const colorMatches = gradientString.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g);
  
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
  return { colors: ['#6366f1', '#8b5cf6'] };
};


interface PresetCardProps {
  preset: any;
  isActive: boolean;
  onClick: (id: string | number) => void;
  showIcon?: boolean;
  isDark?: boolean;
  isDeleteMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string | number) => void;
  wiggleAnim?: Animated.Value;
}

function PresetCard({ 
  preset, 
  isActive, 
  onClick, 
  showIcon = false, 
  isDark = false, 
  isDeleteMode = false,
  isSelected = false,
  onToggleSelection,
  wiggleAnim
}: PresetCardProps) {
  const screenWidth = Dimensions.get('window').width;
  
  // Simplified animation values - only native driver animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  
  // Entrance animation
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      delay: (preset as any)._animationDelay || Math.random() * 200, // Staggered animation
      useNativeDriver: true,
    }).start();
  }, []);
  
  // Use LinearGradient colors for device presets if available
  const shouldUseGradient = preset.isWledPreset && (preset.linearGradientColors || preset.gradient);
  const gradientColors = preset.linearGradientColors || 
    (preset.gradient ? parseGradientString(preset.gradient).colors : null);
  
  // Ensure gradient colors are valid before using LinearGradient
  const hasValidGradient = gradientColors && 
    Array.isArray(gradientColors) && 
    gradientColors.length >= 2 && 
    gradientColors.every(color => typeof color === 'string' && color.length > 0);

  const handleCardPress = () => {
    if (isDeleteMode && onToggleSelection) {
      onToggleSelection(preset.id);
    } else if (!isDeleteMode) {
      onClick(preset.id);
    }
  };

  const animatedTransformStyle = {
    transform: [
      { scale: scaleAnim },
      ...(isDeleteMode && wiggleAnim ? [{
        rotate: wiggleAnim.interpolate({
          inputRange: [-1, 1],
          outputRange: ['-2deg', '2deg']
        })
      }] : [])
    ],
  };

  const cardItemStyle = {
    width: '22%',
    margin: '1.5%',
  };


  // Use unified structure for all preset cards (with gradient support)
  return (
    <Animated.View style={[animatedTransformStyle, cardItemStyle]}>
      <TouchableOpacity
        onPress={handleCardPress}
        style={styles.touchableArea}
      >
        <View style={[
          styles.presetCard, 
          shouldUseGradient && hasValidGradient ? { padding: 0 } : { backgroundColor: preset.gradient ? extractPrimaryColor(preset.gradient) : '#6366f1' },
          isActive && !isDeleteMode && { borderWidth: 2, borderColor: '#3b82f6', borderRadius: 8 }, 
          isSelected && { borderWidth: 3, borderColor: '#ef4444', borderRadius: 8 }
        ]}>
          {shouldUseGradient && hasValidGradient && (
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBackground}
            />
          )}
          <View style={shouldUseGradient && hasValidGradient ? styles.gradientContent : styles.cardContent}>
            {showIcon && (
              <Text style={styles.cardIcon}>{preset.icon}</Text>
            )}
            <Text style={styles.cardTitle}>
              {preset.name}
            </Text>
            <Text style={styles.cardPresetId}>
              ID: {preset.presetId || preset.id}
            </Text>
            {preset.effectName && (
              <Text style={styles.cardSubtitle}>
                {preset.effectName}
              </Text>
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
}

interface PresetGridProps {
  activePreset: string | number | null;
  onPresetSelect: (presetId: string | number) => void;
  isDark: boolean;
  currentPlaylist: any[];
  onShowPlaylist: () => void;
  activeDevice: WledDevice | undefined;
  devices: WledDevice[];
  activeDeviceId?: number | null;
  onSetActiveDeviceId?: (id: number) => void;
  customEffects: CustomEffect[];
  onAddCustomEffect: (effect: CustomEffect) => void;
  onRemoveCustomEffect: (effectId: number) => void;
  onCustomEffectUpdate: (effects: CustomEffect[]) => void;
  savedPlaylists: SavedPlaylist[];
  isLoadingPlaylists: boolean;
  onPlaylistEdit: (playlist: SavedPlaylist) => void;
  onPlaylistRemove: (playlistId: number) => void;
  onPlaylistSelect: (playlistId: number) => void;
  setShowSettings: (show: boolean) => void;
  onDeviceRemove: (deviceId: number) => void;
  onAddDevice: () => void;
  onScanForDevices: () => void;
  liveLedData: LEDColor[];
  liveViewEnabled: boolean;
  onLiveViewToggle: (enabled: boolean) => void;
  onLiveLedDataUpdate?: (ledData: LEDColor[]) => void;
  onRefreshPresets?: () => Promise<void>;
  onSavePlaylist?: (playlist: SavedPlaylist) => void;
  seasonalPresets: SeasonalPreset[];
  onBrightnessChange?: (brightness: number) => void;
  liveViewLedSize?: 'compact' | 'normal' | 'large' | 'extra-large';
}

export default function PresetGrid({
  activePreset,
  onPresetSelect,
  isDark,
  currentPlaylist,
  onShowPlaylist,
  activeDevice,
  devices = [],
  activeDeviceId,
  onSetActiveDeviceId,
  customEffects = [],
  onAddCustomEffect,
  onRemoveCustomEffect,
  onCustomEffectUpdate,
  savedPlaylists = [],
  isLoadingPlaylists,
  onPlaylistEdit,
  onPlaylistRemove,
  onPlaylistSelect,
  setShowSettings,
  onDeviceRemove,
  onAddDevice,
  onScanForDevices,
  liveLedData,
  liveViewEnabled,
  onLiveViewToggle,
  onLiveLedDataUpdate,
  onRefreshPresets,
  onSavePlaylist,
  seasonalPresets,
  onBrightnessChange,
  liveViewLedSize = 'normal',
}: PresetGridProps) {
  
  
  const [isSeasonalCollapsed, setIsSeasonalCollapsed] = useState(true);
  const [isCustomEffectsCollapsed, setIsCustomEffectsCollapsed] = useState(true);
  const [isPlaylistsCollapsed, setIsPlaylistsCollapsed] = useState(false);
  const [showCustomEffectsModal, setShowCustomEffectsModal] = useState(false);
  const [showPlaylistCreationModal, setShowPlaylistCreationModal] = useState(false);
  const [showFabOptions, setShowFabOptions] = useState(false);
  const [showCreateNewOptions, setShowCreateNewOptions] = useState(false);
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  const [showDeviceManagementModal, setShowDeviceManagementModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTogglingDevice, setIsTogglingDevice] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string | number>>(new Set());
  const [isDeletionInProgress, setIsDeletionInProgress] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState({ current: 0, total: 0, currentItem: '' });
  // UNCONTROLLED SLIDER APPROACH - Remove value prop to eliminate flicker
  const [currentBrightnessDisplay, setCurrentBrightnessDisplay] = useState<number>(activeDevice?.wledInfo?.bri || 0);
  const [isSliding, setIsSliding] = useState(false);
  const [sliderKey, setSliderKey] = useState(0); // Force re-render key for slider reset
  const sliderRef = useRef<any>(null);
  const hasUserTouchedSlider = useRef(false);
  const lastKnownDeviceBrightness = useRef<number>(activeDevice?.wledInfo?.bri || 0);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const [cooldownProgress, setCooldownProgress] = useState(0);
  const cooldownAnimRef = useRef<Animated.Value>(new Animated.Value(0)).current;
  
  // Reset slider to device value - force re-render with new defaultValue
  const resetSliderToDeviceValue = useCallback((deviceBrightness: number, reason: string) => {
    console.log(`🔄 Resetting slider to device value: ${deviceBrightness} (${reason})`);
    console.log(`📊 Current device brightness from activeDevice: ${activeDevice?.wledInfo?.bri}`);
    
    // Update display value first
    setCurrentBrightnessDisplay(deviceBrightness);
    hasUserTouchedSlider.current = false;
    
    // Then force slider to re-render with new defaultValue by changing key
    setSliderKey(prev => {
      const newKey = prev + 1;
      console.log(`✅ Slider reset complete - key: ${newKey}, value: ${deviceBrightness}`);
      return newKey;
    });
  }, [activeDevice?.wledInfo?.bri]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(liveViewEnabled ? 1 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fabRotateAnim = useRef(new Animated.Value(0)).current;
  const fabScaleAnim1 = useRef(new Animated.Value(0)).current;
  const fabScaleAnim2 = useRef(new Animated.Value(0)).current;
  const fabScaleAnim3 = useRef(new Animated.Value(0)).current;
  const fabScaleAnim4 = useRef(new Animated.Value(0)).current;
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
      wiggleAnim.stopAnimation();
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
      
      // Animation cleanup completed
    };
  }, [fabRotateAnim, fabScaleAnim1, fabScaleAnim2, fabScaleAnim3, fabScaleAnim4, wiggleAnim, fadeAnim, scaleAnim]);

  // Device presets are now passed via customEffects prop from parent
  const devicePresets = customEffects; // Use customEffects directly
  const loadingPresets = customEffects.length === 0 && activeDevice?.isConnected;

  // Theme colors
  const backgroundColor = isDark ? '#111827' : '#f9fafb';
  const cardBackground = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#111827';
  const subtextColor = isDark ? '#9ca3af' : '#6b7280';
  const borderColor = isDark ? '#374151' : '#e5e7eb';

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
        logger.error('Failed to load collapse states:', error);
      }
    };

    loadCollapseStates();
  }, []);

  // Save collapse states
  useEffect(() => {
    storage.saveToStorage(STORAGE_KEYS.SEASONAL_COLLAPSED, isSeasonalCollapsed);
  }, [isSeasonalCollapsed]);

  useEffect(() => {
    storage.saveToStorage(STORAGE_KEYS.CUSTOM_EFFECTS_COLLAPSED, isCustomEffectsCollapsed);
  }, [isCustomEffectsCollapsed]);

  useEffect(() => {
    storage.saveToStorage(STORAGE_KEYS.PLAYLISTS_COLLAPSED, isPlaylistsCollapsed);
  }, [isPlaylistsCollapsed]);

  // Track previous device ID for immediate updates on device switch
  const prevDeviceId = useRef(activeDevice?.id);
  
  // Handle device switching - reset uncontrolled slider
  useEffect(() => {
    const isDeviceSwitch = prevDeviceId.current !== activeDevice?.id;
    
    if (isDeviceSwitch && activeDevice?.id) {
      prevDeviceId.current = activeDevice.id;
      
      if (activeDevice.wledInfo?.bri !== undefined) {
        const deviceBrightness = Math.round(activeDevice.wledInfo.bri);
        resetSliderToDeviceValue(deviceBrightness, 'device-switch');
      }
    }
  }, [activeDevice?.id, activeDevice?.name, resetSliderToDeviceValue]);

  // Track device brightness and sync display if user hasn't touched slider
  useEffect(() => {
    if (activeDevice?.wledInfo?.bri !== undefined) {
      const deviceBrightness = Math.round(activeDevice.wledInfo.bri);
      
      // Always update our tracking ref
      lastKnownDeviceBrightness.current = deviceBrightness;
      
      // Only update display if user hasn't touched slider
      if (!hasUserTouchedSlider.current) {
        setCurrentBrightnessDisplay(deviceBrightness);
        console.log(`📖 Brightness sync: ${deviceBrightness} (user hasn't touched)`);
      } else {
        console.log(`📖 Device brightness updated to ${deviceBrightness}, but user has control`);
      }
    }
  }, [activeDevice?.wledInfo?.bri]);

  // Reset brightness sync on refresh - reset uncontrolled slider
  const resetBrightnessSync = useCallback(() => {
    console.log('🔄 resetBrightnessSync called');
    console.log(`📊 activeDevice?.wledInfo?.bri: ${activeDevice?.wledInfo?.bri}`);
    console.log(`📊 lastKnownDeviceBrightness: ${lastKnownDeviceBrightness.current}`);
    console.log(`📊 currentBrightnessDisplay: ${currentBrightnessDisplay}`);
    
    // Use current device brightness, fallback to last known, fallback to current display
    const deviceBrightness = activeDevice?.wledInfo?.bri !== undefined 
      ? Math.round(activeDevice.wledInfo.bri)
      : lastKnownDeviceBrightness.current || currentBrightnessDisplay;
      
    console.log(`📊 Using brightness for reset: ${deviceBrightness}`);
    resetSliderToDeviceValue(deviceBrightness, 'refresh');
  }, [activeDevice?.wledInfo?.bri, resetSliderToDeviceValue, currentBrightnessDisplay]);


  // Device presets are now loaded by the parent KoloriApp component
  // This component receives them via the customEffects prop

  // Note: WebSocket connection is handled by the parent KoloriApp component
  // Live LED data is passed down via props and updated through onLiveLedDataUpdate

  const activePresetData = [...seasonalPresets, ...customEffects].find(
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

  const handleDeviceToggle = useCallback(async (turnOn: boolean) => {
    if (!activeDevice?.ip || isTogglingDevice) return;

    setIsTogglingDevice(true);
    try {
      const result = turnOn
        ? await turnWledOn(activeDevice.ip)
        : await turnWledOff(activeDevice.ip);

      if (!result.success) {
        Alert.alert('Error', `Failed to ${turnOn ? 'turn on' : 'turn off'} device: ${result.message}`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${turnOn ? 'turn on' : 'turn off'} device`);
    } finally {
      setIsTogglingDevice(false);
      // Refresh device state after toggle
      if (onRefreshPresets) {
        onRefreshPresets();
      }
    }
  }, [activeDevice?.ip, isTogglingDevice, onRefreshPresets]);

  const handleRefresh = useCallback(async () => {
    if (!onRefreshPresets || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Reset brightness sync before refreshing to allow fresh device data
      resetBrightnessSync();
      await onRefreshPresets();
    } catch (error) {
      logger.error('Failed to refresh presets:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshPresets, isRefreshing, resetBrightnessSync]);

  // Animation coordination (non-blocking)
  const fabAnimationInProgress = useRef(false);

  // Improved animation system with proper sequencing
  const animateFabOpen = useCallback(() => {
    // if (fabAnimationInProgress.current) return;
    // fabAnimationInProgress.current = true;
    console.log('animateFabOpen called');
    
    // Ensure animations start from 0 (closed state)
    fabRotateAnim.setValue(0);
    fabScaleAnim1.setValue(0);
    fabScaleAnim2.setValue(0);
    fabScaleAnim3.setValue(0);
    fabScaleAnim4.setValue(0);
    
    console.log('Animation values reset to 0, starting animations...');
    
    Animated.parallel([
      Animated.timing(fabRotateAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.stagger(60, [
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
      console.log('animateFabOpen completed');
    });
  }, [fabRotateAnim, fabScaleAnim1, fabScaleAnim2, fabScaleAnim3, fabScaleAnim4]);

  const animateFabClose = useCallback(() => {
    // if (fabAnimationInProgress.current) return;
    // fabAnimationInProgress.current = true;
    console.log('animateFabClose called');
    
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
      ]),
    ]).start(() => {
      // fabAnimationInProgress.current = false;
      setShowFabOptions(false);
      console.log('animateFabClose completed');
    });
  }, [fabRotateAnim, fabScaleAnim1, fabScaleAnim2, fabScaleAnim3, fabScaleAnim4]);

  const toggleFabOptions = useCallback(() => {
    console.log('🔵 FAB toggle called, current showFabOptions:', showFabOptions);
    console.log('🔵 Function entering with showFabOptions:', showFabOptions);
    
    if (showFabOptions) {
      console.log('🔴 Closing FAB - setting state to false');
      setShowFabOptions(false);
      console.log('🔴 Reset animations to closed state');
      // Reset animations to closed state
      fabRotateAnim.setValue(0);
      fabScaleAnim1.setValue(0);
      fabScaleAnim2.setValue(0);
      fabScaleAnim3.setValue(0);
      fabScaleAnim4.setValue(0);
      console.log('🔴 FAB close complete');
    } else {
      console.log('🟢 Opening FAB - setting state to true');
      setShowFabOptions(true);
      console.log('🟢 Setting animations to open state (no animation)');
      // Set animations to open state immediately
      fabRotateAnim.setValue(1);
      fabScaleAnim1.setValue(1);
      fabScaleAnim2.setValue(1);
      fabScaleAnim3.setValue(1);
      fabScaleAnim4.setValue(1);
      console.log('🟢 FAB open complete');
    }
  }, [showFabOptions, fabRotateAnim, fabScaleAnim1, fabScaleAnim2, fabScaleAnim3, fabScaleAnim4]);

  // Debug state changes
  useEffect(() => {
    console.log('⭐ showFabOptions state changed to:', showFabOptions);
  }, [showFabOptions]);

  // Safety mechanism to reset stuck animation flag
  useEffect(() => {
    if (fabAnimationInProgress.current) {
      const timeout = setTimeout(() => {
        console.log('Animation progress flag stuck, resetting...');
        // fabAnimationInProgress.current = false;
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [showFabOptions]);

  // Simple function to close FAB and open modal immediately
  const closeFabAndOpenModal = useCallback((modalOpenFunction: () => void) => {
    // Hide FAB options immediately to prevent background visibility
    setShowFabOptions(false);
    // Reset animations to closed state immediately
    fabRotateAnim.setValue(0);
    fabScaleAnim1.setValue(0);
    fabScaleAnim2.setValue(0);
    fabScaleAnim3.setValue(0);
    fabScaleAnim4.setValue(0);
    // Open modal immediately
    modalOpenFunction();
  }, [fabRotateAnim, fabScaleAnim1, fabScaleAnim2, fabScaleAnim3, fabScaleAnim4]);

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
    setSelectedForDelete(prev => {
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
  const processDeletionQueue = useCallback(async (selectedItems: Array<{id: string | number, name: string, type: string}>) => {
    if (selectedItems.length === 0) return;

    setIsDeletionInProgress(true);
    setDeletionProgress({ current: 0, total: selectedItems.length, currentItem: '' });
    
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
          currentItem: item.name 
        });

        try {
          if (item.type === 'effect') {
            const effect = customEffects.find(e => e.id === item.id);
            if (effect?.presetId && activeDevice?.ip) {
              console.log(`🗑️ Deleting effect "${item.name}" (preset ID: ${effect.presetId})`);
              const result = await deleteWledPreset(
                activeDevice.ip,
                effect.presetId,
                activeDevice.protocol || 'http'
              );
              
              if (result.success) {
                onRemoveCustomEffect(item.id as number);
                results.success.push(item.name);
                console.log(`✅ Successfully deleted effect "${item.name}"`);
              } else {
                results.failed.push(`${item.name}: ${result.message || 'Unknown error'}`);
                console.error(`❌ Failed to delete effect "${item.name}":`, result.message);
              }
            } else {
              // Local effect only, remove from local state
              onRemoveCustomEffect(item.id as number);
              results.success.push(item.name);
            }
          } else if (item.type === 'playlist') {
            const playlist = savedPlaylists.find(p => p.id === item.id);
            if (playlist?.id) {
              console.log(`🗑️ Deleting playlist "${item.name}":`);
              console.log(`   - Playlist ID: ${playlist.id}`);
              console.log(`   - Preset ID: ${playlist.presetId}`);
              console.log(`   - Is WLED Playlist: ${playlist.isWledPlaylist}`);
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
                    activeDevice?.protocol || 'http'
                  );
                } catch (error) {
                  console.error(`⚠️ Error during playlist deletion for "${item.name}":`, error);
                  deletionResult = { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
                }
              } else {
                // Local playlist only
                deletionResult = { success: true };
              }
              
              if (deletionResult?.success) {
                onPlaylistRemove(item.id as number);
                results.success.push(item.name);
                console.log(`✅ Successfully deleted playlist "${item.name}"`);
                
                // Refresh presets to ensure UI is in sync with device
                if (onRefreshPresets) {
                  try {
                    await onRefreshPresets();
                    console.log(`🔄 Refreshed presets after deleting playlist "${item.name}"`);
                  } catch (refreshError) {
                    console.warn(`⚠️ Failed to refresh presets after deleting playlist "${item.name}":`, refreshError);
                  }
                }
              } else {
                results.failed.push(`${item.name}: ${deletionResult?.message || 'Unknown error'}`);
                console.error(`❌ Failed to delete playlist "${item.name}":`, deletionResult?.message);
              }
            } else {
              results.failed.push(`${item.name}: Playlist not found`);
            }
          }

          // Add small delay between deletions to prevent overwhelming the device
          if (i < selectedItems.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          results.failed.push(`${item.name}: ${errorMessage}`);
          console.error(`💥 Unexpected error deleting "${item.name}":`, error);
        }
      }

      // Show results summary
      let alertTitle = 'Deletion Complete';
      let alertMessage = '';

      if (results.success.length > 0) {
        alertMessage += `✅ Successfully deleted ${results.success.length} item${results.success.length !== 1 ? 's' : ''}`;
        if (results.failed.length === 0) {
          alertMessage += '.';
        } else {
          alertMessage += '\n\n';
        }
      }

      if (results.failed.length > 0) {
        alertTitle = results.success.length > 0 ? 'Deletion Partially Complete' : 'Deletion Failed';
        alertMessage += `❌ Failed to delete ${results.failed.length} item${results.failed.length !== 1 ? 's' : ''}:\n`;
        alertMessage += results.failed.map(item => `• ${item}`).join('\n');
      }

      Alert.alert(alertTitle, alertMessage, [{ text: 'OK' }]);

    } catch (error) {
      console.error('💥 Critical error in deletion queue:', error);
      Alert.alert(
        'Deletion Error', 
        'A critical error occurred during deletion. Some items may not have been deleted.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeletionInProgress(false);
      setDeletionProgress({ current: 0, total: 0, currentItem: '' });
      exitDeleteMode();
    }
  }, [customEffects, savedPlaylists, activeDevice, onRemoveCustomEffect, onPlaylistRemove, exitDeleteMode]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedForDelete.size === 0) return;

    const selectedItems: Array<{id: string | number, name: string, type: 'effect' | 'playlist'}> = [];
    
    // Collect selected playlists FIRST (delete playlists before effects they depend on)
    savedPlaylists.forEach(playlist => {
      if (selectedForDelete.has(playlist.id)) {
        selectedItems.push({
          id: playlist.id,
          name: playlist.name,
          type: 'playlist'
        });
      }
    });

    // Collect selected custom effects AFTER playlists
    customEffects.forEach(effect => {
      if (selectedForDelete.has(effect.id)) {
        selectedItems.push({
          id: effect.id,
          name: effect.name,
          type: 'effect'
        });
      }
    });

    if (selectedItems.length === 0) return;

    const itemList = selectedItems.map(item => `• ${item.name} (${item.type})`).join('\n');
    
    Alert.alert(
      'Delete Confirmation',
      `Are you sure you want to delete the following items?\n\n${itemList}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => processDeletionQueue(selectedItems),
        },
      ]
    );
  }, [selectedForDelete, customEffects, savedPlaylists, onRemoveCustomEffect, onPlaylistRemove, exitDeleteMode, activeDevice, processDeletionQueue]);

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
      setCooldownProgress(prev => {
        const newProgress = prev + (100 / 3000); // increment by 100ms/3000ms
        if (newProgress >= 1) {
          clearInterval(progressInterval);
          return 1;
        }
        return newProgress;
      });
    }, 100);

    try {
      console.log('🎲 Generating random custom effect...');
      
      // Detect WLED device dimensions first
      const detectWledDimensions = async (deviceIp: string): Promise<'1D' | '2D' | null> => {
        try {
          const response = await fetch(`http://${deviceIp}/settings/s.js?p=10`, {
            timeout: 5000,
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText || 'Unknown error'}`);
          }
          
          const responseText = await response.text();
          const sompMatch = responseText.match(/d\.Sf\.SOMP\.value\s*=\s*(\d+)/);
          
          if (sompMatch) {
            const sompValue = parseInt(sompMatch[1]);
            return sompValue === 0 ? '1D' : '2D';
          }
          return null;
        } catch (error) {
          console.error('Failed to detect WLED dimensions:', error);
          return null;
        }
      };

      // Get device effects and palettes
      const [effectsResponse, palettesResponse, deviceDimensions] = await Promise.all([
        fetch(`http://${activeDevice.ip}/json/eff`, { timeout: 8000 }),
        fetch(`http://${activeDevice.ip}/json/pal`, { timeout: 8000 }),
        detectWledDimensions(activeDevice.ip)
      ]);

      if (!effectsResponse.ok || !palettesResponse.ok) {
        throw new Error('Failed to fetch device data');
      }

      const [deviceEffects, devicePalettes] = await Promise.all([
        effectsResponse.json(),
        palettesResponse.json()
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
          
          if (deviceDimensions === '1D' && !lookupEffect.supports1D) {
            shouldInclude = false;
          } else if (deviceDimensions === '2D' && !lookupEffect.supports2D) {
            shouldInclude = false;
          }
          
          if (shouldInclude) {
            availableEffects.push(lookupEffect);
          }
        }
      });

      if (availableEffects.length === 0) {
        Alert.alert('No Effects Available', 'No compatible effects found for this device.');
        return;
      }

      // Select random effect
      const randomEffect = availableEffects[Math.floor(Math.random() * availableEffects.length)];
      console.log(`🎲 Selected random effect: "${randomEffect.name}" (ID: ${randomEffect.id})`);

      // Select random palette if effect supports palettes
      let randomPalette = null;
      let presetName = randomEffect.name;
      
      if (randomEffect.supportsPalette && devicePalettes.length > 0) {
        const randomPaletteIndex = Math.floor(Math.random() * devicePalettes.length);
        randomPalette = { id: randomPaletteIndex, name: devicePalettes[randomPaletteIndex] };
        presetName = `${randomEffect.name}+${randomPalette.name}`;
        console.log(`🎲 Selected random palette: "${randomPalette.name}" (ID: ${randomPalette.id})`);
      }

      console.log(`🎲 Generated preset name: "${presetName}"`);

      // Create the random custom effect preset
      const result = await createWledPreset(
        activeDevice.ip,
        randomEffect.id,
        randomPalette?.id || 0,
        presetName,
        undefined, // Let it auto-generate preset ID
        activeDevice.protocol || 'http'
      );

      if (result.success && result.presetId) {
        console.log(`🎲 Successfully created random custom effect with preset ID: ${result.presetId}`);
        
        // Generate gradient colors based on effect and palette
        const generateEffectGradient = (effectName: string, paletteName?: string): { colors: string[] } => {
          const effect = effectName.toLowerCase();
          
          // Effect-specific gradients
          if (effect.includes('fire')) {
            return { colors: ['#ff4500', '#ff6500', '#ffb347'] };
          }
          if (effect.includes('rainbow')) {
            return { colors: ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0077ff', '#4b0082'] };
          }
          if (effect.includes('ocean') || effect.includes('water') || effect.includes('blue')) {
            return { colors: ['#006994', '#47b5d6', '#87ceeb'] };
          }
          if (effect.includes('plasma')) {
            return { colors: ['#ff1493', '#00ffff', '#9400d3'] };
          }
          if (effect.includes('solid')) {
            return { colors: ['#6366f1', '#8b5cf6'] };
          }
          
          // Default gradient with variation
          const hash = effect.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
          const hue1 = hash % 360;
          const hue2 = (hash + 120) % 360;
          
          return {
            colors: [
              `hsl(${hue1}, 70%, 50%)`,
              `hsl(${hue2}, 70%, 60%)`
            ]
          };
        };

        const gradientData = generateEffectGradient(randomEffect.name, randomPalette?.name);
        
        // Add to local custom effects
        const newCustomEffect: CustomEffect = {
          id: result.presetId,
          presetId: result.presetId,
          name: presetName,
          effectName: randomEffect.name,
          effectId: randomEffect.id,
          paletteId: randomPalette?.id || 0,
          paletteName: randomPalette?.name || '',
          isWledPreset: true,
          linearGradientColors: gradientData.colors,
          gradient: `linear-gradient(135deg, ${gradientData.colors.join(', ')})`,
          isCustom: false
        };

        onAddCustomEffect(newCustomEffect);

        // Apply the effect immediately
        onPresetSelect(result.presetId);

        // Refresh presets to ensure sync
        if (onRefreshPresets) {
          await onRefreshPresets();
        }

        console.log(`🎲 Random effect created: "${presetName}" with effect "${randomEffect.name}"${randomPalette ? ` and palette "${randomPalette.name}"` : ''}.`);
      } else {
        throw new Error(result.message || 'Failed to create preset');
      }
    } catch (error) {
      console.error('🎲 Error generating random custom effect:', error);
      Alert.alert(
        'Failed to Generate Random Effect',
        error instanceof Error ? error.message : 'An unexpected error occurred.'
      );
    }
  }, [activeDevice, onAddCustomEffect, onPresetSelect, onRefreshPresets, isCooldownActive, cooldownAnimRef]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={textColor}
            colors={['#3b82f6']}
            progressBackgroundColor={cardBackground}
          />
        }
      >
        
        {/* Live View Section */}
        <View style={[styles.sectionCard, { backgroundColor: cardBackground, borderColor }]}>
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
                { backgroundColor: liveViewEnabled ? '#3b82f6' : borderColor }
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  { 
                    backgroundColor: '#ffffff',
                    marginLeft: liveViewEnabled ? 22 : 2
                  }
                ]}
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.sectionContent}>
            <View style={[styles.innerCard, { backgroundColor: isDark ? '#374151' : '#f9fafb', borderColor: isDark ? '#4b5563' : '#e5e7eb' }]}>
              <Animated.View style={[
                styles.cardContent,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }]
                }
              ]}>
                {activePresetData && (
                  <Text style={[styles.activePresetText, { color: textColor }]}>
                    Active: {activePresetData.name}
                  </Text>
                )}
                
                {/* Live LED Data */}
                {liveViewEnabled && !activeDevice?.isConnected && (
                  <View style={styles.disabledContainer}>
                    <Text style={[styles.disabledText, { color: '#ef4444' }]}>
                      Device offline - Connect to view LED data
                    </Text>
                  </View>
                )}
                {liveViewEnabled && activeDevice?.isConnected && liveLedData.length > 0 && (
                  <LEDVisualization 
                    ledData={liveLedData} 
                    subtextColor={subtextColor}
                    liveViewLedSize={liveViewLedSize}
                    showLedCount={true}
                  />
                )}

                {/* Brightness Slider */}
                {liveViewEnabled && activeDevice?.isConnected && (
                  <View style={styles.sliderContainer}>
                    <Ionicons name="sunny-outline" size={20} color={subtextColor} />
                    <Slider
                      key={`brightness-slider-${sliderKey}`}
                      ref={sliderRef}
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={255}
                      step={1}
                      defaultValue={currentBrightnessDisplay}
                      onSlidingStart={() => {
                        setIsSliding(true);
                        hasUserTouchedSlider.current = true;
                        console.log('🎯 User touched slider - now uncontrolled');
                      }}
                      onValueChange={(value) => {
                        // Only update display value - slider manages its own value internally
                        const roundedValue = Math.round(value);
                        setCurrentBrightnessDisplay(roundedValue);
                      }}
                      onSlidingComplete={(value) => {
                        const finalValue = Math.round(value);
                        console.log('🎯 Slider final value:', finalValue);
                        
                        // Send to WLED device
                        onBrightnessChange?.(finalValue);
                        setIsSliding(false);
                      }}
                      minimumTrackTintColor="#3b82f6"
                      maximumTrackTintColor={isDark ? '#4b5563' : '#e5e7eb'}
                      thumbTintColor={isDark ? '#ffffff' : '#3b82f6'}
                    />
                    <Text style={{color: subtextColor, fontSize: 12, width: 30, textAlign: 'right'}}>{currentBrightnessDisplay}</Text>
                  </View>
                )}
                
                {!liveViewEnabled && (
                  <View style={styles.disabledContainer}>
                    {!activeDevice?.isConnected ? (
                      <Text style={[styles.disabledText, { color: '#ef4444' }]}>
                        Device offline - Connect to view LED data
                      </Text>
                    ) : (
                      <Text style={[styles.disabledText, { color: subtextColor }]}>
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
                            <Text style={[styles.ledCount, { color: subtextColor, marginTop: 4 }]}>
                              {ledCount} LED{ledCount !== 1 ? 's' : ''} available
                            </Text>
                            {activeDevice?.wledInfo?.leds?.rgbw && (
                              <Text style={[styles.ledCount, { color: subtextColor, fontSize: 10, marginTop: 2 }]}>
                                RGBW LEDs supported
                              </Text>
                            )}
                          </View>
                        );
                      } else if (activeDevice?.isConnected) {
                        return (
                          <Text style={[styles.ledCount, { color: subtextColor, marginTop: 4, fontSize: 12 }]}>
                            Device connected - LED count not available
                          </Text>
                        );
                      } else {
                        return (
                          <Text style={[styles.ledCount, { color: subtextColor, marginTop: 4, fontSize: 12 }]}>
                            Device offline
                          </Text>
                        );
                      }
                    })()}
                  </View>
                )}
              </Animated.View>
            </View>
          </View>
        </View>

        {/* Seasonal Presets */}
        <View style={[styles.sectionCard, { backgroundColor: cardBackground, borderColor }]}>
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
              name={isSeasonalCollapsed ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={subtextColor}
            />
          </TouchableOpacity>
          
          {!isSeasonalCollapsed && (
            <View style={styles.sectionContent}>
              <View style={styles.presetGrid}>
                {seasonalPresets.map((preset, index) => (
                  <PresetCard
                    key={`seasonal-${preset.id}-${index}`}
                    preset={{
                      id: preset.presetId,
                      name: preset.name,
                      icon: preset.icon,
                      gradient: getSeasonalGradient(preset.name),
                      _animationDelay: index * 50
                    }}
                    isActive={activePreset?.toString() === preset.presetId.toString()}
                    onClick={() => onPresetSelect(preset.presetId)}
                    showIcon={true}
                    isDark={isDark}
                    isDeleteMode={false}
                    isSelected={false}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Custom Effects */}
        <View style={[styles.sectionCard, { backgroundColor: cardBackground, borderColor }]}>
          <TouchableOpacity
            onPress={() => setIsCustomEffectsCollapsed(!isCustomEffectsCollapsed)}
            style={styles.sectionHeader}
          >
            <View style={styles.headerLeft}>
              <Ionicons name="color-palette" size={20} color={textColor} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Custom Effects ({customEffects.length})
              </Text>
            </View>
            <Ionicons
              name={isCustomEffectsCollapsed ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={subtextColor}
            />
          </TouchableOpacity>
          
          {!isCustomEffectsCollapsed && (
            <View style={styles.sectionContent}>
              {/* Random Custom Effect Button */}
              {activeDevice?.isConnected && (
                <View style={[styles.randomEffectContainer, { marginBottom: 16 }]}>
                  <TouchableOpacity
                    onPress={isCooldownActive ? undefined : generateRandomCustomEffect}
                    disabled={isCooldownActive}
                    style={[
                      styles.randomEffectButton, 
                      { 
                        backgroundColor: isCooldownActive 
                          ? (isDark ? '#4b5563' : '#e5e7eb')
                          : (isDark ? '#374151' : '#f3f4f6'),
                        borderColor: isDark ? '#6b7280' : '#d1d5db',
                        opacity: isCooldownActive ? 0.6 : 1
                      }
                    ]}
                  >
                    <View style={styles.randomEffectButtonContent}>
                      <Ionicons 
                        name="dice" 
                        size={18} 
                        color={isCooldownActive ? subtextColor : textColor} 
                      />
                      <Text style={[
                        styles.randomEffectButtonText, 
                        { color: isCooldownActive ? subtextColor : textColor }
                      ]}>
                        {isCooldownActive ? `Cooldown (${Math.ceil(3 - cooldownProgress * 3)}s)` : 'Generate Random Effect'}
                      </Text>
                    </View>
                    {isCooldownActive && (
                      <Animated.View 
                        style={[
                          styles.cooldownProgress,
                          {
                            width: cooldownAnimRef.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%']
                            }),
                            backgroundColor: '#3b82f6'
                          }
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              )}
              {!activeDevice?.isConnected ? (
                <View style={styles.infoCard}>
                  <Ionicons name="wifi-outline" size={24} color={subtextColor} style={styles.infoIcon} />
                  <Text style={[styles.infoText, { color: subtextColor }]}>
                    Connect to a WLED device to load available effects
                  </Text>
                </View>
              ) : (
                <View>
                  {customEffects.length > 0 ? (
                    <View style={styles.presetGrid}>
                      {customEffects.map((preset, index) => (
                        <PresetCard
                          key={`device-${preset.id}-${index}`}
                          preset={{...preset, _animationDelay: index * 50}}
                          isActive={activePreset?.toString() === preset.id.toString()}
                          onClick={onPresetSelect}
                          showIcon={false}
                          isDark={isDark}
                          isDeleteMode={isDeleteMode}
                          isSelected={selectedForDelete.has(preset.id)}
                          onToggleSelection={toggleCardSelection}
                          wiggleAnim={wiggleAnim}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.infoCard}>
                      <Ionicons name="color-palette-outline" size={24} color={subtextColor} style={styles.infoIcon} />
                      <Text style={[styles.infoText, { color: subtextColor }]}>
                        No presets or custom effects found.
                      </Text>
                      <Text style={[styles.infoSubtext, { color: subtextColor }]}>
                        Save presets on your WLED device or create custom effects here.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Playlists */}
        <View style={[styles.sectionCard, { backgroundColor: cardBackground, borderColor }]}>
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
              name={isPlaylistsCollapsed ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={subtextColor}
            />
          </TouchableOpacity>

          {!isPlaylistsCollapsed && (
            <View style={styles.sectionContent}>
              {isLoadingPlaylists ? (
                // Loading state - brief empty state for smooth transition
                <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
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
                customEffects.length === 0 && (
                  <View style={styles.infoCard}>
                    <Ionicons name="play-outline" size={24} color={subtextColor} style={styles.infoIcon} />
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
        <View style={[styles.floatingDropdown, { backgroundColor: `${cardBackground}CC`, borderColor }]}>
          {/* On/Off Button */}
          <TouchableOpacity
            onPress={() => handleDeviceToggle(!activeDevice?.wledInfo?.on)}
            disabled={!activeDevice?.isConnected || isTogglingDevice}
            style={[
              styles.powerButton,
              {
                backgroundColor: activeDevice?.wledInfo?.on ? '#10b981' : '#6b7280',
                opacity: (!activeDevice?.isConnected || isTogglingDevice) ? 0.5 : 1
              }
            ]}
          >
            {isTogglingDevice ? (
              <Ionicons name="refresh" size={20} color="#ffffff" style={{ transform: [{ rotate: '180deg' }] }} />
            ) : (
              <Ionicons
                name={activeDevice?.wledInfo?.on ? 'power' : 'power-outline'}
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
                  { backgroundColor: activeDevice?.isConnected ? '#10b981' : '#ef4444' }
                ]}
              />
              <Text style={[styles.dropdownText, { color: textColor }]} numberOfLines={1}>
                {activeDevice?.name || 'No Device'}
              </Text>
              <Ionicons
                name={showDeviceDropdown ? 'chevron-up' : 'chevron-down'}
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
            style={[styles.deleteActionButton, styles.cancelButton, { backgroundColor: isDark ? '#4b5563' : '#f3f4f6' }]}
          >
            <Text style={[styles.deleteActionText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleDeleteSelected}
            disabled={selectedForDelete.size === 0}
            style={[
              styles.deleteActionButton, 
              { 
                backgroundColor: selectedForDelete.size === 0 ? '#9ca3af' : '#ef4444',
                opacity: selectedForDelete.size === 0 ? 0.5 : 1
              }
            ]}
          >
            <Text style={[styles.deleteActionText, { color: 'white' }]}>
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
          <View style={[styles.dropdownModal, { backgroundColor: cardBackground }]}>
            <Text style={[styles.dropdownTitle, { color: textColor }]}>Select Device</Text>
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
                  index < devices.length - 1 ? { borderBottomWidth: 1, borderBottomColor: borderColor } : { borderBottomWidth: 0 },
                  device.id === activeDeviceId && { backgroundColor: isDark ? '#374151' : '#f3f4f6' }
                ]}
              >
                <View 
                  style={[
                    styles.statusDot, 
                    { backgroundColor: device.isConnected ? '#10b981' : '#ef4444' }
                  ]} 
                />
                <Text style={[styles.deviceOptionText, { color: textColor }]}>
                  {device.name}
                </Text>
                {device.id === activeDeviceId && (
                  <Ionicons name="checkmark" size={20} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
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
              bottom: 260,
            }
          ]}
          pointerEvents={showFabOptions ? 'auto' : 'none'}
        >
          <TouchableOpacity
            onPress={() => {
              closeFabAndOpenModal(() => setShowCreateNewOptions(true));
            }}
            style={[
              styles.miniFabButton,
              { 
                backgroundColor: '#10b981',
                shadowColor: isDark ? '#000' : '#10b981'
              }
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
            }
          ]}
          pointerEvents={showFabOptions ? 'auto' : 'none'}
        >
          <TouchableOpacity
            onPress={() => {
              closeFabAndOpenModal(() => setShowDeviceManagementModal(true));
            }}
            style={[
              styles.miniFabButton,
              { 
                backgroundColor: '#f59e0b',
                shadowColor: isDark ? '#000' : '#f59e0b'
              }
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
            }
          ]}
          pointerEvents={showFabOptions ? 'auto' : 'none'}
        >
          <TouchableOpacity
            onPress={() => {
              closeFabAndOpenModal(() => enterDeleteMode());
            }}
            style={[
              styles.miniFabButton,
              { 
                backgroundColor: '#ef4444',
                shadowColor: isDark ? '#000' : '#ef4444'
              }
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
            }
          ]}
          pointerEvents={showFabOptions ? 'auto' : 'none'}
        >
          <TouchableOpacity
            onPress={() => {
              closeFabAndOpenModal(() => setShowSettings(true));
            }}
            style={[
              styles.miniFabButton,
              { 
                backgroundColor: '#6b7280',
                shadowColor: isDark ? '#000' : '#6b7280'
              }
            ]}
          >
            <Ionicons name="settings" size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>

        {/* Main FAB */}
        <Animated.View
          style={[
            styles.floatingButton,
            {
              transform: [{
                rotate: fabRotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg']
                })
              }]
            }
          ]}
        >
          <TouchableOpacity
            onPress={toggleFabOptions}
            disabled={false}
            activeOpacity={0.8}
            style={[
              styles.mainFabButton,
              { 
                backgroundColor: '#3b82f6',
                shadowColor: isDark ? '#000' : '#3b82f6',
                opacity: 1
              }
            ]}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="white" />
          </TouchableOpacity>
        </Animated.View>
        </View>
      )}

      {/* Create New Options Modal */}
      {showCreateNewOptions && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowCreateNewOptions(false)}
          style={styles.fabOverlay}
        >
          <View style={[styles.fabOptionsContainer, { backgroundColor: cardBackground }]}>
            <Text style={[styles.fabTitle, { color: textColor }]}>Create New</Text>
            
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
            
            {customEffects.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setShowCreateNewOptions(false);
                  closeFabAndOpenModal(() => setShowPlaylistCreationModal(true));
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
      )}

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
        device={activeDevice || { 
          id: 0, 
          ip: '', 
          name: 'Unknown Device', 
          protocol: 'http', 
          isConnected: false, 
          isPlaying: false, 
          autoBrightness: false, 
          maxBrightness: 255 
        }}
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

      {/* Deletion Progress Modal */}
      {isDeletionInProgress && (
        <View style={styles.deletionProgressOverlay}>
          <View style={[styles.deletionProgressModal, { backgroundColor: cardBackground }]}>
            <Text style={[styles.deletionProgressTitle, { color: textColor }]}>
              Deleting Items...
            </Text>
            <Text style={[styles.deletionProgressText, { color: subtextColor }]}>
              {deletionProgress.current} of {deletionProgress.total}
            </Text>
            {deletionProgress.currentItem && (
              <Text style={[styles.deletionProgressItem, { color: subtextColor }]} numberOfLines={1}>
                {deletionProgress.currentItem}
              </Text>
            )}
            <View style={[styles.progressBar, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${(deletionProgress.current / deletionProgress.total) * 100}%`,
                    backgroundColor: '#3b82f6'
                  }
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
    overflow: 'visible',
  },
  sectionContent: {
    marginTop: 8,
    overflow: 'visible',
  },
  innerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 80,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
  },
  activePresetText: {
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 8,
  },
  ledContainer: {
    marginTop: 12,
  },
  ledGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: 20, // Revert to original minHeight
  },
  ledPill: {
    width: 6,
    height: 11,
    marginRight: 2,
    marginBottom: 2,
    borderRadius: 2,
    borderWidth: 0.2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 5, // Keep a default elevation for Android shadow
  },
  ledCount: {
    fontSize: 12,
    marginTop: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  dynamicLedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    minHeight: 20,
  },
  disabledText: {
    fontSize: 14,
    marginTop: 8,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  presetCard: {
    borderRadius: 8,
    padding: 8,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledContainer: {
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  cardTitle: {
    fontWeight: '500',
    fontSize: 10,
    color: 'white',
    textAlign: 'center',
    marginBottom: 1,
  },
  cardPresetId: {
    fontSize: 8,
    color: 'white',
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 8,
    opacity: 0.75,
    color: 'white',
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  infoCard: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  infoIcon: {
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
  },
  infoSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  playlistItem: {
    width: '22%',
    margin: '1.5%',
  },
  playlistCard: {
    borderRadius: 8,
    padding: 8,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistName: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 1,
  },
  playlistId: {
    color: 'white',
    fontSize: 8,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 2,
  },
  playlistCount: {
    color: 'white',
    fontSize: 8,
    opacity: 0.75,
    textAlign: 'center',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },
  gradientContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  touchableArea: {
    flex: 1,
  },
  floatingDropdown: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 100,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 20,
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
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002,
  },
  dropdownModal: {
    borderRadius: 12,
    padding: 16,
    minWidth: 250,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  deviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  deviceOptionText: {
    fontSize: 16,
    marginLeft: 8,
    flex: 1,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 1000,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniFab: {
    position: 'absolute',
    right: 8,
  },
  miniFabButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  fabOptionsContainer: {
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  fabTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  fabOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  fabOptionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  deleteOverlay: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
  },
  deleteXButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteActionContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    zIndex: 1000,
  },
  deleteActionButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  deleteActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  diceButton: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  deletionProgressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1003,
  },
  deletionProgressModal: {
    borderRadius: 12,
    padding: 24,
    minWidth: 280,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  deletionProgressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  deletionProgressText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  deletionProgressItem: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  randomEffectContainer: {
    alignItems: 'center',
  },
  randomEffectButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    minWidth: 200,
  },
  randomEffectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  randomEffectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  cooldownProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#3b82f6',
    opacity: 0.2,
    zIndex: 0,
  },
});