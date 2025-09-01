// Device Onboarding Screen for React Native - StyleSheet Version
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  TextInput,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { wledMdnsDiscovery, MdnsWledDevice } from '../utils/wledMdnsDiscovery';

interface DeviceOnboardingScreenProps {
  isDark: boolean;
  onDeviceAdded: (device: any) => void;
  backgroundScanDevices?: MdnsWledDevice[];
  existingDevices?: any[];
}

interface DeviceWithStatus {
  name: string;
  host?: string;
  port?: number;
  addresses?: string[];
  version?: string;
  wledInfo?: any;
  deviceInfo?: any;
  status: 'discovered' | 'connecting' | 'connected' | 'failed' | 'alreadyAdded';
  source: 'mdns';
}

export default function DeviceOnboardingScreen({
  isDark,
  onDeviceAdded,
  backgroundScanDevices = [],
  existingDevices = [],
}: DeviceOnboardingScreenProps) {
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DeviceWithStatus[]>([]);
  const [deviceIP, setDeviceIP] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [scanTimeout, setScanTimeout] = useState<NodeJS.Timeout | null>(null);

  // Helper function to check if a device is already added
  const isDeviceAlreadyAdded = (deviceName: string, deviceIP: string): boolean => {
    return existingDevices.some(device => 
      device.name === deviceName || device.ip === deviceIP
    );
  };

  useEffect(() => {
    // Don't setup listeners in constructor since it's a singleton
    // Setup listeners only when starting scan

    return () => {
      // Cleanup on component unmount - but don't destroy singleton
      console.log('DeviceOnboardingScreen component unmounting, cleaning up...');
      if (isScanning) {
        wledMdnsDiscovery.stopScan();
      }
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
    };
  }, []);

  // Separate useEffect for cleanup timeout when scanTimeout changes
  useEffect(() => {
    return () => {
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
    };
  }, [scanTimeout]);

  // Pre-load devices from background scan when modal opens
  const preLoadBackgroundDevices = () => {
    const preLoadedDevices: DeviceWithStatus[] = backgroundScanDevices.map(device => {
      const primaryIP = device.addresses?.[0] || device.host;
      const isAlreadyAdded = isDeviceAlreadyAdded(device.name, primaryIP);
      
      return {
        name: device.name,
        host: device.host,
        port: device.port,
        addresses: device.addresses,
        version: device.wledInfo?.version,
        wledInfo: device.wledInfo,
        status: isAlreadyAdded ? 'alreadyAdded' as const : 'discovered' as const,
        source: 'mdns' as const,
      };
    });
    
    setDiscoveredDevices(preLoadedDevices);
    if (preLoadedDevices.length > 0) {
      console.log(`Pre-loaded ${preLoadedDevices.length} devices from background scan`);
    }
  };

  // Start mDNS scanning for WLED devices
  const scanForDevices = async () => {
    console.log('scanForDevices called, current scanning state:', isScanning);
    
    // Don't start if already scanning
    if (isScanning) {
      console.log('Already scanning, ignoring request');
      return;
    }
    
    // Don't clear if we have pre-loaded devices, just start fresh scan
    if (discoveredDevices.length === 0) {
      preLoadBackgroundDevices();
    }
    
    // Clear any existing timeout
    if (scanTimeout) {
      console.log('Clearing existing scan timeout');
      clearTimeout(scanTimeout);
    }

    // Setup fresh listeners for this scanning session
    console.log('Setting up mDNS listeners for DeviceOnboarding...');
    wledMdnsDiscovery.setListeners({
      onDeviceFound: (device: MdnsWledDevice) => {
        console.log('ONBOARDING: WLED device found via mDNS:', device);
        const primaryIP = device.addresses?.[0] || device.host;
        const isAlreadyAdded = isDeviceAlreadyAdded(device.name, primaryIP);
        
        const deviceWithStatus: DeviceWithStatus = {
          name: device.name,
          host: device.host,
          port: device.port,
          addresses: device.addresses,
          version: device.wledInfo?.version,
          wledInfo: device.wledInfo,
          status: isAlreadyAdded ? 'alreadyAdded' : 'discovered',
          source: 'mdns',
        };
        setDiscoveredDevices(prev => {
          // Avoid duplicates
          const exists = prev.some(d => d.name === device.name);
          if (exists) return prev;
          return [...prev, deviceWithStatus];
        });
      },
      onDeviceRemoved: (device: MdnsWledDevice) => {
        console.log('ONBOARDING: WLED device removed:', device);
        setDiscoveredDevices(prev => prev.filter(d => d.name !== device.name));
      },
      onScanStart: () => {
        console.log('ONBOARDING: mDNS scan started callback');
        setIsScanning(true);
      },
      onScanStop: () => {
        console.log('ONBOARDING: mDNS scan stopped callback');
        setIsScanning(false);
      },
      onError: (error: string) => {
        console.error('ONBOARDING: mDNS Discovery error:', error);
        Alert.alert('mDNS Error', error);
        setIsScanning(false);
      },
    });
    
    try {
      console.log('Starting mDNS scan for WLED devices...');
      console.log('wledMdnsDiscovery object:', !!wledMdnsDiscovery);
      
      await wledMdnsDiscovery.startScan();
      console.log('mDNS scan started successfully');
      
      // Set timeout to automatically stop scan after 5 seconds
      const timeout = setTimeout(() => {
        console.log('Scan timeout reached, stopping scan...');
        wledMdnsDiscovery.stopScan();
        setIsScanning(false);
        setScanTimeout(null);
      }, 5000);
      
      setScanTimeout(timeout);
      console.log('Scan timeout set for 5 seconds');
    } catch (error) {
      console.error('Failed to start mDNS scan:', error);
      setIsScanning(false); // Ensure scanning state is reset on error
      Alert.alert('Scan Error', 'Failed to start mDNS scan. Please check your network permissions and ensure you are using a development build.');
    }
  };

  const addAllDevices = async () => {
    const availableDevices = discoveredDevices.filter(device => device.status === 'discovered');
    
    if (availableDevices.length === 0) {
      Alert.alert('No Devices', 'No devices available to add.');
      return;
    }

    // Set all devices to connecting status
    setDiscoveredDevices(prev => 
      prev.map(d => d.status === 'discovered' ? { ...d, status: 'connecting' } : d)
    );

    let successCount = 0;
    let failCount = 0;

    // Connect to all devices in parallel
    const connectionPromises = availableDevices.map(async (device) => {
      try {
        const validation = await wledMdnsDiscovery.validateWledDevice(device as any);
        
        if (validation.isValid) {
          setDiscoveredDevices(prev => 
            prev.map(d => 
              d.name === device.name 
                ? { ...d, status: 'connected' } 
                : d
            )
          );

          const primaryIP = device.addresses?.[0] || device.host;
          
          const newDevice = {
            id: Date.now() + Math.random(), // Ensure unique IDs
            name: device.name,
            ip: primaryIP,
            protocol: 'http' as const,
            isConnected: true,
            isPlaying: false,
            autoBrightness: false,
            maxBrightness: 255,
            version: validation.deviceInfo?.ver || device.version,
            wledInfo: validation.deviceInfo || device.deviceInfo,
            discoverySource: 'mdns' as const,
          };
          
          onDeviceAdded(newDevice);
          successCount++;
        } else {
          setDiscoveredDevices(prev => 
            prev.map(d => 
              d.name === device.name 
                ? { ...d, status: 'failed' } 
                : d
            )
          );
          failCount++;
        }
      } catch (error) {
        console.error(`Connection error for ${device.name}:`, error);
        setDiscoveredDevices(prev => 
          prev.map(d => 
            d.name === device.name 
              ? { ...d, status: 'failed' } 
              : d
          )
        );
        failCount++;
      }
    });

    await Promise.all(connectionPromises);

    // Show results
    if (successCount > 0 && failCount === 0) {
      Alert.alert('Success', `Successfully added all ${successCount} devices!`);
      setShowScanModal(false);
    } else if (successCount > 0 && failCount > 0) {
      Alert.alert('Partial Success', `Added ${successCount} devices successfully. ${failCount} failed to connect.`);
    } else {
      Alert.alert('Failed', 'Failed to connect to any devices. Please try again.');
    }
  };

  const connectToDevice = async (device: DeviceWithStatus) => {
    setDiscoveredDevices(prev => 
      prev.map(d => d.name === device.name ? { ...d, status: 'connecting' } : d)
    );

    try {
      // Validate the mDNS discovered device
      const validation = await wledMdnsDiscovery.validateWledDevice(device as any);
      
      if (validation.isValid) {
        setDiscoveredDevices(prev => 
          prev.map(d => 
            d.name === device.name 
              ? { ...d, status: 'connected' } 
              : d
          )
        );

        // Get the primary IP address from mDNS device
        const primaryIP = device.addresses?.[0] || device.host;
        
        const newDevice = {
          id: Date.now(),
          name: device.name,
          ip: primaryIP,
          protocol: 'http' as const,
          isConnected: true,
          isPlaying: false,
          autoBrightness: false,
          maxBrightness: 255,
          version: validation.deviceInfo?.ver || device.version,
          wledInfo: validation.deviceInfo || device.deviceInfo,
          discoverySource: 'mdns' as const,
        };
        
        onDeviceAdded(newDevice);
        setShowScanModal(false);
        
        Alert.alert('Success', `Connected to ${device.name}!`);
      } else {
        setDiscoveredDevices(prev => 
          prev.map(d => 
            d.name === device.name 
              ? { ...d, status: 'failed' } 
              : d
          )
        );
        
        Alert.alert('Connection Failed', validation.error || 'Could not connect to device');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setDiscoveredDevices(prev => 
        prev.map(d => 
          d.name === device.name 
            ? { ...d, status: 'failed' } 
            : d
        )
      );
      
      Alert.alert('Connection Error', 'Failed to connect to device');
    }
  };

  const addManualDevice = async () => {
    if (!deviceIP.trim()) {
      Alert.alert('Error', 'Please enter an IP address');
      return;
    }

    setIsValidating(true);

    // Simulate device validation
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success rate
      setIsValidating(false);

      if (success) {
        const newDevice = {
          id: Date.now(),
          name: deviceName.trim() || `WLED Device (${deviceIP})`,
          ip: deviceIP.trim(),
          protocol: 'http' as const,
          isConnected: true,
          isPlaying: false,
          autoBrightness: false,
          maxBrightness: 255,
        };
        onDeviceAdded(newDevice);
        setShowAddDeviceModal(false);
        setDeviceIP('');
        setDeviceName('');
      } else {
        Alert.alert('Connection Failed', 'Could not connect to the device. Please check the IP address and try again.');
      }
    }, 2000);
  };

  const containerStyle = [
    styles.container,
    { backgroundColor: isDark ? '#111827' : '#f9fafb' }
  ];

  const modalContainerStyle = [
    styles.modalContainer,
    { backgroundColor: isDark ? '#1f2937' : '#ffffff' }
  ];

  return (
    <SafeAreaView style={containerStyle}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[
            styles.logo,
            { color: isDark ? '#ffffff' : '#111827' }
          ]}>
            <Text style={styles.logoBlue}>Ko</Text>
            <Text style={styles.logoPurple}>lori</Text>
          </Text>
          <Text style={[
            styles.tagline,
            { color: isDark ? '#d1d5db' : '#6b7280' }
          ]}>
            Control your WLED devices with style
          </Text>
        </View>

        {/* Illustration */}
        <View style={[
          styles.illustration,
          { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }
        ]}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="wifi" 
              size={32} 
              color={isDark ? '#9ca3af' : '#6b7280'} 
            />
            <View style={styles.overlayIcon}>
              <Ionicons 
                name="color-palette" 
                size={16} 
                color="#3b82f6" 
              />
            </View>
          </View>
        </View>

        {/* Welcome Message */}
        <View style={styles.welcomeSection}>
          <Text style={[
            styles.welcomeTitle,
            { color: isDark ? '#ffffff' : '#111827' }
          ]}>
            Add Your First Device
          </Text>
          <Text style={[
            styles.welcomeText,
            { color: isDark ? '#9ca3af' : '#6b7280' }
          ]}>
            To get started, you'll need to add your first WLED device.{'\n'}
            Make sure your device is connected to the same network.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            onPress={() => setShowAddDeviceModal(true)}
            style={styles.primaryButton}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.primaryButtonText}>
              Add Device Manually
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => {
              setShowScanModal(true);
              // Pre-load background scan results when modal opens
              if (backgroundScanDevices.length > 0 && discoveredDevices.length === 0) {
                preLoadBackgroundDevices();
              }
              // Automatically start scanning when modal opens
              setTimeout(() => {
                console.log('Auto-starting scan after modal open...');
                scanForDevices();
              }, 1000); // Increased delay to ensure proper initialization
            }}
            style={styles.secondaryButton}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.secondaryButtonText}>
              Scan Network for Devices
            </Text>
          </TouchableOpacity>
          
          <Text style={[
            styles.helpText,
            { color: isDark ? '#6b7280' : '#9ca3af' }
          ]}>
            You'll need your WLED device's IP address or use network scan
          </Text>
        </View>

        {/* Quick Tips */}
        <View style={[
          styles.tipsCard,
          { 
            backgroundColor: isDark ? '#1f2937' : '#dbeafe',
            borderColor: isDark ? '#374151' : '#93c5fd'
          }
        ]}>
          <Text style={[
            styles.tipsTitle,
            { color: isDark ? '#93c5fd' : '#1d4ed8' }
          ]}>
            Quick Tips:
          </Text>
          <View style={styles.tipsList}>
            <Text style={[
              styles.tipText,
              { color: isDark ? '#d1d5db' : '#1e40af' }
            ]}>
              • Check router admin panel for devices
            </Text>
            <Text style={[
              styles.tipText,
              { color: isDark ? '#d1d5db' : '#1e40af' }
            ]}>
              • Look for "wled-" device names
            </Text>
            <Text style={[
              styles.tipText,
              { color: isDark ? '#d1d5db' : '#1e40af' }
            ]}>
              • Ensure same WiFi network
            </Text>
          </View>
        </View>
      </View>

      {/* Add Device Modal */}
      <Modal
        visible={showAddDeviceModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={containerStyle}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowAddDeviceModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={isDark ? '#ffffff' : '#000000'} />
            </TouchableOpacity>
            <Text style={[
              styles.modalTitle,
              { color: isDark ? '#ffffff' : '#111827' }
            ]}>
              Add WLED Device
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputSection}>
              <Text style={[
                styles.inputLabel,
                { color: isDark ? '#d1d5db' : '#374151' }
              ]}>
                Device Name (Optional)
              </Text>
              <TextInput
                value={deviceName}
                onChangeText={setDeviceName}
                placeholder="Living Room LEDs"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    borderColor: isDark ? '#4b5563' : '#d1d5db',
                    color: isDark ? '#ffffff' : '#111827'
                  }
                ]}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={[
                styles.inputLabel,
                { color: isDark ? '#d1d5db' : '#374151' }
              ]}>
                IP Address
              </Text>
              <TextInput
                value={deviceIP}
                onChangeText={setDeviceIP}
                placeholder="192.168.1.100"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                keyboardType="numeric"
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    borderColor: isDark ? '#4b5563' : '#d1d5db',
                    color: isDark ? '#ffffff' : '#111827'
                  }
                ]}
              />
            </View>

            <TouchableOpacity
              onPress={addManualDevice}
              disabled={isValidating}
              style={[
                styles.modalButton,
                { opacity: isValidating ? 0.6 : 1 }
              ]}
            >
              {isValidating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="add" size={20} color="white" />
              )}
              <Text style={styles.modalButtonText}>
                {isValidating ? 'Connecting...' : 'Add Device'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Network Scan Modal */}
      <Modal
        visible={showScanModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={containerStyle}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                // Clean up scan when modal closes
                if (isScanning) {
                  wledMdnsDiscovery.stopScan();
                  setIsScanning(false);
                }
                if (scanTimeout) {
                  clearTimeout(scanTimeout);
                  setScanTimeout(null);
                }
                setShowScanModal(false);
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={isDark ? '#ffffff' : '#000000'} />
            </TouchableOpacity>
            <Text style={[
              styles.modalTitle,
              { color: isDark ? '#ffffff' : '#111827' }
            ]}>
              Device Discovery
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (Constants.appOwnership === 'expo') {
                  Alert.alert(
                    'Network Discovery Unavailable',
                    'Network device scanning requires a development build. Use "Add Device Manually" instead or build with:\n\n• npx expo run:android\n• npx expo run:ios'
                  );
                  return;
                }
                
                if (isScanning) {
                  wledMdnsDiscovery.stopScan();
                  setIsScanning(false);
                  // Clear the timeout when manually stopping
                  if (scanTimeout) {
                    clearTimeout(scanTimeout);
                    setScanTimeout(null);
                  }
                } else {
                  scanForDevices();
                }
              }}
              style={[
                styles.scanButton,
                { opacity: Constants.appOwnership === 'expo' ? 0.5 : 1 }
              ]}
            >
              <Ionicons 
                name={isScanning ? "stop" : "refresh"} 
                size={20} 
                color="#3b82f6" 
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {isScanning && (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={[
                  styles.scanningText,
                  { color: isDark ? '#d1d5db' : '#6b7280' }
                ]}>
                  Scanning network for WLED devices...

                </Text>
              </View>
            )}

            {discoveredDevices.map((device, index) => (
              <View
                key={device.name}
                style={[
                  styles.deviceCard,
                  {
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    borderColor: isDark ? '#374151' : '#e5e7eb'
                  }
                ]}
              >
                <View style={styles.deviceInfo}>
                  <Text style={[
                    styles.deviceName,
                    { color: isDark ? '#ffffff' : '#111827' }
                  ]}>
                    {device.name}
                  </Text>
                  <Text style={[
                    styles.deviceIP,
                    { color: isDark ? '#9ca3af' : '#6b7280' }
                  ]}>
                    {device.addresses?.[0] || device.host}
                    {device.port && device.port !== 80 ? `:${device.port}` : ''} 
                    {device.version && ` • v${device.version}`}
                    {backgroundScanDevices.some(bg => bg.name === device.name) && !isScanning && ' • Found earlier'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => connectToDevice(device)}
                  disabled={device.status === 'connecting' || device.status === 'connected' || device.status === 'alreadyAdded'}
                  style={[
                    styles.connectButton,
                    {
                      backgroundColor: 
                        device.status === 'connected' ? '#10b981' :
                        device.status === 'alreadyAdded' ? '#10b981' :
                        device.status === 'failed' ? '#ef4444' : '#3b82f6'
                    }
                  ]}
                >
                  {device.status === 'connecting' && (
                    <ActivityIndicator size="small" color="white" />
                  )}
                  {device.status === 'discovered' && (
                    <Ionicons name="add" size={16} color="white" />
                  )}
                  {(device.status === 'connected' || device.status === 'alreadyAdded') && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                  {device.status === 'failed' && (
                    <Ionicons name="close" size={16} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            ))}

            {/* Add All Devices Button */}
            {discoveredDevices.filter(d => d.status === 'discovered').length > 0 && (
              <View style={[
                styles.addAllButtonContainer,
                { borderTopColor: isDark ? '#374151' : '#e5e7eb' }
              ]}>
                <TouchableOpacity
                  onPress={addAllDevices}
                  style={[
                    styles.addAllButton,
                    { backgroundColor: '#059669' }
                  ]}
                >
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text style={styles.addAllButtonText}>
                    {discoveredDevices.filter(d => d.status === 'discovered').length === 1 
                      ? `Add Device (${discoveredDevices.filter(d => d.status === 'discovered').length})`
                      : `Add All Devices (${discoveredDevices.filter(d => d.status === 'discovered').length})`
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {!isScanning && discoveredDevices.length === 0 && (
              <View style={styles.noDevicesContainer}>
                {Constants.appOwnership === 'expo' ? (
                  <>
                    <Ionicons 
                      name="information-circle" 
                      size={48} 
                      color={isDark ? '#4b5563' : '#9ca3af'} 
                    />
                    <Text style={[
                      styles.noDevicesText,
                      { color: isDark ? '#9ca3af' : '#6b7280' }
                    ]}>
                      Network device discovery is not available in Expo Go.{'\n\n'}
                      To enable automatic device discovery, build a development version:{'\n'}
                      • npx expo run:android{'\n'}
                      • npx expo run:ios{'\n\n'}
                      For now, you can add devices manually using their IP addresses.
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons 
                      name="search" 
                      size={48} 
                      color={isDark ? '#4b5563' : '#9ca3af'} 
                    />
                    <Text style={[
                      styles.noDevicesText,
                      { color: isDark ? '#9ca3af' : '#6b7280' }
                    ]}>
                      No WLED devices found on your network.{'\n'}
                      Make sure your WLED devices are powered on and connected to the same WiFi network.{'\n\n'}
                      Tap the refresh button to scan again.
                    </Text>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logoBlue: {
    color: '#2563eb',
  },
  logoPurple: {
    color: '#7c3aed',
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
  },
  illustration: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    position: 'relative',
  },
  overlayIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeText: {
    textAlign: 'center',
    lineHeight: 18,
    fontSize: 14,
  },
  buttonSection: {
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  secondaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  tipsCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  tipsTitle: {
    fontWeight: '600',
    marginBottom: 6,
    fontSize: 13,
  },
  tipsList: {
    gap: 2,
  },
  tipText: {
    fontSize: 11,
    lineHeight: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  modalButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  scanButton: {
    padding: 8,
  },
  scanningIndicator: {
    alignItems: 'center',
    padding: 32,
  },
  scanningText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceIP: {
    fontSize: 14,
  },
  connectButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  statusIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDevicesContainer: {
    alignItems: 'center',
    padding: 48,
  },
  noDevicesText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  modalContainer: {
    borderRadius: 12,
    margin: 16,
    padding: 24,
  },
  addAllButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 16,
  },
  addAllButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  addAllButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});