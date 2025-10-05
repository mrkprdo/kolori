import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SavedPlaylist } from '../../types';
import { parseGradientString, extractPrimaryColor } from '../../utils/presetUtils';

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
        (color: string) => typeof color === 'string' && color.length > 0
      );

    const cardStyle = useMemo(
      () => [
        styles.playlistCard,
        shouldUseGradient && hasValidGradient
          ? { padding: 0 }
          : {
              backgroundColor: playlist.gradient
                ? extractPrimaryColor(playlist.gradient)
                : '#8b5cf6',
            },
        playlist.isActive &&
          !isDeleteMode && {
            borderWidth: 2,
            borderColor: '#3b82f6',
            borderRadius: 8,
          },
        isSelected && {
          borderWidth: 3,
          borderColor: '#ef4444',
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

    const containerStyle = {
      ...styles.playlistItem,
      transform: [
        { scale: scaleAnim },
        ...(isDeleteMode && wiggleAnim
          ? [
              {
                rotate: wiggleAnim.interpolate({
                  inputRange: [-1, 1],
                  outputRange: ['-2deg', '2deg'],
                }),
              },
            ]
          : []),
      ] as any,
    };

    return (
      <Animated.View style={containerStyle}>
        <TouchableOpacity onPress={handlePress} style={styles.touchableArea}>
          <View style={cardStyle}>
            {shouldUseGradient && hasValidGradient && gradientColors && (
              <LinearGradient
                colors={gradientColors as any}
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

const styles = StyleSheet.create({
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
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchableArea: {
    flex: 1,
  },
  activeIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
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
  },
});

export default AnimatedPlaylistItem;
