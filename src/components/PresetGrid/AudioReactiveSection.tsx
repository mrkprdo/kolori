import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sharedStyles } from './styles';
import { useAudioReactive } from '../../hooks/useAudioReactive';
import AudioVisualizer from '../AudioVisualizer';
import AudioReactiveSettingsModal from '../AudioReactiveSettingsModal';
import { sendDdpToWLED, closeDdpSocket, getDdpPacketStats, resetDdpPacketStats, resetDdpState, sendBlankFrame } from '../../utils/wledDdp';
import { LEDFX_EFFECTS, EffectType, EffectConfig } from '../../utils/ledfxEffects';

interface AudioReactiveSectionProps {
  isDark: boolean;
  cardBackground: string;
  borderColor: string;
  textColor: string;
  subtextColor: string;
  activeDeviceIp?: string;
  isDeviceConnected?: boolean;
  onAudioReactiveChange?: (isActive: boolean) => void;
}

/**
 * Audio Reactive Section Component
 *
 * LedFx-style audio reactive visualizations using DDP protocol.
 * Processes audio locally and sends RGB pixel data to WLED via DDP (port 4048).
 *
 * Features:
 * - 6 classic LedFx effects (Wavelength, Energy, Scroll, Bars, Pulse, Wave)
 * - Real-time FFT audio processing with mel-scale filterbank
 * - DDP protocol for reliable LED streaming
 * - Live audio visualizer
 * - No WLED configuration required - works out of the box!
 */
const AudioReactiveSection: React.FC<AudioReactiveSectionProps> = ({
  isDark,
  cardBackground,
  borderColor,
  textColor,
  subtextColor,
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
    error,
    setAudioCallback,
  } = useAudioReactive();

  const [audioReactiveEnabled, setAudioReactiveEnabled] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [packetStats, setPacketStats] = useState({ sent: 0, dropped: 0 });
  const [packetsPerSecond, setPacketsPerSecond] = useState(0);
  const [numLeds, setNumLeds] = useState(50);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [sensitivity, setSensitivity] = useState(1.0);
  const [ledOffset, setLedOffset] = useState(15); // LED offset compensation (default 15)

  // Effect selection and configuration
  const [selectedEffect, setSelectedEffect] = useState<EffectType>('wavelength');
  const [effectConfig, setEffectConfig] = useState<EffectConfig>({
    brightness: 1.0, // Full brightness by default
    speed: 2,
    blur: 0.3,
  });

  // Refs for stats tracking
  const previousSentRef = React.useRef(0);
  const lastStatsUpdateRef = React.useRef(0);

  // Handle effect change - turn off LEDs before switching
  const handleEffectChange = (newEffect: EffectType) => {
    if (activeDeviceIp && newEffect !== selectedEffect) {
      // Send blank frame to turn off LEDs (with offset compensation)
      sendBlankFrame(activeDeviceIp, numLeds + ledOffset);
      // Reset effect state
      resetDdpState();
      // Update selected effect
      setSelectedEffect(newEffect);
    }
  };

  // Load LED offset from storage on mount
  useEffect(() => {
    const loadLedOffset = async () => {
      try {
        const saved = await AsyncStorage.getItem('@audio_reactive_led_offset');
        if (saved !== null) {
          setLedOffset(parseInt(saved, 10));
        }
      } catch (error) {
        console.error('Failed to load LED offset:', error);
      }
    };
    loadLedOffset();
  }, []);

  // Save LED offset to storage whenever it changes
  useEffect(() => {
    const saveLedOffset = async () => {
      try {
        await AsyncStorage.setItem('@audio_reactive_led_offset', ledOffset.toString());
      } catch (error) {
        console.error('Failed to save LED offset:', error);
      }
    };
    saveLedOffset();
  }, [ledOffset]);

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

          if (!isNetworkError) {
            console.error('Failed to detect LED count:', error);
          }
        }
      }
    };
    detectLedCount();
  }, [activeDeviceIp]);

  const handleToggleAudioReactive = async () => {
    if (isRecording) {
      // Stop audio capture
      stopAudioCapture();
      closeDdpSocket(); // Close DDP socket
      resetDdpState(); // Reset effect state
      setAudioReactiveEnabled(false);
    } else {
      // Check if device is connected
      if (!activeDeviceIp) {
        alert('No device connected! Please connect to a WLED device first.');
        return;
      }

      // Turn off LEDs first to clear any existing WLED state (with offset compensation)
      sendBlankFrame(activeDeviceIp, numLeds + ledOffset);
      resetDdpState(); // Reset effect state for clean start

      // Show loading state
      setIsStarting(true);
      resetDdpPacketStats(); // Reset stats for new session

      // Start audio capture - DDP works out of the box, no WLED config needed!
      try {
        const success = await startAudioCapture();
        setIsStarting(false);
        if (success) {
          setAudioReactiveEnabled(true);
          activateKeepAwakeAsync(); // Keep screen awake during audio reactive
        }
      } catch (error) {
        setIsStarting(false);
        alert('Failed to start audio capture. Please check microphone permissions.');
        console.error('Audio capture error:', error);
      }
    }
  };

  // Setup DDP audio callback - sends RGB pixel data directly to WLED
  React.useEffect(() => {
    if (audioReactiveEnabled && isRecording && activeDeviceIp) {
      // Set up direct callback that runs on every audio frame
      setAudioCallback((features, spectrum) => {
        // Send RGB pixel data via DDP using selected effect
        sendDdpToWLED(activeDeviceIp, features, spectrum, numLeds, selectedEffect, effectConfig, ledOffset);

        // Update stats every second (throttled to avoid excessive state updates)
        const now = Date.now();
        if (now - lastStatsUpdateRef.current >= 1000) {
          const stats = getDdpPacketStats();
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
  }, [audioReactiveEnabled, isRecording, activeDeviceIp, selectedEffect, effectConfig, numLeds, ledOffset, setAudioCallback]);

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
        <View style={styles.headerButtons}>
          {isRecording && (
            <TouchableOpacity
              onPress={() => setSettingsModalVisible(true)}
              style={[
                styles.settingsButton,
                {
                  backgroundColor: isDark ? '#374151' : '#e5e7eb',
                  borderColor: isDark ? '#4b5563' : '#1e293b',
                },
              ]}
            >
              <Ionicons name="settings-outline" size={18} color={textColor} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleToggleAudioReactive}
            disabled={isStarting}
            style={[
              styles.toggleButton,
              {
                backgroundColor: isRecording ? '#10b981' : (isDark ? '#374151' : '#e5e7eb'),
                borderColor: isDark ? '#4b5563' : '#1e293b',
                opacity: isStarting ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons
              name={isStarting ? 'hourglass-outline' : (isRecording ? 'mic-outline' : 'mic-off-outline')}
              size={18}
              color={isRecording ? '#ffffff' : textColor}
            />
            <Text style={[styles.toggleText, { color: isRecording ? '#ffffff' : textColor }]}>
              {isStarting ? 'Starting...' : (isRecording ? 'Active' : 'Start')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={sharedStyles.sectionContent}>
        {/* Audio Visualizer */}
        <View style={[styles.visualizerWrapper, { borderColor: borderColor }]}>
          <AudioVisualizer
            audioFeatures={isRecording ? audioFeatures : null}
            melSpectrum={isRecording ? melSpectrum : []}
            isDark={isDark}
            height={140}
            isActive={isRecording}
          />
        </View>

        {/* LedFx Effect Preset Dropdown */}
        {isRecording && (
          <View style={styles.effectDropdownContainer}>
            <Text style={[styles.effectDropdownLabel, { color: textColor }]}>Effect Preset:</Text>
            <View style={[styles.pickerWrapper, {
              backgroundColor: isDark ? '#374151' : '#f3f4f6',
              borderColor: isDark ? '#4b5563' : '#d1d5db',
            }]}>
              <Picker
                selectedValue={selectedEffect}
                onValueChange={(itemValue) => handleEffectChange(itemValue as EffectType)}
                style={[styles.picker, { color: textColor }]}
                dropdownIconColor={textColor}
              >
                {LEDFX_EFFECTS.map((effect) => (
                  <Picker.Item
                    key={effect.id}
                    label={effect.name}
                    value={effect.id}
                  />
                ))}
              </Picker>
            </View>
            <Text style={[styles.effectDescription, { color: subtextColor }]}>
              {LEDFX_EFFECTS.find(e => e.id === selectedEffect)?.description}
            </Text>
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


        {/* Active status indicator */}
        {isRecording && activeDeviceIp && (
          <View style={styles.statusIndicator}>
            <View style={[styles.statusPulse, { backgroundColor: '#10b981' }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusText, { color: subtextColor }]}>
                DDP Protocol → {activeDeviceIp}:4048
              </Text>
              <Text style={[styles.packetStatsText, { color: subtextColor }]}>
                📦 {packetStats.sent} sent • {packetsPerSecond}/s • {numLeds} LEDs
                {packetStats.dropped > 0 && ` • ⚠️ ${packetStats.dropped} dropped`}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Settings Modal */}
      <AudioReactiveSettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        isDark={isDark}
        sensitivity={sensitivity}
        onSensitivityChange={setSensitivity}
        effectConfig={effectConfig}
        onEffectConfigChange={setEffectConfig}
        ledOffset={ledOffset}
        onLedOffsetChange={setLedOffset}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    minWidth: 90,
    gap: 6,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
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
    borderRadius: 8,
    overflow: 'hidden',
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
  effectDropdownContainer: {
    marginTop: 12,
    gap: 6,
  },
  effectDropdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  pickerWrapper: {
    borderRadius: 8,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  effectDescription: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default React.memo(AudioReactiveSection);
