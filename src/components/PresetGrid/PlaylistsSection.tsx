import React from 'react';
import { View, Text, TouchableOpacity, Animated, Platform, ToastAndroid, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavedPlaylist } from '../../types';
import { sharedStyles } from './styles';
import AnimatedPlaylistItem from './AnimatedPlaylistItem';

interface PlaylistsSectionProps {
  savedPlaylists: SavedPlaylist[];
  customEffectsCount: number;
  bootPresetId: number | null;
  isCollapsed: boolean;
  isBlocked?: boolean;
  blockReason?: 'offline' | 'audioReactive';
  isDeleteMode: boolean;
  isLoadingPlaylists: boolean;
  selectedForDelete: Set<string | number>;
  wiggleAnim: Animated.Value;
  isDark: boolean;
  cardBackground: string;
  borderColor: string;
  textColor: string;
  subtextColor: string;
  onToggleCollapse: () => void;
  onPlaylistSelect: (id: number) => void;
  onLongPress?: (preset: any, isDeletable?: boolean) => void;
  onToggleSelection: (id: string | number) => void;
}

const PlaylistsSection: React.FC<PlaylistsSectionProps> = ({
  savedPlaylists,
  customEffectsCount,
  bootPresetId,
  isCollapsed,
  isBlocked = false,
  blockReason = 'offline',
  isDeleteMode,
  isLoadingPlaylists,
  selectedForDelete,
  wiggleAnim,
  isDark,
  cardBackground,
  borderColor,
  textColor,
  subtextColor,
  onToggleCollapse,
  onPlaylistSelect,
  onLongPress,
  onToggleSelection,
}) => {
  return (
    <View
      style={[
        sharedStyles.sectionCard,
        { backgroundColor: cardBackground, borderColor: isDark ? '#4b5563' : '#1e293b', position: 'relative' },
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
                  bootPresetId={bootPresetId}
                  onPress={onPlaylistSelect}
                  onLongPress={onLongPress}
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
                borderWidth: 2,
                borderColor: isDark ? '#4b5563' : '#1e293b',
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

      {/* Overlay when blocked - covers entire section */}
      {isBlocked && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            if (blockReason === 'offline') {
              if (Platform.OS === 'android') {
                ToastAndroid.show('Connect to a WLED device to change presets', ToastAndroid.SHORT);
              } else {
                Alert.alert('Device Offline', 'Connect to a WLED device to change presets');
              }
            } else {
              if (Platform.OS === 'android') {
                ToastAndroid.show('Turn off Audio Reactive to change presets', ToastAndroid.SHORT);
              } else {
                Alert.alert('Audio Reactive Active', 'Turn off Audio Reactive to change presets');
              }
            }
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.9)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
            borderRadius: 12,
          }}
        />
      )}
    </View>
  );
};

export default PlaylistsSection;
