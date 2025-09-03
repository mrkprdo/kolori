// DeviceForm Component for React Native
// Migrated from kolori_old/src/components/DeviceForm.jsx

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WledDevice, DeviceValidationResult } from '../types';
import { testDeviceConnectivity } from '../config/wledApi';
import { logger } from '../utils/logger';
import { ipToDeviceId } from '../utils/deviceId';

interface DeviceFormProps {
  isVisible: boolean;
  onClose: () => void;
  onAddDevice: (device: WledDevice) => void;
  isDark: boolean;
  existingDevices?: WledDevice[];
}

interface FormData {
  name: string;
  ip: string;
  protocol: 'http' | 'https';
}

const COMMON_IPS = [
  '192.168.1.',
  '192.168.0.',
  '10.0.0.',
  '172.16.0.',
];

export default function DeviceForm({
  isVisible,
  onClose,
  onAddDevice,
  isDark,
  existingDevices = [],
}: DeviceFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    ip: '',
    protocol: 'http',
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<DeviceValidationResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Reset form when modal opens
      setFormData({
        name: '',
        ip: '',
        protocol: 'http',
      });
      setValidationResult(null);
      setShowAdvanced(false);
    }
  }, [isVisible]);

  const handleIpChange = (ip: string) => {
    setFormData({ ...formData, ip });
    setValidationResult(null); // Clear previous validation
  };

  const handleValidateDevice = async () => {
    if (!formData.ip.trim()) {
      Alert.alert('Error', 'Please enter an IP address');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await testDeviceConnectivity(formData.ip, formData.protocol);
      setValidationResult(result);
      
      if (result.success && result.deviceInfo) {
        // Auto-fill device name if available
        if (!formData.name && result.deviceInfo.name) {
          setFormData(prev => ({ ...prev, name: result.deviceInfo.name }));
        }
      }
    } catch (error) {
      logger.error('Device validation failed:', error);
      setValidationResult({
        success: false,
        message: 'Failed to validate device. Please check the IP address and try again.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleAddDevice = () => {
    if (!validationResult?.success) {
      Alert.alert('Error', 'Please validate the device first');
      return;
    }

    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a device name');
      return;
    }

    // Check for duplicate devices
    const isDuplicate = existingDevices.some(
      device => device.ip === formData.ip || device.name.toLowerCase() === formData.name.toLowerCase()
    );

    if (isDuplicate) {
      Alert.alert('Error', 'A device with this IP address or name already exists');
      return;
    }

    const deviceIp = formData.ip.trim();
    const newDevice: WledDevice = {
      id: ipToDeviceId(deviceIp),
      name: formData.name.trim(),
      ip: deviceIp,
      protocol: formData.protocol,
      bestAddress: validationResult.bestAddress || deviceIp,
      isConnected: true,
      isPlaying: false,
      autoBrightness: false,
      maxBrightness: 255,
      responseTime: validationResult.responseTime,
      wledInfo: validationResult.deviceInfo,
      lastHeartbeat: new Date().toISOString(),
    };

    onAddDevice(newDevice);
    onClose();
    logger.log(`Added new device: ${newDevice.name} (${newDevice.ip})`);
  };

  const renderValidationStatus = () => {
    if (!validationResult) return null;

    return (
      <View className={`p-4 rounded-xl border mt-4 ${
        validationResult.success
          ? isDark ? 'border-green-600 bg-green-900/20' : 'border-green-200 bg-green-50'
          : isDark ? 'border-red-600 bg-red-900/20' : 'border-red-200 bg-red-50'
      }`}>
        <View className="flex-row items-start space-x-3">
          <Ionicons
            name={validationResult.success ? 'checkmark-circle' : 'close-circle'}
            size={20}
            color={validationResult.success ? '#10B981' : '#EF4444'}
          />
          <View className="flex-1">
            <Text className={`font-medium ${
              validationResult.success
                ? isDark ? 'text-green-200' : 'text-green-800'
                : isDark ? 'text-red-200' : 'text-red-800'
            }`}>
              {validationResult.success ? 'Device Found!' : 'Connection Failed'}
            </Text>
            <Text className={`text-sm mt-1 ${
              validationResult.success
                ? isDark ? 'text-green-300' : 'text-green-700'
                : isDark ? 'text-red-300' : 'text-red-700'
            }`}>
              {validationResult.message}
            </Text>
            {validationResult.success && validationResult.deviceInfo && (
              <View className="mt-2 space-y-1">
                <Text className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  • Name: {validationResult.deviceInfo.name || 'Unknown'}
                </Text>
                <Text className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  • Version: {validationResult.deviceInfo.ver || 'Unknown'}
                </Text>
                {validationResult.responseTime && (
                  <Text className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    • Response Time: {validationResult.responseTime}ms
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Header */}
        <View className={`flex-row items-center justify-between p-4 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <TouchableOpacity onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color={isDark ? '#FFF' : '#000'} />
          </TouchableOpacity>
          <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Add WLED Device
          </Text>
          <View className="w-10" />
        </View>

        <View className="flex-1 p-4">
          {/* Device Name */}
          <View className="mb-4">
            <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Device Name
            </Text>
            <TextInput
              value={formData.name}
              onChangeText={(name) => setFormData({ ...formData, name })}
              placeholder="Enter device name (e.g., Living Room LEDs)"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              className={`p-4 rounded-xl border ${
                isDark 
                  ? 'border-gray-600 bg-gray-800 text-white' 
                  : 'border-gray-200 bg-white text-gray-900'
              }`}
            />
          </View>

          {/* IP Address */}
          <View className="mb-4">
            <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              IP Address
            </Text>
            <TextInput
              value={formData.ip}
              onChangeText={handleIpChange}
              placeholder="192.168.1.100"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              keyboardType="numeric"
              className={`p-4 rounded-xl border ${
                isDark 
                  ? 'border-gray-600 bg-gray-800 text-white' 
                  : 'border-gray-200 bg-white text-gray-900'
              }`}
            />
            
            {/* Quick IP suggestions */}
            <View className="flex-row space-x-2 mt-2">
              {COMMON_IPS.map((prefix) => (
                <TouchableOpacity
                  key={prefix}
                  onPress={() => setFormData({ ...formData, ip: prefix })}
                  className={`px-3 py-1 rounded-lg border ${
                    isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-100'
                  }`}
                >
                  <Text className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {prefix}...
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Advanced Settings */}
          <TouchableOpacity
            onPress={() => setShowAdvanced(!showAdvanced)}
            className="flex-row items-center space-x-2 mb-4"
          >
            <Ionicons
              name={showAdvanced ? 'chevron-down' : 'chevron-forward'}
              size={16}
              color={isDark ? '#9CA3AF' : '#6B7280'}
            />
            <Text className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Advanced Settings
            </Text>
          </TouchableOpacity>

          {showAdvanced && (
            <View className="mb-4">
              <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Protocol
              </Text>
              <View className="flex-row space-x-3">
                {(['http', 'https'] as const).map((protocol) => (
                  <TouchableOpacity
                    key={protocol}
                    onPress={() => setFormData({ ...formData, protocol })}
                    className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center ${
                      formData.protocol === protocol
                        ? isDark ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                        : isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <Text className={`font-medium ${
                      formData.protocol === protocol
                        ? isDark ? 'text-blue-200' : 'text-blue-600'
                        : isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {protocol.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Validation */}
          <TouchableOpacity
            onPress={handleValidateDevice}
            disabled={isValidating || !formData.ip.trim()}
            className={`p-4 rounded-xl flex-row items-center justify-center space-x-2 ${
              isValidating || !formData.ip.trim()
                ? isDark ? 'bg-gray-700' : 'bg-gray-300'
                : 'bg-blue-500'
            }`}
          >
            {isValidating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="search" size={20} color="white" />
            )}
            <Text className="text-white font-semibold">
              {isValidating ? 'Validating...' : 'Test Connection'}
            </Text>
          </TouchableOpacity>

          {renderValidationStatus()}

          {/* Add Device Button */}
          {validationResult?.success && (
            <TouchableOpacity
              onPress={handleAddDevice}
              className="bg-green-500 p-4 rounded-xl flex-row items-center justify-center space-x-2 mt-6"
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-semibold text-lg">
                Add Device
              </Text>
            </TouchableOpacity>
          )}

          {/* Help Text */}
          <View className={`mt-6 p-4 rounded-xl border ${
            isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-blue-50'
          }`}>
            <View className="flex-row items-start space-x-3">
              <Ionicons 
                name="information-circle" 
                size={20} 
                color={isDark ? '#60A5FA' : '#2563EB'} 
              />
              <View className="flex-1">
                <Text className={`font-medium mb-2 ${
                  isDark ? 'text-blue-200' : 'text-blue-800'
                }`}>
                  Finding Your Device
                </Text>
                <View className="space-y-1">
                  <Text className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    • Check your router's admin panel for connected devices
                  </Text>
                  <Text className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    • Look for devices named "wled-" followed by numbers
                  </Text>
                  <Text className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    • Ensure both devices are on the same WiFi network
                  </Text>
                  <Text className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    • Try common IP ranges like 192.168.1.x or 192.168.0.x
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}