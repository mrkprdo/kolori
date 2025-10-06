import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { parseGradientString, extractPrimaryColor } from '../../utils/presetUtils';

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
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const hasAnimated = useRef(false);

    // Entrance animation - only run once
    useEffect(() => {
      if (!hasAnimated.current) {
        hasAnimated.current = true;
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          delay: animationDelay || Math.random() * 200,
          useNativeDriver: true,
        }).start();
      }
    }, [scaleAnim, animationDelay]);

    // Memoize gradient calculations
    const { shouldUseGradient, gradientColors, hasValidGradient } =
      useMemo(() => {
        // Check if preset has a gradient (works for both WLED presets and custom effects)
        const shouldUse = Boolean(preset.gradient);
        const colors = preset.gradient ? parseGradientString(preset.gradient).colors : null;

        const hasValid =
          colors &&
          Array.isArray(colors) &&
          colors.length >= 2 &&
          colors.every(
            (color) => typeof color === 'string' && color.length > 0
          );

        return {
          shouldUseGradient: shouldUse,
          gradientColors: colors,
          hasValidGradient: hasValid,
        };
      }, [preset.gradient]);

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
                    outputRange: ['-2deg', '2deg'],
                  }),
                },
              ]
            : []),
        ] as any,
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
                : '#6366f1',
            },
        isActive &&
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
        shouldUseGradient,
        hasValidGradient,
        preset.gradient,
        isActive,
        isDeleteMode,
        isSelected,
      ]
    );

    return (
      <Animated.View style={[animatedTransformStyle, cardItemStyle]}>
        <TouchableOpacity
          onPress={handleCardPress}
          style={styles.touchableArea}
        >
          <View style={cardViewStyle}>
            {shouldUseGradient && hasValidGradient && (
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

const styles = StyleSheet.create({
  presetCard: {
    borderRadius: 8,
    padding: 8,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchableArea: {
    flex: 1,
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
  cardIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  cardTitle: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 2,
  },
  cardPresetId: {
    color: 'white',
    fontSize: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
  cardSubtitle: {
    color: 'white',
    fontSize: 8,
    opacity: 0.75,
    textAlign: 'center',
    marginTop: 2,
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

export default PresetCard;
