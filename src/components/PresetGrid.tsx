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
  onLiveViewToggle: (enabled: boolean) => void;
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
  onLiveViewToggle,
}: PresetGridProps) {
  console.log('PresetGrid: liveLedData received:', liveLedData); // Debug log
  
  const [isSeasonalCollapsed, setIsSeasonalCollapsed] = useState(true);
  const [isCustomEffectsCollapsed, setIsCustomEffectsCollapsed] = useState(true);
  const [isPlaylistsCollapsed, setIsPlaylistsCollapsed] = useState(false);
  const [liveViewEnabled, setLiveViewEnabled] = useState(true);

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
        const [seasonal, customEffectsState, playlists, liveView] = await Promise.all([
          storage.loadFromStorage(STORAGE_KEYS.SEASONAL_COLLAPSED, true),
          storage.loadFromStorage(STORAGE_KEYS.CUSTOM_EFFECTS_COLLAPSED, true),
          storage.loadFromStorage(STORAGE_KEYS.PLAYLISTS_COLLAPSED, false),
          storage.loadFromStorage(STORAGE_KEYS.LIVE_VIEW_ENABLED, true),
        ]);

        setIsSeasonalCollapsed(seasonal);
        setIsCustomEffectsCollapsed(customEffectsState);
        setIsPlaylistsCollapsed(playlists);
        setLiveViewEnabled(liveView);
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

  const activePresetData = [...SEASONAL_PRESETS, ...customEffects].find(
    (p) => p.id.toString() === activePreset?.toString()
  );

  const handleLiveViewToggle = () => {
    const newValue = !liveViewEnabled;
    setLiveViewEnabled(newValue);
    storage.saveToStorage(STORAGE_KEYS.LIVE_VIEW_ENABLED, newValue);
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
                    transform: [{ translateX: liveViewEnabled ? 20 : 2 }] 
                  }
                ]}
              />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
            {activePresetData && (
              <Text style={[styles.activePresetText, { color: textColor }]}>
                Active: {activePresetData.name}
              </Text>
            )}
            
            {/* Live LED Data */}
            {liveViewEnabled && liveLedData.length > 0 && (
              <View style={styles.ledContainer}>
                <View style={styles.ledGrid}>
                  {liveLedData.map((color, index) => (
                    <View
                      key={index}
                      style={[
                        styles.ledPill,
                        {
                          backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                          shadowColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                          shadowOpacity: 0.6,
                          shadowRadius: 4,
                        }
                      ]}
                    >
                      {/* LED highlight effect */}
                      <View
                        style={{
                          position: 'absolute',
                          top: 0.5,
                          left: 0.5,
                          borderRadius: 1,
                          width: 2,
                          height: 4,
                          backgroundColor: 'rgba(255, 255, 255, 0.4)',
                        }}
                      />
                    </View>
                  ))}
                </View>
                <Text style={[styles.ledCount, { color: subtextColor }]}>
                  {liveLedData.length} LED{liveLedData.length !== 1 ? 's' : ''} live
                </Text>
              </View>
            )}
            
            {!liveViewEnabled && (
              <Text style={[styles.disabledText, { color: subtextColor }]}>
                Live view disabled
              </Text>
            )}
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

                  {customEffects.length > 0 ? (
                    <View style={styles.presetGrid}>
                      {customEffects.map((effect) => (
                        <PresetCard
                          key={effect.id}
                          preset={effect}
                          isActive={activePreset?.toString() === effect.id.toString()}
                          onClick={onPresetSelect}
                          showIcon={false}
                          isDark={isDark}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={[styles.infoCard, { backgroundColor: cardBackground, borderColor }]}>
                      <Ionicons name="color-palette-outline" size={24} color={subtextColor} style={styles.infoIcon} />
                      <Text style={[styles.infoText, { color: subtextColor }]}>
                        No custom effects found.
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
    padding: 16,
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
    minHeight: 50, // Increased minHeight
    backgroundColor: 'lightgray', // Distinct background
    padding: 5, // Add some padding
  },
  ledPill: {
    width: 20, // Temporarily larger
    height: 20, // Temporarily larger
    marginRight: 5, // More spacing
    marginBottom: 5,
    borderRadius: 5, // More rounded
    backgroundColor: 'red', // Distinct color
    borderWidth: 1, // Visible border
    borderColor: 'blue', // Distinct border color
    elevation: 10, // More prominent shadow
  },
  ledCount: {
    fontSize: 12,
    marginTop: 8,
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
    padding: 12,
    justifyContent: 'center',
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