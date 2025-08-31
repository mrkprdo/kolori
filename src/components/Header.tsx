// Header Component for React Native
// Migrated from kolori_old/src/components/Header.jsx

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
  
  const getScheduleIcon = () => {
    switch (scheduleMode) {
      case 'day':
        return 'sunny-outline';
      case 'night':
        return 'moon-outline';
      case 'all-day':
        return 'time-outline';
      default:
        return 'time-outline';
    }
  };

  const getScheduleColor = () => {
    switch (scheduleMode) {
      case 'day':
        return '#EAB308'; // yellow-500
      case 'night':
        return '#8B5CF6'; // purple-500
      case 'all-day':
        return '#3B82F6'; // blue-500
      default:
        return '#3B82F6';
    }
  };

  return (
    <View
      className={`p-4 border-b pt-safe-top ${
        isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <Text className="text-2xl font-bold">
            <Text className="text-blue-600">Ko</Text>
            <Text className="text-purple-600">lori</Text>
          </Text>
          
          <View className="ml-4 flex-row items-center">
            <View
              className={`px-3 py-1 rounded-lg max-w-32 ${
                isConnected
                  ? isDark 
                    ? 'bg-green-900' 
                    : 'bg-green-100'
                  : isDark
                    ? 'bg-red-900'
                    : 'bg-red-100'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  isConnected
                    ? isDark ? 'text-green-200' : 'text-green-800'
                    : isDark ? 'text-red-200' : 'text-red-800'
                }`}
                numberOfLines={1}
              >
                {deviceName.length > 12 ? `${deviceName.slice(0, 12)}...` : deviceName}
              </Text>
            </View>
            
            {devices.length > 1 && (
              <TouchableOpacity
                className={`ml-2 px-2 py-1 rounded border ${
                  isDark
                    ? 'bg-gray-800 border-gray-600'
                    : 'bg-white border-gray-300'
                }`}
                onPress={() => {
                  // TODO: Show device picker modal
                  logger.log('Device picker not yet implemented');
                }}
              >
                <Ionicons 
                  name="chevron-down" 
                  size={16} 
                  color={isDark ? '#9CA3AF' : '#6B7280'} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="flex-row items-center space-x-3">
          {/* Schedule Mode Indicator */}
          {scheduleMode && scheduleMode !== 'all-day' && (
            <View className="relative">
              <Ionicons 
                name={getScheduleIcon()} 
                size={20} 
                color={getScheduleColor()} 
              />
              <View 
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                style={{ backgroundColor: getScheduleColor() }}
              />
            </View>
          )}
          
          {/* Connection Status */}
          <View className="relative">
            <Ionicons
              name={isConnected ? 'wifi' : 'wifi'}
              size={20}
              color={isConnected ? '#10B981' : '#EF4444'}
            />
            <View
              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          </View>

          {/* Settings Button */}
          <TouchableOpacity
            className={`p-2 rounded-full ${
              isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
            onPress={() => {
              logger.log('⚙️ Settings opened');
              setShowSettings(true);
            }}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}