import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { EffectConfig } from '../utils/ledfxEffects';

interface AudioReactiveSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  sensitivity: number;
  onSensitivityChange: (value: number) => void;
  effectConfig: EffectConfig;
  onEffectConfigChange: (config: EffectConfig) => void;
  ledOffset: number;
  onLedOffsetChange: (value: number) => void;
}

export default function AudioReactiveSettingsModal({
  visible,
  onClose,
  isDark,
  sensitivity,
  onSensitivityChange,
  effectConfig,
  onEffectConfigChange,
  ledOffset,
  onLedOffsetChange,
}: AudioReactiveSettingsModalProps) {
  const textColor = isDark ? '#ffffff' : '#111827';
  const subtextColor = isDark ? '#9ca3af' : '#6b7280';
  const backgroundColor = isDark ? '#1f2937' : '#ffffff';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#374151' : '#e5e7eb' }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Audio Reactive Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.container}>
        {/* Sensitivity Slider */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: textColor }]}>Sensitivity</Text>
            <Text style={[styles.sliderValue, { color: isDark ? '#93c5fd' : '#3b82f6' }]}>
              {sensitivity.toFixed(1)}x
            </Text>
          </View>
          <Text style={[styles.sliderDescription, { color: subtextColor }]}>
            Adjusts how responsive the effects are to audio input
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0.1}
            maximumValue={2.0}
            step={0.1}
            value={sensitivity}
            onSlidingComplete={onSensitivityChange}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor={isDark ? '#4b5563' : '#e5e7eb'}
            thumbTintColor={isDark ? '#ffffff' : '#3b82f6'}
          />
        </View>

        {/* Brightness Slider */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: textColor }]}>Brightness</Text>
            <Text style={[styles.sliderValue, { color: isDark ? '#93c5fd' : '#3b82f6' }]}>
              {Math.round((effectConfig.brightness || 1) * 100)}%
            </Text>
          </View>
          <Text style={[styles.sliderDescription, { color: subtextColor }]}>
            Overall brightness of the LED colors
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            step={0.05}
            value={effectConfig.brightness || 1}
            onValueChange={(value) => onEffectConfigChange({ ...effectConfig, brightness: value })}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor={isDark ? '#4b5563' : '#e5e7eb'}
            thumbTintColor={isDark ? '#ffffff' : '#3b82f6'}
          />
        </View>

        {/* Speed Slider */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: textColor }]}>Speed</Text>
            <Text style={[styles.sliderValue, { color: isDark ? '#93c5fd' : '#3b82f6' }]}>
              {(effectConfig.speed || 2).toFixed(1)}x
            </Text>
          </View>
          <Text style={[styles.sliderDescription, { color: subtextColor }]}>
            Animation speed for effects like Scroll and Wave
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={5}
            step={0.5}
            value={effectConfig.speed || 2}
            onValueChange={(value) => onEffectConfigChange({ ...effectConfig, speed: value })}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor={isDark ? '#4b5563' : '#e5e7eb'}
            thumbTintColor={isDark ? '#ffffff' : '#3b82f6'}
          />
        </View>

        {/* Blur Slider */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: textColor }]}>Blur</Text>
            <Text style={[styles.sliderValue, { color: isDark ? '#93c5fd' : '#3b82f6' }]}>
              {Math.round((effectConfig.blur || 0.3) * 100)}%
            </Text>
          </View>
          <Text style={[styles.sliderDescription, { color: subtextColor }]}>
            Smoothing amount for softer color transitions
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            step={0.1}
            value={effectConfig.blur || 0.3}
            onValueChange={(value) => onEffectConfigChange({ ...effectConfig, blur: value })}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor={isDark ? '#4b5563' : '#e5e7eb'}
            thumbTintColor={isDark ? '#ffffff' : '#3b82f6'}
          />
        </View>

        {/* LED Offset Compensation */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: textColor }]}>LED Offset</Text>
            <Text style={[styles.sliderValue, { color: isDark ? '#93c5fd' : '#3b82f6' }]}>
              {ledOffset}
            </Text>
          </View>
          <Text style={[styles.sliderDescription, { color: subtextColor }]}>
            Compensate for data corruption or offset issues (try 0-30)
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={30}
            step={1}
            value={ledOffset}
            onSlidingComplete={onLedOffsetChange}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor={isDark ? '#4b5563' : '#e5e7eb'}
            thumbTintColor={isDark ? '#ffffff' : '#3b82f6'}
          />
        </View>
      </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: 500,
  },
  container: {
    padding: 16,
    gap: 24,
  },
  sliderSection: {
    gap: 8,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  sliderDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
