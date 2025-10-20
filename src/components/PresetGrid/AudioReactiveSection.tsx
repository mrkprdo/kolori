import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { sharedStyles } from './styles';
import { useAudioReactive } from '../../hooks/useAudioReactive';
import AudioVisualizer from '../AudioVisualizer';
import { sendRealtimeToWLED, closeRealtimeSocket, getRealtimePacketStats, resetRealtimePacketStats, resetRealtimeState, sendTestPatternOnce, turnOffAllLEDs } from '../../utils/wledUdpRealtime';
import { checkWLEDAudioReactiveConfig, WLEDConfigStatus, setWLEDUdpRealtime, rebootWLED } from '../../utils/wledConfigChecker';

interface AudioReactiveSectionProps {
  isDark: boolean;
  cardBackground: string;
  borderColor: string;
  textColor: string;
  subtextColor: string;
  onBrightnessChange?: (brightness: number) => void;
  activeDeviceIp?: string;
  isDeviceConnected?: boolean;
  onAudioReactiveChange?: (isActive: boolean) => void;
}

/**
 * Audio Reactive Section Component
 *
 * Displays audio reactive controls and live frequency visualizer for WLED effects.
 * Based on LedFx's audio processing algorithm using FFT and mel filterbank.
 *
 * IMPORTANT: For WLED to respond to audio reactive effects, you must:
 * 1. Enable "Audio Reactive" usermod in WLED (Settings > Usermods > AudioReactive)
 * 2. Set "UDP Sound Sync" to enabled in WLED
 * 3. Select an audio reactive effect (e.g., "Waverly", "GEQ", "Akemi")
 * 4. Make sure your WLED device is on the same network
 * 5. Check that UDP port matches (default: 11988)
 */
const AudioReactiveSection: React.FC<AudioReactiveSectionProps> = ({
  isDark,
  cardBackground,
  borderColor,
  textColor,
  subtextColor,
  onBrightnessChange,
  activeDeviceIp,
  isDeviceConnected = false,
  onAudioReactiveChange,
}) => {
  const {
    isRecording,
    audioFeatures,
    melSpectrum,
    startAudioCapture,
    stopAudioCapture,
    config,
    updateConfig,
    error,
    setAudioCallback,
  } = useAudioReactive();

  const [audioReactiveEnabled, setAudioReactiveEnabled] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [packetStats, setPacketStats] = useState({ sent: 0, dropped: 0 });
  const [packetsPerSecond, setPacketsPerSecond] = useState(0);
  const [numLeds, setNumLeds] = useState(50);
  const [testMode, setTestMode] = useState(false);
  const [configStatus, setConfigStatus] = useState<WLEDConfigStatus | null>(null);
  const [checkingConfig, setCheckingConfig] = useState(false);
  const [enablingUdp, setEnablingUdp] = useState(false);
  const [rebooting, setRebooting] = useState(false);
  const [effectType, setEffectType] = useState<'spectrum' | 'volume' | 'waves'>('spectrum');

  // Refs for intervals and stats tracking
  const testIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const previousSentRef = React.useRef(0);
  const lastStatsUpdateRef = React.useRef(0);

  // Detect LED count from WLED device
  useEffect(() => {
    const detectLedCount = async () => {
      if (activeDeviceIp) {
        try {
          const response = await fetch(`http://${activeDeviceIp}/json/info`);
          if (response.ok) {
            const info = await response.json();
            if (info.leds && info.leds.count) {
              setNumLeds(info.leds.count);
            }
          }
        } catch (error) {
          // Check if it's a network/timeout error
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isNetworkError = errorMessage.includes('timeout') ||
                                 errorMessage.includes('Network request') ||
                                 errorMessage.includes('Failed to fetch');

          if (isNetworkError) {
            console.log('⚠️ Could not detect LED count - device may be offline or unreachable');
          } else {
            console.error('Failed to detect LED count:', error);
          }
        }
      }
    };
    detectLedCount();
  }, [activeDeviceIp]);

  const handleToggleAudioReactive = async () => {
    if (isRecording) {
      // Turn off all LEDs before stopping
      if (activeDeviceIp) {
        turnOffAllLEDs(activeDeviceIp, numLeds);
      }

      stopAudioCapture();
      closeRealtimeSocket(); // Close UDP socket when stopping
      setAudioReactiveEnabled(false);
    } else {
      // Check if device is connected
      if (!activeDeviceIp) {
        alert('No device connected! Please connect to a WLED device first.');
        return;
      }

      // Show loading state
      setIsStarting(true);
      setTestMode(false);
      resetRealtimeState();
      resetRealtimePacketStats(); // Reset stats for new session

      // Check UDP Realtime status before starting
      try {
        const status = await checkWLEDAudioReactiveConfig(activeDeviceIp);
        setConfigStatus(status);

        if (!status.udpRealtimeEnabled) {
          setIsStarting(false);
          alert('UDP Realtime is not enabled on your WLED device.\n\nPlease tap "Enable UDP" below to enable it, or enable it manually in WLED settings:\nSettings > Sync Interfaces > Realtime UDP');
          return;
        }

        // UDP Realtime is enabled, proceed with starting audio
        startAudioCapture().then((success) => {
          setIsStarting(false);
          if (success) {
            setAudioReactiveEnabled(true);
            // Clear any test patterns
            if (activeDeviceIp) {
              turnOffAllLEDs(activeDeviceIp, numLeds);
            }
          }
        }).catch(() => {
          setIsStarting(false);
        });
      } catch (error) {
        setIsStarting(false);
        alert('Failed to check WLED configuration. Please ensure your device is connected.');
        console.error('Config check error:', error);
      }
    }
  };

  const handleCheckConfig = async () => {
    if (!activeDeviceIp) return;

    setCheckingConfig(true);
    try {
      const status = await checkWLEDAudioReactiveConfig(activeDeviceIp);
      setConfigStatus(status);
    } catch (error) {
      console.error('Failed to check WLED config:', error);
    } finally {
      setCheckingConfig(false);
    }
  };

  const handleEnableUdp = async () => {
    if (!activeDeviceIp) return;

    setEnablingUdp(true);
    try {
      const enable = !configStatus?.udpRealtimeEnabled;
      const result = await setWLEDUdpRealtime(activeDeviceIp, enable);

      if (result.success) {
        // Wait a moment for WLED to apply the change, then re-check
        setTimeout(async () => {
          await handleCheckConfig();
        }, 500);
      }
    } catch (error) {
      console.error('Failed to toggle UDP Realtime:', error);
    } finally {
      setEnablingUdp(false);
    }
  };

  const handleReboot = async () => {
    if (!activeDeviceIp) return;

    setRebooting(true);
    try {
      const success = await rebootWLED(activeDeviceIp);
      if (success) {
        // Wait 5 seconds for device to reboot, then re-check
        setTimeout(async () => {
          await handleCheckConfig();
          setRebooting(false);
        }, 5000);
      } else {
        setRebooting(false);
      }
    } catch (error) {
      console.error('Failed to reboot WLED:', error);
      setRebooting(false);
    }
  };

  const handleTestUDP = () => {
    if (!activeDeviceIp) {
      alert('No device connected! Please connect to a WLED device first.');
      return;
    }

    setTestMode(!testMode);
  };

  const handleReset = () => {
    if (activeDeviceIp) {
      turnOffAllLEDs(activeDeviceIp, numLeds);
    }
    setTestMode(false);
    setConfigStatus(null);
    if (isRecording) {
      stopAudioCapture();
      closeRealtimeSocket();
      setAudioReactiveEnabled(false);
    }
  };

  // Setup direct audio callback for high-performance UDP sending (bypasses React re-renders)
  React.useEffect(() => {
    if (audioReactiveEnabled && isRecording && activeDeviceIp) {
      // Set up direct callback that runs on every audio frame
      setAudioCallback((features, spectrum) => {
        // Send UDP packet with LED colors (no React re-render!)
        sendRealtimeToWLED(activeDeviceIp, features, spectrum, numLeds, effectType);

        // Update stats every second (throttled to avoid excessive state updates)
        const now = Date.now();
        if (now - lastStatsUpdateRef.current >= 1000) {
          const stats = getRealtimePacketStats();
          const pps = stats.sent - previousSentRef.current;
          setPacketStats(stats);
          setPacketsPerSecond(pps);
          previousSentRef.current = stats.sent;
          lastStatsUpdateRef.current = now;
        }
      });
    } else {
      // Clear callback when not active
      setAudioCallback(null);
    }

    return () => {
      setAudioCallback(null);
    };
  }, [audioReactiveEnabled, isRecording, activeDeviceIp, effectType, numLeds, setAudioCallback]);

  // Notify parent when AR state changes
  React.useEffect(() => {
    if (onAudioReactiveChange) {
      onAudioReactiveChange(audioReactiveEnabled && isRecording);
    }
  }, [audioReactiveEnabled, isRecording, onAudioReactiveChange]);

  // Keep device awake when audio reactive is active
  React.useEffect(() => {
    if (audioReactiveEnabled && isRecording) {
      activateKeepAwakeAsync('audio-reactive')
        .catch(err => console.error('Failed to activate keep awake:', err));
    } else {
      deactivateKeepAwake('audio-reactive');
    }

    return () => {
      deactivateKeepAwake('audio-reactive');
    };
  }, [audioReactiveEnabled, isRecording]);

  // Update packet stats for test mode (audio mode updates inline above)
  React.useEffect(() => {
    if (!testMode) return;

    const intervalId = setInterval(() => {
      const stats = getRealtimePacketStats();
      const pps = stats.sent - previousSentRef.current;
      setPacketStats(stats);
      setPacketsPerSecond(pps);
      previousSentRef.current = stats.sent;
    }, 1000);

    return () => clearInterval(intervalId);
  }, [testMode]);

  // Send test pattern repeatedly when test mode is active
  React.useEffect(() => {
    if (!testMode || !activeDeviceIp) {
      if (testIntervalRef.current) {
        clearInterval(testIntervalRef.current);
        testIntervalRef.current = null;
      }
      return;
    }

    // Send immediately
    sendTestPatternOnce(activeDeviceIp, numLeds);

    // Then send every 2 seconds
    testIntervalRef.current = setInterval(() => {
      sendTestPatternOnce(activeDeviceIp, numLeds);
    }, 2000);

    return () => {
      if (testIntervalRef.current) {
        clearInterval(testIntervalRef.current);
        testIntervalRef.current = null;
      }
    };
  }, [testMode, activeDeviceIp, numLeds]);

  return (
    <View style={[sharedStyles.sectionCard, { backgroundColor: cardBackground, borderColor: isDark ? '#4b5563' : '#1e293b', position: 'relative' }]}>
      {/* Device Offline Overlay */}
      {!isDeviceConnected && (
        <View
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
              borderRadius: 12,
              padding: 16,
              borderWidth: 2,
              borderColor: '#ef4444',
              maxWidth: '75%',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 6,
            }}
          >
            <Ionicons name="cloud-offline" size={32} color="#ef4444" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: textColor, marginBottom: 6 }}>
              Device Offline
            </Text>
            <Text style={{ fontSize: 12, color: subtextColor, textAlign: 'center', lineHeight: 16 }}>
              Connect to a WLED device to use Audio Reactive features.
            </Text>
          </View>
        </View>
      )}

      <View style={sharedStyles.sectionHeader}>
        <View style={sharedStyles.headerLeft}>
          <Ionicons name="musical-notes" size={20} color={textColor} />
          <Text style={[sharedStyles.sectionTitle, { color: textColor }]}>
            Audio Reactive
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleToggleAudioReactive}
          disabled={isStarting}
          style={[
            styles.toggleButton,
            {
              backgroundColor: isRecording ? '#10b981' : (isDark ? '#374151' : '#e5e7eb'),
              opacity: isStarting ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons
            name={isStarting ? 'hourglass-outline' : (isRecording ? 'mic' : 'mic-off')}
            size={18}
            color={isRecording ? '#ffffff' : textColor}
          />
          <Text style={[styles.toggleText, { color: isRecording ? '#ffffff' : textColor }]}>
            {isStarting ? 'Starting...' : (isRecording ? 'Active' : 'Start')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={sharedStyles.sectionContent}>
        {/* Audio Visualizer with Sensitivity Slider */}
        <View style={styles.visualizerContainer}>
          <View style={styles.visualizerWrapper}>
            <AudioVisualizer
              audioFeatures={isRecording ? audioFeatures : null}
              melSpectrum={isRecording ? melSpectrum : []}
              isDark={isDark}
              height={140}
              isActive={isRecording}
            />
          </View>
          <View style={styles.verticalSliderWrapper}>
            <Text style={[styles.sliderValue, { color: isDark ? '#93c5fd' : '#3b82f6', opacity: isRecording ? 1 : 0.5 }]}>
              {config.sensitivity.toFixed(1)}x
            </Text>
            <Slider
              style={styles.verticalSlider}
              minimumValue={0.1}
              maximumValue={2.0}
              step={0.1}
              value={config.sensitivity}
              onSlidingComplete={(value) => updateConfig({ sensitivity: value })}
              minimumTrackTintColor="#3b82f6"
              maximumTrackTintColor={isDark ? '#4b5563' : '#e5e7eb'}
              thumbTintColor={isDark ? '#ffffff' : '#3b82f6'}
              disabled={!isRecording}
            />
            <Text style={[styles.sliderLabel, { color: subtextColor, opacity: isRecording ? 1 : 0.5 }]}>
              Sens
            </Text>
          </View>
        </View>

        {/* Effect Type Selector */}
        {isRecording && (
          <View style={styles.effectTypeContainer}>
            <Text style={[styles.effectTypeLabel, { color: subtextColor }]}>Effect:</Text>
            <View style={styles.effectTypeButtons}>
              <TouchableOpacity
                onPress={() => setEffectType('spectrum')}
                style={[
                  styles.effectTypeButton,
                  {
                    backgroundColor: effectType === 'spectrum' ? '#3b82f6' : (isDark ? '#374151' : '#e5e7eb'),
                  }
                ]}
              >
                <Text style={[styles.effectTypeButtonText, { color: effectType === 'spectrum' ? '#ffffff' : textColor }]}>
                  Spectrum
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEffectType('volume')}
                style={[
                  styles.effectTypeButton,
                  {
                    backgroundColor: effectType === 'volume' ? '#3b82f6' : (isDark ? '#374151' : '#e5e7eb'),
                  }
                ]}
              >
                <Text style={[styles.effectTypeButtonText, { color: effectType === 'volume' ? '#ffffff' : textColor }]}>
                  Volume
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEffectType('waves')}
                style={[
                  styles.effectTypeButton,
                  {
                    backgroundColor: effectType === 'waves' ? '#3b82f6' : (isDark ? '#374151' : '#e5e7eb'),
                  }
                ]}
              >
                <Text style={[styles.effectTypeButtonText, { color: effectType === 'waves' ? '#ffffff' : textColor }]}>
                  Waves
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Audio Features Display */}
        {audioFeatures && isRecording && (
          <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
              <View style={styles.featureItem}>
                <Text style={[styles.featureLabel, { color: subtextColor }]}>Bass</Text>
                <Text style={[styles.featureValue, { color: '#ef4444' }]}>
                  {Math.round(audioFeatures.bass * 100)}%
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={[styles.featureLabel, { color: subtextColor }]}>Mid</Text>
                <Text style={[styles.featureValue, { color: '#10b981' }]}>
                  {Math.round(audioFeatures.mid * 100)}%
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={[styles.featureLabel, { color: subtextColor }]}>Treble</Text>
                <Text style={[styles.featureValue, { color: '#3b82f6' }]}>
                  {Math.round(audioFeatures.treble * 100)}%
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={[styles.featureLabel, { color: subtextColor }]}>Vol</Text>
                <Text style={[styles.featureValue, { color: textColor }]}>
                  {Math.round(audioFeatures.volume * 100)}%
                </Text>
              </View>
            </View>
          </View>
        )}


        {/* Error Display */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: isDark ? '#7f1d1d' : '#fee2e2' }]}>
            <Ionicons name="warning" size={16} color="#ef4444" />
            <Text style={[styles.errorText, { color: '#ef4444' }]}>{error}</Text>
          </View>
        )}

        {/* Info Text */}
        {!isRecording && !error && (
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle" size={16} color={subtextColor} />
            <Text style={[styles.infoText, { color: subtextColor }]}>
              Uses phone mic to render audio reactive effects on WLED.
            </Text>
          </View>
        )}

        {/* Test, Check Config & Reset Buttons */}
        {!isRecording && activeDeviceIp && (
          <View style={styles.configCheckerContainer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={handleTestUDP}
                style={[
                  styles.checkConfigButton,
                  styles.flexButton,
                  {
                    backgroundColor: testMode ? '#10b981' : (isDark ? '#374151' : '#f3f4f6'),
                    borderColor: isDark ? '#4b5563' : '#1e293b',
                  }
                ]}
              >
                <Ionicons
                  name={testMode ? 'stop-circle' : 'flash'}
                  size={16}
                  color={testMode ? '#ffffff' : textColor}
                />
                <Text style={[styles.checkConfigText, { color: testMode ? '#ffffff' : textColor }]}>
                  {testMode ? 'Stop' : 'Test'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCheckConfig}
                disabled={checkingConfig}
                style={[
                  styles.checkConfigButton,
                  styles.flexButton,
                  {
                    backgroundColor: isDark ? '#374151' : '#f3f4f6',
                    borderColor: isDark ? '#4b5563' : '#1e293b',
                    opacity: checkingConfig ? 0.5 : 1,
                  }
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={textColor}
                />
                <Text style={[styles.checkConfigText, { color: textColor }]}>
                  {checkingConfig ? 'Checking...' : 'Check'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReset}
                style={[
                  styles.checkConfigButton,
                  styles.flexButton,
                  {
                    backgroundColor: isDark ? '#374151' : '#f3f4f6',
                    borderColor: isDark ? '#4b5563' : '#1e293b',
                  }
                ]}
              >
                <Ionicons
                  name="refresh"
                  size={16}
                  color={textColor}
                />
                <Text style={[styles.checkConfigText, { color: textColor }]}>
                  Reset
                </Text>
              </TouchableOpacity>
            </View>

            {/* Test Mode Help Message */}
            {testMode && (
              <View style={[styles.testHelpContainer, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
                <Ionicons name="bulb" size={14} color={isDark ? '#93c5fd' : '#3b82f6'} />
                <Text style={[styles.testHelpText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
                  If you don't see light effects, this means UDP Realtime is not working. Press "Check" to see UDP status and enable it if needed.
                </Text>
              </View>
            )}


            {/* Config Status Display */}
            {configStatus && (
              <View style={styles.configStatusContainer}>
                <View style={[
                  styles.configStatusItem,
                  { backgroundColor: configStatus.isReady ? (isDark ? '#064e3b' : '#d1fae5') : (isDark ? '#7f1d1d' : '#fee2e2') }
                ]}>
                  <Ionicons
                    name={configStatus.isReady ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={configStatus.isReady ? '#10b981' : '#ef4444'}
                  />
                  <Text style={[styles.configStatusText, { color: configStatus.isReady ? '#10b981' : '#ef4444' }]}>
                    {configStatus.isReady ? 'UDP Realtime Ready ✓' : configStatus.issues[0] || 'Configuration Issues'}
                  </Text>
                </View>

                {/* Enable/Disable UDP Button */}
                <TouchableOpacity
                  onPress={handleEnableUdp}
                  disabled={enablingUdp}
                  style={[
                    styles.enableUdpButton,
                    {
                      backgroundColor: configStatus.udpRealtimeEnabled ? '#ef4444' : '#10b981',
                      opacity: enablingUdp ? 0.5 : 1,
                    }
                  ]}
                >
                  <Ionicons name="power" size={16} color="#ffffff" />
                  <Text style={[styles.enableUdpText, { color: '#ffffff' }]}>
                    {enablingUdp ? 'Updating...' : (configStatus.udpRealtimeEnabled ? 'Disable UDP' : 'Enable UDP')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Active status indicator */}
        {isRecording && activeDeviceIp && (
          <View style={styles.statusIndicator}>
            <View style={[styles.statusPulse, { backgroundColor: '#10b981' }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusText, { color: subtextColor }]}>
                UDP Realtime → {activeDeviceIp}:21324
              </Text>
              <Text style={[styles.packetStatsText, { color: subtextColor }]}>
                📦 {packetStats.sent} sent • {packetsPerSecond}/s
                {packetStats.dropped > 0 && ` • ⚠️ ${packetStats.dropped} dropped`}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: isDark ? '#4b5563' : '#1e293b',
    minWidth: 90,
    gap: 6,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  featuresContainer: {
    marginTop: 12,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  featureItem: {
    alignItems: 'center',
  },
  featureLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  featureValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  controlContainer: {
    marginTop: 12,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  controlValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  visualizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  visualizerWrapper: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    borderWidth: 2,
    borderColor: isDark ? '#4b5563' : '#1e293b',
    borderRadius: 8,
    overflow: 'hidden',
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  verticalSliderWrapper: {
    height: 170,
    width: 60,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    paddingVertical: 8,
  },
  verticalSlider: {
    width: 120,
    height: 40,
    transform: [{ rotate: '-90deg' }],
  },
  sliderValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  sliderLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  portInput: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'center',
  },
  portHint: {
    fontSize: 10,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    padding: 10,
    gap: 8,
  },
  infoText: {
    fontSize: 10,
    lineHeight: 16,
    flex: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 8,
  },
  statusPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  packetStatsText: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
  },
  effectTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  effectTypeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  effectTypeButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  effectTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  effectTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  configCheckerContainer: {
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  checkConfigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    gap: 6,
  },
  flexButton: {
    flex: 1,
  },
  checkConfigText: {
    fontSize: 12,
    fontWeight: '600',
  },
  configStatusContainer: {
    marginTop: 8,
  },
  configStatusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
    gap: 6,
  },
  configStatusText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  protocolButtons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  protocolButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
  },
  protocolButtonText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  enableUdpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: isDark ? '#4b5563' : '#1e293b',
    gap: 6,
  },
  enableUdpText: {
    fontSize: 12,
    fontWeight: '600',
  },
  testHelpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  testHelpText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});

export default React.memo(AudioReactiveSection);
