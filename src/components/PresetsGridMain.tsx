import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SEASONAL_PRESETS, SeasonalPreset } from '../constants/presets';

interface PresetCardProps {
  preset: SeasonalPreset;
  isActive: boolean;
  onClick: (id: string | number) => void;
  showIcon?: boolean;
  isDark?: boolean;
}

function PresetCard({ preset, isActive, onClick, showIcon = false, isDark = false }: PresetCardProps) {
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - 48) / 3 - 8; // 3 columns with padding

  return (
    <TouchableOpacity
      onPress={() => onClick(preset.id)}
      style={[
        styles.presetCard,
        {
          width: cardWidth,
          borderColor: isActive ? '#3b82f6' : (isDark ? '#374151' : '#e5e7eb'),
          borderWidth: isActive ? 2 : 1,
        }
      ]}
    >
      <View style={styles.cardOverlay} />
      <View style={styles.cardContent}>
        {showIcon && (
          <Text style={styles.presetIcon}>{preset.icon}</Text>
        )}
        <Text style={styles.presetName}>
          {preset.name}
        </Text>
      </View>
      {isActive && (
        <View style={styles.activeIndicator}>
          <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
        </View>
      )}
    </TouchableOpacity>
  );
}

interface Device {
  id: string | number;
  name: string;
  ip: string;
  isConnected?: boolean;
}

interface PresetsGridMainProps {
  devices: Device[];
  isDark?: boolean;
  onSettingsPress: () => void;
  deviceConnectionStatus?: Record<string, boolean>;
}

export default function PresetsGridMain({
  devices = [],
  isDark = false,
  onSettingsPress,
  deviceConnectionStatus = {}
}: PresetsGridMainProps) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [activePreset, setActivePreset] = useState<string | number | null>(null);
  const [isSeasonalCollapsed, setIsSeasonalCollapsed] = useState(false);
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);

  // Auto-select first connected device
  useEffect(() => {
    if (!selectedDevice && devices.length > 0) {
      const connectedDevice = devices.find(device => 
        deviceConnectionStatus[device.id] === true
      );
      setSelectedDevice(connectedDevice || devices[0]);
    }
  }, [devices, deviceConnectionStatus, selectedDevice]);

  const handlePresetSelect = async (presetId: string | number) => {
    if (!selectedDevice) {
      return;
    }
    
    setActivePreset(presetId);
    console.log(`Applying preset ${presetId} to device ${selectedDevice.name} (${selectedDevice.ip})`);
    
    // Apply preset to WLED device
    try {
      const preset = SEASONAL_PRESETS.find(p => p.id === presetId);
      if (!preset) return;
      
      // Basic WLED API call to change colors based on preset
      // This is a simplified implementation - real presets would have more complex configurations
      const wledApiCall = {
        on: true,
        bri: 255,
        seg: [{
          col: [
            [255, 165, 0], // Orange fallback color
            [0, 0, 0],     // Background
            [0, 0, 0]      // Background
          ]
        }]
      };
      
      // Map preset to colors
      switch (preset.name) {
        case 'Autumn':
          wledApiCall.seg[0].col = [[255, 140, 0], [255, 69, 0], [139, 69, 19]];
          break;
        case 'Canada Day':
          wledApiCall.seg[0].col = [[255, 0, 0], [255, 255, 255], [255, 0, 0]];
          break;
        case 'Christmas':
          wledApiCall.seg[0].col = [[0, 128, 0], [255, 0, 0], [255, 255, 255]];
          break;
      }
      
      const response = await fetch(`http://${selectedDevice.ip}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wledApiCall),
      });
      
      if (response.ok) {
        console.log(`Successfully applied ${preset.name} preset to ${selectedDevice.name}`);
      } else {
        console.error(`Failed to apply preset: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error applying preset to device:`, error);
    }
  };

  const getDeviceStatusColor = (device: Device) => {
    const isConnected = deviceConnectionStatus[device.id] ?? device.isConnected ?? false;
    return isConnected ? '#10b981' : '#6b7280';
  };

  const getDeviceStatusText = (device: Device) => {
    const isConnected = deviceConnectionStatus[device.id] ?? device.isConnected ?? false;
    return isConnected ? 'Online' : 'Offline';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#f9fafb' }]}>
      {/* Header with Device Dropdown */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1f2937' : '#ffffff' }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.appTitle, { color: isDark ? '#ffffff' : '#111827' }]}>
            <Text style={styles.titleBlue}>Ko</Text>
            <Text style={styles.titlePurple}>lori</Text>
          </Text>
          
          {/* Device Dropdown */}
          <TouchableOpacity
            onPress={() => setShowDeviceDropdown(!showDeviceDropdown)}
            style={[styles.deviceSelector, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}
          >
            <View style={styles.deviceSelectorContent}>
              <Ionicons 
                name="bulb" 
                size={16} 
                color={selectedDevice ? getDeviceStatusColor(selectedDevice) : '#6b7280'} 
              />
              <Text style={[styles.deviceSelectorText, { color: isDark ? '#ffffff' : '#374151' }]}>
                {selectedDevice ? selectedDevice.name : 'Select Device'}
              </Text>
              <Ionicons 
                name={showDeviceDropdown ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={isDark ? '#9ca3af' : '#6b7280'} 
              />
            </View>
          </TouchableOpacity>

          {/* Dropdown Menu */}
          {showDeviceDropdown && (
            <View style={[styles.dropdown, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
              {devices.length === 0 ? (
                <View style={styles.dropdownItem}>
                  <Text style={[styles.dropdownText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                    No devices available
                  </Text>
                </View>
              ) : (
                devices.map((device) => (
                  <TouchableOpacity
                    key={device.id}
                    onPress={() => {
                      setSelectedDevice(device);
                      setShowDeviceDropdown(false);
                    }}
                    style={[
                      styles.dropdownItem,
                      selectedDevice?.id === device.id && styles.selectedDropdownItem
                    ]}
                  >
                    <Ionicons 
                      name="bulb" 
                      size={16} 
                      color={getDeviceStatusColor(device)} 
                    />
                    <View style={styles.deviceDropdownInfo}>
                      <Text style={[styles.dropdownText, { color: isDark ? '#ffffff' : '#111827' }]}>
                        {device.name}
                      </Text>
                      <Text style={[styles.dropdownSubtext, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                        {device.ip} • {getDeviceStatusText(device)}
                      </Text>
                    </View>
                    {selectedDevice?.id === device.id && (
                      <Ionicons name="checkmark" size={16} color="#3b82f6" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={onSettingsPress}
          style={styles.settingsButton}
        >
          <Ionicons name="settings-outline" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Device Status Banner */}
        {selectedDevice && (
          <View style={[styles.deviceBanner, { backgroundColor: isDark ? '#1f2937' : '#ffffff' }]}>
            <View style={styles.deviceBannerContent}>
              <Ionicons 
                name="bulb" 
                size={20} 
                color={getDeviceStatusColor(selectedDevice)} 
              />
              <Text style={[styles.deviceBannerText, { color: isDark ? '#ffffff' : '#111827' }]}>
                Controlling: {selectedDevice.name}
              </Text>
              <Text style={[styles.deviceBannerStatus, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                ({getDeviceStatusText(selectedDevice)})
              </Text>
            </View>
          </View>
        )}

        {/* No Device Selected */}
        {!selectedDevice && (
          <View style={styles.noDeviceContainer}>
            <Ionicons name="bulb-outline" size={48} color="#9ca3af" />
            <Text style={[styles.noDeviceTitle, { color: isDark ? '#ffffff' : '#111827' }]}>
              No Device Selected
            </Text>
            <Text style={[styles.noDeviceText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              Select a device from the dropdown above to control your WLED lights
            </Text>
          </View>
        )}

        {/* Seasonal Presets */}
        {selectedDevice && (
          <View style={styles.section}>
            <TouchableOpacity
              onPress={() => setIsSeasonalCollapsed(!isSeasonalCollapsed)}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="calendar" size={20} color={isDark ? '#ffffff' : '#000000'} />
                <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#111827' }]}>
                  Seasonal Presets
                </Text>
              </View>
              <Ionicons
                name={isSeasonalCollapsed ? 'chevron-down' : 'chevron-up'}
                size={20}
                color={isDark ? '#9ca3af' : '#6b7280'}
              />
            </TouchableOpacity>

            {!isSeasonalCollapsed && (
              <View style={styles.presetsGrid}>
                {SEASONAL_PRESETS.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    isActive={activePreset?.toString() === preset.id.toString()}
                    onClick={handlePresetSelect}
                    showIcon={true}
                    isDark={isDark}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    position: 'relative',
  },
  headerLeft: {
    flex: 1,
    position: 'relative',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  titleBlue: {
    color: '#2563eb',
  },
  titlePurple: {
    color: '#7c3aed',
  },
  deviceSelector: {
    borderRadius: 8,
    padding: 8,
    minWidth: 200,
  },
  deviceSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceSelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  dropdown: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectedDropdownItem: {
    backgroundColor: '#f3f4f6',
  },
  deviceDropdownInfo: {
    flex: 1,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownSubtext: {
    fontSize: 12,
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  deviceBanner: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  deviceBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceBannerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deviceBannerStatus: {
    fontSize: 14,
  },
  noDeviceContainer: {
    alignItems: 'center',
    padding: 32,
    margin: 16,
  },
  noDeviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noDeviceText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  presetCard: {
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  presetIcon: {
    fontSize: 24,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  presetName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});