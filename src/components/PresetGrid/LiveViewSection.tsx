import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Device as WledDevice, LEDColor } from '../../types';
import LEDVisualization from '../LEDVisualization';
import { logger } from '../../utils/logger';
import { useWledDevice } from '../../contexts/WledDeviceContext';
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
  onSetSliderBrightness?: (value: number) => void;
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
  const { setBrightness: setBrightnessWS, matrixDimensions } = useWledDevice();
  const [isAdjustingBrightness, setIsAdjustingBrightness] = useState(false);
  const [localBrightness, setLocalBrightness] = useState(sliderBrightness);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  const isConnected = activeDevice?.isConnected || false;
  const ledCount = activeDevice?.wledInfo?.leds?.count;
  const isRgbw = activeDevice?.wledInfo?.leds?.rgbw;
  const canShowLiveView = liveViewEnabled && isConnected && liveLedData.length > 0;

  // Merge WebSocket matrix dimensions into wledInfo to ensure LEDVisualization has matrix data immediately
  const enhancedWledInfo = React.useMemo(() => {
    const baseInfo = activeDevice?.wledInfo;

    // If WebSocket has matrix dimensions, always use them (they're the most up-to-date)
    if (matrixDimensions && matrixDimensions.width > 0 && matrixDimensions.height > 0) {
      return {
        ...baseInfo,
        ledMatrix: {
          w: matrixDimensions.width,
          h: matrixDimensions.height,
        },
      };
    }

    return baseInfo;
  }, [activeDevice?.wledInfo, matrixDimensions?.width, matrixDimensions?.height]);

  // Clear interaction flag when refresh happens (timestamp changes)
  useEffect(() => {
    if (lastRefreshTimestamp > 0) {
      setIsUserInteracting(false);
      setIsAdjustingBrightness(false);
    }
  }, [lastRefreshTimestamp]);

  // Update local brightness when slider brightness changes (only when user is NOT interacting)
  useEffect(() => {
    if (!isAdjustingBrightness && !isUserInteracting) {
      setLocalBrightness(sliderBrightness);
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

    // Update parent state (optional - brightness auto-syncs via WebSocket)
    onSetSliderBrightness?.(finalValue);

    if (activeDevice?.ip) {
      try {
        setBrightnessWS(finalValue);
        logger.log(`💡 Brightness command sent: ${finalValue}`);
      } catch (error) {
        logger.error('Error setting brightness:', error);
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
            <Text style={[styles.activePresetText, { color: isDark ? '#93c5fd' : '#1e40af' }]} numberOfLines={1}>
              {activePresetData.name.length > 12 ? `${activePresetData.name.substring(0, 11)}...` : activePresetData.name}
            </Text>
          </View>
        )}

        {/* Toggle Button */}
        <TouchableOpacity
          onPress={onLiveViewToggle}
          style={[
            styles.toggleButton,
            {
              backgroundColor: liveViewEnabled ? '#3b82f6' : (isDark ? '#374151' : '#e5e7eb'),
            },
          ]}
        >
          <Ionicons
            name={liveViewEnabled ? 'eye' : 'eye-off'}
            size={18}
            color={liveViewEnabled ? '#ffffff' : textColor}
          />
          <Text style={[styles.toggleText, { color: liveViewEnabled ? '#ffffff' : textColor }]}>
            {liveViewEnabled ? 'Active' : 'Start'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={sharedStyles.sectionContent}>
        {/* Main Content Card */}
        <View
          style={[
            styles.innerCard,
            !liveViewEnabled && isConnected && styles.innerCardCompact,
            {
              backgroundColor: isDark ? '#374151' : '#f9fafb',
              borderColor: isDark ? '#4b5563' : '#e5e7eb',
            },
          ]}
        >
          {/* Brightness Slider - Compact inline */}
          {isConnected && (
            <View style={styles.brightnessContainer}>
              <View style={styles.brightnessInlineRow}>
                <Ionicons name="sunny" size={16} color={textColor} />
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.brightnessValue, { color: isDark ? '#93c5fd' : '#3b82f6' }]}>
                    {localBrightness}
                  </Text>
                  {(isAdjustingBrightness || isFetchingBrightness) && (
                    <ActivityIndicator size="small" color={isDark ? '#93c5fd' : '#3b82f6'} />
                  )}
                </View>
              </View>
            </View>
          )}

          {/* LED Visualization or Status */}
          <Animated.View
            style={[
              styles.cardContent,
              !liveViewEnabled && isConnected && styles.cardContentCompact,
              {
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
                wledInfo={enhancedWledInfo}
                brightness={localBrightness}
              />
            ) : (
              <View style={[
                styles.statusContainer,
                !liveViewEnabled && isConnected && styles.statusContainerCompact
              ]}>
                {!liveViewEnabled && isConnected ? (
                  // Compact single-line view when disabled
                  <>
                    <View style={styles.compactStatusRow}>
                      <Ionicons name="eye-off-outline" size={16} color={subtextColor} />
                      <Text style={[styles.compactStatusText, { color: textColor }]}>
                        Live View Disabled
                      </Text>
                      {ledCount && (
                        <>
                          <View style={styles.compactDivider} />
                          <Ionicons name="bulb" size={14} color={subtextColor} />
                          <Text style={[styles.compactStatusInfo, { color: subtextColor }]}>
                            {ledCount} LED{ledCount !== 1 ? 's' : ''}
                          </Text>
                          {isRgbw && (
                            <>
                              <Ionicons name="color-palette" size={14} color={subtextColor} />
                              <Text style={[styles.compactStatusInfo, { color: subtextColor }]}>
                                RGBW
                              </Text>
                            </>
                          )}
                        </>
                      )}
                    </View>
                    {/* Performance Warning */}
                    <View style={[styles.warningContainer, styles.warningContainerCompact, { backgroundColor: isDark ? '#422006' : '#fef3c7' }]}>
                      <Ionicons name="warning" size={12} color={isDark ? '#fbbf24' : '#d97706'} />
                      <Text style={[styles.warningText, styles.warningTextCompact, { color: isDark ? '#fbbf24' : '#92400e' }]}>
                        Activating live view may affect WLED performance
                      </Text>
                    </View>
                  </>
                ) : (
                  // Full view for offline or waiting states
                  <>
                    <Ionicons
                      name={!isConnected ? 'cloud-offline' : 'eye-off-outline'}
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
                  </>
                )}
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

export default React.memo(LiveViewSection, (prevProps, nextProps) => {
  // React.memo returns true to SKIP re-render, false to re-render

  // Only re-render if relevant props change (prevent re-renders from liveLedData updates when not enabled)
  if (!nextProps.liveViewEnabled && !prevProps.liveViewEnabled) {
    // When disabled, check if these specific props changed
    const shouldSkipRender = (
      prevProps.activeDevice?.ip === nextProps.activeDevice?.ip &&
      prevProps.activeDevice?.isConnected === nextProps.activeDevice?.isConnected &&
      prevProps.liveViewEnabled === nextProps.liveViewEnabled &&
      prevProps.sliderBrightness === nextProps.sliderBrightness &&
      prevProps.activePresetData?.name === nextProps.activePresetData?.name &&
      prevProps.isDark === nextProps.isDark
    );
    return shouldSkipRender;
  }

  // When enabled, use default shallow comparison (always re-render)
  return false;
});
