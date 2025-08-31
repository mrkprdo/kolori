// UserAgreement Component for React Native
// Migrated from kolori_old/src/components/UserAgreement.jsx

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface UserAgreementProps {
  isDark: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export default function UserAgreement({
  isDark,
  onAccept,
  onReject,
}: UserAgreementProps) {
  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <ScrollView className="flex-1 p-6">
        <View className="space-y-6">
          {/* Header */}
          <View className="items-center space-y-4">
            <View className={`w-16 h-16 rounded-full items-center justify-center ${
              isDark ? 'bg-blue-900' : 'bg-blue-100'
            }`}>
              <Ionicons 
                name="document-text" 
                size={32} 
                color={isDark ? '#60A5FA' : '#2563EB'} 
              />
            </View>
            
            <Text className={`text-2xl font-bold text-center ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Welcome to Kolori
            </Text>
            
            <Text className={`text-center ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Before you begin, please review and accept our terms and conditions.
            </Text>
          </View>

          {/* Terms Content */}
          <View className={`p-6 rounded-xl border ${
            isDark 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <Text className={`text-lg font-semibold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Terms of Use
            </Text>

            <View className="space-y-4">
              <View>
                <Text className={`font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  🔒 Privacy & Security
                </Text>
                <Text className={`text-sm leading-relaxed ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Kolori stores your device settings locally on your device. No personal data is transmitted to external servers.
                </Text>
              </View>

              <View>
                <Text className={`font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  🌐 Network Communication
                </Text>
                <Text className={`text-sm leading-relaxed ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  The app communicates directly with your WLED devices on your local network. All communication happens locally.
                </Text>
              </View>

              <View>
                <Text className={`font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  ⚡ Device Control
                </Text>
                <Text className={`text-sm leading-relaxed ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  This app allows you to control LED devices. Use responsibly and ensure proper electrical safety.
                </Text>
              </View>

              <View>
                <Text className={`font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  📱 Open Source
                </Text>
                <Text className={`text-sm leading-relaxed ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Kolori is open source software. You can review the code and contribute to the project.
                </Text>
              </View>
            </View>
          </View>

          {/* Disclaimer */}
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
                  Important Disclaimer
                </Text>
                <Text className={`text-sm leading-relaxed ${
                  isDark ? 'text-yellow-300' : 'text-yellow-700'
                }`}>
                  Use this software at your own risk. The developers are not responsible for any damage to your devices or property.
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
                I Accept the Terms
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
                I Decline
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text className={`text-center text-xs ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}>
            By continuing, you agree to these terms and conditions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}