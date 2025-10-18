import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  StyleSheet, 
  Modal 
} from 'react-native';
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

type DeviceStatus = 'discovered' | 'connecting' | 'connected' | 'failed' | 'alreadyAdded';

interface DeviceWithStatus extends MdnsWledDevice {
  status: DeviceStatus;
  enhancedName?: string;
  wledDeviceName?: string; // The actual WLED device name from /win endpoint
}

interface DeviceCardProps {
  device: DeviceWithStatus;
  styles: any;
  onConnect: () => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, styles, onConnect }) => {
  const getStatusColor = (status: DeviceStatus) => {
    switch (status) {
      case 'connected':
      case 'alreadyAdded':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getStatusIcon = (status: DeviceStatus) => {
    switch (status) {
      case 'connecting':
        return <ActivityIndicator size="small" color="#3b82f6" />;
      case 'discovered':
        return <Ionicons name="add-circle-outline" size={18} color="#3b82f6" />;
      case 'failed':
        return <Ionicons name="close-circle-outline" size={18} color="#ef4444" />;
      case 'connected':
      case 'alreadyAdded':
        return <Ionicons name="checkmark-circle" size={18} color="#10b981" />;
    }
  };

  const isDisabled = ['connecting', 'connected', 'alreadyAdded'].includes(device.status);

  return (
    <View style={styles.deviceCard}>
      <View style={styles.deviceCardHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(device.status) }]} />
            <Text style={styles.deviceName}>
              {device.wledDeviceName || device.enhancedName || device.name}
            </Text>
          </View>
          <Text style={styles.deviceIP}>
            {device.name} · {device.addresses?.[0] || device.host}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onConnect}
          disabled={isDisabled}
          style={styles.connectButton}
        >
          {getStatusIcon(device.status)}
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface AddAllDevicesButtonProps {
  availableDevices: DeviceWithStatus[];
  isScanning: boolean;
  onPress: () => void;
  styles: any;
}

const AddAllDevicesButton: React.FC<AddAllDevicesButtonProps> = ({ 
  availableDevices, 
  isScanning, 
  onPress, 
  styles 
}) => {
  const isEnabled = !isScanning && availableDevices.length > 0;
  
  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={!isEnabled}
      style={[
        styles.footerButtonPrimary, 
        { 
          backgroundColor: isEnabled ? '#059669' : '#9ca3af',
          opacity: isEnabled ? 1 : 0.6
        }
      ]}
    >
      <Ionicons name="add-circle" size={20} color="white" />
      <Text style={styles.footerButtonText}>
        Add All Devices ({availableDevices.length})
      </Text>
    </TouchableOpacity>
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  scanButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
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
    marginBottom: 12,
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
    marginBottom: 12,
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

  const isDeviceAlreadyAdded = (mdnsDevice: MdnsWledDevice): boolean => {
    const deviceName = mdnsDevice.name;
    const deviceIPs = mdnsDevice.addresses || [];
    const deviceHost = mdnsDevice.host;
    
    return existingDevices.some(existingDevice => {
      // Check for exact name match
      if (existingDevice.name === deviceName) {
        return true;
      }
      
      // Check if existing device name ends with the mDNS name (for enhanced names)
      if (existingDevice.name.endsWith(`-${deviceName}`)) {
        return true;
      }
      
      // Check for IP address matches
      if (deviceIPs.includes(existingDevice.ip)) {
        return true;
      }
      
      // Check host match
      if (deviceHost && existingDevice.ip === deviceHost) {
        return true;
      }
      
      // Check if existing device IP is in the discovered device's address list
      if (deviceIPs.length > 0 && deviceIPs.includes(existingDevice.ip)) {
        return true;
      }
      
      return false;
    });
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
      console.log('🔍 Pre-validating background device:', device.name);

      // Validate device to filter out non-WLED devices
      const validation = await wledMdnsDiscovery.validateWledDevice(device);

      if (!validation.isValid) {
        console.log('❌ Background device failed validation, skipping:', device.name, validation.error);
        continue; // Skip non-WLED devices
      }

      console.log('✅ Background device validated successfully:', device.name);

      const nameInfo = await enhanceDeviceName(device);
      const isAlreadyAdded = isDeviceAlreadyAdded(device);

      preLoadedDevices.push({
        ...device,
        status: isAlreadyAdded ? 'alreadyAdded' : 'discovered',
        enhancedName: nameInfo.enhancedName,
        wledDeviceName: nameInfo.wledDeviceName,
      });
    }

    setDiscoveredDevices(preLoadedDevices);
  };

  const enhanceDeviceName = async (device: MdnsWledDevice): Promise<{ enhancedName: string; wledDeviceName?: string }> => {
    try {
      const nameResult = await wledMdnsDiscovery.getWledDeviceName(device);
      if (nameResult.success && nameResult.deviceName) {
        return {
          enhancedName: `${nameResult.deviceName}-${device.name}`,
          wledDeviceName: nameResult.deviceName
        };
      }
    } catch (error) {
      console.log('Failed to get enhanced name for device:', device.name, error);
    }
    return { enhancedName: device.name };
  };

  const scanForDevices = async () => {
    if (isScanning) return;
    
    wledMdnsDiscovery.setListeners({
      onDeviceFound: async (device: MdnsWledDevice) => {
        console.log('🔍 Device found, validating:', device.name);

        // Validate device immediately to filter out non-WLED devices
        const validation = await wledMdnsDiscovery.validateWledDevice(device);

        if (!validation.isValid) {
          console.log('❌ Device failed validation, skipping:', device.name, validation.error);
          return; // Don't add non-WLED devices to the UI
        }

        console.log('✅ Device validated successfully:', device.name);

        const nameInfo = await enhanceDeviceName(device);
        const isAlreadyAdded = isDeviceAlreadyAdded(device);

        const deviceWithStatus: DeviceWithStatus = {
          ...device,
          status: isAlreadyAdded ? 'alreadyAdded' : 'discovered',
          enhancedName: nameInfo.enhancedName,
          wledDeviceName: nameInfo.wledDeviceName,
        };

        setDiscoveredDevices(prev => {
          // Check if device already exists by name or IP addresses
          const exists = prev.some(d => {
            // Match by name
            if (d.name === device.name) return true;

            // Match by any IP address
            const existingIPs = d.addresses || [];
            const newIPs = device.addresses || [];
            return existingIPs.some(ip => newIPs.includes(ip));
          });

          if (exists) {
            // Update existing device status if it's more current
            return prev.map(d => {
              if (d.name === device.name ||
                  (d.addresses && device.addresses &&
                   d.addresses.some(ip => device.addresses?.includes(ip)))) {
                return { ...d, status: deviceWithStatus.status };
              }
              return d;
            });
          }

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

  const updateDeviceStatus = (deviceName: string, status: DeviceStatus) => {
    setDiscoveredDevices(prev => 
      prev.map(d => d.name === deviceName ? { ...d, status } : d)
    );
  };

  const connectToDevice = async (device: DeviceWithStatus, setConnectingStatus = true) => {
    console.log('🔵 Connecting to device:', device.name);
    console.log('🔵 Device details:', {
      name: device.name,
      host: device.host,
      addresses: device.addresses,
      port: device.port,
    });

    if (setConnectingStatus) {
      updateDeviceStatus(device.name, 'connecting');
    }

    try {
      // Device is already validated at discovery time, so we can proceed directly
      const primaryIP = device.addresses?.[0] || device.host;
      console.log('✅ Using validated device IP:', primaryIP);

      const newDevice: Device = {
        id: ipToDeviceId(primaryIP),
        name: device.wledDeviceName || device.enhancedName || device.name,
        ip: primaryIP,
        mdns: device.name, // Store the original mDNS name
        protocol: 'http',
        isConnected: true,
        isPlaying: false,
        autoBrightness: false,
        maxBrightness: 255,
      };

      updateDeviceStatus(device.name, 'connected');

      setTimeout(() => {
        onDeviceAdded(newDevice);
        updateDeviceStatus(device.name, 'alreadyAdded');
      }, 1000);
    } catch (error) {
      console.error('❌ Connection error:', error);
      updateDeviceStatus(device.name, 'failed');

      const primaryIP = device.addresses?.[0] || device.host;
      Alert.alert(
        'Connection Error',
        `Device: ${device.name}\nIP: ${primaryIP}\n\nError: ${error}\n\nThis might be a network or permissions issue.`
      );
    }
  };

  const addAllDevices = () => {
    const availableDevices = discoveredDevices.filter(device => device.status === 'discovered');
    console.log('🚀 Starting Add All Devices:', { 
      availableCount: availableDevices.length, 
      deviceNames: availableDevices.map(d => d.name) 
    });
    
    if (availableDevices.length === 0) {
      Alert.alert('No Devices', 'No devices available to add.');
      return;
    }
    
    // Prevent navigation during discovery process
    setIsDiscoveryInProgress?.(true);
    console.log('🔒 Discovery in progress - navigation disabled');
    
    // Mark all available devices as connecting
    setDiscoveredDevices(prev => 
      prev.map(device => 
        availableDevices.some(ad => ad.name === device.name) 
          ? { ...device, status: 'connecting' as const }
          : device
      )
    );
    
    let completedDevices = 0;
    const totalDevices = availableDevices.length;
    
    // Connect to devices with staggered delays
    availableDevices.forEach((device, index) => {
      const delay = index * 1000; // 1 second between each device
      console.log(`📱 Scheduling device ${index + 1}/${totalDevices} (${device.name}) with ${delay}ms delay`);
      
      setTimeout(async () => {
        console.log(`🔵 Starting connection for device: ${device.name}`);
        try {
          await connectToDevice(device, false);
          console.log(`✅ Completed device: ${device.name}`);
        } catch (error) {
          console.log(`❌ Failed device: ${device.name}`, error);
        }
        
        completedDevices++;
        console.log(`📊 Progress: ${completedDevices}/${totalDevices} devices completed`);
        
        // Re-enable navigation after all devices are completed
        if (completedDevices === totalDevices) {
          setTimeout(() => {
            setIsDiscoveryInProgress?.(false);
            console.log('🔓 Discovery completed - navigation re-enabled');
          }, 2000);
        }
      }, delay);
    });
    
    console.log('🏁 Add All Devices scheduled');
  };

  const footerContent = (
    <View style={styles.buttonContainer}>
      <AddAllDevicesButton
        availableDevices={discoveredDevices.filter(d => d.status === 'discovered')}
        isScanning={isScanning}
        onPress={addAllDevices}
        styles={styles}
      />
    </View>
  );

  return (
    <FloatingModal
      visible={isVisible}
      isDark={isDark}
      onClose={onClose}
      title="Device Discovery"
      scrollable={true}
      footer={footerContent}
    >
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

      {discoveredDevices.map((device) => (
        <DeviceCard
          key={device.name}
          device={device}
          styles={styles}
          onConnect={() => connectToDevice(device)}
        />
      ))}
      {!isScanning && discoveredDevices.length === 0 && (
        <View style={styles.noDevicesContainer}>
          <Ionicons name="search" size={48} color={isDark ? '#4B5563' : '#9CA3AF'} />
          <Text style={styles.noDevicesText}>No WLED devices found on your network.</Text>
        </View>
      )}

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
