import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FloatingModal from './FloatingModal';
import { Device as WledDevice } from '../types';

interface DeviceManagementModalProps {
  isVisible: boolean;
  onClose: () => void;
  isDark: boolean;
  devices: WledDevice[];
  onDeviceRemove: (deviceId: number) => void;
  onAddDevice: () => void;
  onScanForDevices: () => void;
}

export default function DeviceManagementModal({
  isVisible,
  onClose,
  isDark,
  devices = [],
  onDeviceRemove,
  onAddDevice,
  onScanForDevices,
}: DeviceManagementModalProps) {
  const handleShowAddManually = () => {
    onClose();
    if (onAddDevice && typeof onAddDevice === 'function') {
      onAddDevice();
    } else {
      console.error('onAddDevice is not a function:', onAddDevice);
    }
  };

  const handleShowScanNetwork = () => {
    onClose();
    onScanForDevices();
  };

  const openWledPage = (ip: string) => {
    const url = `http://${ip}`;
    Linking.openURL(url);
  };

  const confirmDeviceRemoval = (device: WledDevice) => {
    Alert.alert(
      'Remove Device',
      `Are you sure you want to remove "${device.name}" from your devices?\n\nThis action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onDeviceRemove(device.id)
        }
      ]
    );
  };

  const confirmDeviceReboot = (device: WledDevice) => {
    Alert.alert(
      'Reboot Device',
      `Are you sure you want to reboot "${device.name}"?\n\nThe device will restart and may be temporarily unavailable.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Reboot',
          style: 'destructive',
          onPress: () => rebootDevice(device)
        }
      ]
    );
  };

  const rebootDevice = async (device: WledDevice) => {
    try {
      const response = await fetch(`http://${device.ip}/win&RB`, {
        method: 'GET',
        timeout: 5000,
      });
      
      if (response.ok) {
        Alert.alert('Success', `${device.name} has been rebooted successfully.`);
      } else {
        Alert.alert('Error', `Failed to reboot ${device.name}. Please try again.`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to connect to ${device.name}. Please check if the device is online.`);
    }
  };

  const getStyles = (isDark: boolean) => StyleSheet.create({
    deviceCard: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderRadius: 10,
      padding: 10,
      marginBottom: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.25 : 0.05,
      shadowRadius: 3,
      elevation: 2,
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
    },
    deviceCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    deviceName: {
      color: isDark ? '#ffffff' : '#111827',
      fontWeight: '700',
      fontSize: 13,
    },
    deviceIp: {
      color: isDark ? '#9ca3af' : '#6b7280',
      fontSize: 11,
      fontWeight: '500',
      marginTop: 1,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    linkButton: {
      padding: 5,
      borderRadius: 6,
      backgroundColor: isDark ? '#1e3a8a' : '#eff6ff',
      marginRight: 6,
    },
    trashButton: {
      padding: 5,
      borderRadius: 6,
      backgroundColor: isDark ? '#374151' : '#fef2f2',
    },
    rebootButton: {
      padding: 5,
      borderRadius: 6,
      backgroundColor: isDark ? '#1e3a8a' : '#fff7ed',
      marginRight: 6,
    },
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
    buttonContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    footerButtonPrimary: {
      flex: 1, 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center', 
      paddingVertical: 14, 
      paddingHorizontal: 20,
      borderRadius: 12, 
      backgroundColor: '#3b82f6', 
      gap: 6,
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    footerButtonSecondary: {
      flex: 1, 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center', 
      paddingVertical: 14, 
      paddingHorizontal: 20,
      borderRadius: 12, 
      backgroundColor: isDark ? '#374151' : '#ffffff', 
      gap: 6,
      borderWidth: 1,
      borderColor: isDark ? '#4b5563' : '#d1d5db',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.25 : 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    footerButtonText: {
      fontSize: 15,
      fontWeight: '600',
    },
  });

  const styles = getStyles(isDark);

  const footerContent = (
    <View style={styles.buttonContainer}>
      <TouchableOpacity onPress={handleShowAddManually} style={styles.footerButtonSecondary}>
        <Ionicons name="add" size={20} color={isDark ? '#FFF' : '#3B82F6'} />
        <Text style={[styles.footerButtonText, { color: isDark ? '#FFF' : '#3B82F6' }]}>Add Manually</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleShowScanNetwork} style={styles.footerButtonPrimary}>
        <Ionicons name="search" size={20} color="white" />
        <Text style={[styles.footerButtonText, { color: 'white' }]}>Scan Network</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <FloatingModal
      visible={isVisible}
      isDark={isDark}
      onClose={onClose}
      title="Device Management"
      scrollable={true}
      footer={footerContent}
    >
      {(devices || []).map((device) => (
        <View key={device.id} style={styles.deviceCard}>
          <View style={styles.deviceCardHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={[styles.statusDot, { backgroundColor: device.isConnected ? '#10b981' : '#ef4444' }]} />
                <Text style={styles.deviceName}>{device.name}</Text>
              </View>
              <Text style={styles.deviceIp}>{device.ip}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => openWledPage(device.ip)} style={styles.linkButton}>
                <Ionicons name="link-outline" size={18} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDeviceReboot(device)} style={styles.rebootButton}>
                <Ionicons name="refresh-outline" size={18} color="#F97316" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDeviceRemoval(device)} style={styles.trashButton}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
      {(devices || []).length === 0 && (
        <View style={styles.noDevicesContainer}>
          <Ionicons name="hardware-chip-outline" size={48} color={isDark ? '#4B5563' : '#9CA3AF'} />
          <Text style={styles.noDevicesText}>No devices configured</Text>
        </View>
      )}
    </FloatingModal>
  );
}
