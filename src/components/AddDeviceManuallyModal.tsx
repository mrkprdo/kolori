import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Device } from '../types';
import { ipToDeviceId } from '../utils/deviceId';

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
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDark ? '#FFF' : '#000'} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add Device Manually</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
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
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: isDark ? '#111827' : '#F3F4F6' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: isDark ? '#FFF' : '#000' },
  closeButton: { padding: 8 },
  modalContent: { padding: 16 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '500', color: isDark ? '#E5E7EB' : '#374151', marginBottom: 8 },
  input: { backgroundColor: isDark ? '#1F2937' : '#FFF', color: isDark ? '#FFF' : '#000', padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: isDark ? '#4B5563' : '#D1D5DB' },
  addButton: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  addButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});