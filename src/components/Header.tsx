import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
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
  onRefreshPresets?: () => Promise<void>;
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
  onRefreshPresets,
}: HeaderProps) {
  const { showActionSheetWithOptions } = useActionSheet();
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleRefreshPress = useCallback(async () => {
    if (!onRefreshPresets || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefreshPresets();
    } catch (error) {
      logger.error('Failed to refresh presets:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshPresets, isRefreshing]);

  return (
    <View style={[styles.header, { backgroundColor: themeColors.backgroundColor, borderBottomColor: themeColors.borderColor }]}>
      <View style={styles.headerContent}>        
        {/* Device Dropdown - Left Aligned */}
        <View style={styles.leftContainer}>
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
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Refresh Button */}
          <TouchableOpacity 
            onPress={handleRefreshPress}
            style={[styles.actionButton, { opacity: isConnected ? 1 : 0.5 }]}
            disabled={!isConnected}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={themeColors.textColor} />
            ) : (
              <Ionicons name="refresh" size={24} color={themeColors.textColor} />
            )}
          </TouchableOpacity>
          
          {/* Settings Button */}
          <TouchableOpacity 
            onPress={handleSettingsPress}
            style={styles.actionButton}
          >
            <Ionicons name="settings" size={24} color={themeColors.textColor} />
          </TouchableOpacity>
        </View>
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
    prevProps.onRefreshPresets === nextProps.onRefreshPresets &&
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
  leftContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  deviceDropdown: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 180,
  },
  deviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'left',
    flex: 1,
  },
  dropdownIcon: {
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
});
