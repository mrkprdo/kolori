import React, { useState, useEffect } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { wledMdnsDiscovery, MdnsWledDevice } from '../utils/wledMdnsDiscovery';
import { Device } from '../types';

interface ScanNetworkModalProps {
  isVisible: boolean;
  onClose: () => void;
  onDeviceAdded: (device: Device) => void;
  isDark: boolean;
  existingDevices: Device[];
  backgroundScanDevices?: MdnsWledDevice[];
}

interface DeviceWithStatus extends MdnsWledDevice {
  status: 'discovered' | 'connecting' | 'connected' | 'failed' | 'alreadyAdded';
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: isDark ? '#111827' : '#F3F4F6' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: isDark ? '#FFF' : '#000' },
  closeButton: { padding: 8 },
  scanButton: { padding: 8 },
  modalContent: { flex: 1, padding: 16 },
  scanningIndicator: { alignItems: 'center', padding: 32 },
  scanningText: { marginTop: 16, fontSize: 16, textAlign: 'center', color: isDark ? '#d1d5db' : '#6b7280' },
  deviceCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, backgroundColor: isDark ? '#1F2937' : '#FFF', borderColor: isDark ? '#374151' : '#E5E7EB' },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: isDark ? '#FFF' : '#111827' },
  deviceIP: { fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280' },
  connectButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, minWidth: 40, alignItems: 'center' },
  noDevicesContainer: { alignItems: 'center', padding: 48 },
  noDevicesText: { marginTop: 16, fontSize: 16, textAlign: 'center', color: isDark ? '#9CA3AF' : '#6B7280' },
  addAllButtonContainer: { padding: 16, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#E5E7EB', marginTop: 16 },
  addAllButton: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669' },
  addAllButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
});

export default function ScanNetworkModal({
  isVisible,
  onClose,
  onDeviceAdded,
  isDark,
  existingDevices = [],
  backgroundScanDevices = [],
}: ScanNetworkModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DeviceWithStatus[]>([]);
  const [scanTimeout, setScanTimeout] = useState<NodeJS.Timeout | null>(null);

  const styles = getStyles(isDark);

  const isDeviceAlreadyAdded = (deviceName: string, deviceIP: string): boolean => {
    return existingDevices.some(device => device.name === deviceName || device.ip === deviceIP);
  };

  useEffect(() => {
    if (isVisible) {
      preLoadBackgroundDevices();
      setTimeout(() => scanForDevices(), 500);
    }
    return () => {
      if (isScanning) wledMdnsDiscovery.stopScan();
      if (scanTimeout) clearTimeout(scanTimeout);
    };
  }, [isVisible]);

  const preLoadBackgroundDevices = () => {
    const preLoadedDevices: DeviceWithStatus[] = backgroundScanDevices.map(device => ({
      ...device,
      status: isDeviceAlreadyAdded(device.name, device.addresses?.[0] || device.host) ? 'alreadyAdded' : 'discovered',
    }));
    setDiscoveredDevices(preLoadedDevices);
  };

  const scanForDevices = async () => {
    if (isScanning) return;
    wledMdnsDiscovery.setListeners({
      onDeviceFound: (device: MdnsWledDevice) => {
        const primaryIP = device.addresses?.[0] || device.host;
        const isAlreadyAdded = isDeviceAlreadyAdded(device.name, primaryIP);
        const deviceWithStatus: DeviceWithStatus = {
          ...device,
          status: isAlreadyAdded ? 'alreadyAdded' : 'discovered',
        };
        setDiscoveredDevices(prev => {
          const exists = prev.some(d => d.name === device.name);
          if (exists) return prev;
          return [...prev, deviceWithStatus];
        });
      },
      onScanStart: () => setIsScanning(true),
      onScanStop: () => setIsScanning(false),
      onError: (error: string) => Alert.alert('mDNS Error', error),
    });
    await wledMdnsDiscovery.startScan();
    const timeout = setTimeout(() => wledMdnsDiscovery.stopScan(), 5000);
    setScanTimeout(timeout);
  };

  const connectToDevice = async (device: DeviceWithStatus) => {
    setDiscoveredDevices(prev => prev.map(d => d.name === device.name ? { ...d, status: 'connecting' } : d));
    try {
      const validation = await wledMdnsDiscovery.validateWledDevice(device as any);
      if (validation.isValid) {
        const primaryIP = device.addresses?.[0] || device.host;
        const newDevice: Device = {
          id: Date.now(),
          name: device.name,
          ip: primaryIP,
          protocol: 'http',
          isConnected: true,
        };
        onDeviceAdded(newDevice);
        onClose();
      } else {
        Alert.alert('Connection Failed', validation.error || 'Could not connect to device');
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Failed to connect to device');
    }
  };

  const addAllDevices = async () => {
    const availableDevices = discoveredDevices.filter(device => device.status === 'discovered');
    if (availableDevices.length === 0) {
      Alert.alert('No Devices', 'No devices available to add.');
      return;
    }
    for (const device of availableDevices) {
      await connectToDevice(device);
    }
    onClose();
  };

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDark ? '#FFF' : '#000'} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Device Discovery</Text>
          <TouchableOpacity onPress={scanForDevices} style={styles.scanButton}>
            <Ionicons name={isScanning ? "stop" : "refresh"} size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          {isScanning && (
            <View style={styles.scanningIndicator}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.scanningText}>Scanning network for WLED devices...</Text>
            </View>
          )}
          {discoveredDevices.map((device) => (
            <View key={device.name} style={styles.deviceCard}>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceIP}>{device.ip}</Text>
              </View>
              <TouchableOpacity
                onPress={() => connectToDevice(device)}
                disabled={device.status === 'connecting' || device.status === 'connected' || device.status === 'alreadyAdded'}
                style={[styles.connectButton, { backgroundColor: device.status === 'connected' || device.status === 'alreadyAdded' ? '#10b981' : device.status === 'failed' ? '#ef4444' : '#3b82f6' }]}>
                {device.status === 'connecting' && <ActivityIndicator size="small" color="white" />}
                {(device.status === 'discovered' || device.status === 'failed') && <Ionicons name={device.status === 'failed' ? "close" : "add"} size={16} color="white" />}
                {(device.status === 'connected' || device.status === 'alreadyAdded') && <Ionicons name="checkmark" size={16} color="white" />}
              </TouchableOpacity>
            </View>
          ))}
          {discoveredDevices.filter(d => d.status === 'discovered').length > 0 && (
            <View style={styles.addAllButtonContainer}>
              <TouchableOpacity onPress={addAllDevices} style={styles.addAllButton}>
                <Ionicons name="add-circle" size={20} color="white" />
                <Text style={styles.addAllButtonText}>Add All Devices ({discoveredDevices.filter(d => d.status === 'discovered').length})</Text>
              </TouchableOpacity>
            </View>
          )}
          {!isScanning && discoveredDevices.length === 0 && (
            <View style={styles.noDevicesContainer}>
              <Ionicons name="search" size={48} color={isDark ? '#4B5563' : '#9CA3AF'} />
              <Text style={styles.noDevicesText}>No WLED devices found on your network.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
