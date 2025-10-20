import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, ActivityIndicator, Platform, ToastAndroid, Alert } from 'react-native';
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
  liveViewLedSize: 'compact' | 'normal' | 'large' | 'extra-large';
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
  }, [sliderBrightness, isAdjustingBrightness, isUserInteracting, lastRefreshTimestamp]);

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
        { backgroundColor: cardBackground, borderColor: isDark ? '#4b5563' : '#1e293b', position: 'relative' },
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
                borderColor: isDark ? '#4b5563' : '#1e293b',
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
          disabled={!isConnected}
          style={[
            styles.toggleButton,
            {
              backgroundColor: liveViewEnabled ? '#3b82f6' : (isDark ? '#374151' : '#e5e7eb'),
              borderColor: isDark ? '#4b5563' : '#1e293b',
              opacity: !isConnected ? 0.5 : 1,
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
              borderColor: isDark ? '#4b5563' : '#1e293b',
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
                (!liveViewEnabled || !isConnected) && styles.statusContainerCompact
              ]}>
                {!isConnected ? (
                  // Offline state - compact single line with no padding
                  <View style={[styles.compactStatusRow, { paddingVertical: 0, paddingHorizontal: 0 }]}>
                    <Ionicons name="cloud-offline" size={16} color="#ef4444" />
                    <Text style={[styles.compactStatusText, { color: '#ef4444' }]}>
                      Device Offline
                    </Text>
                  </View>
                ) : !liveViewEnabled ? (
                  // Live view disabled - compact with warning
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
                    <View style={[styles.warningContainer, styles.warningContainerCompact, { backgroundColor: isDark ? '#422006' : '#fef3c7' }]}>
                      <Ionicons name="warning" size={12} color={isDark ? '#fbbf24' : '#d97706'} />
                      <Text style={[styles.warningText, styles.warningTextCompact, { color: isDark ? '#fbbf24' : '#92400e' }]}>
                        Activating live view may affect WLED performance
                      </Text>
                    </View>
                  </>
                ) : (
                  // Waiting for LED data
                  <View style={styles.compactStatusRow}>
                    <Ionicons name="eye-off-outline" size={16} color={subtextColor} />
                    <Text style={[styles.compactStatusText, { color: textColor }]}>
                      Waiting for LED data...
                    </Text>
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        </View>
      </View>

      {/* Overlay when device is offline - covers entire section */}
      {!isConnected && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            if (Platform.OS === 'android') {
              ToastAndroid.show('Connect to a WLED device to use Live View', ToastAndroid.SHORT);
            } else {
              Alert.alert('Device Offline', 'Connect to a WLED device to use Live View');
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
        >
          <View
            style={{
              backgroundColor: cardBackground,
              borderRadius: 10,
              padding: 12,
              borderWidth: 2,
              borderColor: '#ef4444',
              maxWidth: '70%',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Ionicons
              name="cloud-offline"
              size={28}
              color="#ef4444"
              style={{ marginBottom: 6 }}
            />
            <Text style={{ fontSize: 15, fontWeight: '600', color: textColor, marginBottom: 4 }}>
              Device Offline
            </Text>
            <Text style={{ fontSize: 11, color: subtextColor, textAlign: 'center', lineHeight: 14 }}>
              Connect to a WLED device to use Live View.
            </Text>
          </View>
        </TouchableOpacity>
      )}
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
