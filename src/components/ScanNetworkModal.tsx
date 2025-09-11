import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { wledMdnsDiscovery, MdnsWledDevice } from '../utils/wledMdnsDiscovery';
import { Device } from '../types';
import { ipToDeviceId } from '../utils/deviceId';
import FloatingModal from './FloatingModal';

interface ScanNetworkModalProps {
  isVisible: boolean;
  onClose: () => void;
  onDeviceAdded: (device: Device) => void;
  isDark: boolean;
  existingDevices: Device[];
  backgroundScanDevices?: MdnsWledDevice[];
  setIsDiscoveryInProgress?: (inProgress: boolean) => void;
  onManualEntry?: () => void;
}

interface DeviceWithStatus extends MdnsWledDevice {
  status: 'discovered' | 'connecting' | 'connected' | 'failed' | 'alreadyAdded';
  enhancedName?: string; // Enhanced name in format <device_name>-<mDNS>
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  scanButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: isDark ? '#1e3a8a' : '#eff6ff',
    gap: 4,
  },
  deviceCard: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff', 
    borderRadius: 10, 
    padding: 10,
    marginBottom: 0,
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
  deviceInfo: { flex: 1 },
  deviceName: {
    color: isDark ? '#ffffff' : '#111827',
    fontWeight: '700',
    fontSize: 13,
  },
  deviceIP: {
    color: isDark ? '#9ca3af' : '#6b7280',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  connectButton: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: isDark ? '#1e3a8a' : '#eff6ff',
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
  stickyFooter: {
    borderTopWidth: 1, 
    borderTopColor: isDark ? '#374151' : '#e5e7eb', 
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: isDark ? 0.25 : 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonContainer: {
    padding: 16,
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
    backgroundColor: '#059669', 
    gap: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  warningModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  warningModalContent: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  warningModalTitle: {
    color: isDark ? '#ffffff' : '#111827',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningModalMessage: {
    color: isDark ? '#9ca3af' : '#6b7280',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  warningModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  warningModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningModalButtonPrimary: {
    backgroundColor: '#059669',
  },
  warningModalButtonSecondary: {
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
  },
  warningModalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  warningModalButtonTextPrimary: {
    color: 'white',
  },
  warningModalButtonTextSecondary: {
    color: isDark ? '#d1d5db' : '#374151',
  },
});

export default function ScanNetworkModal({
  isVisible,
  onClose,
  onDeviceAdded,
  isDark,
  existingDevices = [],
  backgroundScanDevices = [],
  setIsDiscoveryInProgress,
  onManualEntry,
}: ScanNetworkModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DeviceWithStatus[]>([]);
  const [showNetworkWarning, setShowNetworkWarning] = useState(false);

  const styles = getStyles(isDark);

  const isDeviceAlreadyAdded = (deviceName: string, deviceIP: string): boolean => {
    return existingDevices.some(device => device.name === deviceName || device.ip === deviceIP);
  };

  useEffect(() => {
    if (isVisible) {
      preLoadBackgroundDevices();
      setTimeout(() => scanForDevices(), 500);
    }
    return () => {
      if (isScanning) {
        wledMdnsDiscovery.stopScan();
      }
    };
  }, [isVisible]);

  const preLoadBackgroundDevices = async () => {
    const preLoadedDevices: DeviceWithStatus[] = [];
    for (const device of backgroundScanDevices) {
      const enhancedName = await enhanceDeviceName(device);
      const deviceWithStatus: DeviceWithStatus = {
        ...device,
        status: isDeviceAlreadyAdded(device.name, device.addresses?.[0] || device.host) ? 'alreadyAdded' : 'discovered',
        enhancedName,
      };
      preLoadedDevices.push(deviceWithStatus);
    }
    setDiscoveredDevices(preLoadedDevices);
  };

  const enhanceDeviceName = async (device: MdnsWledDevice): Promise<string> => {
    try {
      const nameResult = await wledMdnsDiscovery.getWledDeviceName(device);
      if (nameResult.success && nameResult.deviceName) {
        // Format: <device_name>-<mDNS>
        return `${nameResult.deviceName}-${device.name}`;
      }
    } catch (error) {
      console.log('Failed to get enhanced name for device:', device.name, error);
    }
    // Fallback to original mDNS name
    return device.name;
  };

  const scanForDevices = async () => {
    if (isScanning) return;
    
    wledMdnsDiscovery.setListeners({
      onDeviceFound: async (device: MdnsWledDevice) => {
        const primaryIP = device.addresses?.[0] || device.host;
        const enhancedName = await enhanceDeviceName(device);
        const isAlreadyAdded = isDeviceAlreadyAdded(device.name, primaryIP);
        const deviceWithStatus: DeviceWithStatus = {
          ...device,
          status: isAlreadyAdded ? 'alreadyAdded' : 'discovered',
          enhancedName,
        };
        setDiscoveredDevices(prev => {
          const exists = prev.some(d => d.name === device.name);
          if (exists) return prev;
          return [...prev, deviceWithStatus];
        });
      },
      onScanStart: () => setIsScanning(true),
      onScanStop: () => setIsScanning(false),
      onError: (error: string) => {
        console.warn('Network scan unavailable:', error);
        setShowNetworkWarning(true);
      },
    });
    await wledMdnsDiscovery.startScan();
  };

  const connectToDevice = async (device: DeviceWithStatus, setConnectingStatus = true) => {
    console.log('🔵 connectToDevice called for:', device.name);
    
    if (setConnectingStatus) {
      setDiscoveredDevices(prev => prev.map(d => d.name === device.name ? { ...d, status: 'connecting' } : d));
    }
    
    try {
      const validation = await wledMdnsDiscovery.validateWledDevice(device as any);
      if (validation.isValid) {
        const primaryIP = device.addresses?.[0] || device.host;
        const newDevice: Device = {
          id: ipToDeviceId(primaryIP),
          name: device.enhancedName || device.name, // Use enhanced name if available
          ip: primaryIP,
          protocol: 'http',
          isConnected: true,
          isPlaying: false,
          autoBrightness: false,
          maxBrightness: 255,
        };
        
        // Update to connected status and show green checkmark
        setDiscoveredDevices(prev => prev.map(d => d.name === device.name ? { ...d, status: 'connected' } : d));
        
        // Add device after a short delay to show the green checkmark
        setTimeout(() => {
          onDeviceAdded(newDevice);
          // Update to alreadyAdded status
          setDiscoveredDevices(prev => prev.map(d => d.name === device.name ? { ...d, status: 'alreadyAdded' } : d));
          // Don't close modal - let user see results and close manually
        }, 1000);
      } else {
        setDiscoveredDevices(prev => prev.map(d => d.name === device.name ? { ...d, status: 'failed' } : d));
        Alert.alert('Connection Failed', validation.error || 'Could not connect to device');
      }
    } catch (error) {
      setDiscoveredDevices(prev => prev.map(d => d.name === device.name ? { ...d, status: 'failed' } : d));
      Alert.alert('Connection Error', 'Failed to connect to device');
    }
  };

  const addAllDevices = () => {
    const availableDevices = discoveredDevices.filter(device => device.status === 'discovered');
    console.log('🚀 Starting Add All Devices:', { availableCount: availableDevices.length, deviceNames: availableDevices.map(d => d.name) });
    
    if (availableDevices.length === 0) {
      Alert.alert('No Devices', 'No devices available to add.');
      return;
    }
    
    // Prevent navigation during discovery process
    if (setIsDiscoveryInProgress) {
      setIsDiscoveryInProgress(true);
      console.log('🔒 Discovery in progress - navigation disabled');
    }
    
    // Mark all available devices as "connecting" immediately
    // This prevents the button from being clickable again and gives immediate feedback
    setDiscoveredDevices(prev => 
      prev.map(device => 
        availableDevices.some(ad => ad.name === device.name) 
          ? { ...device, status: 'connecting' as const }
          : device
      )
    );
    
    let completedDevices = 0;
    const totalDevices = availableDevices.length;
    
    // Trigger each device connection with staggered delays
    // This approach is more resilient to navigation interruptions
    availableDevices.forEach((device, index) => {
      const delay = index * 1000; // 1 second between each device start
      console.log(`📱 Scheduling device ${index + 1}/${availableDevices.length} (${device.name}) with ${delay}ms delay`);
      
      setTimeout(async () => {
        console.log(`🔵 Starting connection for device: ${device.name}`);
        try {
          await connectToDevice(device, false); // Don't set connecting status - already set
          console.log(`✅ Completed device: ${device.name}`);
        } catch (error) {
          console.log(`❌ Failed device: ${device.name}`, error);
        }
        
        completedDevices++;
        console.log(`📊 Progress: ${completedDevices}/${totalDevices} devices completed`);
        
        // Re-enable navigation after all devices are completed
        if (completedDevices === totalDevices && setIsDiscoveryInProgress) {
          setTimeout(() => {
            setIsDiscoveryInProgress(false);
            console.log('🔓 Discovery completed - navigation re-enabled');
          }, 2000); // Wait 2 seconds after completion before allowing navigation
        }
      }, delay);
    });
    
    console.log('🏁 Add All Devices scheduled - connections will happen over time');
  };

  return (
    <FloatingModal
      visible={isVisible}
      isDark={isDark}
      onClose={onClose}
      title="Device Discovery"
      scrollable={false}
    >
      <View style={styles.container}>
        <View style={styles.scanButtonContainer}>
          <TouchableOpacity 
            onPress={scanForDevices} 
            style={styles.scanButton}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Ionicons name="refresh" size={18} color="#3b82f6" />
            )}
            <Text style={{ color: '#3b82f6', fontWeight: '600', fontSize: 14 }}>
              {isScanning ? 'Scanning...' : 'Scan'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={styles.contentContainer}>
          {discoveredDevices.map((device) => (
            <View key={device.name} style={styles.deviceCard}>
              <View style={styles.deviceCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={[styles.statusDot, { backgroundColor: device.status === 'connected' || device.status === 'alreadyAdded' ? '#10b981' : device.status === 'failed' ? '#ef4444' : '#f59e0b' }]} />
                    <Text style={styles.deviceName}>{device.enhancedName || device.name}</Text>
                  </View>
                  <Text style={styles.deviceIP}>{device.addresses?.[0] || device.host}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => connectToDevice(device)}
                  disabled={device.status === 'connecting' || device.status === 'connected' || device.status === 'alreadyAdded'}
                  style={styles.connectButton}>
                  {device.status === 'connecting' && <ActivityIndicator size="small" color="#3b82f6" />}
                  {device.status === 'discovered' && <Ionicons name="add-circle-outline" size={18} color="#3b82f6" />}
                  {device.status === 'failed' && <Ionicons name="close-circle-outline" size={18} color="#ef4444" />}
                  {(device.status === 'connected' || device.status === 'alreadyAdded') && <Ionicons name="checkmark-circle" size={18} color="#10b981" />}
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {!isScanning && discoveredDevices.length === 0 && (
            <View style={styles.noDevicesContainer}>
              <Ionicons name="search" size={48} color={isDark ? '#4B5563' : '#9CA3AF'} />
              <Text style={styles.noDevicesText}>No WLED devices found on your network.</Text>
            </View>
          )}
        </ScrollView>
        
        <View style={styles.stickyFooter}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              onPress={addAllDevices} 
              disabled={isScanning || discoveredDevices.filter(d => d.status === 'discovered').length === 0}
              style={[
                styles.footerButtonPrimary, 
                { 
                  backgroundColor: (!isScanning && discoveredDevices.filter(d => d.status === 'discovered').length > 0) ? '#059669' : '#9ca3af',
                  opacity: (!isScanning && discoveredDevices.filter(d => d.status === 'discovered').length > 0) ? 1 : 0.6
                }
              ]}>
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.footerButtonText}>
                Add All Devices ({discoveredDevices.filter(d => d.status === 'discovered').length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Network Warning Modal */}
      <Modal
        visible={showNetworkWarning}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNetworkWarning(false)}
      >
        <View style={styles.warningModalOverlay}>
          <View style={styles.warningModalContent}>
            <Ionicons 
              name="warning-outline" 
              size={48} 
              color="#f59e0b" 
              style={{ alignSelf: 'center', marginBottom: 16 }}
            />
            <Text style={styles.warningModalTitle}>
              Network Scan Unavailable
            </Text>
            <Text style={styles.warningModalMessage}>
              Network discovery is not available at the moment. You can try scanning again or manually enter your WLED device's IP address.
            </Text>
            <View style={styles.warningModalButtons}>
              <TouchableOpacity
                style={[styles.warningModalButton, styles.warningModalButtonSecondary]}
                onPress={() => setShowNetworkWarning(false)}
              >
                <Text style={[styles.warningModalButtonText, styles.warningModalButtonTextSecondary]}>
                  Try Again Later
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.warningModalButton, styles.warningModalButtonPrimary]}
                onPress={() => {
                  setShowNetworkWarning(false);
                  onClose();
                  setTimeout(() => {
                    onManualEntry?.();
                  }, 100);
                }}
              >
                <Text style={[styles.warningModalButtonText, styles.warningModalButtonTextPrimary]}>
                  Manual Entry
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </FloatingModal>
  );
}
