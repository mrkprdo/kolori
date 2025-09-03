import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActionSheet } from '@expo/react-native-action-sheet';
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

/**
 * Optimized Header component with memoization and performance enhancements
 */
const Header = React.memo(function Header({
  deviceName,
  isConnected,
  devices,
  activeDeviceId,
  setActiveDeviceId,
  setShowSettings,
  isDark,
  scheduleMode,
}: HeaderProps) {
  const { showActionSheetWithOptions } = useActionSheet();

  // Memoize theme colors to prevent recalculation
  const themeColors = useMemo(() => ({
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    textColor: isDark ? '#ffffff' : '#111827',
    subtextColor: isDark ? '#9ca3af' : '#6b7280',
    dropdownBg: isDark ? '#374151' : '#f3f4f6',
    dropdownBorder: isDark ? '#4b5563' : '#d1d5db',
  }), [isDark]);

  // Memoize device names to prevent recalculation
  const deviceNames = useMemo(() => devices.map(d => d.name), [devices]);

  const handleDeviceSwitch = useCallback(() => {
    if (devices.length <= 1) return;

    const options = [...deviceNames, 'Cancel'];
    const cancelButtonIndex = options.length - 1;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: 'Select a Device',
        titleTextStyle: { color: themeColors.textColor },
        containerStyle: { backgroundColor: themeColors.backgroundColor },
        textStyle: { color: isDark ? '#60a5fa' : '#3b82f6' },
        cancelButtonTintColor: themeColors.subtextColor,
      },
      (selectedIndex) => {
        logger.log('Header: Device selection callback', { 
          selectedIndex, 
          deviceNamesLength: deviceNames.length,
          currentActiveDeviceId: activeDeviceId 
        });
        
        if (selectedIndex !== undefined && selectedIndex < deviceNames.length) {
          const selectedDevice = devices[selectedIndex];
          logger.log('Header: Selected device', {
            selectedDevice: selectedDevice ? {
              id: selectedDevice.id,
              name: selectedDevice.name,
              isConnected: selectedDevice.isConnected
            } : null,
            currentActiveDeviceId: activeDeviceId
          });
          
          if (selectedDevice && selectedDevice.id !== activeDeviceId) {
            logger.log('Header: Calling setActiveDeviceId with:', selectedDevice.id);
            setActiveDeviceId(selectedDevice.id);
            logger.log('Switched to device:', selectedDevice.name);
          } else {
            logger.log('Header: Not switching - same device or invalid device');
          }
        }
      }
    );
  }, [devices, deviceNames, themeColors, isDark, activeDeviceId, setActiveDeviceId, showActionSheetWithOptions]);

  const handleSettingsPress = useCallback(() => {
    setShowSettings(true);
  }, [setShowSettings]);

  return (
    <View style={[styles.header, { backgroundColor: themeColors.backgroundColor, borderBottomColor: themeColors.borderColor }]}>
      <View style={styles.headerContent}>
        {/* Logo */}
        <Text style={styles.logo}>
          <Text style={styles.logoBlue}>Ko</Text>
          <Text style={styles.logoPurple}>lori</Text>
        </Text>
        
        {/* Device Dropdown - Centered */}
        <View style={styles.centerContainer}>
          {devices.length > 0 && (
            <TouchableOpacity 
              onPress={handleDeviceSwitch}
              style={[
                styles.deviceDropdown,
                { 
                  backgroundColor: themeColors.dropdownBg,
                  borderColor: themeColors.dropdownBorder
                }
              ]}
            >
              <View style={styles.deviceContent}>
                <View 
                  style={[
                    styles.statusDot, 
                    { backgroundColor: isConnected ? '#10b981' : '#ef4444' }
                  ]} 
                />
                <Text style={[styles.deviceName, { color: themeColors.textColor }]} numberOfLines={1}>
                  {deviceName}
                </Text>
                {devices.length > 1 && (
                  <Ionicons name="chevron-down" size={16} color={themeColors.subtextColor} style={styles.dropdownIcon} />
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Settings Button */}
        <TouchableOpacity 
          onPress={handleSettingsPress}
          style={styles.settingsButton}
        >
          <Ionicons name="settings" size={24} color={themeColors.textColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.deviceName === nextProps.deviceName &&
    prevProps.isConnected === nextProps.isConnected &&
    prevProps.activeDeviceId === nextProps.activeDeviceId &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.scheduleMode === nextProps.scheduleMode &&
    prevProps.devices.length === nextProps.devices.length &&
    prevProps.devices.every((device, index) => {
      const nextDevice = nextProps.devices[index];
      return device?.id === nextDevice?.id && 
             device?.name === nextDevice?.name &&
             device?.isConnected === nextDevice?.isConnected;
    })
  );
});

export default Header;

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoBlue: {
    color: '#2563eb',
  },
  logoPurple: {
    color: '#7c3aed',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  deviceDropdown: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
  },
  deviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
  },
  dropdownIcon: {
    marginLeft: 4,
  },
  settingsButton: {
    padding: 4,
  },
});
