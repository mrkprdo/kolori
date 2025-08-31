// PresetGrid Component for React Native
// Migrated from kolori_old/src/components/PresetGrid.jsx

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
  FlatList 
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
      className={`rounded-xl shadow-sm border-2 overflow-hidden relative m-1 ${
        isActive
          ? 'border-white shadow-lg'
          : 'border-white/20'
      }`}
      style={{
        width: cardWidth,
        aspectRatio: 1,
        backgroundColor: '#6366f1', // Fallback color since we can't easily use gradients
      }}
    >
      <View className="absolute inset-0 bg-black/10" />
      <View className="relative flex-1 p-3 justify-center items-center">
        {showIcon && (
          <Text className="text-2xl mb-1 drop-shadow-lg">{preset.icon}</Text>
        )}
        <Text className="font-medium text-xs text-white text-center leading-tight">
          {preset.name}
        </Text>
        {preset.effectName && (
          <Text className="text-xs opacity-75 text-white text-center leading-tight mt-1">
            {preset.effectName}
          </Text>
        )}
      </View>
      {isActive && (
        <View className="absolute top-1 right-1">
          <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
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
  
  const [isSeasonalCollapsed, setIsSeasonalCollapsed] = useState(true);
  const [isCustomEffectsCollapsed, setIsCustomEffectsCollapsed] = useState(true);
  const [isPlaylistsCollapsed, setIsPlaylistsCollapsed] = useState(false);
  const [liveViewEnabled, setLiveViewEnabled] = useState(true);

  // Load collapse states from storage
  useEffect(() => {
    const loadCollapseStates = async () => {
      try {
        const [seasonal, customEffects, playlists, liveView] = await Promise.all([
          storage.loadFromStorage(STORAGE_KEYS.SEASONAL_COLLAPSED, true),
          storage.loadFromStorage(STORAGE_KEYS.CUSTOM_EFFECTS_COLLAPSED, true),
          storage.loadFromStorage(STORAGE_KEYS.PLAYLISTS_COLLAPSED, false),
          storage.loadFromStorage(STORAGE_KEYS.LIVE_VIEW_ENABLED, true),
        ]);

        setIsSeasonalCollapsed(seasonal);
        setIsCustomEffectsCollapsed(customEffects);
        setIsPlaylistsCollapsed(playlists);
        setLiveViewEnabled(liveView);
      } catch (error) {
        logger.error('Failed to load collapse states:', error);
      }
    };

    loadCollapseStates();
  }, []);

  // Save collapse states to storage
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
    <ScrollView 
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      showsVerticalScrollIndicator={false}
    >
      <View className="p-4 space-y-6 pb-24">
        
        {/* Live View Section */}
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="play" size={20} color={isDark ? '#fff' : '#000'} />
              <Text className={`text-lg font-semibold ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Live View
              </Text>
            </View>
            
            {/* Toggle Switch */}
            <TouchableOpacity
              onPress={handleLiveViewToggle}
              className={`relative w-11 h-6 rounded-full ${
                liveViewEnabled ? 'bg-blue-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <View
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transform transition-transform ${
                  liveViewEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </TouchableOpacity>
          </View>
          
          <View className={`border rounded-xl p-4 ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}>
            <View className="flex-row items-center">
              <View className="flex-1">
                {activePresetData && (
                  <Text className={`font-medium text-sm mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Active: {activePresetData.name}
                  </Text>
                )}
                
                {/* Live LED Data - Small LED Pills */}
                {liveViewEnabled && liveLedData.length > 0 && (
                  <View className="mt-3">
                    <View className="flex-row flex-wrap">
                      {liveLedData.slice(0, 60).map((color, index) => (
                        <View
                          key={index}
                          className="w-1.5 h-3 mr-0.5 mb-0.5 rounded-sm"
                          style={{
                            backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                            shadowColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.6,
                            shadowRadius: 2,
                            elevation: 2,
                          }}
                        />
                      ))}
                    </View>
                    <Text className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {liveLedData.length} LED{liveLedData.length !== 1 ? 's' : ''} live
                    </Text>
                  </View>
                )}
                
                {!liveViewEnabled && (
                  <Text className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Live view disabled
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Seasonal Presets */}
        <View>
          <TouchableOpacity
            onPress={() => setIsSeasonalCollapsed(!isSeasonalCollapsed)}
            className="flex-row items-center justify-between mb-3"
          >
            <View className="flex-row items-center">
              <Ionicons name="calendar" size={20} color={isDark ? '#fff' : '#000'} />
              <Text className={`text-lg font-semibold ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Seasonal Presets
              </Text>
            </View>
            <Ionicons
              name={isSeasonalCollapsed ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>
          
          {!isSeasonalCollapsed && (
            <View className="flex-row flex-wrap justify-between">
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
        <View>
          <TouchableOpacity
            onPress={() => setIsCustomEffectsCollapsed(!isCustomEffectsCollapsed)}
            className="flex-row items-center justify-between mb-3"
          >
            <View className="flex-row items-center">
              <Ionicons name="color-palette" size={20} color={isDark ? '#fff' : '#000'} />
              <Text className={`text-lg font-semibold ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Custom Effects
              </Text>
            </View>
            <Ionicons
              name={isCustomEffectsCollapsed ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>
          
          {!isCustomEffectsCollapsed && (
            <View className="space-y-4">
              {!activeDevice?.isConnected ? (
                <View className={`p-4 border rounded-xl text-center ${
                  isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'
                }`}>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Connect to a WLED device to load available effects
                  </Text>
                </View>
              ) : (
                <>
                  {/* Add Effect Button */}
                  <TouchableOpacity
                    onPress={() => {
                      // TODO: Show effect creation modal
                      logger.log('Effect creation modal not yet implemented');
                    }}
                    className={`p-4 border-2 border-dashed rounded-xl flex-row items-center justify-center space-x-2 ${
                      isDark 
                        ? 'border-gray-600 bg-gray-800' 
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <Ionicons 
                      name="add" 
                      size={20} 
                      color={isDark ? '#9CA3AF' : '#6B7280'} 
                    />
                    <Text className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Add Custom Effect
                    </Text>
                  </TouchableOpacity>

                  {/* Custom Effects Grid */}
                  {customEffects.length > 0 ? (
                    <View className="flex-row flex-wrap justify-between">
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
                    <View className={`p-4 border rounded-xl ${
                      isDark
                        ? 'border-gray-700 bg-gray-800'
                        : 'border-gray-300 bg-gray-50'
                    }`}>
                      <Text className={`text-center ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        No custom effects found.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* Playlists */}
        <View>
          <TouchableOpacity
            onPress={() => setIsPlaylistsCollapsed(!isPlaylistsCollapsed)}
            className="flex-row items-center justify-between mb-3"
          >
            <View className="flex-row items-center">
              <Ionicons name="list" size={20} color={isDark ? '#fff' : '#000'} />
              <Text className={`text-lg font-semibold ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Playlists
              </Text>
            </View>
            <Ionicons
              name={isPlaylistsCollapsed ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>

          {!isPlaylistsCollapsed && (
            <View className="space-y-4">
              {/* Create Playlist Button */}
              {customEffects.length > 0 && (
                <TouchableOpacity
                  onPress={onShowPlaylist}
                  className={`p-3 rounded-xl flex-row items-center justify-center space-x-2 ${
                    isDark ? 'bg-blue-900' : 'bg-blue-50'
                  }`}
                >
                  <Ionicons 
                    name="play" 
                    size={18} 
                    color={isDark ? '#93C5FD' : '#1D4ED8'} 
                  />
                  <Text className={`font-medium ${
                    isDark ? 'text-blue-200' : 'text-blue-700'
                  }`}>
                    Create Playlist
                  </Text>
                </TouchableOpacity>
              )}

              {savedPlaylists && savedPlaylists.length > 0 ? (
                <View className="flex-row flex-wrap justify-between">
                  {savedPlaylists.map((playlist) => (
                    <TouchableOpacity
                      key={playlist.id}
                      onPress={() => onPlaylistSelect(playlist.id)}
                      className="w-1/3 p-1"
                    >
                      <View
                        className={`rounded-xl p-3 aspect-square items-center justify-center ${
                          playlist.isActive ? 'ring-2 ring-blue-500' : ''
                        }`}
                        style={{ backgroundColor: '#8B5CF6' }} // Fallback color
                      >
                        <Text className="text-white text-xs text-center font-medium mb-1">
                          {playlist.name}
                        </Text>
                        <Text className="text-white text-xs opacity-75">
                          {playlist.items?.length || 0} effects
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                customEffects.length === 0 && (
                  <View className="text-center py-8">
                    <Ionicons 
                      name="play" 
                      size={48} 
                      color={isDark ? '#4B5563' : '#9CA3AF'} 
                      style={{ opacity: 0.5, alignSelf: 'center', marginBottom: 16 }}
                    />
                    <Text className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      No playlists saved yet
                    </Text>
                    <Text className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Create custom effects first to build playlists
                    </Text>
                  </View>
                )
              )}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}