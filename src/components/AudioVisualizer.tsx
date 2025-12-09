import React, { useEffect, useMemo, useRef } from 'react';
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
  const barCount = melSpectrum.length > 0 ? melSpectrum.length : 24;
  const barWidth = 100 / barCount;

  const smoothedSpectrumRef = useRef<number[]>([]);
  const animatedValuesRef = useRef<Animated.Value[]>([]);
  const idleAnimationsRef = useRef<Animated.CompositeAnimation[]>([]);
  const animationsRunning = useRef(false);

  // Keep smoothing buffer aligned with bar count synchronously before render content uses it
  if (smoothedSpectrumRef.current.length !== barCount) {
    const nextValues = new Array(barCount)
      .fill(0)
      .map((_, idx) => smoothedSpectrumRef.current[idx] || 0);
    smoothedSpectrumRef.current = nextValues;
  }

  // Ensure there is an Animated.Value per bar so transforms never read undefined
  const animatedValues = animatedValuesRef.current;
  if (animatedValues.length < barCount) {
    for (let i = animatedValues.length; i < barCount; i++) {
      animatedValues.push(new Animated.Value(0));
    }
  } else if (animatedValues.length > barCount) {
    animatedValues.splice(barCount);
  }

  // Smooth spectrum updates with stronger smoothing for less jitter
  const displaySpectrum = useMemo(() => {
    if (isActive && melSpectrum.length > 0) {
      return Array.from({ length: barCount }, (_, i) => {
        const value = melSpectrum[i] ?? melSpectrum[melSpectrum.length - 1] ?? 0;
        const smoothed = value * 0.65 + (smoothedSpectrumRef.current[i] || 0) * 0.35;
        smoothedSpectrumRef.current[i] = smoothed;
        return smoothed;
      });
    }

    smoothedSpectrumRef.current = smoothedSpectrumRef.current.map(() => 0);
    if (smoothedSpectrumRef.current.length === 0) {
      smoothedSpectrumRef.current = new Array(barCount).fill(0);
    }

    return new Array(barCount).fill(0);
  }, [isActive, melSpectrum, barCount]);

  // Show idle animation ONLY when inactive (not when active with quiet audio)
  const shouldShowIdleAnimation = !isActive;

  // Smooth wave animation when inactive - more lively with bigger amplitude
  useEffect(() => {
    if (!shouldShowIdleAnimation) {
      animationsRunning.current = false;
      idleAnimationsRef.current.forEach((anim) => anim.stop());
      idleAnimationsRef.current = [];
      animatedValuesRef.current.forEach((anim) => anim.stopAnimation(() => anim.setValue(0)));
      return;
    }

    if (animationsRunning.current) {
      return;
    }

    animationsRunning.current = true;

    const animations = animatedValuesRef.current.map((anim, index) => {
      const phase = (index / barCount) * Math.PI * 4;
      const baseDelay = index * 25;
      const speedMultiplier = 0.8 + Math.sin((index / barCount) * Math.PI) * 0.4;
      const duration = 900 * speedMultiplier;

      return Animated.loop(
        Animated.sequence([
          Animated.delay(baseDelay),
          Animated.timing(anim, {
            toValue: 0.6 + Math.sin(phase) * 0.35,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.25 + Math.sin(phase + Math.PI) * 0.3,
            duration: duration * 1.1,
            useNativeDriver: true,
          }),
        ])
      );
    });

    idleAnimationsRef.current = animations;
    animations.forEach((anim) => anim.start());

    return () => {
      animationsRunning.current = false;
      animations.forEach((anim) => anim.stop());
      idleAnimationsRef.current = [];
    };
  }, [shouldShowIdleAnimation, barCount]);

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
        {displaySpectrum.map((intensityValue, index) => {
          const intensity = shouldShowIdleAnimation ? 0.5 : intensityValue;
          const barHeight = !shouldShowIdleAnimation
            ? Math.max(2, intensity * height * 0.85)
            : height * 0.85;
          const color = getBarColor(index, intensity);

          return shouldShowIdleAnimation ? (
            <Animated.View
              key={index}
              style={[
                styles.bar,
                {
                  width: `${barWidth - 0.5}%`,
                  height: barHeight,
                  backgroundColor: color,
                  transform: [
                    {
                      scaleY: animatedValuesRef.current[index]?.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.1, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
          ) : (
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
