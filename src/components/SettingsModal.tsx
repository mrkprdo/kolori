import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Device as WledDevice, Theme, ScheduleMode } from '../types';

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
}

const TABS = [
  { id: 'devices', title: 'Devices', icon: 'hardware-chip-outline' },
  { id: 'general', title: 'General', icon: 'settings-outline' },
];

const getStyles = (isDark: boolean) => StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: isDark ? '#111827' : '#F3F4F6' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: isDark ? '#FFF' : '#000' },
  closeButton: { padding: 8 },
  tabContainer: { flexDirection: 'row', padding: 16, gap: 8 },
  tabButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: isDark ? '#1F2937' : '#FFF', gap: 8 },
  tabButtonActive: { backgroundColor: '#3B82F6' },
  tabText: { color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  tabContentContainer: { padding: 16, gap: 16 },
  addDeviceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: isDark ? '#4B5563' : '#D1D5DB', gap: 8 },
  addDeviceText: { color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: '600', fontSize: 16 },
  deviceCard: { backgroundColor: isDark ? '#1F2937' : '#FFF', borderRadius: 12, padding: 16 },
  deviceCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  deviceName: { color: isDark ? '#FFF' : '#111827', fontWeight: '600', fontSize: 16, marginBottom: 4 },
  deviceIp: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8, alignSelf: 'center' },
  trashButton: { padding: 4 },
  noDevicesContainer: { alignItems: 'center', paddingVertical: 48, gap: 16 },
  noDevicesText: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 16, fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: isDark ? '#FFF' : '#111827', marginBottom: 8 },
  settingsGroup: { gap: 8 },
  optionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#1F2937' : '#FFF', padding: 16, borderRadius: 12 },
  optionButtonActive: { backgroundColor: isDark ? '#3B82F6' : '#EBF5FF', borderWidth: 1, borderColor: isDark ? '#3B82F6' : '#90CDF4' },
  optionText: { color: isDark ? '#FFF' : '#111827', fontSize: 16, fontWeight: '500' },
  optionTextActive: { color: isDark ? '#EBF5FF' : '#2563EB' },
  optionSubText: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 14, marginTop: 4 },
  optionSubTextActive: { color: isDark ? '#D1D5DB' : '#2C5282' },
  stickyFooter: { flexDirection: 'row', padding: 16, gap: 16, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#E5E7EB', backgroundColor: isDark ? '#111827' : '#F3F4F6' },
  footerButtonPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, backgroundColor: '#3B82F6', gap: 8 },
  footerButtonSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#E5E7EB', gap: 8 },
  footerButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
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
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('devices');
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <View style={[styles.statusDot, { backgroundColor: device.isConnected ? '#10b981' : '#ef4444' }]} />
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
        {(['light', 'dark', 'system'] as Theme[]).map((themeOption) => (
          <TouchableOpacity
            key={themeOption}
            onPress={() => onThemeChange(themeOption)}
            style={[styles.optionButton, theme === themeOption && styles.optionButtonActive]}
          >
            <Text style={[styles.optionText, theme === themeOption && styles.optionTextActive]}>
              {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
            </Text>
            {theme === themeOption && <Ionicons name="checkmark" size={20} color={isDark ? '#60A5FA' : '#2563EB'} />}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Schedule Mode</Text>
      <View style={styles.settingsGroup}>
        {(['all-day', 'day', 'night'] as ScheduleMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            onPress={() => onScheduleModeChange(mode)}
            style={[styles.optionButton, scheduleMode === mode && styles.optionButtonActive]}
          >
            <View>
              <Text style={[styles.optionText, scheduleMode === mode && styles.optionTextActive]}>
                {mode === 'all-day' ? 'All Day' : mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
              </Text>
              <Text style={[styles.optionSubText, scheduleMode === mode && styles.optionSubTextActive]}>
                {mode === 'all-day' ? 'LEDs active 24/7' : mode === 'day' ? 'Active during daytime' : 'Active during nighttime'}
              </Text>
            </View>
            {scheduleMode === mode && <Ionicons name="checkmark" size={20} color={isDark ? '#60A5FA' : '#2563EB'} />}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDark ? '#FFF' : '#000'} />
          </TouchableOpacity>
        </View>

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

      </SafeAreaView>
    </Modal>
  );
}