import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FloatingModal from './FloatingModal';
import { WledDevice } from '../types';
import { logger } from '../utils/logger';
import {
  saveWledRobustSchedule,
  resetWledTimerSettings,
  fetchWledCurrentPreset,
} from '../config/wledApi';
import { fetchWledTimerSettings, WledTimerSettings } from '../config/wledTimer';

interface SchedulerModalProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  activeDevice: WledDevice | undefined;
  configuredSchedule: any;
  setConfiguredSchedule: (schedule: any) => void;
  schedulerEnabled: boolean;
  setSchedulerEnabled: (enabled: boolean) => void;
}

export default function SchedulerModal({
  visible,
  onClose,
  isDark,
  activeDevice,
  configuredSchedule,
  setConfiguredSchedule,
  schedulerEnabled,
  setSchedulerEnabled,
}: SchedulerModalProps) {
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4, 5, 6])
  );
  const [turnOnTime, setTurnOnTime] = useState('20:00');
  const [turnOffTime, setTurnOffTime] = useState('07:00');
  const [targetPresetId, setTargetPresetId] = useState<number>(3);
  const [isSchedulerSaving, setIsSchedulerSaving] = useState(false);
  const [isLoadingTimerSettings, setIsLoadingTimerSettings] = useState(false);

  // Helper function to convert WLED timer weekdays bitmask to day set
  const convertWledDaysToSet = useCallback((weekdaysBitmask: number): Set<number> => {
    const daySet = new Set<number>();
    for (let i = 0; i < 7; i++) {
      // WLED uses Sunday = bit 0, Monday = bit 1, etc.
      if (weekdaysBitmask & (1 << i)) {
        daySet.add(i);
      }
    }
    return daySet;
  }, []);

  // Helper function to format time from hour/minute
  const formatTime = useCallback((hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }, []);

  // Load current WLED timer settings
  const loadTimerSettings = useCallback(async () => {
    if (!activeDevice?.ip || !activeDevice?.isConnected) {
      return;
    }

    setIsLoadingTimerSettings(true);
    try {
      logger.log(`📥 Loading WLED timer settings from ${activeDevice.ip}`);
      const result = await fetchWledTimerSettings(
        activeDevice.ip,
        activeDevice.protocol || 'http'
      );

      if (result.success && result.timerSettings) {

        // Find active timers (Timer 0 and Timer 1 are typically used for ON/OFF)
        const timer0 = result.timerSettings.timers[0]; // Turn ON timer
        const timer1 = result.timerSettings.timers[1]; // Turn OFF timer

        logger.log(`🔎 Found timers - Timer0: preset=${timer0.preset}, time=${timer0.hour}:${timer0.minute}, Timer1: preset=${timer1.preset}, time=${timer1.hour}:${timer1.minute}`);

        // If Timer 0 has a valid preset (indicating it's configured), load its settings
        // Note: We check preset > 0 since enabled flag might not be parsed correctly
        if (timer0.preset > 0 && timer0.preset !== 62) {
          const onTime = formatTime(timer0.hour, timer0.minute);
          const offTime = timer1.preset === 62
            ? formatTime(timer1.hour, timer1.minute)
            : turnOffTime; // Keep current value if no Timer 1

          setTurnOnTime(onTime);
          setTargetPresetId(timer0.preset);
          setSelectedDays(convertWledDaysToSet(timer0.weekdays));

          // If Timer 1 is set to turn off (preset 62), load its time
          if (timer1.preset === 62) {
            setTurnOffTime(offTime);
          }

          // Update the scheduler state to show as active (parent component state)
          setSchedulerEnabled(true);
          setConfiguredSchedule({
            onTime: onTime,
            offTime: offTime,
            presetId: timer0.preset,
          });

          logger.log(`✅ Loaded timer settings: ON at ${onTime}, OFF at ${offTime}, preset ${timer0.preset}`);
        } else {
          // No active schedule found
          setSchedulerEnabled(false);
          setConfiguredSchedule(null);
          logger.log(`ℹ️ No active schedule found on device`);
        }
      } else {
        logger.warn(`⚠️ Failed to load timer settings: ${result.message}`);
      }
    } catch (error: any) {
      logger.error('❌ Error loading timer settings:', error);
    } finally {
      setIsLoadingTimerSettings(false);
    }
  }, [activeDevice, convertWledDaysToSet, formatTime]);

  // Load timer settings when modal opens
  useEffect(() => {
    if (visible && activeDevice?.isConnected) {
      logger.log(`🔍 SchedulerModal opened: schedulerEnabled=${schedulerEnabled}, configuredSchedule=${JSON.stringify(configuredSchedule)}`);
      loadTimerSettings();
    }
  }, [visible, activeDevice?.isConnected, loadTimerSettings]);

  // Handle time input formatting
  const handleTimeInput = useCallback(
    (
      text: string,
      setter: (value: string) => void
    ) => {
      let cleaned = text.replace(/[^0-9]/g, '');

      if (cleaned.length >= 2) {
        const hours = cleaned.substring(0, 2);
        const minutes = cleaned.substring(2, 4);
        cleaned = hours + (minutes ? ':' + minutes : '');
      }

      if (cleaned.length > 5) {
        cleaned = cleaned.substring(0, 5);
      }

      setter(cleaned);
    },
    []
  );

  // Save scheduler state
  const saveSchedulerState = useCallback(
    async () => {
      // Implement storage logic here if needed
    },
    []
  );

  const handleSaveSchedule = useCallback(async () => {
    if (selectedDays.size === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    if (!activeDevice?.ip || !activeDevice?.isConnected) {
      Alert.alert('Error', 'Device not connected');
      return;
    }

    Alert.alert(
      'Save Schedule',
      `This will overwrite Timer 0 and Timer 1 on your WLED device.\n\nTimer 0: Turn ON at ${turnOnTime}\nTimer 1: Turn OFF at ${turnOffTime}\nDays: ${Array.from(
        selectedDays
      )
        .map(
          (d) =>
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]
        )
        .join(', ')}\nPreset: ${targetPresetId}\n\nContinue?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Save',
          onPress: async () => {
            setIsSchedulerSaving(true);
            try {
              const result = await saveWledRobustSchedule(
                activeDevice.ip,
                turnOnTime,
                turnOffTime,
                targetPresetId,
                selectedDays,
                activeDevice.protocol || 'http'
              );

              if (result.success) {
                setSchedulerEnabled(true);
                setConfiguredSchedule({
                  onTime: turnOnTime,
                  offTime: turnOffTime,
                  presetId: targetPresetId,
                });
                saveSchedulerState();
                logger.log(`✅ Schedule saved successfully`);

                // Prompt user to reboot device
                Alert.alert(
                  'Schedule Saved! 🎉',
                  'Your schedule has been saved successfully!\n\nWould you like to reboot the device now for the changes to take effect?',
                  [
                    {
                      text: 'Later',
                      style: 'cancel',
                    },
                    {
                      text: 'Reboot Now',
                      onPress: async () => {
                        try {
                          const rebootUrl = `${activeDevice.protocol || 'http'}://${activeDevice.ip}/win&RB`;
                          await fetch(rebootUrl, { method: 'GET' });
                          Alert.alert(
                            'Rebooting',
                            `${activeDevice.name || 'Device'} is rebooting. It will be available in a few moments.`
                          );
                        } catch (error) {
                          Alert.alert(
                            'Reboot Failed',
                            'Failed to reboot device. Please reboot manually from the device settings.'
                          );
                        }
                      },
                    },
                  ]
                );
              } else {
                Alert.alert(
                  'Error',
                  result.message || 'Failed to save schedule'
                );
                logger.error('❌ Failed to save schedule:', result.message);
              }
            } catch (error: any) {
              Alert.alert('Error', 'Failed to save schedule');
              logger.error('❌ Save error:', error);
            } finally {
              setIsSchedulerSaving(false);
            }
          },
        },
      ]
    );
  }, [
    selectedDays,
    activeDevice,
    turnOnTime,
    turnOffTime,
    targetPresetId,
    setSchedulerEnabled,
    setConfiguredSchedule,
    saveSchedulerState,
  ]);

  const handleResetSchedule = useCallback(async () => {
    if (!activeDevice?.ip || !activeDevice?.isConnected) {
      Alert.alert('Error', 'Device not connected');
      return;
    }

    Alert.alert(
      'Reset Timer Settings',
      'This will reset ALL 8 timer slots and time settings to WLED defaults:\n\n• All scheduled presets will be disabled\n• Turn ON/OFF times will be cleared\n• Weekday selections will be reset\n• Date ranges will be reset\n• Countdown and macro settings will be reset\n\nThis action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await resetWledTimerSettings(
                activeDevice.ip,
                activeDevice.protocol || 'http'
              );

              if (result.success) {
                Alert.alert('Success', 'Timer settings reset to defaults!');
                setSchedulerEnabled(false);
                setConfiguredSchedule(null);
                setSelectedDays(new Set([0, 1, 2, 3, 4, 5, 6]));
                setTurnOnTime('20:00');
                setTurnOffTime('07:00');
                setTargetPresetId(3);
                saveSchedulerState();
                logger.log(`✅ Timer settings reset successfully`);
              } else {
                Alert.alert(
                  'Error',
                  result.message || 'Failed to reset timer settings'
                );
                logger.error('❌ Failed to reset timer settings:', result.message);
              }
            } catch (error: any) {
              Alert.alert('Error', 'Failed to reset timer settings');
              logger.error('❌ Reset error:', error);
            }
          },
        },
      ]
    );
  }, [activeDevice, setSchedulerEnabled, setConfiguredSchedule, saveSchedulerState]);

  const getStyles = (isDark: boolean) => StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 12,
    },
    statusCard: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderColor: isDark ? '#374151' : '#e5e7eb',
    },
    statusTitle: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
    },
    statusText: {
      fontSize: 14,
      lineHeight: 20,
    },
    card: {
      padding: 16,
      borderRadius: 10,
      borderWidth: 1,
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderColor: isDark ? '#374151' : '#e5e7eb',
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 12,
      color: isDark ? '#f3f4f6' : '#111827',
    },
    daysContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    dayButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    dayButtonText: {
      fontSize: 11,
      fontWeight: '500',
    },
    presetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      minWidth: 70,
      color: isDark ? '#f3f4f6' : '#111827',
    },
    presetInputContainer: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      height: 44,
      justifyContent: 'center',
    },
    presetInput: {
      fontSize: 14,
      paddingHorizontal: 12,
      textAlign: 'center',
    },
    activePresetButton: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
    },
    subtext: {
      fontSize: 12,
      marginBottom: 20,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    timeContainer: {
      marginBottom: 20,
    },
    timeRow: {
      flexDirection: 'row',
      gap: 12,
    },
    timeGroup: {
      flex: 1,
    },
    timeInputContainer: {
      borderWidth: 1,
      borderRadius: 8,
      height: 44,
      justifyContent: 'center',
      marginTop: 4,
    },
    timeInput: {
      fontSize: 14,
      paddingHorizontal: 12,
      textAlign: 'center',
    },
    stickyFooter: {
      borderTopWidth: 1,
      borderTopColor: isDark ? '#374151' : '#e5e7eb',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    buttonContainer: {
      padding: 16,
      flexDirection: 'row',
      gap: 8,
    },
    resetButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    resetButtonText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '600',
    },
    saveButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      gap: 6,
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    saveButtonText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '600',
    },
  });

  const styles = getStyles(isDark);
  const textColor = isDark ? '#f3f4f6' : '#111827';

  return (
    <FloatingModal
      visible={visible}
      isDark={isDark}
      onClose={onClose}
      title="Scheduler"
      scrollable={false}
    >
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          {/* Timer Status Info */}
          <View style={styles.statusCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text style={{ fontSize: 16 }}>
                  {isLoadingTimerSettings ? '⏳' : schedulerEnabled ? '✅' : '⏱️'}
                </Text>
                <Text
                  style={[
                    styles.statusTitle,
                    {
                      color: isLoadingTimerSettings
                        ? isDark ? '#fbbf24' : '#f59e0b'
                        : schedulerEnabled
                        ? isDark
                          ? '#10b981'
                          : '#059669'
                        : isDark
                        ? '#9ca3af'
                        : '#6b7280',
                    },
                  ]}
                >
                  {isLoadingTimerSettings
                    ? 'Loading Timer Settings...'
                    : schedulerEnabled
                    ? 'Schedule Active'
                    : 'No Schedule Set'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={loadTimerSettings}
                style={[
                  styles.activePresetButton,
                  {
                    backgroundColor: isDark ? '#374151' : '#f3f4f6',
                    borderColor: isDark ? '#6b7280' : '#d1d5db',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    minWidth: 0,
                  },
                ]}
                disabled={!activeDevice?.ip || !activeDevice?.isConnected || isLoadingTimerSettings}
              >
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color={
                    !activeDevice?.ip || !activeDevice?.isConnected || isLoadingTimerSettings
                      ? isDark ? '#6b7280' : '#9ca3af'
                      : isDark ? '#d1d5db' : '#374151'
                  }
                />
              </TouchableOpacity>
            </View>
            {schedulerEnabled && configuredSchedule && (
              <Text
                style={[
                  styles.statusText,
                  {
                    color: isDark ? '#d1d5db' : '#4b5563',
                    textAlign: 'center',
                    fontSize: 11,
                    lineHeight: 14,
                  },
                ]}
              >
                💡 ON {configuredSchedule.onTime} • ⚫ OFF {configuredSchedule.offTime} • 🎨 #{configuredSchedule.presetId}
              </Text>
            )}
          </View>

          {/* Days Selection & Settings Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Select Days</Text>
            <View style={styles.daysContainer}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => {
                    const newSelectedDays = new Set(selectedDays);
                    if (selectedDays.has(index)) {
                      newSelectedDays.delete(index);
                    } else {
                      newSelectedDays.add(index);
                    }
                    setSelectedDays(newSelectedDays);
                  }}
                  style={[
                    styles.dayButton,
                    {
                      backgroundColor: selectedDays.has(index)
                        ? '#3b82f6'
                        : isDark
                        ? '#4b5563'
                        : '#e5e7eb',
                      borderColor: isDark ? '#6b7280' : '#d1d5db',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      {
                        color: selectedDays.has(index)
                          ? '#ffffff'
                          : isDark
                          ? '#9ca3af'
                          : '#6b7280',
                      },
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preset Selection */}
            <Text style={styles.sectionTitle}>Preset to Schedule</Text>
            <View style={styles.presetRow}>
              <Text style={styles.label}>Preset ID</Text>
              <View
                style={[
                  styles.presetInputContainer,
                  {
                    backgroundColor: isDark ? '#4b5563' : '#ffffff',
                    borderColor: isDark ? '#6b7280' : '#d1d5db',
                  },
                ]}
              >
                <TextInput
                  style={[styles.presetInput, { color: textColor }]}
                  value={targetPresetId.toString()}
                  onChangeText={(text) => {
                    if (text === '') return;
                    const id = parseInt(text);
                    if (!isNaN(id) && id >= 1 && id <= 250) {
                      setTargetPresetId(id);
                    }
                  }}
                  onBlur={() => {
                    if (targetPresetId < 1 || targetPresetId > 250) {
                      setTargetPresetId(1);
                    }
                  }}
                  placeholder="1-250"
                  placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                  keyboardType="numeric"
                  maxLength={3}
                  selectTextOnFocus={true}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.activePresetButton,
                  {
                    backgroundColor: isDark ? '#374151' : '#f3f4f6',
                    borderColor: isDark ? '#6b7280' : '#d1d5db',
                  },
                ]}
                onPress={async () => {
                  if (!activeDevice?.ip) return;
                  try {
                    const result = await fetchWledCurrentPreset(
                      activeDevice.ip,
                      activeDevice.protocol || 'http'
                    );
                    if (result.success && result.presetId) {
                      setTargetPresetId(result.presetId);
                      logger.log(`📌 Set target preset to current active: ${result.presetId}`);
                    } else {
                      Alert.alert('Info', result.message || 'No active preset found');
                    }
                  } catch (error: any) {
                    Alert.alert('Error', 'Failed to fetch current preset');
                    logger.error('❌ Failed to fetch current preset:', error);
                  }
                }}
                disabled={!activeDevice?.ip || !activeDevice?.isConnected}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color:
                      !activeDevice?.ip || !activeDevice?.isConnected
                        ? isDark
                          ? '#6b7280'
                          : '#9ca3af'
                        : isDark
                        ? '#d1d5db'
                        : '#374151',
                  }}
                >
                  Active Preset
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.subtext}>
              Enter the preset/playlist ID (1-250) to schedule
            </Text>

            {/* Time Settings */}
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Schedule Times</Text>
            <View style={styles.timeContainer}>
              <View style={styles.timeRow}>
                <View style={styles.timeGroup}>
                  <Text style={styles.label}>Turn On</Text>
                  <View
                    style={[
                      styles.timeInputContainer,
                      {
                        backgroundColor: isDark ? '#4b5563' : '#ffffff',
                        borderColor: isDark ? '#6b7280' : '#d1d5db',
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.timeInput, { color: textColor }]}
                      value={turnOnTime}
                      onChangeText={(text) => {
                        handleTimeInput(text, setTurnOnTime);
                      }}
                      placeholder="20:00"
                      placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                      maxLength={5}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.timeGroup}>
                  <Text style={styles.label}>Turn Off</Text>
                  <View
                    style={[
                      styles.timeInputContainer,
                      {
                        backgroundColor: isDark ? '#4b5563' : '#ffffff',
                        borderColor: isDark ? '#6b7280' : '#d1d5db',
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.timeInput, { color: textColor }]}
                      value={turnOffTime}
                      onChangeText={(text) => {
                        handleTimeInput(text, setTurnOffTime);
                      }}
                      placeholder="07:00"
                      placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                      maxLength={5}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>
            </View>

          </View>
        </ScrollView>

        {/* Sticky Footer with Action Buttons */}
        <View style={styles.stickyFooter}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleResetSchedule}
              style={[
                styles.resetButton,
                {
                  backgroundColor: isDark ? '#dc2626' : '#ef4444',
                },
              ]}
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSaveSchedule}
              style={[
                styles.saveButton,
                {
                  backgroundColor: '#3b82f6',
                  opacity: isSchedulerSaving ? 0.6 : 1,
                },
              ]}
              disabled={isSchedulerSaving}
            >
              <Ionicons name="save-outline" size={20} color="white" />
              <Text style={styles.saveButtonText}>
                {isSchedulerSaving ? 'Saving...' : 'Save Schedule'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </FloatingModal>
  );
}
