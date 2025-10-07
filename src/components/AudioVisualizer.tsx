import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { AudioFeatures } from '../utils/audioProcessing';

interface AudioVisualizerProps {
  audioFeatures: AudioFeatures | null;
  melSpectrum: number[];
  isDark: boolean;
  height?: number;
  isActive?: boolean;
}

/**
 * Audio Visualizer Component
 *
 * Displays a frequency spectrum visualizer based on mel filterbank analysis
 */
const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioFeatures,
  melSpectrum,
  isDark,
  height = 120,
  isActive = false,
}) => {
  const barCount = melSpectrum.length || 24;
  const barWidth = 100 / barCount;

  // Smoothed spectrum values using ref to avoid infinite loop
  const smoothedSpectrumRef = useRef<number[]>(new Array(barCount).fill(0));

  // Animated values for idle dancing animation
  const animatedValues = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0))
  ).current;

  // Smooth spectrum updates for less jitter
  const displaySpectrum = isActive && melSpectrum.length > 0
    ? melSpectrum.map((val, i) => {
        // Light smoothing: 85% new + 15% old for responsive feel
        const smoothed = val * 0.85 + (smoothedSpectrumRef.current[i] || 0) * 0.15;
        smoothedSpectrumRef.current[i] = smoothed;
        return smoothed;
      })
    : new Array(barCount).fill(0);

  // Dancing animation when inactive
  useEffect(() => {
    if (!isActive) {
      // Create staggered wave animation
      const animations = animatedValues.map((anim, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.3 + Math.random() * 0.4,
              duration: 800 + Math.random() * 400,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.1 + Math.random() * 0.2,
              duration: 800 + Math.random() * 400,
              useNativeDriver: false,
            }),
          ])
        );
      });

      // Start animations with staggered delay
      animations.forEach((anim, index) => {
        setTimeout(() => anim.start(), index * 50);
      });

      return () => {
        animations.forEach(anim => anim.stop());
      };
    }
  }, [isActive, animatedValues]);

  // Color gradient from bass (indigo) -> mid (green) -> treble (red)
  const getBarColor = (index: number, intensity: number): string => {
    const ratio = index / barCount;

    // Rainbow gradient matching LED spectrum
    const hue = 240 - ratio * 240; // 240° (indigo) -> 0° (red)
    const h = hue / 60;
    const c = 1.0;
    const x = c * (1 - Math.abs((h % 2) - 1));

    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 1) {
      r = c; g = x; b = 0;
    } else if (h >= 1 && h < 2) {
      r = x; g = c; b = 0;
    } else if (h >= 2 && h < 3) {
      r = 0; g = c; b = x;
    } else if (h >= 3 && h < 4) {
      r = 0; g = x; b = c;
    } else if (h >= 4 && h < 5) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    // Apply intensity with min opacity
    const alpha = 0.3 + intensity * 0.7;

    return `rgba(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)}, ${alpha})`;
  };

  return (
    <View style={[styles.container, { height, backgroundColor: isDark ? '#1f2937' : '#f9fafb' }]}>
      <View style={styles.barsContainer}>
        {(isActive ? displaySpectrum : animatedValues).map((intensityValue, index) => {
          // For active mode, use smoothed value; for idle, use animated value
          const intensity = isActive
            ? (typeof intensityValue === 'number' ? intensityValue : 0)
            : 0.2;

          const barHeight = isActive
            ? Math.max(2, intensity * height * 0.85)
            : height * 0.85;

          const color = getBarColor(index, intensity);

          return isActive ? (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  width: `${barWidth - 0.5}%`,
                  height: barHeight,
                  backgroundColor: color,
                },
              ]}
            />
          ) : (
            <Animated.View
              key={index}
              style={[
                styles.bar,
                {
                  width: `${barWidth - 0.5}%`,
                  height: animatedValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [2, barHeight],
                  }),
                  backgroundColor: color,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Audio feature indicators */}
      {audioFeatures && (
        <View style={styles.featureIndicators}>
          <View style={[styles.featureBar, { width: `${audioFeatures.bass * 100}%`, backgroundColor: '#ef4444' }]} />
          <View style={[styles.featureBar, { width: `${audioFeatures.mid * 100}%`, backgroundColor: '#10b981' }]} />
          <View style={[styles.featureBar, { width: `${audioFeatures.treble * 100}%`, backgroundColor: '#3b82f6' }]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '100%',
    paddingBottom: 20,
  },
  bar: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    marginHorizontal: 0.5,
    minHeight: 2,
  },
  featureIndicators: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 12,
    flexDirection: 'column',
  },
  featureBar: {
    height: 4,
    borderRadius: 2,
  },
});

export default AudioVisualizer;
