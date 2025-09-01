import 'react-native-gesture-handler';
import './global.css';
import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SheetProvider } from 'react-native-actions-sheet';
import { BackHandler } from 'react-native';

// Components
import KoloriApp from './src/components/KoloriApp';
import WelcomePage from './src/components/WelcomePage';
import UserAgreement from './src/components/UserAgreement';
import LoadingScreen from './src/components/LoadingScreen';
import DeviceOnboardingScreen from './src/components/DeviceOnboardingScreen';
import SettingsScreen from './src/components/SettingsScreen';

// Utils
import { 
  loadDevices, 
  saveDevices, 
  loadSettings, 
  saveSettings
} from './src/utils/storage';
import { 
  hasValidAgreement, 
  saveAgreementSignature 
} from './src/utils/userAgreement';

// Types
import { Device, Settings } from './src/types';

// Background Scan
import { wledMdnsDiscovery, MdnsWledDevice } from './src/utils/wledMdnsDiscovery';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hasAgreed, setHasAgreed] = useState<boolean | null>(null);
  const [showAgreement, setShowAgreement] = useState(false);
  const [backgroundScanDevices, setBackgroundScanDevices] = useState<MdnsWledDevice[]>([]);

  // Background scanning effect
  useEffect(() => {
    console.log('Setting up background mDNS listeners...');
    
    wledMdnsDiscovery.setListeners({
      onDeviceFound: (device) => {
        console.log('BACKGROUND: WLED device found:', device.name);
        setBackgroundScanDevices(prev => {
          const exists = prev.some(d => d.name === device.name);
          if (exists) return prev;
          return [...prev, device];
        });
      },
      onDeviceRemoved: (device) => {
        console.log('BACKGROUND: WLED device removed:', device.name);
        setBackgroundScanDevices(prev => prev.filter(d => d.name !== device.name));
      },
      onError: (error) => {
        console.error('BACKGROUND: mDNS Discovery error:', error);
        // Optionally, you could show a toast or a non-intrusive notification here
      }
    });

    // Start background scanning
    wledMdnsDiscovery.startScan();

    // Cleanup on app close
    return () => {
      console.log('App closing, stopping background mDNS scan.');
      wledMdnsDiscovery.stopScan();
    };
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [loadedDevices, loadedSettings, agreementValid] = await Promise.all([
          loadDevices(),
          loadSettings(),
          hasValidAgreement(),
        ]);

        setDevices(loadedDevices);
        const defaultSettings: Settings = {
          theme: 'dark',
          scheduleMode: 'all-day',
          liveViewEnabled: false,
        };
        setSettings(loadedSettings && Object.keys(loadedSettings).length > 0 ? loadedSettings as Settings : defaultSettings);
        setHasAgreed(agreementValid);
        setShowAgreement(!agreementValid);
      } catch (error) {
        console.error("Failed to load initial data:", error);
        // Set default settings if loading fails
        setSettings({
          theme: 'dark',
          scheduleMode: 'all-day',
          liveViewEnabled: false,
        });
        setHasAgreed(false);
        setShowAgreement(true);
      } finally {
        // Use a timeout to simulate a longer loading time for better UX
        setTimeout(() => {
          setIsLoading(false);
        }, 1500);
      }
    };

    loadInitialData();
  }, []);

  const handleAddDevice = async (device: Device) => {
    const wasOnboarding = devices.length === 0;
    const newDevices = [...devices, device];
    setDevices(newDevices);
    await saveDevices(newDevices);
    if (wasOnboarding && navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'KoloriApp' }],
      });
    }
  };

  const handleUpdateDevice = async (updatedDevice: Device) => {
    const newDevices = devices.map(d => d.id === updatedDevice.id ? updatedDevice : d);
    setDevices(newDevices);
    await saveDevices(newDevices);
  };

  const handleDeleteDevice = async (deviceId: number) => {
    const newDevices = devices.filter(d => d.id !== deviceId);
    setDevices(newDevices);
    await saveDevices(newDevices);
  };

  const handleUpdateSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleAgreementAccept = async () => {
    await saveAgreementSignature();
    setHasAgreed(true);
    setShowAgreement(false);
  };

  const handleAgreementReject = () => {
    // User rejected the agreement - close the app
    BackHandler.exitApp();
  };

  const handleWelcomeAddDevice = () => {
    // For now, this will just trigger the agreement
    // In the future, this could navigate to a device setup screen
    console.log('Add device requested');
  };

  if (isLoading || hasAgreed === null) {
    return <LoadingScreen isDark={settings?.theme === 'dark'} />;
  }

  if (showAgreement) {
    return (
      <UserAgreement 
        isDark={settings?.theme === 'dark'} 
        onAccept={handleAgreementAccept}
        onReject={handleAgreementReject}
      />
    );
  }

  if (!hasAgreed) {
    return <WelcomePage onAgree={() => setShowAgreement(true)} onAddDevice={handleWelcomeAddDevice} isDark={settings?.theme === 'dark'} />;
  }

  const isDark = settings?.theme === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ActionSheetProvider>
        <SheetProvider>
          <SafeAreaProvider>
            <NavigationContainer ref={navigationRef}>
              <StatusBar style={isDark ? "light" : "dark"} />
              <Stack.Navigator 
                initialRouteName={devices.length === 0 ? 'DeviceOnboarding' : 'KoloriApp'}
                screenOptions={{ 
                  headerShown: false,
                  contentStyle: { backgroundColor: isDark ? '#121212' : '#FFFFFF' }
                }}
              >
                <Stack.Screen name="DeviceOnboarding">
                  {(props) => (
                    <DeviceOnboardingScreen
                      {...props}
                      isDark={isDark}
                      onDeviceAdded={handleAddDevice}
                      backgroundScanDevices={backgroundScanDevices}
                      existingDevices={devices}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="KoloriApp" component={KoloriApp} />
                <Stack.Screen name="Settings">
                  {(props) => (
                    <SettingsScreen
                      {...props}
                      settings={settings!}
                      onUpdateSettings={handleUpdateSettings}
                      isDark={isDark}
                    />
                  )}
                </Stack.Screen>
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </SheetProvider>
      </ActionSheetProvider>
    </GestureHandlerRootView>
  );
}

