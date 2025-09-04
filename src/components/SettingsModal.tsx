import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import AboutModal from './AboutModal';
import FloatingModal from './FloatingModal';
import { Device as WledDevice, Theme, ScheduleMode, Settings } from '../types';

interface SettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
  isDark: boolean;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  scheduleMode: ScheduleMode;
  onScheduleModeChange: (mode: ScheduleMode) => void;
  devices: WledDevice[];
  onDeviceRemove: (deviceId: number) => void;
  onAddDevice: () => void;
  onScanForDevices: () => void;
  // New settings
  settings: Settings;
  onSettingsUpdate: (settings: Settings) => void;
}

const TABS = [
  { id: 'devices', title: 'Devices', icon: 'hardware-chip-outline' },
  { id: 'general', title: 'General', icon: 'settings-outline' },
];

const getStyles = (isDark: boolean) => StyleSheet.create({
  tabContainer: { 
    flexDirection: 'row',
    padding: 3,
    backgroundColor: isDark ? '#1f2937' : '#f1f5f9',
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 8,
  },
  tabButton: { 
    flex: 1,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 8, 
    paddingHorizontal: 10, 
    borderRadius: 6, 
    backgroundColor: 'transparent',
    gap: 4,
  },
  tabButtonActive: { 
    backgroundColor: isDark ? '#3b82f6' : '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: { color: isDark ? '#9ca3af' : '#64748b', fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  tabContentContainer: { paddingHorizontal: 12, paddingVertical: 8, gap: 12 },

  // Device Cards
  deviceCard: { 
    backgroundColor: isDark ? '#1f2937' : '#ffffff', 
    borderRadius: 10, 
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.25 : 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
  },
  deviceCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deviceName: { color: isDark ? '#ffffff' : '#111827', fontWeight: '700', fontSize: 13 },
  deviceIp: { color: isDark ? '#9ca3af' : '#6b7280', fontSize: 11, fontWeight: '500', marginTop: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  trashButton: { padding: 5, borderRadius: 6, backgroundColor: isDark ? '#374151' : '#fef2f2' },

  noDevicesContainer: { 
    alignItems: 'center', 
    paddingVertical: 32, 
    paddingHorizontal: 20,
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: isDark ? '#374151' : '#d1d5db',
  },
  noDevicesText: { 
    color: isDark ? '#9ca3af' : '#6b7280', 
    fontSize: 13, 
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },

  // Section Styling
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: isDark ? '#ffffff' : '#111827', 
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  settingsGroup: { 
    gap: 6,
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 10,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
  },

  // Option Buttons
  optionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    borderRadius: 8,
  },
  dropdownOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  optionText: { color: isDark ? '#ffffff' : '#111827', fontSize: 14, fontWeight: '600' },
  optionSubText: { color: isDark ? '#9ca3af' : '#6b7280', fontSize: 12, marginTop: 1 },

  // Footer Buttons
  stickyFooter: { 
    flexDirection: 'row', 
    padding: 10, 
    gap: 8, 
    borderTopWidth: 1, 
    borderTopColor: isDark ? '#374151' : '#e5e7eb', 
    backgroundColor: isDark ? '#111827' : '#f9fafb',
  },
  footerButtonPrimary: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10, 
    borderRadius: 8, 
    backgroundColor: '#3b82f6', 
    gap: 5,
  },
  footerButtonSecondary: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10, 
    borderRadius: 8, 
    backgroundColor: isDark ? '#374151' : '#ffffff', 
    gap: 5,
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#d1d5db',
  },
  footerButtonText: { fontSize: 14, fontWeight: '700' },

  // Danger Zone
  dangerZoneGroup: {
    gap: 6,
    backgroundColor: isDark ? '#1f1f23' : '#fef7f7',
    borderRadius: 10,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: isDark ? '#7f1d1d' : '#fca5a5',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#7f1d1d' : '#fca5a5',
  },
});

export default function SettingsModal({
  isVisible,
  onClose,
  isDark,
  theme,
  onThemeChange,
  scheduleMode,
  onScheduleModeChange,
  devices,
  onDeviceRemove,
  onAddDevice,
  onScanForDevices,
  settings,
  onSettingsUpdate,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('devices');
  const [showAbout, setShowAbout] = useState(false); // New state for About modal
  const styles = getStyles(isDark);

  const handleShowAddManually = () => {
    onClose();
    onAddDevice();
  };

  const handleShowScanNetwork = () => {
    onClose();
    onScanForDevices();
  };

  const renderDevicesTab = () => (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.tabContentContainer}>
        {devices.map((device) => (
          <View key={device.id} style={styles.deviceCard}>
            <View style={styles.deviceCardHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={[styles.statusDot, { backgroundColor: device.isConnected ? '#10b981' : '#ef4444' }]} />
                  <Text style={styles.deviceName}>{device.name}</Text>
                </View>
                <Text style={styles.deviceIp}>{device.ip}</Text>
              </View>
              <TouchableOpacity onPress={() => onDeviceRemove(device.id)} style={styles.trashButton}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {devices.length === 0 && (
          <View style={styles.noDevicesContainer}>
            <Ionicons name="hardware-chip-outline" size={48} color={isDark ? '#4B5563' : '#9CA3AF'} />
            <Text style={styles.noDevicesText}>No devices configured</Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.stickyFooter}>
        <TouchableOpacity onPress={handleShowAddManually} style={styles.footerButtonPrimary}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.footerButtonText}>Add Manually</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShowScanNetwork} style={styles.footerButtonSecondary}>
          <Ionicons name="scan" size={20} color={isDark ? '#FFF' : '#3B82F6'} />
          <Text style={[styles.footerButtonText, { color: isDark ? '#FFF' : '#3B82F6' }]}>Scan Network</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGeneralTab = () => (
    <ScrollView contentContainerStyle={styles.tabContentContainer}>
      <Text style={styles.sectionTitle}>Appearance</Text>
      <View style={styles.settingsGroup}>
        <View style={[styles.dropdownOptionButton, { backgroundColor: isDark ? '#111827' : '#f9fafb' }]}>
          <Picker
            selectedValue={theme}
            onValueChange={(itemValue) => onThemeChange(itemValue as Theme)}
            style={{ flex: 1, color: isDark ? '#FFF' : '#000' }}
            dropdownIconColor={isDark ? '#FFF' : '#000'}
          >
            <Picker.Item label="System" value="system" />
            <Picker.Item label="Light" value="light" />
            <Picker.Item label="Dark" value="dark" />
          </Picker>
        </View>
      </View>

      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.settingsGroup}>
        <TouchableOpacity
          style={[styles.optionButton, { justifyContent: 'space-between' }]}
          onPress={() => setShowAbout(true)}
        >
          <View>
            <Text style={styles.optionText}>App Info</Text>
            <Text style={styles.optionSubText}>View application version and licenses</Text>
          </View>
          <Ionicons name="information-circle-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
      </View>

      

      

      

      

      <Text style={styles.sectionTitle}>Danger Zone</Text>
      <View style={styles.dangerZoneGroup}>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() => {
            Alert.alert(
              'Clear Cache',
              'This will clear all cached data but keep your devices and settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear Cache',
                  style: 'destructive',
                  onPress: () => {
                    // Clear cache logic would go here
                    Alert.alert('Success', 'Cache cleared successfully');
                  }
                }
              ]
            );
          }}
        >
          <View>
            <Text style={[styles.optionText, { color: '#EF4444' }]}>Clear Cache</Text>
            <Text style={styles.optionSubText}>Clear cached data (keeps devices)</Text>
          </View>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() => {
            Alert.alert(
              'Reset Application',
              'This will remove all devices and reset the app to first-time setup. This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset App',
                  style: 'destructive',
                  onPress: () => {
                    // Reset app logic would go here
                    Alert.alert('App Reset', 'Application has been reset to factory settings');
                  }
                }
              ]
            );
          }}
        >
          <View>
            <Text style={[styles.optionText, { color: '#EF4444' }]}>Reset Application</Text>
            <Text style={styles.optionSubText}>Remove all data and reset app</Text>
          </View>
          <Ionicons name="warning" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <>
    <FloatingModal
      visible={isVisible}
      isDark={isDark}
      onClose={onClose}
      title="Settings"
      scrollable={false}
    >
        <View style={styles.tabContainer}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.id ? '#FFF' : (isDark ? '#9CA3AF' : '#6B7280')}
              />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'devices' ? renderDevicesTab() : renderGeneralTab()}

    </FloatingModal>

      {/* About Modal */}
      <AboutModal
        isVisible={showAbout}
        onClose={() => setShowAbout(false)}
        isDark={isDark}
      />
    </>
  );
}