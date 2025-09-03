// PresetGrid Component for React Native
// Clean implementation with consistent theming

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
  StyleSheet
} from 'react-native';
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
}

function PresetCard({ preset, isActive, onClick, showIcon = false, isDark = false }: PresetCardProps) {
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - 48) / 3 - 8; // 3 columns with padding

  return (
    <TouchableOpacity
      onPress={() => onClick(preset.id)}
      style={[
        styles.presetCard,
        {
          width: cardWidth,
          borderColor: isActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
          backgroundColor: '#6366f1',
          shadowColor: isActive ? '#3b82f6' : '#000',
          shadowOpacity: isActive ? 0.3 : 0.1,
          elevation: isActive ? 8 : 2,
        }
      ]}
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
      {isActive && (
        <View style={styles.activeIndicator}>
          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

interface PresetGridProps {
  activePreset: string | number | null;
  onPresetSelect: (presetId: string | number) => void;
  isDark: boolean;
  currentPlaylist: any[];
  onShowPlaylist: () => void;
  activeDevice: WledDevice | undefined;
  customEffects: CustomEffect[];
  onAddCustomEffect: (effect: CustomEffect) => void;
  onRemoveCustomEffect: (effectId: number) => void;
  onCustomEffectUpdate: (effects: CustomEffect[]) => void;
  savedPlaylists: SavedPlaylist[];
  onPlaylistEdit: (playlist: SavedPlaylist) => void;
  onPlaylistRemove: (playlistId: number) => void;
  onPlaylistSelect: (playlistId: number) => void;
  setShowSettings: (show: boolean) => void;
  liveLedData: LEDColor[];
  liveViewEnabled: boolean;
  onLiveViewToggle: (enabled: boolean) => void;
  onLiveLedDataUpdate?: (ledData: LEDColor[]) => void;
}

export default function PresetGrid({
  activePreset,
  onPresetSelect,
  isDark,
  currentPlaylist,
  onShowPlaylist,
  activeDevice,
  customEffects = [],
  onAddCustomEffect,
  onRemoveCustomEffect,
  onCustomEffectUpdate,
  savedPlaylists = [],
  onPlaylistEdit,
  onPlaylistRemove,
  onPlaylistSelect,
  setShowSettings,
  liveLedData,
  liveViewEnabled,
  onLiveViewToggle,
  onLiveLedDataUpdate,
}: PresetGridProps) {
  
  const [isSeasonalCollapsed, setIsSeasonalCollapsed] = useState(true);
  const [isCustomEffectsCollapsed, setIsCustomEffectsCollapsed] = useState(true);
  const [isPlaylistsCollapsed, setIsPlaylistsCollapsed] = useState(false);
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
    if (onLiveViewToggle) {
      onLiveViewToggle(newValue);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* Live View Section */}
        <View style={styles.section}>
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
          
          <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.cardContent}>
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
            </View>
          </View>
        </View>

        {/* Seasonal Presets */}
        <View style={styles.section}>
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
            <View style={styles.presetGrid}>
              {SEASONAL_PRESETS.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isActive={activePreset?.toString() === preset.id.toString()}
                  onClick={onPresetSelect}
                  showIcon={true}
                  isDark={isDark}
                />
              ))}
            </View>
          )}
        </View>

        {/* Custom Effects */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => setIsCustomEffectsCollapsed(!isCustomEffectsCollapsed)}
            style={styles.sectionHeader}
          >
            <View style={styles.headerLeft}>
              <Ionicons name="color-palette" size={20} color={textColor} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Custom Effects
              </Text>
            </View>
            <Ionicons
              name={isCustomEffectsCollapsed ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={subtextColor}
            />
          </TouchableOpacity>
          
          {!isCustomEffectsCollapsed && (
            <View>
              {!activeDevice?.isConnected ? (
                <View style={[styles.infoCard, { backgroundColor: cardBackground, borderColor }]}>
                  <Ionicons name="wifi-outline" size={24} color={subtextColor} style={styles.infoIcon} />
                  <Text style={[styles.infoText, { color: subtextColor }]}>
                    Connect to a WLED device to load available effects
                  </Text>
                </View>
              ) : loadingPresets ? (
                <View style={[styles.infoCard, { backgroundColor: cardBackground, borderColor }]}>
                  <Ionicons name="refresh" size={24} color={subtextColor} style={styles.infoIcon} />
                  <Text style={[styles.infoText, { color: subtextColor }]}>
                    Loading presets from device...
                  </Text>
                </View>
              ) : (
                <View>
                  {/* Add Effect Button */}
                  <TouchableOpacity
                    onPress={() => {
                      logger.log('Effect creation modal not yet implemented');
                    }}
                    style={[styles.addButton, { backgroundColor: cardBackground, borderColor: subtextColor }]}
                  >
                    <Ionicons name="add" size={20} color={subtextColor} />
                    <Text style={[styles.addButtonText, { color: subtextColor }]}>
                      Add Custom Effect
                    </Text>
                  </TouchableOpacity>

                  {/* Device Presets (from WLED device) */}
                  {customEffects.length > 0 ? (
                    <View>
                      <Text style={[styles.sectionSubtitle, { color: subtextColor, marginBottom: 8 }]}>
                        Device Presets ({customEffects.length})
                      </Text>
                      <View style={styles.presetGrid}>
                        {customEffects.map((preset) => (
                          <PresetCard
                            key={`device-${preset.id}`}
                            preset={preset}
                            isActive={activePreset?.toString() === preset.id.toString()}
                            onClick={onPresetSelect}
                            showIcon={false}
                            isDark={isDark}
                          />
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.infoCard, { backgroundColor: cardBackground, borderColor }]}>
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
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => setIsPlaylistsCollapsed(!isPlaylistsCollapsed)}
            style={styles.sectionHeader}
          >
            <View style={styles.headerLeft}>
              <Ionicons name="list" size={20} color={textColor} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Playlists
              </Text>
            </View>
            <Ionicons
              name={isPlaylistsCollapsed ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={subtextColor}
            />
          </TouchableOpacity>

          {!isPlaylistsCollapsed && (
            <View>
              {/* Create Playlist Button */}
              {customEffects.length > 0 && (
                <TouchableOpacity
                  onPress={onShowPlaylist}
                  style={[styles.createButton, { backgroundColor: isDark ? '#1e3a8a' : '#dbeafe' }]}
                >
                  <Ionicons name="play" size={18} color={isDark ? '#93c5fd' : '#1d4ed8'} />
                  <Text style={[styles.createButtonText, { color: isDark ? '#bfdbfe' : '#1e40af' }]}>
                    Create Playlist
                  </Text>
                </TouchableOpacity>
              )}

              {savedPlaylists && savedPlaylists.length > 0 ? (
                <View style={styles.playlistGrid}>
                  {savedPlaylists.map((playlist) => (
                    <TouchableOpacity
                      key={playlist.id}
                      onPress={() => onPlaylistSelect(playlist.id)}
                      style={styles.playlistItem}
                    >
                      <View
                        style={[
                          styles.playlistCard,
                          { backgroundColor: '#8b5cf6' },
                          playlist.isActive && { borderWidth: 2, borderColor: '#3b82f6' }
                        ]}
                      >
                        <Text style={styles.playlistName}>
                          {playlist.name}
                        </Text>
                        <Text style={styles.playlistCount}>
                          {playlist.items?.length || 0} effects
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                customEffects.length === 0 && (
                  <View style={[styles.infoCard, { backgroundColor: cardBackground, borderColor }]}>
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
    justifyContent: 'space-between',
    marginTop: 8,
  },
  presetCard: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    margin: 4,
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
    fontSize: 24,
    marginBottom: 4,
  },
  cardTitle: {
    fontWeight: '500',
    fontSize: 12,
    color: 'white',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 10,
    opacity: 0.75,
    color: 'white',
    textAlign: 'center',
    marginTop: 4,
  },
  activeIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 12,
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
  addButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 14,
    marginLeft: 8,
  },
  createButton: {
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  createButtonText: {
    fontWeight: '500',
    marginLeft: 8,
  },
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  playlistItem: {
    width: '30%',
    margin: '1.66%',
  },
  playlistCard: {
    borderRadius: 12,
    padding: 12,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistName: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 4,
  },
  playlistCount: {
    color: 'white',
    fontSize: 10,
    opacity: 0.75,
  },
});