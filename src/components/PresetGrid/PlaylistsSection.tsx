import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavedPlaylist } from '../../types';
import { sharedStyles } from './styles';
import AnimatedPlaylistItem from './AnimatedPlaylistItem';

interface PlaylistsSectionProps {
  savedPlaylists: SavedPlaylist[];
  customEffectsCount: number;
  isCollapsed: boolean;
  isDeleteMode: boolean;
  isLoadingPlaylists: boolean;
  selectedForDelete: Set<string | number>;
  wiggleAnim: Animated.Value;
  cardBackground: string;
  borderColor: string;
  textColor: string;
  subtextColor: string;
  onToggleCollapse: () => void;
  onPlaylistSelect: (id: number) => void;
  onToggleSelection: (id: string | number) => void;
}

const PlaylistsSection: React.FC<PlaylistsSectionProps> = ({
  savedPlaylists,
  customEffectsCount,
  isCollapsed,
  isDeleteMode,
  isLoadingPlaylists,
  selectedForDelete,
  wiggleAnim,
  cardBackground,
  borderColor,
  textColor,
  subtextColor,
  onToggleCollapse,
  onPlaylistSelect,
  onToggleSelection,
}) => {
  return (
    <View
      style={[
        sharedStyles.sectionCard,
        { backgroundColor: cardBackground, borderColor },
      ]}
    >
      <TouchableOpacity
        onPress={onToggleCollapse}
        style={sharedStyles.sectionHeader}
      >
        <View style={sharedStyles.headerLeft}>
          <Ionicons name="list" size={20} color={textColor} />
          <Text style={[sharedStyles.sectionTitle, { color: textColor }]}>
            Playlists ({savedPlaylists.length})
          </Text>
        </View>
        <Ionicons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={20}
          color={subtextColor}
        />
      </TouchableOpacity>

      {!isCollapsed && (
        <View style={sharedStyles.sectionContent}>
          {isLoadingPlaylists ? (
            // Loading state - brief empty state for smooth transition
            <View
              style={{
                height: 120,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {/* Empty space during loading for smooth transition */}
            </View>
          ) : savedPlaylists && savedPlaylists.length > 0 ? (
            <View style={sharedStyles.grid}>
              {savedPlaylists.map((playlist, index) => (
                <AnimatedPlaylistItem
                  key={`playlist-${playlist.id}-${index}`}
                  playlist={playlist}
                  index={index}
                  onPress={onPlaylistSelect}
                  isDeleteMode={isDeleteMode}
                  isSelected={selectedForDelete.has(playlist.id)}
                  onToggleSelection={onToggleSelection}
                  wiggleAnim={wiggleAnim}
                />
              ))}
            </View>
          ) : (
            <View
              style={{
                backgroundColor: cardBackground,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: borderColor,
                padding: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name="play-outline"
                size={24}
                color={subtextColor}
                style={{ marginBottom: 8 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: textColor,
                  textAlign: 'center',
                }}
              >
                No playlists saved yet
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: subtextColor,
                  marginTop: 4,
                  textAlign: 'center',
                }}
              >
                {customEffectsCount === 0
                  ? 'Create custom effects first to build playlists'
                  : 'Tap + to create a playlist from your custom effects'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default PlaylistsSection;
