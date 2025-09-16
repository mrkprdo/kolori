import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Device } from '../types';
import { ipToDeviceId } from '../utils/deviceId';
import FloatingModal from './FloatingModal';

interface AddDeviceManuallyModalProps {
  isVisible: boolean;
  onClose: () => void;
  onDeviceAdded: (device: Device) => void;
  isDark: boolean;
  existingDevices: Device[];
}

export default function AddDeviceManuallyModal({
  isVisible,
  onClose,
  onDeviceAdded,
  isDark,
  existingDevices,
}: AddDeviceManuallyModalProps) {
  const [deviceName, setDeviceName] = useState('');
  const [deviceIP, setDeviceIP] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const styles = getStyles(isDark);

  // Clear fields when modal opens
  useEffect(() => {
    if (isVisible) {
      setDeviceName('');
      setDeviceIP('');
      setIsValidating(false);
    }
  }, [isVisible]);

  const isValidIP = (ip: string): boolean => {
    const ipRegex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    return ipRegex.test(ip);
  };

  const isIPAlreadyAdded = (ip: string): boolean => {
    return existingDevices.some(device => device.ip === ip.trim());
  };

  const getValidationMessage = (): string => {
    if (!deviceIP.trim()) return '';
    if (!isValidIP(deviceIP.trim())) {
      return 'Please enter a valid IP address (e.g., 192.168.1.100)';
    }
    if (isIPAlreadyAdded(deviceIP.trim())) {
      return 'This IP address has already been added';
    }
    return '';
  };

  const isFormValid = (): boolean => {
    return deviceIP.trim() && isValidIP(deviceIP.trim()) && !isIPAlreadyAdded(deviceIP.trim());
  };

  const addManualDevice = async () => {
    if (!isFormValid()) {
      return;
    }
    setIsValidating(true);
    // This is a simplified validation. A real app should verify the connection.
    setTimeout(() => {
      const deviceIp = deviceIP.trim();
      const newDevice: Device = {
        id: ipToDeviceId(deviceIp),
        name: deviceName.trim() || `WLED (${deviceIp})`,
        ip: deviceIp,
        protocol: 'http',
        isConnected: true,
        isPlaying: false,
        autoBrightness: false,
        maxBrightness: 255,
      };
      setIsValidating(false);
      onDeviceAdded(newDevice);
      onClose();
    }, 1000);
  };

  return (
    <FloatingModal
      visible={isVisible}
      isDark={isDark}
      onClose={onClose}
      title="Add Device Manually"
      scrollable={false}
    >
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <View style={styles.inputCard}>
            <Text style={styles.label}>Device Name (Optional)</Text>
            <TextInput
              value={deviceName}
              onChangeText={setDeviceName}
              placeholder="Living Room LEDs"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              style={styles.input}
              maxLength={50}
            />
          </View>
          
          <View style={styles.inputCard}>
            <Text style={styles.label}>IP Address</Text>
            <TextInput
              value={deviceIP}
              onChangeText={setDeviceIP}
              placeholder="192.168.1.100"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              style={[
                styles.input,
                getValidationMessage() ? styles.inputError : null
              ]}
              keyboardType="default"
            />
            {getValidationMessage() && (
              <Text style={styles.warningText}>{getValidationMessage()}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.stickyFooter}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              onPress={addManualDevice} 
              disabled={isValidating || !isFormValid()} 
              style={[
                styles.footerButtonPrimary,
                {
                  backgroundColor: (!isValidating && isFormValid()) ? '#3b82f6' : '#9ca3af',
                  opacity: (!isValidating && isFormValid()) ? 1 : 0.6
                }
              ]}
            >
              {isValidating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="add-circle" size={20} color="white" />
              )}
              <Text style={styles.footerButtonText}>
                {isValidating ? 'Adding Device...' : 'Add Device'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </FloatingModal>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 20,
    gap: 16,
  },
  inputCard: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff', 
    borderRadius: 10, 
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.25 : 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: isDark ? '#ffffff' : '#111827', 
    marginBottom: 8 
  },
  input: { 
    backgroundColor: isDark ? '#374151' : '#f9fafb', 
    color: isDark ? '#ffffff' : '#111827', 
    padding: 12, 
    borderRadius: 8, 
    fontSize: 14, 
    borderWidth: 1, 
    borderColor: isDark ? '#4b5563' : '#e5e7eb' 
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  warningText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
    fontWeight: '500',
  },
  stickyFooter: {
    borderTopWidth: 1, 
    borderTopColor: isDark ? '#374151' : '#e5e7eb', 
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: isDark ? 0.25 : 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonContainer: {
    padding: 16,
    flexDirection: 'row',
    gap: 8,
  },
  footerButtonPrimary: {
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 20,
    borderRadius: 12, 
    gap: 6,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
});