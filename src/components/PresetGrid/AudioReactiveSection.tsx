import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sharedStyles } from './styles';
import { useAudioReactive } from '../../hooks/useAudioReactive';
import AudioVisualizer from '../AudioVisualizer';
import { audioToBrightness } from '../../utils/audioProcessing';
import { sendRealtimeToWLED, closeRealtimeSocket, getRealtimePacketStats, resetRealtimeState, sendTestPatternOnce, turnOffAllLEDs } from '../../utils/wledUdpRealtime';
import { checkWLEDAudioReactiveConfig, WLEDConfigStatus, setWLEDUdpRealtime, rebootWLED } from '../../utils/wledConfigChecker';

interface AudioReactiveSectionProps {
  isDark: boolean;
  cardBackground: string;
  borderColor: string;
  textColor: string;
  subtextColor: string;
  onBrightnessChange?: (brightness: number) => void;
  activeDeviceIp?: string;
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
  const testIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

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
          console.error('Failed to detect LED count:', error);
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
      // Show loading state
      setIsStarting(true);
      setTestMode(false);
      setConfigStatus(null);
      resetRealtimeState();

      // Start audio in background
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
    if (!activeDeviceIp) return;

    const newTestMode = !testMode;
    setTestMode(newTestMode);

    if (newTestMode) {
      // Send test pattern once
      sendTestPatternOnce(activeDeviceIp, numLeds);
    }
  };

  const handleReset = () => {
    // Turn off all LEDs before resetting
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

  // Send test pattern when test mode is active

  // Send LED colors to WLED via UDP Realtime
  React.useEffect(() => {
    if (audioReactiveEnabled && isRecording && audioFeatures && melSpectrum.length > 0 && activeDeviceIp) {
      sendRealtimeToWLED(
        activeDeviceIp,
        audioFeatures,
        melSpectrum,
        numLeds,
        effectType
      );
    }
  }, [audioFeatures, melSpectrum, audioReactiveEnabled, isRecording, activeDeviceIp, effectType]);

  // Update packet stats and calculate packets/s
  React.useEffect(() => {
    if (!isRecording) return;

    let previousSent = 0;
    const interval = setInterval(() => {
      const stats = getRealtimePacketStats();
      setPacketStats(stats);

      // Calculate packets per second
      const pps = stats.sent - previousSent;
      setPacketsPerSecond(pps);
      previousSent = stats.sent;
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isRecording]);

  // Send test pattern repeatedly when test mode is active
  React.useEffect(() => {
    if (testMode && activeDeviceIp) {
      // Send immediately
      sendTestPatternOnce(activeDeviceIp, numLeds);

      // Then send every 2000ms (slower to avoid interference)
      testIntervalRef.current = setInterval(() => {
        sendTestPatternOnce(activeDeviceIp, numLeds);
      }, 2000);
    } else {
      // Clear interval when test mode is off
      if (testIntervalRef.current) {
        clearInterval(testIntervalRef.current);
        testIntervalRef.current = null;
      }
    }

    return () => {
      if (testIntervalRef.current) {
        clearInterval(testIntervalRef.current);
        testIntervalRef.current = null;
      }
    };
  }, [testMode, activeDeviceIp, numLeds]);

  return (
    <View style={[sharedStyles.sectionCard, { backgroundColor: cardBackground, borderColor }]}>
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
              onValueChange={(value) => updateConfig({ sensitivity: value })}
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
            <Ionicons name="information-circle" size={20} color={subtextColor} />
            <Text style={[styles.infoText, { color: subtextColor }]}>
              Tap "Start" to enable audio reactive effects.{'\n'}
              Your microphone will analyze music in real-time and control your LEDs directly.{'\n\n'}
              <Text style={{ fontWeight: '600' }}>How it works:{'\n'}</Text>
              • Audio is analyzed on your phone{'\n'}
              • LED colors are sent via UDP Realtime{'\n'}
              • Effect runs independently of WLED presets
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
                    borderColor: testMode ? '#10b981' : (isDark ? '#4b5563' : '#d1d5db'),
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
                    borderColor: isDark ? '#4b5563' : '#d1d5db',
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
                    borderColor: isDark ? '#4b5563' : '#d1d5db',
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
    height: 140,
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
    borderWidth: 1,
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
    fontSize: 12,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    gap: 6,
  },
  enableUdpText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default React.memo(AudioReactiveSection);
