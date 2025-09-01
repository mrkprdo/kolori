import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AddDeviceManuallyModal from './AddDeviceManuallyModal';
import { Device } from '../types';
import { MdnsWledDevice } from '../utils/wledMdnsDiscovery';

interface DeviceOnboardingScreenProps {
  isDark: boolean;
  onDeviceAdded: (device: Device) => void;
  backgroundScanDevices?: MdnsWledDevice[];
  existingDevices?: Device[];
  showScanNetworkModal: boolean;
  setShowScanNetworkModal: (show: boolean) => void;
  setIsDiscoveryInProgress: (inProgress: boolean) => void;
}

export default function DeviceOnboardingScreen({
  isDark,
  onDeviceAdded,
  backgroundScanDevices = [],
  existingDevices = [],
  showScanNetworkModal,
  setShowScanNetworkModal,
  setIsDiscoveryInProgress,
}: DeviceOnboardingScreenProps) {
  const [showAddManuallyModal, setShowAddManuallyModal] = useState(false);

  const styles = getStyles(isDark);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>
            <Text style={styles.logoBlue}>Ko</Text>
            <Text style={styles.logoPurple}>lori</Text>
          </Text>
          <Text style={styles.tagline}>Control your WLED devices with style</Text>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Add Your First Device</Text>
          <Text style={styles.welcomeText}>
            To get started, add your first WLED device. Make sure it's on the same network.
          </Text>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity onPress={() => setShowAddManuallyModal(true)} style={styles.primaryButton}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Add Device Manually</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowScanNetworkModal(true)} style={styles.secondaryButton}>
            <Ionicons name="scan" size={20} color={isDark ? '#FFF' : '#374151'} />
            <Text style={styles.secondaryButtonText}>Scan Network for Devices</Text>
          </TouchableOpacity>
        </View>
      </View>

      <AddDeviceManuallyModal
        isVisible={showAddManuallyModal}
        onClose={() => setShowAddManuallyModal(false)}
        onDeviceAdded={onDeviceAdded}
        isDark={isDark}
        existingDevices={existingDevices}
      />
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#111827' : '#f9fafb' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  header: { alignItems: 'center', position: 'absolute', top: 80, left: 20, right: 20 },
  logo: { fontSize: 48, fontWeight: 'bold' },
  logoBlue: { color: '#2563eb' },
  logoPurple: { color: '#7c3aed' },
  tagline: { fontSize: 18, color: isDark ? '#d1d5db' : '#6b7280', marginTop: 8 },
  welcomeSection: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 40 },
  welcomeTitle: { fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 8, color: isDark ? '#FFF' : '#111827' },
  welcomeText: { textAlign: 'center', lineHeight: 22, fontSize: 16, color: isDark ? '#9ca3af' : '#6b7280' },
  buttonSection: { gap: 12, paddingHorizontal: 20 },
  primaryButton: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  secondaryButton: { backgroundColor: isDark ? '#1F2937' : '#E5E7EB', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { color: isDark ? '#FFF' : '#374151', fontWeight: '600', fontSize: 16 },
});
