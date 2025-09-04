import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, StyleSheet } from 'react-native';
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
}: AddDeviceManuallyModalProps) {
  const [deviceName, setDeviceName] = useState('');
  const [deviceIP, setDeviceIP] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const styles = getStyles(isDark);

  const addManualDevice = async () => {
    if (!deviceIP.trim()) {
      Alert.alert('Error', 'Please enter an IP address');
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
      scrollable={true}
    >
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Device Name (Optional)</Text>
            <TextInput
              value={deviceName}
              onChangeText={setDeviceName}
              placeholder="Living Room LEDs"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>IP Address</Text>
            <TextInput
              value={deviceIP}
              onChangeText={setDeviceIP}
              placeholder="192.168.1.100"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              style={styles.input}
              keyboardType="decimal-pad"
            />
          </View>
          <TouchableOpacity onPress={addManualDevice} disabled={isValidating} style={styles.addButton}>
            {isValidating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.addButtonText}>Add Device</Text>
            )}
          </TouchableOpacity>
    </FloatingModal>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '500', color: isDark ? '#E5E7EB' : '#374151', marginBottom: 8 },
  input: { backgroundColor: isDark ? '#1F2937' : '#FFF', color: isDark ? '#FFF' : '#000', padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: isDark ? '#4B5563' : '#D1D5DB' },
  addButton: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  addButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});