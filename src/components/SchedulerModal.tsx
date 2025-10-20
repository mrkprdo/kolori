import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
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
    statusCard: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 2,
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderColor: isDark ? '#4b5563' : '#1e293b',
      marginBottom: 6,
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
      borderWidth: 2,
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderColor: isDark ? '#4b5563' : '#1e293b',
      marginBottom: 6,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 0,
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
      borderWidth: 2,
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
      borderWidth: 2,
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
      borderWidth: 2,
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
      borderWidth: 2,
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
    buttonContainer: {
      paddingTop: 4,
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
      borderWidth: 2,
      borderColor: isDark ? '#4b5563' : '#1e293b',
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
      borderWidth: 2,
      borderColor: isDark ? '#4b5563' : '#1e293b',
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

  const footerContent = (
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
  );

  return (
    <FloatingModal
      visible={visible}
      isDark={isDark}
      onClose={onClose}
      title="Scheduler"
      scrollable={true}
      footer={footerContent}
    >
      {/* Timer Status Info */}
      <View style={styles.statusCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: schedulerEnabled ? 12 : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isLoadingTimerSettings
                    ? isDark ? '#fbbf2420' : '#f59e0b20'
                    : schedulerEnabled
                    ? isDark ? '#10b98120' : '#05966920'
                    : isDark ? '#4b5563' : '#f3f4f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Ionicons
                    name={isLoadingTimerSettings ? 'hourglass-outline' : schedulerEnabled ? 'checkmark-circle' : 'time-outline'}
                    size={24}
                    color={isLoadingTimerSettings
                      ? isDark ? '#fbbf24' : '#f59e0b'
                      : schedulerEnabled
                      ? isDark ? '#10b981' : '#059669'
                      : isDark ? '#9ca3af' : '#6b7280'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.statusTitle,
                      {
                        color: isLoadingTimerSettings
                          ? isDark ? '#fbbf24' : '#f59e0b'
                          : schedulerEnabled
                          ? isDark ? '#10b981' : '#059669'
                          : isDark ? '#f3f4f6' : '#111827',
                        marginBottom: 2,
                      },
                    ]}
                  >
                    {isLoadingTimerSettings
                      ? 'Loading...'
                      : schedulerEnabled
                      ? 'Schedule Active'
                      : 'No Schedule Set'}
                  </Text>
                  {!isLoadingTimerSettings && (
                    <Text style={{
                      fontSize: 12,
                      color: isDark ? '#9ca3af' : '#6b7280',
                    }}>
                      {schedulerEnabled ? 'Timer is configured' : 'Configure your schedule below'}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={loadTimerSettings}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (!activeDevice?.ip || !activeDevice?.isConnected || isLoadingTimerSettings) ? 0.5 : 1,
                }}
                disabled={!activeDevice?.ip || !activeDevice?.isConnected || isLoadingTimerSettings}
              >
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={isDark ? '#d1d5db' : '#374151'}
                />
              </TouchableOpacity>
            </View>
            {schedulerEnabled && configuredSchedule && (
              <View style={{
                flexDirection: 'row',
                gap: 8,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: isDark ? '#374151' : '#e5e7eb',
              }}>
                <View style={{
                  flex: 1,
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: isDark ? '#10b98110' : '#05966910',
                  borderWidth: 2,
                  borderColor: isDark ? '#10b98130' : '#05966930',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <Ionicons name="sunny" size={14} color={isDark ? '#10b981' : '#059669'} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#10b981' : '#059669' }}>
                      Turn ON
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#f3f4f6' : '#111827' }}>
                    {configuredSchedule.onTime}
                  </Text>
                </View>
                <View style={{
                  flex: 1,
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: isDark ? '#6b728010' : '#9ca3af10',
                  borderWidth: 2,
                  borderColor: isDark ? '#6b728030' : '#9ca3af30',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <Ionicons name="moon" size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280' }}>
                      Turn OFF
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#f3f4f6' : '#111827' }}>
                    {configuredSchedule.offTime}
                  </Text>
                </View>
                <View style={{
                  flex: 1,
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: isDark ? '#3b82f610' : '#3b82f610',
                  borderWidth: 2,
                  borderColor: isDark ? '#3b82f630' : '#3b82f630',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <Ionicons name="sparkles" size={14} color="#3b82f6" />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#3b82f6' }}>
                      Preset
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#f3f4f6' : '#111827' }}>
                    #{configuredSchedule.presetId}
                  </Text>
                </View>
              </View>
            )}
      </View>

      {/* Days Selection & Settings Card */}
      <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Select Days</Text>
              <TouchableOpacity
                onPress={() => {
                  if (selectedDays.size === 7) {
                    setSelectedDays(new Set());
                  } else {
                    setSelectedDays(new Set([0, 1, 2, 3, 4, 5, 6]));
                  }
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280' }}>
                  {selectedDays.size === 7 ? 'Clear All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.daysContainer}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                const isSelected = selectedDays.has(index);
                return (
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
                        backgroundColor: isSelected
                          ? '#3b82f6'
                          : isDark
                          ? '#374151'
                          : '#f9fafb',
                        borderColor: isSelected ? '#3b82f6' : (isDark ? '#4b5563' : '#1e293b'),
                        borderWidth: 2,
                        transform: [{ scale: isSelected ? 1.05 : 1 }],
                      },
                    ]}
                  >
                    {isSelected && (
                      <View style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: '#10b981',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: isDark ? '#1f2937' : '#ffffff',
                      }}>
                        <Ionicons name="checkmark" size={10} color="white" />
                      </View>
                    )}
                    <Text
                      style={[
                        styles.dayButtonText,
                        {
                          color: isSelected
                            ? '#ffffff'
                            : isDark
                            ? '#9ca3af'
                            : '#6b7280',
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Preset Selection */}
            <Text style={styles.sectionTitle}>Preset to Schedule</Text>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: isDark ? '#3b82f620' : '#3b82f620',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Ionicons name="sparkles" size={16} color="#3b82f6" />
                </View>
                <Text style={[styles.label, { minWidth: 'auto', fontWeight: '600' }]}>Preset ID</Text>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: isDark ? '#4b5563' : '#ffffff',
                      borderColor: isDark ? '#4b5563' : '#1e293b',
                      borderWidth: 2,
                      borderRadius: 8,
                      height: 38,
                      justifyContent: 'center',
                    }}
                  >
                    <TextInput
                      style={[styles.presetInput, { color: textColor, fontSize: 15, fontWeight: '600' }]}
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
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 12,
                      height: 38,
                      borderRadius: 8,
                      backgroundColor: '#3b82f6',
                      borderWidth: 2,
                      borderColor: isDark ? '#4b5563' : '#1e293b',
                      opacity: (!activeDevice?.ip || !activeDevice?.isConnected) ? 0.5 : 1,
                    }}
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
                    <Ionicons name="download-outline" size={14} color="white" />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: 'white',
                      }}
                    >
                      Use Active Preset
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.subtext, { marginBottom: 0 }]}>
                Enter preset/playlist ID (1-250) or use currently active preset
              </Text>
            </View>

            {/* Time Settings */}
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Schedule Times</Text>
            <View style={styles.timeContainer}>
              <View style={styles.timeRow}>
                <View style={styles.timeGroup}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <View style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: isDark ? '#10b98120' : '#05966920',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Ionicons name="sunny" size={16} color={isDark ? '#10b981' : '#059669'} />
                    </View>
                    <Text style={[styles.label, { minWidth: 'auto', fontWeight: '600' }]}>Turn On</Text>
                  </View>
                  <View
                    style={[
                      styles.timeInputContainer,
                      {
                        backgroundColor: isDark ? '#4b5563' : '#ffffff',
                        borderColor: isDark ? '#6b7280' : '#1e293b',
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.timeInput, { color: textColor, fontSize: 18, fontWeight: '600' }]}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <View style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: isDark ? '#6b728020' : '#9ca3af20',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Ionicons name="moon" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
                    </View>
                    <Text style={[styles.label, { minWidth: 'auto', fontWeight: '600' }]}>Turn Off</Text>
                  </View>
                  <View
                    style={[
                      styles.timeInputContainer,
                      {
                        backgroundColor: isDark ? '#4b5563' : '#ffffff',
                        borderColor: isDark ? '#6b7280' : '#1e293b',
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.timeInput, { color: textColor, fontSize: 18, fontWeight: '600' }]}
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
    </FloatingModal>
  );
}
