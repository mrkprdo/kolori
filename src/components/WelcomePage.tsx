// WelcomePage Component for React Native
// Migrated from kolori_old/src/components/WelcomePage.jsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WledDevice } from '../types';

interface WelcomePageProps {
  isDark: boolean;
  onAddDevice: (deviceData?: any) => void;
  devices?: WledDevice[];
}

export default function WelcomePage({ 
  isDark, 
  onAddDevice, 
  devices = [] 
}: WelcomePageProps) {
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        className="flex-1 px-6 py-8"
      >
        <View className="flex-1 justify-center items-center space-y-8">
          {/* Logo/Title */}
          <View className="items-center">
            <Text className="text-5xl font-bold mb-3">
              <Text className="text-blue-600">Ko</Text>
              <Text className="text-purple-600">lori</Text>
            </Text>
            <Text className={`text-lg text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Control your WLED devices with style
            </Text>
          </View>

          {/* Welcome illustration */}
          <View className={`w-32 h-32 rounded-full items-center justify-center ${
            isDark ? 'bg-gray-800' : 'bg-gray-100'
          }`}>
            <View className="relative">
              <Ionicons 
                name="wifi" 
                size={48} 
                color={isDark ? '#9CA3AF' : '#6B7280'} 
              />
              <View className="absolute -top-2 -right-2">
                <Ionicons 
                  name="color-palette" 
                  size={24} 
                  color="#3B82F6" 
                />
              </View>
            </View>
          </View>

          {/* Welcome message */}
          <View className="space-y-4">
            <Text className={`text-2xl font-semibold text-center ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Welcome to Kolori!
            </Text>
            <Text className={`text-center leading-relaxed ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              To get started, you'll need to add your first WLED device.{'\n'}
              Make sure your device is connected to the same network.
            </Text>
          </View>

          {/* Add device buttons */}
          <View className="w-full space-y-4">
            <TouchableOpacity
              onPress={() => onAddDevice()}
              className="bg-gradient-to-r from-blue-500 to-purple-500 py-4 px-6 rounded-xl flex-row items-center justify-center space-x-3 shadow-lg"
              style={{
                backgroundColor: '#3B82F6', // Fallback for gradient
              }}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-semibold text-lg">
                Add Your First Device
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setShowDiscoveryModal(true)}
              className="py-4 px-6 rounded-xl flex-row items-center justify-center space-x-3 shadow-lg"
              style={{
                backgroundColor: '#10B981', // Fallback for gradient
              }}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text className="text-white font-semibold text-lg">
                Scan for Devices
              </Text>
            </TouchableOpacity>
            
            <Text className={`text-sm text-center ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}>
              You'll need your WLED device's IP address
            </Text>
          </View>

          {/* Quick tips */}
          <View className={`p-6 rounded-xl border ${
            isDark 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <Text className={`font-semibold mb-3 ${
              isDark ? 'text-blue-300' : 'text-blue-800'
            }`}>
              Quick Tips:
            </Text>
            <View className="space-y-2">
              <View className="flex-row items-start">
                <Text className={`text-sm ${
                  isDark ? 'text-gray-300' : 'text-blue-700'
                }`}>
                  • Check your router's admin panel for connected devices
                </Text>
              </View>
              <View className="flex-row items-start">
                <Text className={`text-sm ${
                  isDark ? 'text-gray-300' : 'text-blue-700'
                }`}>
                  • WLED devices usually show up as "wled-" followed by numbers
                </Text>
              </View>
              <View className="flex-row items-start">
                <Text className={`text-sm ${
                  isDark ? 'text-gray-300' : 'text-blue-700'
                }`}>
                  • Make sure both devices are on the same WiFi network
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* TODO: Add DeviceDiscoveryModal when showDiscoveryModal is true */}
        {showDiscoveryModal && (
          <View className="absolute inset-0 bg-black/50 items-center justify-center">
            <View className={`m-4 p-6 rounded-xl ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}>
              <Text className={`text-lg font-semibold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Device Discovery
              </Text>
              <Text className={`mb-4 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Device discovery modal coming soon!
              </Text>
              <TouchableOpacity
                onPress={() => setShowDiscoveryModal(false)}
                className="bg-blue-500 py-2 px-4 rounded-lg"
              >
                <Text className="text-white text-center font-medium">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}