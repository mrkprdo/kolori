import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Device as WledDevice, LEDColor } from '../../types';
import LEDVisualization from '../LEDVisualization';
import { logger } from '../../utils/logger';
import { setWledBrightness } from '../../config/wledApi';
import { sharedStyles, liveViewStyles as styles } from './styles';

interface LiveViewSectionProps {
  activeDevice: WledDevice | undefined;
  activePresetData: { name: string } | null;
  liveViewEnabled: boolean;
  liveLedData: LEDColor[];
  liveViewLedSize: number;
  sliderBrightness: number;
  isFetchingBrightness: boolean;
  lastRefreshTimestamp: number;
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
  isDark: boolean;
  cardBackground: string;
  borderColor: string;
  textColor: string;
  subtextColor: string;
  onLiveViewToggle: () => void;
  onSetSliderBrightness: (value: number) => void;
  onBrightnessChange?: (value: number) => void;
}

const LiveViewSection: React.FC<LiveViewSectionProps> = ({
  activeDevice,
  activePresetData,
  liveViewEnabled,
  liveLedData,
  liveViewLedSize,
  sliderBrightness,
  isFetchingBrightness,
  lastRefreshTimestamp,
  fadeAnim,
  scaleAnim,
  isDark,
  cardBackground,
  borderColor,
  textColor,
  subtextColor,
  onLiveViewToggle,
  onSetSliderBrightness,
  onBrightnessChange,
}) => {
  const [isAdjustingBrightness, setIsAdjustingBrightness] = useState(false);
  const [localBrightness, setLocalBrightness] = useState(sliderBrightness);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  const isConnected = activeDevice?.isConnected || false;
  const ledCount = activeDevice?.wledInfo?.leds?.count;
  const isRgbw = activeDevice?.wledInfo?.leds?.rgbw;
  const canShowLiveView = liveViewEnabled && isConnected && liveLedData.length > 0;

  // Clear interaction flag when refresh happens (timestamp changes)
  useEffect(() => {
    if (lastRefreshTimestamp > 0) {
      console.log(`🔄 Refresh detected, clearing interaction flags`);
      setIsUserInteracting(false);
      setIsAdjustingBrightness(false);
    }
  }, [lastRefreshTimestamp]);

  // Update local brightness when slider brightness changes (only when user is NOT interacting)
  useEffect(() => {
    console.log(`🔍 Effect triggered - sliderBrightness: ${sliderBrightness}, localBrightness: ${localBrightness}, adjusting: ${isAdjustingBrightness}, interacting: ${isUserInteracting}, timestamp: ${lastRefreshTimestamp}`);
    if (!isAdjustingBrightness && !isUserInteracting) {
      console.log(`🔄 Updating local brightness to: ${sliderBrightness} (was: ${localBrightness})`);
      setLocalBrightness(sliderBrightness);
    } else {
      console.log(`🚫 Blocked brightness update: adjusting=${isAdjustingBrightness}, interacting=${isUserInteracting}`);
    }
  }, [sliderBrightness, isAdjustingBrightness, isUserInteracting, lastRefreshTimestamp, localBrightness]);

  const handleBrightnessSlidingStart = () => {
    setIsUserInteracting(true);
  };

  const handleBrightnessValueChange = (value: number) => {
    // Also set interacting flag on value change (handles taps)
    if (!isUserInteracting) {
      setIsUserInteracting(true);
    }
    setLocalBrightness(Math.round(value));
  };

  const handleBrightnessSlidingComplete = async (value: number) => {
    const finalValue = Math.round(value);
    setIsAdjustingBrightness(true);

    // Update parent state
    onSetSliderBrightness(finalValue);

    if (activeDevice?.ip) {
      try {
        const result = await setWledBrightness(
          activeDevice.ip,
          finalValue,
          activeDevice.protocol || 'http'
        );
        if (result.success) {
          logger.log(`💡 Brightness set to ${finalValue}`);
        } else {
          logger.error('Failed to set brightness:', result.message);
          // Revert on failure
          setLocalBrightness(activeDevice?.wledInfo?.bri || 0);
          onSetSliderBrightness(activeDevice?.wledInfo?.bri || 0);
        }
      } catch (error) {
        logger.error('Error setting brightness:', error);
        // Revert on error
        setLocalBrightness(activeDevice?.wledInfo?.bri || 0);
        onSetSliderBrightness(activeDevice?.wledInfo?.bri || 0);
      }
    }

    onBrightnessChange?.(finalValue);
    setIsAdjustingBrightness(false);
    setIsUserInteracting(false);
  };

  return (
    <View
      style={[
        sharedStyles.sectionCard,
        { backgroundColor: cardBackground, borderColor },
      ]}
    >
      <View style={sharedStyles.sectionHeader}>
        <View style={sharedStyles.headerLeft}>
          <Ionicons name="play" size={20} color={textColor} />
          <Text style={[sharedStyles.sectionTitle, { color: textColor }]}>
            Live View
          </Text>
        </View>

        {/* Toggle Switch */}
        <TouchableOpacity
          onPress={onLiveViewToggle}
          style={[
            styles.toggleSwitch,
            { backgroundColor: liveViewEnabled ? '#3b82f6' : borderColor },
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              {
                backgroundColor: '#ffffff',
                marginLeft: liveViewEnabled ? 22 : 2,
              },
            ]}
          />
        </TouchableOpacity>
      </View>

      <View style={sharedStyles.sectionContent}>
        {/* Active Preset Badge */}
        {activePresetData && isConnected && (
          <View
            style={[
              styles.activePresetBadge,
              {
                backgroundColor: isDark ? '#1f2937' : '#eff6ff',
                borderColor: isDark ? '#3b82f6' : '#93c5fd',
              },
            ]}
          >
            <Ionicons name="radio-button-on" size={12} color="#3b82f6" />
            <Text style={[styles.activePresetText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
              {activePresetData.name}
            </Text>
          </View>
        )}

        {/* Main Content Card */}
        <View
          style={[
            styles.innerCard,
            {
              backgroundColor: isDark ? '#374151' : '#f9fafb',
              borderColor: isDark ? '#4b5563' : '#e5e7eb',
            },
          ]}
        >
          {/* LED Visualization or Status */}
          <Animated.View
            style={[
              styles.cardContent,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {canShowLiveView ? (
              <LEDVisualization
                ledData={liveLedData}
                subtextColor={subtextColor}
                liveViewLedSize={liveViewLedSize}
                showLedCount={true}
                wledInfo={activeDevice?.wledInfo}
                brightness={localBrightness}
              />
            ) : (
              <View style={styles.statusContainer}>
                <Ionicons
                  name={!isConnected ? 'cloud-offline' : liveViewEnabled ? 'eye-off' : 'eye-off-outline'}
                  size={32}
                  color={!isConnected ? '#ef4444' : subtextColor}
                  style={{ marginBottom: 8 }}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: !isConnected ? '#ef4444' : textColor },
                  ]}
                >
                  {!isConnected
                    ? 'Device Offline'
                    : !liveViewEnabled
                    ? 'Live View Disabled'
                    : 'Waiting for LED data...'}
                </Text>

                {/* LED Info */}
                {isConnected && ledCount && (
                  <View style={styles.ledInfoContainer}>
                    <View style={styles.ledInfoRow}>
                      <Ionicons name="bulb" size={14} color={subtextColor} />
                      <Text style={[styles.ledInfoText, { color: subtextColor }]}>
                        {ledCount} LED{ledCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {isRgbw && (
                      <View style={[styles.ledInfoRow, { marginTop: 4 }]}>
                        <Ionicons name="color-palette" size={14} color={subtextColor} />
                        <Text style={[styles.ledInfoText, { color: subtextColor }]}>
                          RGBW Support
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </Animated.View>

          {/* Brightness Slider */}
          {isConnected && (
            <View style={styles.brightnessContainer}>
              <View style={styles.brightnessHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="sunny" size={16} color={textColor} />
                  <Text style={[styles.brightnessLabel, { color: textColor }]}>
                    Brightness
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.brightnessValue, { color: isDark ? '#93c5fd' : '#3b82f6' }]}>
                    {localBrightness}
                  </Text>
                  {(isAdjustingBrightness || isFetchingBrightness) && (
                    <ActivityIndicator size="small" color={isDark ? '#93c5fd' : '#3b82f6'} />
                  )}
                </View>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={255}
                step={1}
                value={localBrightness}
                onSlidingStart={handleBrightnessSlidingStart}
                onValueChange={handleBrightnessValueChange}
                onSlidingComplete={handleBrightnessSlidingComplete}
                minimumTrackTintColor="#3b82f6"
                maximumTrackTintColor={isDark ? '#4b5563' : '#e5e7eb'}
                thumbTintColor={isDark ? '#ffffff' : '#3b82f6'}
                disabled={isFetchingBrightness || isAdjustingBrightness}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default LiveViewSection;
