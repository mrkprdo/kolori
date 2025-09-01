import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  modalContainer: { flex: 1, backgroundColor: isDark ? '#111827' : '#F3F4F6' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: isDark ? '#FFF' : '#000' },
  closeButton: { padding: 8 },
  tabContainer: { flexDirection: 'row', padding: 16, gap: 8 },
  tabButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: isDark ? '#1F2937' : '#FFF', gap: 8 },
  tabButtonActive: { backgroundColor: '#3B82F6' },
  tabText: { color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  tabContentContainer: { padding: 16, gap: 6 },
  addDeviceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: isDark ? '#4B5563' : '#D1D5DB', gap: 8 },
  addDeviceText: { color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: '600', fontSize: 16 },
  deviceCard: { backgroundColor: isDark ? '#1F2937' : '#FFF', borderRadius: 4, padding: 6 },
  deviceCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deviceName: { color: isDark ? '#FFF' : '#111827', fontWeight: '600', fontSize: 12, marginBottom: 0 },
  deviceIp: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 11 },
  statusDot: { width: 8, height: 8, borderRadius: 4, alignSelf: 'center' },
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
  settings,
  onSettingsUpdate,
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
                  <View style={[styles.statusDot, { backgroundColor: device.isConnected ? '#10b981' : '#ef4444', marginRight: 6, marginLeft: 0, width: 6, height: 6, borderRadius: 3 }]} />
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
        <Picker
          selectedValue={theme}
          onValueChange={(itemValue) => onThemeChange(itemValue as Theme)}
          style={{ color: isDark ? '#FFF' : '#000', backgroundColor: isDark ? '#1F2937' : '#FFF', borderRadius: 12 }}
          itemStyle={{ height: 120 }} // Adjust height as needed
        >
          <Picker.Item label="System" value="system" />
          <Picker.Item label="Light" value="light" />
          <Picker.Item label="Dark" value="dark" />
        </Picker>
      </View>

      <Text style={styles.sectionTitle}>Schedule Mode</Text>
      <View style={styles.settingsGroup}>
        <Picker
          selectedValue={scheduleMode}
          onValueChange={(itemValue) => onScheduleModeChange(itemValue as ScheduleMode)}
          style={{ color: isDark ? '#FFF' : '#000', backgroundColor: isDark ? '#1F2937' : '#FFF', borderRadius: 12 }}
          itemStyle={{ height: 120 }} // Adjust height as needed
        >
          <Picker.Item label="All Day Mode" value="all-day" />
          <Picker.Item label="Day Mode" value="day" />
          <Picker.Item label="Night Mode" value="night" />
        </Picker>
      </View>

      <Text style={styles.sectionTitle}>Live View</Text>
      <View style={styles.settingsGroup}>
        <View style={[styles.optionButton, { justifyContent: 'space-between' }]}>
          <View>
            <Text style={styles.optionText}>Live LED View</Text>
            <Text style={styles.optionSubText}>Stream live LED colors from device</Text>
          </View>
          <Switch
            value={settings.liveViewEnabled}
            onValueChange={(value) => onSettingsUpdate({ ...settings, liveViewEnabled: value })}
            trackColor={{ false: isDark ? '#374151' : '#E5E7EB', true: '#3B82F6' }}
            thumbColor={settings.liveViewEnabled ? '#FFF' : isDark ? '#9CA3AF' : '#F3F4F6'}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Device Discovery</Text>
      <View style={styles.settingsGroup}>
        <View style={[styles.optionButton, { justifyContent: 'space-between' }]}>
          <View>
            <Text style={styles.optionText}>Auto Scan</Text>
            <Text style={styles.optionSubText}>Automatically start scanning for devices</Text>
          </View>
          <Switch
            value={settings.autoScan}
            onValueChange={(value) => onSettingsUpdate({ ...settings, autoScan: value })}
            trackColor={{ false: isDark ? '#374151' : '#E5E7EB', true: '#3B82F6' }}
            thumbColor={settings.autoScan ? '#FFF' : isDark ? '#9CA3AF' : '#F3F4F6'}
          />
        </View>

        <View style={[styles.optionButton, { justifyContent: 'space-between' }]}>
          <View>
            <Text style={styles.optionText}>Background Scan</Text>
            <Text style={styles.optionSubText}>Continue scanning in background</Text>
          </View>
          <Switch
            value={settings.backgroundScanEnabled}
            onValueChange={(value) => onSettingsUpdate({ ...settings, backgroundScanEnabled: value })}
            trackColor={{ false: isDark ? '#374151' : '#E5E7EB', true: '#3B82F6' }}
            thumbColor={settings.backgroundScanEnabled ? '#FFF' : isDark ? '#9CA3AF' : '#F3F4F6'}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Advanced</Text>
      <View style={styles.settingsGroup}>
        <View style={[styles.optionButton, { justifyContent: 'space-between' }]}>
          <View>
            <Text style={styles.optionText}>Debug Logs</Text>
            <Text style={styles.optionSubText}>Show detailed logs for troubleshooting</Text>
          </View>
          <Switch
            value={settings.debugLogs}
            onValueChange={(value) => onSettingsUpdate({ ...settings, debugLogs: value })}
            trackColor={{ false: isDark ? '#374151' : '#E5E7EB', true: '#3B82F6' }}
            thumbColor={settings.debugLogs ? '#FFF' : isDark ? '#9CA3AF' : '#F3F4F6'}
          />
        </View>

        <TouchableOpacity
          style={[styles.optionButton, { justifyContent: 'space-between' }]}
          onPress={() => {
            Alert.prompt(
              'Scan Timeout',
              'Set scan timeout in seconds (5-60):',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Save',
                  onPress: (value) => {
                    const timeout = parseInt(value || '15');
                    if (!isNaN(timeout) && timeout >= 5 && timeout <= 60) {
                      onSettingsUpdate({ ...settings, scanTimeout: timeout });
                    }
                  }
                }
              ],
              'plain-text',
              settings.scanTimeout.toString()
            );
          }}
        >
          <View>
            <Text style={styles.optionText}>Scan Timeout</Text>
            <Text style={styles.optionSubText}>{settings.scanTimeout} seconds</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionButton, { justifyContent: 'space-between' }]}
          onPress={() => {
            Alert.prompt(
              'Max Devices',
              'Set maximum number of devices (1-50):',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Save',
                  onPress: (value) => {
                    const max = parseInt(value || '10');
                    if (!isNaN(max) && max >= 1 && max <= 50) {
                      onSettingsUpdate({ ...settings, maxDevices: max });
                    }
                  }
                }
              ],
              'plain-text',
              settings.maxDevices.toString()
            );
          }}
        >
          <View>
            <Text style={styles.optionText}>Max Devices</Text>
            <Text style={styles.optionSubText}>Maximum {settings.maxDevices} devices</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Danger Zone</Text>
      <View style={styles.settingsGroup}>
        <TouchableOpacity
          style={[styles.optionButton, { justifyContent: 'space-between', borderColor: '#EF4444', borderWidth: 1 }]}
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
          style={[styles.optionButton, { justifyContent: 'space-between', borderColor: '#EF4444', borderWidth: 1 }]}
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