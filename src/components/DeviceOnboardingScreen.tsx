import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AddDeviceManuallyModal from './AddDeviceManuallyModal';
import { Device } from '../types';
import { MdnsWledDevice } from '../utils/wledMdnsDiscovery';

// Color palette for animated letters
const COLOR_PALETTE = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

// Helper function to get a random color different from the current one
const getRandomColor = (currentColor: string) => {
  const availableColors = COLOR_PALETTE.filter(c => c !== currentColor);
  return availableColors[Math.floor(Math.random() * availableColors.length)];
};

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

  // State for each letter's color
  const [letterColors, setLetterColors] = useState(() => ({
    K: COLOR_PALETTE[0],
    o1: COLOR_PALETTE[1],
    l: COLOR_PALETTE[2],
    o2: COLOR_PALETTE[3],
    r: COLOR_PALETTE[4],
    i: COLOR_PALETTE[5],
  }));

  // Color changing animation for each letter
  useEffect(() => {
    const letters = ['K', 'o1', 'l', 'o2', 'r', 'i'] as const;

    // Change a random letter's color every 800ms
    const colorInterval = setInterval(() => {
      const randomLetter = letters[Math.floor(Math.random() * letters.length)];
      setLetterColors(prev => ({
        ...prev,
        [randomLetter]: getRandomColor(prev[randomLetter]),
      }));
    }, 800);

    return () => clearInterval(colorInterval);
  }, []);

  const styles = getStyles(isDark);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>
            <Text style={[styles.logoLetter, { color: letterColors.K }]}>K</Text>
            <Text style={[styles.logoLetter, { color: letterColors.o1 }]}>o</Text>
            <Text style={[styles.logoLetter, { color: letterColors.l }]}>l</Text>
            <Text style={[styles.logoLetter, { color: letterColors.o2 }]}>o</Text>
            <Text style={[styles.logoLetter, { color: letterColors.r }]}>r</Text>
            <Text style={[styles.logoLetter, { color: letterColors.i }]}>i</Text>
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
          <TouchableOpacity onPress={() => setShowScanNetworkModal(true)} style={styles.primaryButton}>
            <Ionicons name="search" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Scan Network for Devices</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddManuallyModal(true)} style={styles.secondaryButton}>
            <Ionicons name="add" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
            <Text style={styles.secondaryButtonText}>Add Device Manually</Text>
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
  content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 80 },
  logo: { fontSize: 48, fontWeight: 'bold' },
  logoLetter: { fontSize: 48, fontWeight: 'bold' },
  tagline: { fontSize: 18, color: isDark ? '#d1d5db' : '#6b7280', marginTop: 8 },
  welcomeSection: { alignItems: 'center', paddingHorizontal: 20, flex: 1, justifyContent: 'center' },
  welcomeTitle: { fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 8, color: isDark ? '#FFF' : '#111827' },
  welcomeText: { textAlign: 'center', lineHeight: 22, fontSize: 16, color: isDark ? '#9ca3af' : '#6b7280' },
  buttonSection: { gap: 12, paddingHorizontal: 20 },
  primaryButton: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  secondaryButton: { backgroundColor: 'transparent', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: isDark ? '#9ca3af' : '#6b7280', fontWeight: '500', fontSize: 14 },
});
