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
  Easing,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../utils/logger';
import { SEASONAL_PRESETS } from '../constants/presets';
import { 
  WledDevice, 
  CustomEffect, 
  SavedPlaylist, 
  LEDColor 
} from '../types';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { deleteWledPreset, deleteWledPlaylistViaWebSocket } from '../config/wledApi';
import CustomEffectsModal from './CustomEffectsModal';
import PlaylistCreationModal from './PlaylistCreationModal';

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

  const cardStyle = useMemo(() => [
    styles.playlistCard,
    { backgroundColor: '#8b5cf6' },
    playlist.isActive && !isDeleteMode && { borderWidth: 2, borderColor: '#3b82f6' },
    isSelected && { borderWidth: 3, borderColor: '#ef4444' }
  ], [playlist.isActive, isDeleteMode, isSelected]);
  
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
          <Text style={styles.playlistName}>
            {playlist.name}
          </Text>
          <Text style={styles.playlistCount}>
            {playlist.items?.length || 0} effects
          </Text>
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

interface DynamicLEDVisualizationProps {
  ledData: LEDColor[];
  subtextColor: string;
}

function DynamicLEDVisualization({ ledData, subtextColor }: DynamicLEDVisualizationProps) {
  const screenWidth = Dimensions.get('window').width - 48; // Account for padding
  const ledCount = ledData.length;
  
  // Calculate optimal LED size and layout based on count
  const getOptimalLayout = (count: number) => {
    if (count <= 20) {
      // Linear layout for small counts
      return {
        type: 'linear',
        ledSize: Math.min(Math.floor(screenWidth / count) - 2, 12),
        columns: count,
        spacing: 2
      };
    } else if (count <= 100) {
      // Grid layout for medium counts
      const columns = Math.ceil(Math.sqrt(count));
      const ledSize = Math.min(Math.floor(screenWidth / columns) - 2, 8);
      return {
        type: 'grid',
        ledSize,
        columns,
        spacing: 2
      };
    } else if (count <= 300) {
      // Dense grid for larger counts
      const columns = Math.ceil(Math.sqrt(count));
      const ledSize = Math.min(Math.floor(screenWidth / columns) - 1, 4);
      return {
        type: 'dense',
        ledSize,
        columns,
        spacing: 1
      };
    } else {
      // Matrix visualization for very large counts
      const columns = Math.min(Math.ceil(Math.sqrt(count)), 40);
      const ledSize = Math.max(Math.floor(screenWidth / columns) - 1, 2);
      return {
        type: 'matrix',
        ledSize,
        columns,
        spacing: 0.5
      };
    }
  };
  
  const layout = getOptimalLayout(ledCount);
  
  const renderLED = (color: LEDColor, index: number) => {
    const brightness = (color.r + color.g + color.b) / 3 / 255;
    const isActive = brightness > 0.1; // Consider LED "active" if it's not very dim
    
    return (
      <View
        key={index}
        style={[
          {
            width: layout.ledSize,
            height: layout.ledSize,
            marginRight: layout.spacing,
            marginBottom: layout.spacing,
            borderRadius: layout.type === 'matrix' ? 0.5 : Math.min(layout.ledSize / 3, 2),
            backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
            shadowColor: isActive ? `rgb(${color.r}, ${color.g}, ${color.b})` : 'transparent',
            shadowOpacity: isActive ? Math.min(brightness * 0.8, 0.6) : 0,
            shadowRadius: Math.min(layout.ledSize / 2, 3),
            elevation: isActive ? 2 : 0,
          }
        ]}
      >
        {/* LED highlight effect for active LEDs */}
        {isActive && layout.ledSize > 4 && (
          <View
            style={{
              position: 'absolute',
              top: 0.5,
              left: 0.5,
              borderRadius: Math.min(layout.ledSize / 4, 1),
              height: Math.min(layout.ledSize / 3, 3),
              width: Math.min(layout.ledSize / 2, 2),
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
            }}
          />
        )}
      </View>
    );
  };
  
  return (
    <View style={styles.ledContainer}>
      <View style={[
        styles.dynamicLedGrid, 
        { 
          flexDirection: layout.type === 'linear' ? 'row' : 'row',
          maxWidth: screenWidth,
        }
      ]}>
        {ledData.map((color, index) => renderLED(color, index))}
      </View>
      <Text style={[styles.ledCount, { color: subtextColor }]}>
        {ledCount} LED{ledCount !== 1 ? 's' : ''} live
      </Text>
    </View>
  );
}

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
  const pressAnim = useRef(new Animated.Value(1)).current;
  
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
  
  // Simplified active state - no complex animations for now
  useEffect(() => {
    // Just a simple scale animation when active
    if (isActive) {
      Animated.spring(pressAnim, {
        toValue: 1.02,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(pressAnim, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive]);
  
  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.95,
      tension: 200,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      tension: 200,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };
  
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
      { scale: pressAnim },
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

  const staticCardStyle = {
    borderColor: isSelected ? '#ef4444' : (isActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)'),
    borderWidth: isSelected ? 3 : 2,
    shadowColor: isSelected ? '#ef4444' : (isActive ? '#3b82f6' : '#000'),
    shadowOpacity: isSelected ? 0.6 : (isActive ? 0.4 : 0.1),
    elevation: isSelected ? 12 : (isActive ? 8 : 2),
  };

  if (shouldUseGradient && hasValidGradient) {
    // Use LinearGradient for device presets with gradients
    return (
      <Animated.View style={[animatedTransformStyle, cardItemStyle]}>
        <View style={[styles.presetCard, staticCardStyle]}>
        <TouchableOpacity
          onPress={handleCardPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.touchableArea}
          activeOpacity={0.8}
        >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientBackground, { borderRadius: 8 }]}
        >
          <View style={styles.cardOverlay} />
          <View style={styles.cardContent}>
            {showIcon && (
              <Text style={styles.cardIcon}>{preset.icon}</Text>
            )}
            <Text style={styles.cardTitle}>
              {preset.name}
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
        </LinearGradient>
        </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // Use solid background for seasonal presets or presets without gradients
  return (
    <Animated.View style={[animatedTransformStyle, cardItemStyle]}>
      <View 
        style={[
          styles.presetCard,
          staticCardStyle,
          {
            backgroundColor: preset.gradient ? extractPrimaryColor(preset.gradient) : '#6366f1',
          }
        ]}
      >
      <TouchableOpacity
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.touchableArea}
        activeOpacity={0.8}
      >
      <View style={styles.cardOverlay} />
      <View style={styles.cardContent}>
        {showIcon && (
          <Text style={styles.cardIcon}>{preset.icon}</Text>
        )}
        <Text style={styles.cardTitle}>
          {preset.name}
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
      </TouchableOpacity>
      </View>
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
  devices?: WledDevice[];
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
  onShowDeviceManagement: () => void;
  liveLedData: LEDColor[];
  liveViewEnabled: boolean;
  onLiveViewToggle: (enabled: boolean) => void;
  onLiveLedDataUpdate?: (ledData: LEDColor[]) => void;
  onRefreshPresets?: () => Promise<void>;
  onSavePlaylist?: (playlist: SavedPlaylist) => void;
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
  onShowDeviceManagement,
  liveLedData,
  liveViewEnabled,
  onLiveViewToggle,
  onLiveLedDataUpdate,
  onRefreshPresets,
  onSavePlaylist,
}: PresetGridProps) {
  
  const [isSeasonalCollapsed, setIsSeasonalCollapsed] = useState(true);
  const [isCustomEffectsCollapsed, setIsCustomEffectsCollapsed] = useState(true);
  const [isPlaylistsCollapsed, setIsPlaylistsCollapsed] = useState(false);
  const [showCustomEffectsModal, setShowCustomEffectsModal] = useState(false);
  const [showPlaylistCreationModal, setShowPlaylistCreationModal] = useState(false);
  const [showFabOptions, setShowFabOptions] = useState(false);
  const [showCreateNewOptions, setShowCreateNewOptions] = useState(false);
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string | number>>(new Set());
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(liveViewEnabled ? 1 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fabRotateAnim = useRef(new Animated.Value(0)).current;
  const fabScaleAnim1 = useRef(new Animated.Value(0)).current;
  const fabScaleAnim2 = useRef(new Animated.Value(0)).current;
  const fabScaleAnim3 = useRef(new Animated.Value(0)).current;
  const fabScaleAnim4 = useRef(new Animated.Value(0)).current;
  const wiggleAnim = useRef(new Animated.Value(0)).current;
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

  // Device presets are now loaded by the parent KoloriApp component
  // This component receives them via the customEffects prop

  // Note: WebSocket connection is handled by the parent KoloriApp component
  // Live LED data is passed down via props and updated through onLiveLedDataUpdate

  const activePresetData = [...SEASONAL_PRESETS, ...customEffects].find(
    (p) => p.id.toString() === activePreset?.toString()
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

  const handleRefresh = useCallback(async () => {
    if (!onRefreshPresets || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefreshPresets();
    } catch (error) {
      logger.error('Failed to refresh presets:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshPresets, isRefreshing]);

  const toggleFabOptions = useCallback(() => {
    const newValue = !showFabOptions;
    setShowFabOptions(newValue);
    
    if (newValue) {
      // Expand animation - faster
      Animated.parallel([
        Animated.timing(fabRotateAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.stagger(50, [
          Animated.spring(fabScaleAnim4, {
            toValue: 1,
            tension: 200,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.spring(fabScaleAnim3, {
            toValue: 1,
            tension: 200,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.spring(fabScaleAnim2, {
            toValue: 1,
            tension: 200,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.spring(fabScaleAnim1, {
            toValue: 1,
            tension: 200,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      // Collapse animation
      Animated.parallel([
        Animated.timing(fabRotateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.stagger(40, [
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
      ]).start();
    }
  }, [showFabOptions, fabRotateAnim, fabScaleAnim1, fabScaleAnim2, fabScaleAnim3, fabScaleAnim4]);

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
    
    // Animate FAB options closed
    Animated.parallel([
      Animated.timing(fabRotateAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.parallel([
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
      setShowFabOptions(false);
    });
  }, [wiggleAnim, fabRotateAnim, fabScaleAnim1, fabScaleAnim2, fabScaleAnim3, fabScaleAnim4]);

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

  const handleDeleteSelected = useCallback(() => {
    if (selectedForDelete.size === 0) return;

    const selectedItems: Array<{id: string | number, name: string, type: 'effect' | 'playlist'}> = [];
    
    // Collect selected custom effects
    customEffects.forEach(effect => {
      if (selectedForDelete.has(effect.id)) {
        selectedItems.push({
          id: effect.id,
          name: effect.name,
          type: 'effect'
        });
      }
    });

    // Collect selected playlists
    savedPlaylists.forEach(playlist => {
      if (selectedForDelete.has(playlist.id)) {
        selectedItems.push({
          id: playlist.id,
          name: playlist.name,
          type: 'playlist'
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
          onPress: async () => {
            // Delete custom effects from WLED device
            const effectsToDelete = selectedItems.filter(item => item.type === 'effect');
            for (const item of effectsToDelete) {
              const effect = customEffects.find(e => e.id === item.id);
              if (effect?.presetId && activeDevice?.ip) {
                try {
                  const result = await deleteWledPreset(
                    activeDevice.ip,
                    effect.presetId,
                    activeDevice.protocol || 'http'
                  );
                  if (!result.success) {
                    logger.error(`Failed to delete preset ${effect.presetId} from WLED:`, result.message);
                  }
                } catch (error) {
                  logger.error(`Error deleting preset ${effect.presetId}:`, error);
                }
              }
              // Remove from local state
              onRemoveCustomEffect(item.id as number);
            }

            // Delete playlists from WLED device
            const playlistsToDelete = selectedItems.filter(item => item.type === 'playlist');
            for (const item of playlistsToDelete) {
              const playlist = savedPlaylists.find(p => p.id === item.id);
              if (playlist?.id) {
                try {
                  // Try WebSocket deletion first, then fallback to HTTP if needed
                  const result = await deleteWledPlaylistViaWebSocket(playlist.id as number);
                  if (!result.success && activeDevice?.ip) {
                    // Fallback to HTTP deletion
                    const httpResult = await deleteWledPreset(
                      activeDevice.ip,
                      playlist.id as number,
                      activeDevice.protocol || 'http'
                    );
                    if (!httpResult.success) {
                      logger.error(`Failed to delete playlist ${playlist.id} from WLED:`, httpResult.message);
                    }
                  }
                } catch (error) {
                  logger.error(`Error deleting playlist ${playlist.id}:`, error);
                }
              }
              // Remove from local state
              onPlaylistRemove(item.id as number);
            }

            exitDeleteMode();
          },
        },
      ]
    );
  }, [selectedForDelete, customEffects, savedPlaylists, onRemoveCustomEffect, onPlaylistRemove, exitDeleteMode, activeDevice]);

  // Start wiggle animation when entering delete mode
  useEffect(() => {
    if (isDeleteMode) {
      startWiggleAnimation();
    }
  }, [isDeleteMode, startWiggleAnimation]);

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
                {liveViewEnabled && liveLedData.length > 0 && (
                  <DynamicLEDVisualization 
                    ledData={liveLedData} 
                    subtextColor={subtextColor}
                  />
                )}
                
                {!liveViewEnabled && (
                  <View style={styles.disabledContainer}>
                    <Text style={[styles.disabledText, { color: subtextColor }]}>
                      Live view disabled
                    </Text>
                    {activeDevice?.wledInfo?.leds?.count ? (
                      <View>
                        <Text style={[styles.ledCount, { color: subtextColor, marginTop: 4 }]}>
                          {activeDevice.wledInfo.leds.count} LED{activeDevice.wledInfo.leds.count !== 1 ? 's' : ''} available
                        </Text>
                        {activeDevice.wledInfo.leds.rgbw && (
                          <Text style={[styles.ledCount, { color: subtextColor, fontSize: 10, marginTop: 2 }]}>
                            RGBW LEDs supported
                          </Text>
                        )}
                      </View>
                    ) : activeDevice?.isConnected ? (
                      <Text style={[styles.ledCount, { color: subtextColor, marginTop: 4, fontSize: 12 }]}>
                        Device connected - LED count not available
                      </Text>
                    ) : (
                      <Text style={[styles.ledCount, { color: subtextColor, marginTop: 4, fontSize: 12 }]}>
                        Device offline
                      </Text>
                    )}
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
                {SEASONAL_PRESETS.map((preset, index) => (
                  <PresetCard
                    key={preset.id}
                    preset={{...preset, _animationDelay: index * 50}}
                    isActive={activePreset?.toString() === preset.id.toString()}
                    onClick={onPresetSelect}
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
                          key={`device-${preset.id}`}
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
                      key={playlist.id}
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

      {/* Floating Device Dropdown - Hidden in delete mode */}
      {!isDeleteMode && (
        <View style={[styles.floatingDropdown, { backgroundColor: `${cardBackground}CC`, borderColor }]}>
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
                key={device.id}
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
        >
          <TouchableOpacity
            onPress={() => {
              toggleFabOptions();
              setShowCreateNewOptions(true);
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
        >
          <TouchableOpacity
            onPress={() => {
              toggleFabOptions();
              onShowDeviceManagement();
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
        >
          <TouchableOpacity
            onPress={() => {
              toggleFabOptions();
              enterDeleteMode();
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
        >
          <TouchableOpacity
            onPress={() => {
              toggleFabOptions();
              setShowSettings(true);
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
            style={[
              styles.mainFabButton,
              { 
                backgroundColor: '#3b82f6',
                shadowColor: isDark ? '#000' : '#3b82f6'
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
                setShowCustomEffectsModal(true);
                // Close FAB options
                Animated.parallel([
                  Animated.timing(fabRotateAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                  }),
                  Animated.parallel([
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
                  setShowFabOptions(false);
                });
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
                  setShowPlaylistCreationModal(true);
                  // Close FAB options
                  Animated.parallel([
                    Animated.timing(fabRotateAnim, {
                      toValue: 0,
                      duration: 200,
                      useNativeDriver: true,
                    }),
                    Animated.parallel([
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
                    setShowFabOptions(false);
                  });
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
    marginTop: 12,
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
    marginBottom: 16,
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
    marginTop: 8,
    overflow: 'visible',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  presetCard: {
    borderRadius: 8,
    overflow: 'visible',
    position: 'relative',
    aspectRatio: 1,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
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
  },
  cardSubtitle: {
    fontSize: 8,
    opacity: 0.75,
    color: 'white',
    textAlign: 'center',
    marginTop: 2,
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
    marginTop: 8,
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
    marginBottom: 2,
  },
  playlistCount: {
    color: 'white',
    fontSize: 8,
    opacity: 0.75,
  },
  gradientBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchableArea: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  dropdownButton: {
    flex: 1,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
});