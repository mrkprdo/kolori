// MixedContentProtection Component for React Native
// Migrated from kolori_old/src/components/MixedContentProtection.jsx

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface MixedContentProtectionProps {
  isDark: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export default function MixedContentProtection({
  isDark,
  onAccept,
  onReject,
}: MixedContentProtectionProps) {
  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <ScrollView className="flex-1 p-6">
        <View className="space-y-6">
          {/* Header */}
          <View className="items-center space-y-4">
            <View className={`w-16 h-16 rounded-full items-center justify-center ${
              isDark ? 'bg-yellow-900' : 'bg-yellow-100'
            }`}>
              <Ionicons 
                name="shield-outline" 
                size={32} 
                color={isDark ? '#FBBF24' : '#D97706'} 
              />
            </View>
            
            <Text className={`text-2xl font-bold text-center ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Mixed Content Warning
            </Text>
            
            <Text className={`text-center ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Your browser is blocking HTTP requests to WLED devices
            </Text>
          </View>

          {/* Explanation */}
          <View className={`p-6 rounded-xl border ${
            isDark 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <Text className={`text-lg font-semibold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              What's Happening?
            </Text>

            <View className="space-y-4">
              <View>
                <Text className={`font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  🔒 Mixed Content Protection
                </Text>
                <Text className={`text-sm leading-relaxed ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Modern browsers prevent HTTPS websites from making HTTP requests to protect your security. 
                  Since WLED devices typically use HTTP, this creates a compatibility issue.
                </Text>
              </View>

              <View>
                <Text className={`font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  🌐 Local Network Communication
                </Text>
                <Text className={`text-sm leading-relaxed ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Kolori needs to communicate with WLED devices on your local network using HTTP. 
                  This communication stays within your home network and doesn't travel over the internet.
                </Text>
              </View>
            </View>
          </View>

          {/* Solutions */}
          <View className={`p-6 rounded-xl border ${
            isDark 
              ? 'bg-blue-900/20 border-blue-700' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <Text className={`text-lg font-semibold mb-4 ${
              isDark ? 'text-blue-200' : 'text-blue-800'
            }`}>
              Solutions
            </Text>

            <View className="space-y-4">
              <View>
                <Text className={`font-medium mb-2 ${
                  isDark ? 'text-blue-200' : 'text-blue-800'
                }`}>
                  🎯 Recommended: Allow Mixed Content
                </Text>
                <Text className={`text-sm leading-relaxed ${
                  isDark ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  Click "Allow Mixed Content" below to enable HTTP communication with your WLED devices. 
                  This only affects communication with devices on your local network.
                </Text>
              </View>

              <View>
                <Text className={`font-medium mb-2 ${
                  isDark ? 'text-blue-200' : 'text-blue-800'
                }`}>
                  🔧 Alternative: Use HTTP Version
                </Text>
                <Text className={`text-sm leading-relaxed ${
                  isDark ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  Access Kolori using HTTP instead of HTTPS to avoid mixed content restrictions entirely.
                </Text>
              </View>
            </View>
          </View>

          {/* Warning */}
          <View className={`p-4 rounded-lg border-l-4 border-yellow-500 ${
            isDark 
              ? 'bg-yellow-900/20 border-yellow-400' 
              : 'bg-yellow-50 border-yellow-500'
          }`}>
            <View className="flex-row items-start space-x-3">
              <Ionicons 
                name="warning" 
                size={20} 
                color={isDark ? '#FBBF24' : '#D97706'} 
              />
              <View className="flex-1">
                <Text className={`text-sm font-medium mb-1 ${
                  isDark ? 'text-yellow-200' : 'text-yellow-800'
                }`}>
                  Security Note
                </Text>
                <Text className={`text-sm leading-relaxed ${
                  isDark ? 'text-yellow-300' : 'text-yellow-700'
                }`}>
                  This setting only affects communication with devices on your local network. 
                  Your internet browsing and external website security remain unchanged.
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="space-y-3 pt-4">
            <TouchableOpacity
              onPress={onAccept}
              className="bg-blue-500 py-4 px-6 rounded-xl flex-row items-center justify-center space-x-2"
            >
              <Ionicons name="checkmark" size={20} color="white" />
              <Text className="text-white font-semibold text-lg">
                Allow Mixed Content
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onReject}
              className={`py-3 px-6 rounded-xl border ${
                isDark 
                  ? 'border-gray-600 bg-gray-800' 
                  : 'border-gray-300 bg-white'
              }`}
            >
              <Text className={`text-center font-medium ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Not Right Now
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text className={`text-center text-xs ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}>
            You can change this setting later in the app settings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}