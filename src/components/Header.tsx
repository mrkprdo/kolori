// Header Component for React Native
// Converted to use StyleSheet instead of TailwindCSS

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WledDevice, ScheduleMode } from '../types';
import { logger } from '../utils/logger';

interface HeaderProps {
  deviceName: string;
  isConnected: boolean;
  devices: WledDevice[];
  activeDeviceId: number | null;
  setActiveDeviceId: (id: number) => void;
  setShowSettings: (show: boolean) => void;
  isDark: boolean;
  scheduleMode: ScheduleMode;
}

export default function Header({
  deviceName,
  isConnected,
  devices,
  activeDeviceId,
  setActiveDeviceId,
  setShowSettings,
  isDark,
  scheduleMode,
}: HeaderProps) {

  const backgroundColor = isDark ? '#1f2937' : '#ffffff';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const textColor = isDark ? '#ffffff' : '#111827';
  const subtextColor = isDark ? '#9ca3af' : '#6b7280';

  const handleDeviceSwitch = () => {
    if (devices.length <= 1) return;
    
    const currentIndex = devices.findIndex(d => d.id === activeDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    
    if (nextDevice) {
      setActiveDeviceId(nextDevice.id);
      logger.log('Switched to device:', nextDevice.name);
    }
  };

  const getScheduleText = () => {
    switch (scheduleMode) {
      case 'day': return '☀️ Day';
      case 'night': return '🌙 Night';
      case 'all-day': return '⏰ All Day';
      default: return '⏰ All Day';
    }
  };

  return (
    <View style={[styles.header, { backgroundColor, borderBottomColor: borderColor }]}>
      <View style={styles.headerContent}>
        <View style={styles.leftSection}>
          <Text style={styles.logo}>
            <Text style={styles.logoBlue}>Ko</Text>
            <Text style={styles.logoPurple}>lori</Text>
          </Text>
          
          {devices.length > 0 && (
            <TouchableOpacity 
              onPress={handleDeviceSwitch}
              style={styles.deviceInfo}
            >
              <View style={styles.deviceStatus}>
                <View 
                  style={[
                    styles.statusDot, 
                    { backgroundColor: isConnected ? '#10b981' : '#ef4444' }
                  ]} 
                />
                <Text style={[styles.deviceName, { color: textColor }]} numberOfLines={1}>
                  {deviceName}
                </Text>
                {devices.length > 1 && (
                  <Ionicons name="chevron-down" size={16} color={subtextColor} />
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.rightSection}>
          <View style={styles.scheduleChip}>
            <Text style={[styles.scheduleText, { color: subtextColor }]}>
              {getScheduleText()}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => setShowSettings(true)}
            style={styles.settingsButton}
          >
            <Ionicons name="settings" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 16,
  },
  logoBlue: {
    color: '#2563eb',
  },
  logoPurple: {
    color: '#7c3aed',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  scheduleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingsButton: {
    padding: 4,
  },
});