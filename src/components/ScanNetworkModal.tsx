import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { wledMdnsDiscovery, MdnsWledDevice } from '../utils/wledMdnsDiscovery';
import { Device } from '../types';
import { ipToDeviceId } from '../utils/deviceId';
import FloatingModal from './FloatingModal';

interface ScanNetworkModalProps {
  isVisible: boolean;
  onClose: () => void;
  onDeviceAdded: (device: Device) => void;
  isDark: boolean;
  existingDevices: Device[];
  backgroundScanDevices?: MdnsWledDevice[];
  setIsDiscoveryInProgress?: (inProgress: boolean) => void;
}

interface DeviceWithStatus extends MdnsWledDevice {
  status: 'discovered' | 'connecting' | 'connected' | 'failed' | 'alreadyAdded';
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: isDark ? '#111827' : '#F3F4F6' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: isDark ? '#FFF' : '#000' },
  closeButton: { padding: 8 },
  scanButton: { padding: 8, flexDirection: 'row', alignItems: 'center' },
  scanningIndicator: { alignItems: 'center', padding: 32 },
  scanningText: { marginTop: 16, fontSize: 16, textAlign: 'center', color: isDark ? '#d1d5db' : '#6b7280' },
  scanningOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isDark ? 'rgba(17, 24, 39, 0.6)' : 'rgba(249, 250, 251, 0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  scanningOverlayContent: { alignItems: 'center' },
  deviceCard: { flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 4, borderWidth: 1, marginBottom: 6, backgroundColor: isDark ? '#1F2937' : '#FFF', borderColor: isDark ? '#374151' : '#E5E7EB' },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 12, fontWeight: '600', marginBottom: 0, color: isDark ? '#FFF' : '#111827' },
  deviceIP: { fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  connectIcon: { padding: 4, alignItems: 'center', justifyContent: 'center' },
  noDevicesContainer: { alignItems: 'center', padding: 48 },
  noDevicesText: { marginTop: 16, fontSize: 16, textAlign: 'center', color: isDark ? '#9CA3AF' : '#6B7280' },
  addAllButtonContainer: { padding: 16, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#E5E7EB', backgroundColor: isDark ? '#111827' : '#F3F4F6' },
  addAllButton: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addAllButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
});

export default function ScanNetworkModal({
  isVisible,
  onClose,
  onDeviceAdded,
  isDark,
  existingDevices = [],
  backgroundScanDevices = [],
  setIsDiscoveryInProgress,
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
    const timeout = setTimeout(() => wledMdnsDiscovery.stopScan(), 2000);
    setScanTimeout(timeout);
  };

  const connectToDevice = async (device: DeviceWithStatus, setConnectingStatus = true) => {
    console.log('🔵 connectToDevice called for:', device.name);
    
    if (setConnectingStatus) {
      setDiscoveredDevices(prev => prev.map(d => d.name === device.name ? { ...d, status: 'connecting' } : d));
    }
    
    try {
      const validation = await wledMdnsDiscovery.validateWledDevice(device as any);
      if (validation.isValid) {
        const primaryIP = device.addresses?.[0] || device.host;
        const newDevice: Device = {
          id: ipToDeviceId(primaryIP),
          name: device.name,
          ip: primaryIP,
          protocol: 'http',
          isConnected: true,
          isPlaying: false,
          autoBrightness: false,
          maxBrightness: 255,
        };
        
        // Update to connected status and show green checkmark
        setDiscoveredDevices(prev => prev.map(d => d.name === device.name ? { ...d, status: 'connected' } : d));
        
        // Add device after a short delay to show the green checkmark
        setTimeout(() => {
          onDeviceAdded(newDevice);
          // Update to alreadyAdded status
          setDiscoveredDevices(prev => prev.map(d => d.name === device.name ? { ...d, status: 'alreadyAdded' } : d));
          // Don't close modal - let user see results and close manually
        }, 1000);
      } else {
        setDiscoveredDevices(prev => prev.map(d => d.name === device.name ? { ...d, status: 'failed' } : d));
        Alert.alert('Connection Failed', validation.error || 'Could not connect to device');
      }
    } catch (error) {
      setDiscoveredDevices(prev => prev.map(d => d.name === device.name ? { ...d, status: 'failed' } : d));
      Alert.alert('Connection Error', 'Failed to connect to device');
    }
  };

  const addAllDevices = () => {
    const availableDevices = discoveredDevices.filter(device => device.status === 'discovered');
    console.log('🚀 Starting Add All Devices:', { availableCount: availableDevices.length, deviceNames: availableDevices.map(d => d.name) });
    
    if (availableDevices.length === 0) {
      Alert.alert('No Devices', 'No devices available to add.');
      return;
    }
    
    // Prevent navigation during discovery process
    if (setIsDiscoveryInProgress) {
      setIsDiscoveryInProgress(true);
      console.log('🔒 Discovery in progress - navigation disabled');
    }
    
    // Mark all available devices as "connecting" immediately
    // This prevents the button from being clickable again and gives immediate feedback
    setDiscoveredDevices(prev => 
      prev.map(device => 
        availableDevices.some(ad => ad.name === device.name) 
          ? { ...device, status: 'connecting' as const }
          : device
      )
    );
    
    let completedDevices = 0;
    const totalDevices = availableDevices.length;
    
    // Trigger each device connection with staggered delays
    // This approach is more resilient to navigation interruptions
    availableDevices.forEach((device, index) => {
      const delay = index * 1000; // 1 second between each device start
      console.log(`📱 Scheduling device ${index + 1}/${availableDevices.length} (${device.name}) with ${delay}ms delay`);
      
      setTimeout(async () => {
        console.log(`🔵 Starting connection for device: ${device.name}`);
        try {
          await connectToDevice(device, false); // Don't set connecting status - already set
          console.log(`✅ Completed device: ${device.name}`);
        } catch (error) {
          console.log(`❌ Failed device: ${device.name}`, error);
        }
        
        completedDevices++;
        console.log(`📊 Progress: ${completedDevices}/${totalDevices} devices completed`);
        
        // Re-enable navigation after all devices are completed
        if (completedDevices === totalDevices && setIsDiscoveryInProgress) {
          setTimeout(() => {
            setIsDiscoveryInProgress(false);
            console.log('🔓 Discovery completed - navigation re-enabled');
          }, 2000); // Wait 2 seconds after completion before allowing navigation
        }
      }, delay);
    });
    
    console.log('🏁 Add All Devices scheduled - connections will happen over time');
  };

  return (
    <FloatingModal
      visible={isVisible}
      isDark={isDark}
      onClose={onClose}
      title="Device Discovery"
      scrollable={false}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
        <TouchableOpacity onPress={scanForDevices} style={styles.scanButton}>
          <Ionicons name={isScanning ? "stop" : "refresh"} size={20} color="#3b82f6" />
          <Text style={{ marginLeft: 8, color: '#3b82f6', fontWeight: '600' }}>
            {isScanning ? 'Stop' : 'Scan'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
          <View style={{ opacity: isScanning ? 0.3 : 1 }}>
            {discoveredDevices.map((device) => (
            <View key={device.name} style={styles.deviceCard}>
              <View style={styles.deviceInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.statusDot, { backgroundColor: device.status === 'connected' || device.status === 'alreadyAdded' ? '#10b981' : device.status === 'failed' ? '#ef4444' : '#f59e0b' }]} />
                  <Text style={styles.deviceName}>{device.name}</Text>
                </View>
                <Text style={styles.deviceIP}>{device.addresses?.[0] || device.host}</Text>
              </View>
              <TouchableOpacity
                onPress={() => connectToDevice(device)}
                disabled={device.status === 'connecting' || device.status === 'connected' || device.status === 'alreadyAdded'}
                style={styles.connectIcon}>
                {device.status === 'connecting' && <ActivityIndicator size="small" color="#3b82f6" />}
                {device.status === 'discovered' && <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />}
                {device.status === 'failed' && <Ionicons name="close-circle-outline" size={20} color="#ef4444" />}
                {(device.status === 'connected' || device.status === 'alreadyAdded') && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
              </TouchableOpacity>
            </View>
          ))}
            {!isScanning && discoveredDevices.length === 0 && (
              <View style={styles.noDevicesContainer}>
                <Ionicons name="search" size={48} color={isDark ? '#4B5563' : '#9CA3AF'} />
                <Text style={styles.noDevicesText}>No WLED devices found on your network.</Text>
              </View>
            )}
          </View>
          
          {/* Scanning Overlay */}
          {isScanning && (
            <View style={styles.scanningOverlay}>
              <View style={styles.scanningOverlayContent}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.scanningText}>Scanning network for WLED devices...</Text>
              </View>
            </View>
          )}
      </ScrollView>
      
      {/* Sticky Add All Button */}
      <View style={styles.addAllButtonContainer}>
        <TouchableOpacity 
          onPress={addAllDevices} 
          disabled={isScanning || discoveredDevices.filter(d => d.status === 'discovered').length === 0}
          style={[
            styles.addAllButton, 
            { 
              backgroundColor: (!isScanning && discoveredDevices.filter(d => d.status === 'discovered').length > 0) ? '#059669' : '#9ca3af',
              opacity: (!isScanning && discoveredDevices.filter(d => d.status === 'discovered').length > 0) ? 1 : 0.5
            }
          ]}>
          <Ionicons name="add-circle" size={20} color="white" />
          <Text style={styles.addAllButtonText}>
            Add All Devices ({discoveredDevices.filter(d => d.status === 'discovered').length})
          </Text>
        </TouchableOpacity>
      </View>
    </FloatingModal>
  );
}
