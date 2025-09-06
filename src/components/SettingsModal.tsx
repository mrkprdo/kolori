import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import AboutModal from './AboutModal';
import FloatingModal from './FloatingModal';
import SeasonalPresetsModal from './SeasonalPresetsModal';
import { Device as WledDevice, Theme, ScheduleMode, Settings } from '../types';

interface SettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
  isDark: boolean;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  scheduleMode: ScheduleMode;
  onScheduleModeChange: (mode: ScheduleMode) => void;
  // New settings
  settings: Settings;
  onSettingsUpdate: (settings: Settings) => void;
  activeDevice?: WledDevice | null;
}


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

});

export default function SettingsModal({
  isVisible,
  onClose,
  isDark,
  theme,
  onThemeChange,
  scheduleMode,
  onScheduleModeChange,
  settings,
  onSettingsUpdate,
  activeDevice,
}: SettingsModalProps) {
  const [showAbout, setShowAbout] = useState(false); // New state for About modal
  const [showSeasonalPresets, setShowSeasonalPresets] = useState(false); // New state for Seasonal Presets modal
  const styles = getStyles(isDark);



  const renderGeneralTab = () => (
    <ScrollView contentContainerStyle={styles.tabContentContainer}>
      <Text style={styles.sectionTitle}>Presets</Text>
      <View style={styles.settingsGroup}>
        <TouchableOpacity
          style={[styles.optionButton, { justifyContent: 'space-between' }]}
          onPress={() => setShowSeasonalPresets(true)}
        >
          <View>
            <Text style={styles.optionText}>Seasonal Presets</Text>
            <Text style={styles.optionSubText}>Configure preset IDs for seasonal effects</Text>
          </View>
          <Ionicons name="calendar-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
      </View>

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

        {renderGeneralTab()}

    </FloatingModal>

      {/* About Modal */}
      <AboutModal
        isVisible={showAbout}
        onClose={() => setShowAbout(false)}
        isDark={isDark}
      />

      {/* Seasonal Presets Modal */}
      <SeasonalPresetsModal
        isVisible={showSeasonalPresets}
        onClose={() => setShowSeasonalPresets(false)}
        isDark={isDark}
        seasonalPresets={(() => {
          const presets = settings.seasonalPresets || [];
          return presets;
        })()}
        onUpdateSeasonalPresets={async (presets) => {
          // Device-specific storage is now handled within SeasonalPresetsModal
          // Just update the settings for UI consistency
          const updatedSettings = {
            ...settings,
            seasonalPresets: presets,
          };
          onSettingsUpdate(updatedSettings);
        }}
        activeDevice={activeDevice}
      />
    </>
  );
}