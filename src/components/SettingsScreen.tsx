import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { wledMdnsDiscovery, MdnsWledDevice } from '../utils/wledMdnsDiscovery';

interface SettingsScreenProps {
  isDark?: boolean;
  onClose?: () => void;
  onResetApp?: () => void;
  devices?: any[];
  onDeviceRemove?: (deviceId: string) => void;
  onDeviceAdd?: (device: any) => void;
  settings?: any;
  onUpdateSettings?: (newSettings: any) => Promise<void>;
  route?: any;
  navigation?: any;
}

type SettingsTab = 'devices' | 'config';

interface AppSettings {
  isDarkMode: boolean;
  autoScan: boolean;
  scanTimeout: number;
  showDebugLogs: boolean;
  backgroundScanEnabled: boolean;
  maxDevices: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  isDarkMode: false,
  autoScan: true,
  scanTimeout: 15,
  showDebugLogs: false,
  backgroundScanEnabled: true,
  maxDevices: 10,
};

export default function SettingsScreen({
  isDark = false,
  onClose,
  onResetApp,
  devices = [],
  onDeviceRemove,
  onDeviceAdd,
}: SettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('devices');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [deviceIP, setDeviceIP] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<(MdnsWledDevice & { alreadyAdded?: boolean })[]>([]);
  const [scanTimeout, setScanTimeout] = useState<NodeJS.Timeout | null>(null);
  const [deviceConnectionStatus, setDeviceConnectionStatus] = useState<Record<string, boolean>>({});
  const [isTestingConnections, setIsTestingConnections] = useState(false);

  // Helper function to check if a device is already added
  const isDeviceAlreadyAdded = (deviceName: string, deviceIP: string): boolean => {
    return devices.some(device => 
      device.name === deviceName || device.ip === deviceIP
    );
  };

  // Test device connectivity
  const testDeviceConnection = async (device: any): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(`http://${device.ip}/json/info`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        // Verify this is actually a WLED device
        return !!(data.ver || data.name || data.brand === 'WLED' || data.arch);
      }
      
      return false;
    } catch (error) {
      console.log(`Device ${device.name} (${device.ip}) is offline:`, (error as Error).message || error);
      return false;
    }
  };

  // Test all devices connectivity
  const testAllDevicesConnectivity = async () => {
    if (devices.length === 0) return;
    
    console.log('Testing connectivity for all devices...');
    setIsTestingConnections(true);
    
    try {
      const updatedDevices = await Promise.all(
        devices.map(async (device) => {
          const isOnline = await testDeviceConnection(device);
          return {
            ...device,
            isConnected: isOnline
          };
        })
      );
      
      // Create a local state to track connection status
      const deviceStatusMap = updatedDevices.reduce((acc, device) => {
        acc[device.id] = device.isConnected;
        return acc;
      }, {} as Record<string, boolean>);
      
      setDeviceConnectionStatus(deviceStatusMap);
      console.log('Device connectivity test completed');
    } catch (error) {
      console.error('Error testing device connectivity:', error);
    } finally {
      setIsTestingConnections(false);
    }
  };

  useEffect(() => {
    loadSettings();
    
    // Don't setup listeners in constructor since it's a singleton
    // Setup listeners only when starting scan
    
    return () => {
      // Cleanup on component unmount
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
      // Stop scan if active, but don't destroy the singleton
      if (isScanning) {
        wledMdnsDiscovery.stopScan();
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

  // Test device connectivity when devices change
  useEffect(() => {
    if (devices.length > 0) {
      testAllDevicesConnectivity();
    }
  }, [devices]);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset Application',
      'This will remove all devices and reset the app to first-time setup. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: onResetApp,
        },
      ]
    );
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data but keep your devices and settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear specific cache keys (preserve devices and settings)
              await AsyncStorage.removeItem('mdns_cache');
              await AsyncStorage.removeItem('network_cache');
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const containerStyle = [
    styles.container,
    { backgroundColor: isDark ? '#111827' : '#f9fafb' }
  ];

  const sectionStyle = [
    styles.section,
    { backgroundColor: isDark ? '#1f2937' : '#ffffff' }
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={containerStyle}>
        <View style={styles.loadingContainer}>
          <Text style={[
            styles.loadingText,
            { color: isDark ? '#ffffff' : '#111827' }
          ]}>
            Loading settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleRemoveDevice = (deviceId: string) => {
    // Find the device to get its name
    const device = devices.find(d => d.id === deviceId);
    const deviceName = device?.name || 'this device';
    
    Alert.alert(
      'Remove Device',
      `Are you sure you want to remove "${deviceName}" from Kolori?\n\nThis will:\n• Remove the device from your collection\n• Delete all saved settings for this device\n\nDon't worry - you can always re-add it later by scanning your network or adding it manually.`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        {
          text: 'Remove Device',
          style: 'destructive',
          onPress: () => {
            onDeviceRemove?.(deviceId);
            Alert.alert(
              'Device Removed', 
              `"${deviceName}" has been removed from Kolori. You can re-add it anytime using device discovery or manual setup.`,
              [{ text: 'OK', style: 'default' }]
            );
          },
        },
      ]
    );
  };

  const startDeviceScan = async () => {
    console.log('=== SETTINGS SCAN DEBUG ===');
    console.log('startDeviceScan called, current scanning state:', isScanning);
    console.log('mDNS discovery scanning active:', wledMdnsDiscovery.isScanningActive());
    console.log('wledMdnsDiscovery object exists:', !!wledMdnsDiscovery);
    
    // Force stop any existing scan first
    if (isScanning || wledMdnsDiscovery.isScanningActive()) {
      console.log('Stopping existing scan before starting new one...');
      wledMdnsDiscovery.stopScan();
      setIsScanning(false);
      
      // Wait a bit for the stop to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Clear previous results
    setDiscoveredDevices([]);
    console.log('Cleared previous discovered devices');
    
    // Clear any existing timeout
    if (scanTimeout) {
      console.log('Clearing existing scan timeout');
      clearTimeout(scanTimeout);
      setScanTimeout(null);
    }
    
    // Setup fresh listeners for this scanning session before starting scan
    console.log('Setting up mDNS listeners for Settings...');
    wledMdnsDiscovery.setListeners({
      onDeviceFound: (device: MdnsWledDevice) => {
        console.log('SETTINGS: WLED device found via mDNS:', device);
        const primaryIP = device.addresses?.[0] || device.host;
        const alreadyAdded = isDeviceAlreadyAdded(device.name, primaryIP);
        
        setDiscoveredDevices(prev => {
          const exists = prev.some(d => d.name === device.name);
          if (exists) return prev;
          return [...prev, { ...device, alreadyAdded }];
        });
      },
      onDeviceRemoved: (device: MdnsWledDevice) => {
        console.log('SETTINGS: WLED device removed:', device);
        setDiscoveredDevices(prev => prev.filter(d => d.name !== device.name));
      },
      onScanStart: () => {
        console.log('SETTINGS: mDNS scan started callback');
        setIsScanning(true);
      },
      onScanStop: () => {
        console.log('SETTINGS: mDNS scan stopped callback');
        setIsScanning(false);
      },
      onError: (error: string) => {
        console.error('SETTINGS: mDNS Discovery error:', error);
        Alert.alert('mDNS Error', error);
        setIsScanning(false);
      },
    });
    
    try {
      console.log('Starting mDNS scan for WLED devices...');
      console.log('Current mDNS state before start:', {
        isScanning: wledMdnsDiscovery.isScanningActive(),
        discoveredCount: wledMdnsDiscovery.getDiscoveredDevices().length
      });
      
      // Set UI state to scanning for immediate feedback
      setIsScanning(true);
      
      await wledMdnsDiscovery.startScan();
      console.log('mDNS scan started successfully');
      
      // Set timeout to automatically stop scan after 8 seconds
      const timeout = setTimeout(() => {
        console.log('Scan timeout reached, stopping scan...');
        if (wledMdnsDiscovery.isScanningActive()) {
          wledMdnsDiscovery.stopScan();
        }
        setIsScanning(false);
        setScanTimeout(null);
        console.log('Scan timeout cleanup completed');
      }, 8000);
      
      setScanTimeout(timeout);
      console.log('Scan timeout set for 8 seconds');
    } catch (error) {
      console.error('Failed to start mDNS scan:', error);
      console.error('Error details:', JSON.stringify(error));
      setIsScanning(false);
      const errorMessage = (error as Error).message || (error as Error).toString() || 'Unknown error';
      console.log('Error type:', typeof error);
      console.log('Error keys:', Object.keys(error || {}));
      
      Alert.alert(
        'Scan Error',
        `Failed to start mDNS scan: ${errorMessage}\n\nNote: mDNS scanning requires a development build, not Expo Go. Please use 'npx expo run:android' to build and run.`
      );
    }
  };

  const stopDeviceScan = () => {
    console.log('=== STOPPING SETTINGS SCAN ===');
    console.log('Current scanning state:', isScanning);
    console.log('mDNS scanning active:', wledMdnsDiscovery.isScanningActive());
    
    // Stop the mDNS scan
    if (wledMdnsDiscovery.isScanningActive()) {
      wledMdnsDiscovery.stopScan();
      console.log('Called wledMdnsDiscovery.stopScan()');
    }
    
    // Update UI state
    setIsScanning(false);
    
    // Clear timeout
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      setScanTimeout(null);
      console.log('Cleared scan timeout');
    }
    
    console.log('Scan stop completed');
  };

  const addAllDiscoveredDevices = async () => {
    const devicesToAdd = discoveredDevices.filter(device => !device.alreadyAdded);
    
    if (devicesToAdd.length === 0) {
      Alert.alert('No New Devices', 'All discovered devices are already added.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const device of devicesToAdd) {
      try {
        const validation = await wledMdnsDiscovery.validateWledDevice(device);
        
        if (validation.isValid) {
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
            version: validation.deviceInfo?.ver || device.wledInfo?.version,
            wledInfo: validation.deviceInfo || device.wledInfo,
            discoverySource: 'mdns' as const,
          };
          
          onDeviceAdd?.(newDevice);
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error('Failed to add device:', device.name, error);
        failCount++;
      }
    }

    // Close modal first
    setShowScanModal(false);
    
    // Show single consolidated result
    if (successCount > 0 && failCount === 0) {
      Alert.alert(
        'Devices Added Successfully', 
        `Successfully added ${successCount} device${successCount !== 1 ? 's' : ''} to Kolori!`
      );
    } else if (successCount > 0 && failCount > 0) {
      Alert.alert(
        'Partially Successful', 
        `Added ${successCount} device${successCount !== 1 ? 's' : ''} successfully.\n${failCount} device${failCount !== 1 ? 's' : ''} failed to connect.`
      );
    } else {
      Alert.alert(
        'Addition Failed', 
        'Failed to add any devices. Please check your network connection and try again.'
      );
    }
  };

  const connectToDiscoveredDevice = async (device: MdnsWledDevice) => {
    try {
      const validation = await wledMdnsDiscovery.validateWledDevice(device);
      
      if (validation.isValid) {
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
          version: validation.deviceInfo?.ver || device.wledInfo?.version,
          wledInfo: validation.deviceInfo || device.wledInfo,
          discoverySource: 'mdns' as const,
        };
        
        onDeviceAdd?.(newDevice);
        setShowScanModal(false);
        Alert.alert('Success', `Device "${device.name}" has been added successfully!`);
      } else {
        Alert.alert('Connection Failed', validation.error || 'Could not connect to device');
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Failed to connect to device');
    }
  };

  const addManualDevice = async () => {
    if (!deviceIP.trim()) {
      Alert.alert('Error', 'Please enter an IP address');
      return;
    }

    setIsValidating(true);

    // Simulate device validation (replace with actual validation)
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
        
        onDeviceAdd?.(newDevice);
        setShowAddDeviceModal(false);
        setDeviceIP('');
        setDeviceName('');
        Alert.alert('Success', `Device "${newDevice.name}" has been added successfully!`);
      } else {
        Alert.alert('Connection Failed', 'Could not connect to the device. Please check the IP address and try again.');
      }
    }, 2000);
  };

  const renderDeviceManagementTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Device List */}
      <View style={sectionStyle}>
        <Text style={[
          styles.sectionTitle,
          { color: isDark ? '#ffffff' : '#111827' }
        ]}>
          Connected Devices ({devices.length})
        </Text>
        
        {devices.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons 
              name="hardware-chip-outline" 
              size={48} 
              color={isDark ? '#6b7280' : '#9ca3af'} 
            />
            <Text style={[
              styles.emptyStateText,
              { color: isDark ? '#9ca3af' : '#6b7280' }
            ]}>
              No devices connected yet.{'\n'}Add your first WLED device to get started.
            </Text>
          </View>
        ) : (
          devices.map((device, index) => {
            const isConnected = deviceConnectionStatus[device.id] ?? device.isConnected ?? false;
            const connectionText = isTestingConnections ? 'Testing...' : (isConnected ? 'Connected' : 'Offline');
            
            return (
              <View key={device.id || index} style={styles.deviceRow}>
                <View style={styles.deviceIcon}>
                  {isTestingConnections ? (
                    <ActivityIndicator size="small" color="#6b7280" />
                  ) : (
                    <Ionicons 
                      name="bulb" 
                      size={24} 
                      color={isConnected ? '#10b981' : '#9ca3af'} 
                    />
                  )}
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={[
                    styles.deviceName,
                    { color: isDark ? '#ffffff' : '#111827' }
                  ]}>
                    {device.name}
                  </Text>
                  <Text style={[
                    styles.deviceDetails,
                    { color: isDark ? '#9ca3af' : '#6b7280' }
                  ]}>
                    {device.ip} • {connectionText}
                  </Text>
                {device.version && (
                  <Text style={[
                    styles.deviceVersion,
                    { color: isDark ? '#9ca3af' : '#6b7280' }
                  ]}>
                    v{device.version}
                  </Text>
                )}
              </View>
                <TouchableOpacity
                  onPress={() => handleRemoveDevice(device.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      {/* Device Actions */}
      <View style={sectionStyle}>
        <Text style={[
          styles.sectionTitle,
          { color: isDark ? '#ffffff' : '#111827' }
        ]}>
          Device Actions
        </Text>
        
        <TouchableOpacity 
          style={styles.settingRow}
          onPress={() => setShowAddDeviceModal(true)}
        >
          <View style={styles.settingInfo}>
            <Text style={[
              styles.settingLabel,
              { color: isDark ? '#ffffff' : '#111827' }
            ]}>
              Add New Device
            </Text>
            <Text style={[
              styles.settingDescription,
              { color: isDark ? '#9ca3af' : '#6b7280' }
            ]}>
              Manually add or scan for WLED devices
            </Text>
          </View>
          <Ionicons 
            name="add-circle-outline" 
            size={24} 
            color="#3b82f6" 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingRow}
          onPress={() => {
            setShowScanModal(true);
            // Auto-start scanning when modal opens
            setTimeout(() => {
              startDeviceScan();
            }, 500);
          }}
        >
          <View style={styles.settingInfo}>
            <Text style={[
              styles.settingLabel,
              { color: isDark ? '#ffffff' : '#111827' }
            ]}>
              Scan for New Devices
            </Text>
            <Text style={[
              styles.settingDescription,
              { color: isDark ? '#9ca3af' : '#6b7280' }
            ]}>
              Discover WLED devices on your network
            </Text>
          </View>
          <Ionicons 
            name="wifi-outline" 
            size={24} 
            color="#10b981" 
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderAppConfigTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* App Preferences */}
      <View style={sectionStyle}>
        <Text style={[
          styles.sectionTitle,
          { color: isDark ? '#ffffff' : '#111827' }
        ]}>
          App Preferences
        </Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[
              styles.settingLabel,
              { color: isDark ? '#ffffff' : '#111827' }
            ]}>
              Dark Mode
            </Text>
            <Text style={[
              styles.settingDescription,
              { color: isDark ? '#9ca3af' : '#6b7280' }
            ]}>
              Use dark theme throughout the app
            </Text>
          </View>
          <Switch
            value={settings.isDarkMode}
            onValueChange={(value) => updateSetting('isDarkMode', value)}
            trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
            thumbColor={settings.isDarkMode ? '#ffffff' : '#f3f4f6'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[
              styles.settingLabel,
              { color: isDark ? '#ffffff' : '#111827' }
            ]}>
              Auto Scan
            </Text>
            <Text style={[
              styles.settingDescription,
              { color: isDark ? '#9ca3af' : '#6b7280' }
            ]}>
              Automatically start scanning when opening device discovery
            </Text>
          </View>
          <Switch
            value={settings.autoScan}
            onValueChange={(value) => updateSetting('autoScan', value)}
            trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
            thumbColor={settings.autoScan ? '#ffffff' : '#f3f4f6'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[
              styles.settingLabel,
              { color: isDark ? '#ffffff' : '#111827' }
            ]}>
              Debug Logs
            </Text>
            <Text style={[
              styles.settingDescription,
              { color: isDark ? '#9ca3af' : '#6b7280' }
            ]}>
              Show detailed logs for troubleshooting
            </Text>
          </View>
          <Switch
            value={settings.showDebugLogs}
            onValueChange={(value) => updateSetting('showDebugLogs', value)}
            trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
            thumbColor={settings.showDebugLogs ? '#ffffff' : '#f3f4f6'}
          />
        </View>
      </View>

      {/* Device Settings */}
      <View style={sectionStyle}>
        <Text style={[
          styles.sectionTitle,
          { color: isDark ? '#ffffff' : '#111827' }
        ]}>
          Device Settings
        </Text>
        
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[
              styles.settingLabel,
              { color: isDark ? '#ffffff' : '#111827' }
            ]}>
              Scan Timeout
            </Text>
            <Text style={[
              styles.settingDescription,
              { color: isDark ? '#9ca3af' : '#6b7280' }
            ]}>
              {settings.scanTimeout} seconds
            </Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={isDark ? '#9ca3af' : '#6b7280'} 
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[
              styles.settingLabel,
              { color: isDark ? '#ffffff' : '#111827' }
            ]}>
              Max Devices
            </Text>
            <Text style={[
              styles.settingDescription,
              { color: isDark ? '#9ca3af' : '#6b7280' }
            ]}>
              Maximum {settings.maxDevices} devices
            </Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={isDark ? '#9ca3af' : '#6b7280'} 
          />
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={sectionStyle}>
        <Text style={[
          styles.sectionTitle,
          { color: isDark ? '#ffffff' : '#111827' }
        ]}>
          About
        </Text>
        
        <View style={styles.settingRow}>
          <Text style={[
            styles.settingLabel,
            { color: isDark ? '#ffffff' : '#111827' }
          ]}>
            Version
          </Text>
          <Text style={[
            styles.settingValue,
            { color: isDark ? '#9ca3af' : '#6b7280' }
          ]}>
            1.0.0
          </Text>
        </View>

        <View style={styles.settingRow}>
          <Text style={[
            styles.settingLabel,
            { color: isDark ? '#ffffff' : '#111827' }
          ]}>
            mDNS Library
          </Text>
          <Text style={[
            styles.settingValue,
            { color: isDark ? '#9ca3af' : '#6b7280' }
          ]}>
            react-native-zeroconf
          </Text>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={[sectionStyle, { borderColor: '#ef4444', borderWidth: 1 }]}>
        <Text style={[
          styles.sectionTitle,
          { color: '#ef4444' }
        ]}>
          Danger Zone
        </Text>
        
        <TouchableOpacity 
          onPress={handleClearCache}
          style={styles.dangerSettingRow}
        >
          <View style={styles.settingInfo}>
            <Text style={styles.dangerLabel}>
              Clear Cache
            </Text>
            <Text style={[
              styles.settingDescription,
              { color: isDark ? '#9ca3af' : '#6b7280' }
            ]}>
              Remove cached data (keeps devices and settings)
            </Text>
          </View>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleResetApp}
          style={styles.dangerSettingRow}
        >
          <View style={styles.settingInfo}>
            <Text style={styles.dangerLabel}>
              Reset Application
            </Text>
            <Text style={[
              styles.settingDescription,
              { color: isDark ? '#9ca3af' : '#6b7280' }
            ]}>
              Remove all data and restart first-time setup
            </Text>
          </View>
          <Ionicons name="refresh-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={containerStyle}>
      {/* Header */}
      <View style={[
        styles.header,
        { backgroundColor: isDark ? '#1f2937' : '#ffffff' }
      ]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={isDark ? '#ffffff' : '#111827'} 
          />
        </TouchableOpacity>
        <Text style={[
          styles.headerTitle,
          { color: isDark ? '#ffffff' : '#111827' }
        ]}>
          Settings
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tab Navigation */}
      <View style={[
        styles.tabNavigation,
        { backgroundColor: isDark ? '#1f2937' : '#ffffff' }
      ]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'devices' && styles.activeTabButton,
            activeTab === 'devices' && { backgroundColor: '#3b82f6' }
          ]}
          onPress={() => setActiveTab('devices')}
        >
          <Ionicons 
            name="hardware-chip" 
            size={20} 
            color={activeTab === 'devices' ? '#ffffff' : (isDark ? '#9ca3af' : '#6b7280')} 
          />
          <Text style={[
            styles.tabButtonText,
            { color: activeTab === 'devices' ? '#ffffff' : (isDark ? '#9ca3af' : '#6b7280') }
          ]}>
            Devices
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'config' && styles.activeTabButton,
            activeTab === 'config' && { backgroundColor: '#3b82f6' }
          ]}
          onPress={() => setActiveTab('config')}
        >
          <Ionicons 
            name="settings" 
            size={20} 
            color={activeTab === 'config' ? '#ffffff' : (isDark ? '#9ca3af' : '#6b7280')} 
          />
          <Text style={[
            styles.tabButtonText,
            { color: activeTab === 'config' ? '#ffffff' : (isDark ? '#9ca3af' : '#6b7280') }
          ]}>
            App Config
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'devices' ? renderDeviceManagementTab() : renderAppConfigTab()}

      {/* Add Device Modal */}
      <Modal
        visible={showAddDeviceModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={containerStyle}>
          <View style={[
            styles.modalHeader,
            { backgroundColor: isDark ? '#1f2937' : '#ffffff' }
          ]}>
            <TouchableOpacity 
              onPress={() => {
                setShowAddDeviceModal(false);
                setDeviceIP('');
                setDeviceName('');
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={isDark ? '#ffffff' : '#000000'} />
            </TouchableOpacity>
            <Text style={[
              styles.modalTitle,
              { color: isDark ? '#ffffff' : '#111827' }
            ]}>
              Add WLED Device
            </Text>
            <View style={styles.modalPlaceholder} />
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
                styles.addButton,
                { opacity: isValidating ? 0.6 : 1 }
              ]}
            >
              {isValidating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="add" size={20} color="white" />
              )}
              <Text style={styles.addButtonText}>
                {isValidating ? 'Connecting...' : 'Add Device'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Scan Devices Modal */}
      <Modal
        visible={showScanModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={containerStyle}>
          <View style={[
            styles.modalHeader,
            { backgroundColor: isDark ? '#1f2937' : '#ffffff' }
          ]}>
            <TouchableOpacity 
              onPress={() => {
                setShowScanModal(false);
                stopDeviceScan();
                setDiscoveredDevices([]);
              }}
              style={styles.modalCloseButton}
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
                if (isScanning) {
                  stopDeviceScan();
                } else {
                  startDeviceScan();
                }
              }}
              style={styles.modalCloseButton}
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
                  styles.discoveredDeviceCard,
                  {
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    borderColor: isDark ? '#374151' : '#e5e7eb'
                  }
                ]}
              >
                <View style={styles.discoveredDeviceInfo}>
                  <Text style={[
                    styles.discoveredDeviceName,
                    { color: isDark ? '#ffffff' : '#111827' }
                  ]}>
                    {device.name}
                  </Text>
                  <Text style={[
                    styles.discoveredDeviceIP,
                    { color: isDark ? '#9ca3af' : '#6b7280' }
                  ]}>
                    {device.addresses?.[0] || device.host}
                    {device.port && device.port !== 80 ? `:${device.port}` : ''} 
                    {device.wledInfo?.version && ` • v${device.wledInfo.version}`}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => connectToDiscoveredDevice(device)}
                  disabled={device.alreadyAdded}
                  style={[
                    styles.connectButton,
                    {
                      backgroundColor: device.alreadyAdded ? '#10b981' : '#3b82f6'
                    }
                  ]}
                >
                  <Ionicons 
                    name={device.alreadyAdded ? "checkmark" : "add"} 
                    size={16} 
                    color="white" 
                  />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add All Devices Button */}
            {discoveredDevices.filter(d => !d.alreadyAdded).length > 0 && (
              <View style={[
                styles.addAllButtonContainer,
                { borderTopColor: isDark ? '#374151' : '#e5e7eb' }
              ]}>
                <TouchableOpacity
                  onPress={addAllDiscoveredDevices}
                  style={[
                    styles.addAllButton,
                    { backgroundColor: '#059669' }
                  ]}
                >
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text style={styles.addAllButtonText}>
                    {discoveredDevices.filter(d => !d.alreadyAdded).length === 1 
                      ? `Add Device (${discoveredDevices.filter(d => !d.alreadyAdded).length})`
                      : `Add All Devices (${discoveredDevices.filter(d => !d.alreadyAdded).length})`
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {!isScanning && discoveredDevices.length === 0 && (
              <View style={styles.noDevicesContainer}>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    marginBottom: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
  },
  dangerSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  settingValue: {
    fontSize: 14,
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
    color: '#ef4444',
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    gap: 8,
  },
  activeTabButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  deviceVersion: {
    fontSize: 12,
  },
  removeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalPlaceholder: {
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
  addButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
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
  discoveredDeviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 6,
  },
  discoveredDeviceInfo: {
    flex: 1,
  },
  discoveredDeviceName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 0,
  },
  discoveredDeviceIP: {
    fontSize: 11,
  },
  connectButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  noDevicesContainer: {
    alignItems: 'center',
    padding: 48,
  },
  noDevicesText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  addAllButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
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
  },
  addAllButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});