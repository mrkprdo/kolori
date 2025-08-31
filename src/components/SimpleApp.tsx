// Simple Kolori App Component for React Native - Test Version
import React, { useState } from 'react';
import { Modal, Alert } from 'react-native';
import PresetsGridMain from './PresetsGridMain';
import SettingsScreen from './SettingsScreen';
import { deviceStorage } from '../utils/deviceStorage';

interface SimpleAppProps {
  devices?: any[];
  onResetApp?: () => void;
  onDeviceAdd?: (device: any) => void;
  onDeviceRemove?: (deviceId: string | number) => void;
  deviceConnectionStatus?: Record<string, boolean>;
}

export default function SimpleApp({ devices = [], onResetApp, onDeviceAdd, onDeviceRemove, deviceConnectionStatus = {} }: SimpleAppProps) {
  const [showSettings, setShowSettings] = useState(false);

  const handleDeviceRemove = async (deviceId: string | number) => {
    try {
      const numericId = typeof deviceId === 'string' ? parseInt(deviceId) : deviceId;
      const success = await deviceStorage.removeDevice(numericId);
      
      if (success) {
        // Call the parent callback to update the device list
        onDeviceRemove?.(deviceId);
      } else {
        Alert.alert('Error', 'Failed to remove device. Please try again.');
      }
    } catch (error) {
      console.error('Failed to remove device:', error);
      Alert.alert('Error', 'An error occurred while removing the device.');
    }
  };
  return (
    <>
      <PresetsGridMain 
        devices={devices}
        isDark={false}
        onSettingsPress={() => setShowSettings(true)}
        deviceConnectionStatus={deviceConnectionStatus}
      />

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SettingsScreen
          isDark={false}
          onClose={() => setShowSettings(false)}
          onResetApp={() => {
            setShowSettings(false);
            onResetApp?.();
          }}
          devices={devices}
          onDeviceRemove={handleDeviceRemove}
          onDeviceAdd={onDeviceAdd}
        />
      </Modal>
    </>
  );
}