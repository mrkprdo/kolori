import React, { useState } from 'react';
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

  const isConnected = activeDevice?.isConnected || false;
  const ledCount = activeDevice?.wledInfo?.leds?.count;
  const isRgbw = activeDevice?.wledInfo?.leds?.rgbw;
  const canShowLiveView = liveViewEnabled && isConnected && liveLedData.length > 0;

  const handleBrightnessChange = async (value: number) => {
    const finalValue = Math.round(value);
    setIsAdjustingBrightness(true);

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
          onSetSliderBrightness(activeDevice?.wledInfo?.bri || 0);
        }
      } catch (error) {
        logger.error('Error setting brightness:', error);
        onSetSliderBrightness(activeDevice?.wledInfo?.bri || 0);
      }
    }

    onBrightnessChange?.(finalValue);
    setIsAdjustingBrightness(false);
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
        <View
          style={[
            styles.innerCard,
            {
              backgroundColor: isDark ? '#374151' : '#f9fafb',
              borderColor: isDark ? '#4b5563' : '#e5e7eb',
            },
          ]}
        >
          <Animated.View
            style={[
              styles.cardContent,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {activePresetData && (
              <Text style={[styles.activePresetText, { color: textColor }]}>
                Active: {activePresetData.name}
              </Text>
            )}

            {/* Live LED Data */}
            {liveViewEnabled && !activeDevice?.isConnected && (
              <View style={styles.disabledContainer}>
                <Text style={[styles.disabledText, { color: '#ef4444' }]}>
                  Device offline - Connect to view LED data
                </Text>
              </View>
            )}
            {liveViewEnabled &&
              activeDevice?.isConnected &&
              liveLedData.length > 0 && (
                <LEDVisualization
                  ledData={liveLedData}
                  subtextColor={subtextColor}
                  liveViewLedSize={liveViewLedSize}
                  showLedCount={true}
                  wledInfo={activeDevice?.wledInfo}
                />
              )}

            {!liveViewEnabled && (
              <View style={styles.disabledContainer}>
                {!activeDevice?.isConnected ? (
                  <Text style={[styles.disabledText, { color: '#ef4444' }]}>
                    Device offline - Connect to view LED data
                  </Text>
                ) : (
                  <Text
                    style={[styles.disabledText, { color: subtextColor }]}
                  >
                    Live view disabled
                  </Text>
                )}
                {(() => {
                  // Don't show LED count if device is offline
                  if (!activeDevice?.isConnected) {
                    return null;
                  }

                  // Check for LED count in WLED device info
                  const ledCount = activeDevice?.wledInfo?.leds?.count;

                  if (ledCount) {
                    return (
                      <View>
                        <Text
                          style={[
                            styles.ledCount,
                            { color: subtextColor, marginTop: 4 },
                          ]}
                        >
                          {ledCount} LED{ledCount !== 1 ? 's' : ''}{' '}
                          available
                        </Text>
                        {activeDevice?.wledInfo?.leds?.rgbw && (
                          <Text
                            style={[
                              styles.ledCount,
                              {
                                color: subtextColor,
                                fontSize: 10,
                                marginTop: 2,
                              },
                            ]}
                          >
                            RGBW LEDs supported
                          </Text>
                        )}
                      </View>
                    );
                  } else if (activeDevice?.isConnected) {
                    return (
                      <Text
                        style={[
                          styles.ledCount,
                          {
                            color: subtextColor,
                            marginTop: 4,
                            fontSize: 12,
                          },
                        ]}
                      >
                        Device connected - LED count not available
                      </Text>
                    );
                  } else {
                    return (
                      <Text
                        style={[
                          styles.ledCount,
                          {
                            color: subtextColor,
                            marginTop: 4,
                            fontSize: 12,
                          },
                        ]}
                      >
                        Device offline
                      </Text>
                    );
                  }
                })()}
              </View>
            )}
          </Animated.View>

          {/* Brightness Slider - Always visible when device is connected */}
          {activeDevice?.isConnected && (
            <View style={styles.sliderContainer}>
              <Ionicons
                name="sunny-outline"
                size={20}
                color={subtextColor}
              />
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={255}
                step={1}
                value={sliderBrightness}
                onValueChange={(value) => {
                  onSetSliderBrightness(Math.round(value));
                }}
                onSlidingComplete={async (value) => {
                  const finalValue = Math.round(value);

                  // Use direct API call for setting brightness
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
                        logger.error(
                          'Failed to set brightness:',
                          result.message
                        );
                        // Revert slider to previous value on failure
                        onSetSliderBrightness(
                          activeDevice?.wledInfo?.bri || 0
                        );
                      }
                    } catch (error) {
                      logger.error('Error setting brightness:', error);
                      // Revert slider to previous value on error
                      onSetSliderBrightness(activeDevice?.wledInfo?.bri || 0);
                    }
                  }

                  // Also call the original callback if provided
                  onBrightnessChange?.(finalValue);
                }}
                minimumTrackTintColor="#3b82f6"
                maximumTrackTintColor={isDark ? '#4b5563' : '#e5e7eb'}
                thumbTintColor={isDark ? '#ffffff' : '#3b82f6'}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default LiveViewSection;
