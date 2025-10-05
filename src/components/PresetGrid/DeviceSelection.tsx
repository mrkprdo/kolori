import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Device as WledDevice } from '../../types';
import { sharedStyles, deviceSelectionStyles as styles } from './styles';

interface DeviceSelectionProps {
  activeDevice: WledDevice | undefined;
  activeDeviceId?: number | null;
  devices: WledDevice[];
  isDeleteMode: boolean;
  isTogglingDevice: boolean;
  showDeviceDropdown: boolean;
  isDark: boolean;
  cardBackground: string;
  borderColor: string;
  textColor: string;
  subtextColor: string;
  onDeviceToggle: (turnOn: boolean) => void;
  onSetShowDeviceDropdown: (show: boolean) => void;
  onSetActiveDeviceId?: (id: number) => void;
}

const DeviceSelection: React.FC<DeviceSelectionProps> = ({
  activeDevice,
  activeDeviceId,
  devices,
  isDeleteMode,
  isTogglingDevice,
  showDeviceDropdown,
  isDark,
  cardBackground,
  borderColor,
  textColor,
  subtextColor,
  onDeviceToggle,
  onSetShowDeviceDropdown,
  onSetActiveDeviceId,
}) => {
  if (isDeleteMode) {
    return null;
  }

  return (
    <>
      {/* Floating Device Controls */}
      <View
        style={[
          styles.floatingDropdown,
          { backgroundColor: `${cardBackground}CC`, borderColor },
        ]}
      >
        {/* On/Off Button */}
        <TouchableOpacity
          onPress={() => onDeviceToggle(!activeDevice?.wledInfo?.on)}
          disabled={!activeDevice?.isConnected || isTogglingDevice}
          style={[
            styles.powerButton,
            {
              backgroundColor: activeDevice?.wledInfo?.on
                ? '#10b981'
                : '#6b7280',
              opacity:
                !activeDevice?.isConnected || isTogglingDevice ? 0.5 : 1,
            },
          ]}
        >
          {isTogglingDevice ? (
            <Ionicons
              name="refresh"
              size={20}
              color="#ffffff"
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          ) : (
            <Ionicons
              name={activeDevice?.wledInfo?.on ? 'power' : 'power-outline'}
              size={20}
              color="#ffffff"
            />
          )}
        </TouchableOpacity>

        {/* Device Dropdown */}
        <TouchableOpacity
          onPress={() => onSetShowDeviceDropdown(!showDeviceDropdown)}
          style={styles.dropdownButton}
        >
          <View style={styles.dropdownContent}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: activeDevice?.isConnected
                    ? '#10b981'
                    : '#ef4444',
                },
              ]}
            />
            <Text
              style={[styles.dropdownText, { color: textColor }]}
              numberOfLines={1}
            >
              {activeDevice?.name || 'No Device'}
            </Text>
            <Ionicons
              name={showDeviceDropdown ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={subtextColor}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Device Selection Modal */}
      {showDeviceDropdown && devices.length > 1 && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => onSetShowDeviceDropdown(false)}
          style={styles.dropdownOverlay}
        >
          <View
            style={[styles.dropdownModal, { backgroundColor: cardBackground }]}
          >
            <Text style={[styles.dropdownTitle, { color: textColor }]}>
              Select Device
            </Text>
            <ScrollView
              style={styles.deviceScrollContainer}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {devices.map((device, index) => (
                <TouchableOpacity
                  key={`device-option-${device.id}-${index}`}
                  onPress={() => {
                    if (onSetActiveDeviceId) {
                      onSetActiveDeviceId(device.id);
                    }
                    onSetShowDeviceDropdown(false);
                  }}
                  style={[
                    styles.deviceOption,
                    index < devices.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: borderColor }
                      : { borderBottomWidth: 0 },
                    device.id === activeDeviceId && {
                      backgroundColor: isDark ? '#374151' : '#f3f4f6',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: device.isConnected
                          ? '#10b981'
                          : '#ef4444',
                      },
                    ]}
                  />
                  <View style={styles.deviceInfo}>
                    <Text
                      style={[styles.deviceOptionText, { color: textColor }]}
                    >
                      {device.name}
                    </Text>
                    <Text
                      style={[
                        styles.deviceOptionSubtext,
                        { color: subtextColor },
                      ]}
                    >
                      {device.mdns || 'Unknown'} · {device.ip}
                    </Text>
                  </View>
                  {device.id === activeDeviceId && (
                    <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      )}
    </>
  );
};

export default DeviceSelection;
