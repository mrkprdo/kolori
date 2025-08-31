// SettingsModal Component for React Native
// Migrated from kolori_old/src/components/SettingsModal.jsx

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Modal,
  Switch,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WledDevice, Theme, ScheduleMode } from '../types';
import { logger } from '../utils/logger';
import { storage, STORAGE_KEYS } from '../utils/storage';

interface SettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
  isDark: boolean;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  scheduleMode: ScheduleMode;
  onScheduleModeChange: (mode: ScheduleMode) => void;
  devices: WledDevice[];
  onDeviceUpdate: (deviceId: number, updates: Partial<WledDevice>) => void;
  onDeviceRemove: (deviceId: number) => void;
  onAddDevice: () => void;
}

interface SettingsTab {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SETTINGS_TABS: SettingsTab[] = [
  { id: 'general', title: 'General', icon: 'settings-outline' },
  { id: 'devices', title: 'Devices', icon: 'hardware-chip-outline' },
  { id: 'schedule', title: 'Schedule', icon: 'time-outline' },
  { id: 'about', title: 'About', icon: 'information-circle-outline' },
];

export default function SettingsModal({
  isVisible,
  onClose,
  isDark,
  theme,
  onThemeChange,
  scheduleMode,
  onScheduleModeChange,
  devices,
  onDeviceUpdate,
  onDeviceRemove,
  onAddDevice,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [deviceSettings, setDeviceSettings] = useState<Record<number, any>>({});

  useEffect(() => {
    // Load device-specific settings
    const loadDeviceSettings = async () => {
      const settings: Record<number, any> = {};
      for (const device of devices) {
        try {
          const deviceConfig = await storage.loadFromStorage(
            `${STORAGE_KEYS.DEVICE_CONFIG}_${device.id}`,
            { autoBrightness: device.autoBrightness || false, maxBrightness: device.maxBrightness || 255 }
          );
          settings[device.id] = deviceConfig;
        } catch (error) {
          logger.error(`Failed to load settings for device ${device.id}:`, error);
        }
      }
      setDeviceSettings(settings);
    };

    if (isVisible && devices.length > 0) {
      loadDeviceSettings();
    }
  }, [isVisible, devices]);

  const handleDeviceSettingChange = async (deviceId: number, key: string, value: any) => {
    const updatedSettings = {
      ...deviceSettings,
      [deviceId]: {
        ...deviceSettings[deviceId],
        [key]: value,
      },
    };
    setDeviceSettings(updatedSettings);

    // Save to storage
    try {
      await storage.saveToStorage(`${STORAGE_KEYS.DEVICE_CONFIG}_${deviceId}`, updatedSettings[deviceId]);
      
      // Update device in parent component
      onDeviceUpdate(deviceId, { [key]: value });
    } catch (error) {
      logger.error(`Failed to save device setting:`, error);
    }
  };

  const renderGeneralSettings = () => (
    <View className="space-y-6">
      {/* Theme Settings */}
      <View>
        <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Appearance
        </Text>
        
        <View className="space-y-3">
          {(['light', 'dark', 'system'] as Theme[]).map((themeOption) => (
            <TouchableOpacity
              key={themeOption}
              onPress={() => onThemeChange(themeOption)}
              className={`p-4 rounded-xl border flex-row items-center justify-between ${
                theme === themeOption 
                  ? isDark ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                  : isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
              }`}
            >
              <View className="flex-row items-center space-x-3">
                <Ionicons
                  name={
                    themeOption === 'light' ? 'sunny-outline' :
                    themeOption === 'dark' ? 'moon-outline' : 'phone-portrait-outline'
                  }
                  size={20}
                  color={
                    theme === themeOption 
                      ? isDark ? '#60A5FA' : '#2563EB'
                      : isDark ? '#9CA3AF' : '#6B7280'
                  }
                />
                <Text className={`font-medium ${
                  theme === themeOption 
                    ? isDark ? 'text-blue-200' : 'text-blue-600'
                    : isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                </Text>
              </View>
              {theme === themeOption && (
                <Ionicons name="checkmark" size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* App Settings */}
      <View>
        <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          App Settings
        </Text>
        
        <View className={`p-4 rounded-xl border ${
          isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Debug Logging
              </Text>
              <Text className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Enable detailed logging for troubleshooting
              </Text>
            </View>
            <Switch
              value={false} // TODO: Add debug logging state
              onValueChange={() => {}} // TODO: Handle debug logging toggle
              trackColor={{ false: isDark ? '#374151' : '#E5E7EB', true: '#3B82F6' }}
              thumbColor={isDark ? '#F3F4F6' : '#FFFFFF'}
            />
          </View>
        </View>
      </View>
    </View>
  );

  const renderDeviceSettings = () => (
    <View className="space-y-4">
      {/* Add Device Button */}
      <TouchableOpacity
        onPress={onAddDevice}
        className={`p-4 border-2 border-dashed rounded-xl flex-row items-center justify-center space-x-2 ${
          isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
        }`}
      >
        <Ionicons name="add" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        <Text className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Add New Device
        </Text>
      </TouchableOpacity>

      {/* Device List */}
      {devices.map((device) => (
        <View
          key={device.id}
          className={`p-4 rounded-xl border ${
            isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
          }`}
        >
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1">
              <View className="flex-row items-center space-x-2">
                <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {device.name}
                </Text>
                <View className={`w-2 h-2 rounded-full ${
                  device.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </View>
              <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {device.ip}
              </Text>
              {device.responseTime && (
                <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Response: {device.responseTime}ms
                </Text>
              )}
            </View>
            
            <TouchableOpacity
              onPress={() => onDeviceRemove(device.id)}
              className="p-2 rounded-lg"
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* Device Configuration */}
          <View className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            {/* Auto Brightness */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Auto Brightness
                </Text>
                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Automatically adjust brightness based on time
                </Text>
              </View>
              <Switch
                value={deviceSettings[device.id]?.autoBrightness || false}
                onValueChange={(value) => handleDeviceSettingChange(device.id, 'autoBrightness', value)}
                trackColor={{ false: isDark ? '#374151' : '#E5E7EB', true: '#3B82F6' }}
                thumbColor={isDark ? '#F3F4F6' : '#FFFFFF'}
              />
            </View>

            {/* Max Brightness */}
            <View>
              <Text className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Max Brightness: {deviceSettings[device.id]?.maxBrightness || 255}
              </Text>
              <View className={`h-2 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                <View 
                  className="h-full rounded-full bg-blue-500"
                  style={{ 
                    width: `${((deviceSettings[device.id]?.maxBrightness || 255) / 255) * 100}%` 
                  }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>0</Text>
                <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>255</Text>
              </View>
            </View>
          </View>
        </View>
      ))}

      {devices.length === 0 && (
        <View className="py-12 items-center">
          <Ionicons 
            name="hardware-chip-outline" 
            size={48} 
            color={isDark ? '#4B5563' : '#9CA3AF'} 
            style={{ opacity: 0.5 }}
          />
          <Text className={`text-center mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            No devices configured
          </Text>
          <Text className={`text-sm text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Add your first WLED device to get started
          </Text>
        </View>
      )}
    </View>
  );

  const renderScheduleSettings = () => (
    <View className="space-y-6">
      <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Schedule Mode
      </Text>
      
      <View className="space-y-3">
        {(['all-day', 'day', 'night'] as ScheduleMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            onPress={() => onScheduleModeChange(mode)}
            className={`p-4 rounded-xl border flex-row items-center justify-between ${
              scheduleMode === mode 
                ? isDark ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                : isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
            }`}
          >
            <View className="flex-row items-center space-x-3">
              <Ionicons
                name={
                  mode === 'day' ? 'sunny-outline' :
                  mode === 'night' ? 'moon-outline' : 'time-outline'
                }
                size={20}
                color={
                  scheduleMode === mode 
                    ? isDark ? '#60A5FA' : '#2563EB'
                    : isDark ? '#9CA3AF' : '#6B7280'
                }
              />
              <View>
                <Text className={`font-medium ${
                  scheduleMode === mode 
                    ? isDark ? 'text-blue-200' : 'text-blue-600'
                    : isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {mode === 'all-day' ? 'All Day' : mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
                </Text>
                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {mode === 'all-day' 
                    ? 'LEDs active 24/7' 
                    : mode === 'day' 
                    ? 'LEDs active during daytime only'
                    : 'LEDs active during nighttime only'
                  }
                </Text>
              </View>
            </View>
            {scheduleMode === mode && (
              <Ionicons name="checkmark" size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAboutSettings = () => (
    <View className="space-y-6">
      {/* App Info */}
      <View className={`p-6 rounded-xl border ${
        isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
      }`}>
        <View className="items-center space-y-4">
          <View className={`w-16 h-16 rounded-full items-center justify-center ${
            isDark ? 'bg-blue-900' : 'bg-blue-100'
          }`}>
            <Text className="text-2xl font-bold">
              <Text className="text-blue-600">Ko</Text>
              <Text className="text-purple-600">lori</Text>
            </Text>
          </View>
          
          <View className="items-center">
            <Text className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Kolori
            </Text>
            <Text className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Version 1.0.0
            </Text>
          </View>
          
          <Text className={`text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            A beautiful WLED controller for your LED strips and devices
          </Text>
        </View>
      </View>

      {/* Links */}
      <View className="space-y-3">
        <TouchableOpacity
          className={`p-4 rounded-xl border flex-row items-center justify-between ${
            isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
          }`}
        >
          <View className="flex-row items-center space-x-3">
            <Ionicons name="logo-github" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Source Code
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>

        <TouchableOpacity
          className={`p-4 rounded-xl border flex-row items-center justify-between ${
            isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
          }`}
        >
          <View className="flex-row items-center space-x-3">
            <Ionicons name="help-circle-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Support & Documentation
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>

        <TouchableOpacity
          className={`p-4 rounded-xl border flex-row items-center justify-between ${
            isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
          }`}
        >
          <View className="flex-row items-center space-x-3">
            <Ionicons name="star-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Rate the App
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
      </View>

      {/* Copyright */}
      <Text className={`text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        © 2024 Kolori. Open source project.
      </Text>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'devices':
        return renderDeviceSettings();
      case 'schedule':
        return renderScheduleSettings();
      case 'about':
        return renderAboutSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Header */}
        <View className={`flex-row items-center justify-between p-4 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Settings
          </Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color={isDark ? '#FFF' : '#000'} />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="p-4"
        >
          <View className="flex-row space-x-2">
            {SETTINGS_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full flex-row items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-500'
                    : isDark ? 'bg-gray-800' : 'bg-white'
                }`}
              >
                <Ionicons 
                  name={tab.icon} 
                  size={16} 
                  color={
                    activeTab === tab.id 
                      ? '#FFFFFF' 
                      : isDark ? '#9CA3AF' : '#6B7280'
                  } 
                />
                <Text className={`font-medium ${
                  activeTab === tab.id 
                    ? 'text-white' 
                    : isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {tab.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Tab Content */}
        <ScrollView className="flex-1 p-4">
          {renderTabContent()}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}