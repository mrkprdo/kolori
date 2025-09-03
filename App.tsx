import 'react-native-gesture-handler';
import './global.css';
import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SheetProvider } from 'react-native-actions-sheet';
import { BackHandler, Animated } from 'react-native';

// Components
import KoloriApp from './src/components/KoloriApp';
import UserAgreement from './src/components/UserAgreement';
import LoadingScreen from './src/components/LoadingScreen';
import DeviceOnboardingScreen from './src/components/DeviceOnboardingScreen';
import ScanNetworkModal from './src/components/ScanNetworkModal';
import SettingsModal from './src/components/SettingsModal';
import AddDeviceManuallyModal from './src/components/AddDeviceManuallyModal';

// Utils
import { storage, STORAGE_KEYS, loadDevices, saveDevices, loadSettings, saveSettings } from './src/utils/storage';
import { hasValidAgreement, saveAgreementSignature } from './src/utils/userAgreement';

// Types
import { Device, Settings } from './src/types';
import { MdnsWledDevice } from './src/utils/wledMdnsDiscovery';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeDeviceId, setActiveDeviceId] = useState<number | null>(null);
  const [showScanNetworkModal, setShowScanNetworkModal] = useState(false);
  const [isDiscoveryInProgress, setIsDiscoveryInProgress] = useState(false);
  const [scanModalOpenedFrom, setScanModalOpenedFrom] = useState<'main' | 'settings'>('main');
  const [addModalOpenedFrom, setAddModalOpenedFrom] = useState<'main' | 'settings'>('main');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddManuallyModal, setShowAddManuallyModal] = useState(false);
  
  // Debug modal state changes
  const debugSetShowScanNetworkModal = (show: boolean) => {
    console.log('🔍 Modal state changing from', showScanNetworkModal, 'to', show);
    console.trace('Modal state change trace:');
    setShowScanNetworkModal(show);
  };

  // Smart scan modal handler
  const handleCloseScanModal = () => {
    setShowScanNetworkModal(false);
    // If opened from settings, reopen settings
    if (scanModalOpenedFrom === 'settings') {
      setShowSettings(true);
    }
  };

  const handleOpenScanModalFromSettings = () => {
    setShowSettings(false);
    setScanModalOpenedFrom('settings');
    setShowScanNetworkModal(true);
  };

  const handleOpenScanModalFromMain = () => {
    setScanModalOpenedFrom('main');
    setShowScanNetworkModal(true);
  };

  const handleCloseAddManuallyModal = () => {
    setShowAddManuallyModal(false);
    // If opened from settings, reopen settings
    if (addModalOpenedFrom === 'settings') {
      setShowSettings(true);
    }
  };
  const [hasAgreed, setHasAgreed] = useState<boolean | null>(null);
  const [backgroundScanDevices, setBackgroundScanDevices] = useState<MdnsWledDevice[]>([]);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [currentScreen, setCurrentScreen] = useState<'loading' | 'agreement' | 'main'>('loading');

  const transitionToScreen = (nextScreen: 'loading' | 'agreement' | 'main') => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => {
      setCurrentScreen(nextScreen);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
    });
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [loadedDevices, loadedSettings, agreementResult, loadedActiveId] = await Promise.all([
          loadDevices(),
          loadSettings(),
          hasValidAgreement(),
          storage.loadFromStorage(STORAGE_KEYS.ACTIVE_DEVICE, null),
        ]);

        setDevices(loadedDevices);
        setActiveDeviceId(loadedActiveId);
        setHasAgreed(agreementResult);

        if (loadedSettings && Object.keys(loadedSettings).length > 0) {
          setSettings(loadedSettings as Settings);
        } else {
          setSettings({ 
            theme: 'dark', 
            scheduleMode: 'all-day', 
            liveViewEnabled: false,
            autoScan: true,
            debugLogs: false,
            scanTimeout: 15,
            maxDevices: 10,
            backgroundScanEnabled: true
          });
        }

        if (!agreementResult) {
          transitionToScreen('agreement');
        } else {
          transitionToScreen('main');
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
        setHasAgreed(false);
        transitionToScreen('agreement');
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handleAddDevice = (device: Device) => {
    // Check current route OUTSIDE the setState callback to avoid stale closures
    const currentRoute = navigationRef.getCurrentRoute();
    const isOnOnboardingScreen = currentRoute?.name === 'DeviceOnboarding';
    const shouldNavigate = devices.length === 0 && isOnOnboardingScreen && !isDiscoveryInProgress;
    
    setDevices(prevDevices => {
      const newDevices = [...prevDevices, device];
      saveDevices(newDevices);
      return newDevices;
    });
    
    // Always set the newly added device as active device
    // This ensures WebSocket connection is established and device info is retrieved
    setActiveDeviceId(device.id);
    
    console.log('🔧 Device added and set as active:', device.name, 'ID:', device.id);
  };

  const handleUpdateDevice = (deviceId: number, updates: Partial<Device>) => {
    setDevices(prevDevices => {
      const newDevices = prevDevices.map(d => d.id === deviceId ? { ...d, ...updates } : d);
      saveDevices(newDevices);
      return newDevices;
    });
  };

  const handleDeleteDevice = (deviceId: number) => {
    setDevices(prevDevices => {
      const newDevices = prevDevices.filter(d => d.id !== deviceId);
      saveDevices(newDevices);
      // The navigation will automatically switch to DeviceOnboarding 
      // when devices.length === 0 due to the conditional rendering
      return newDevices;
    });
  };

  const handleSetActiveDeviceId = (id: number | null) => {
    console.log('🔄 Active device changing to ID:', id);
    setActiveDeviceId(id);
    storage.saveToStorage(STORAGE_KEYS.ACTIVE_DEVICE, id);
    // WebSocket connection will be managed globally by KoloriApp
  };

  const handleUpdateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleAgreementAccept = async () => {
    await saveAgreementSignature();
    setHasAgreed(true);
    transitionToScreen('main');
  };

  const renderContent = () => {
    if (isLoading || hasAgreed === null || settings === null || currentScreen === 'loading') {
      return <LoadingScreen isDark={settings?.theme !== 'light'} />;
    }

    if (currentScreen === 'agreement') {
      return <UserAgreement isDark={settings.theme !== 'light'} onAccept={handleAgreementAccept} onReject={() => BackHandler.exitApp()} />;
    }

    const isDark = settings.theme !== 'light';

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ActionSheetProvider>
          <SheetProvider>
            <SafeAreaProvider>
              <NavigationContainer ref={navigationRef}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: isDark ? '#121212' : '#FFFFFF' } }}>
                  {(devices.length === 0 && !isDiscoveryInProgress) ? (
                    <Stack.Screen name="DeviceOnboarding">
                      {(props) => (
                        <DeviceOnboardingScreen
                          {...props}
                          isDark={isDark}
                          onDeviceAdded={handleAddDevice}
                          backgroundScanDevices={backgroundScanDevices}
                          existingDevices={devices}
                          showScanNetworkModal={showScanNetworkModal}
                          setShowScanNetworkModal={debugSetShowScanNetworkModal}
                          setIsDiscoveryInProgress={setIsDiscoveryInProgress}
                        />
                      )}
                    </Stack.Screen>
                  ) : (
                    <Stack.Screen name="KoloriApp">
                      {(props) => (
                        <KoloriApp
                          {...props}
                          devices={devices}
                          activeDeviceId={activeDeviceId}
                          settings={settings}
                          onDeviceAdd={handleAddDevice}
                          onDeviceUpdate={handleUpdateDevice}
                          onDeviceDelete={handleDeleteDevice}
                          onSettingsUpdate={handleUpdateSettings}
                          onSetActiveDeviceId={handleSetActiveDeviceId}
                          showScanNetworkModal={showScanNetworkModal}
                          setShowScanNetworkModal={debugSetShowScanNetworkModal}
                          setIsDiscoveryInProgress={setIsDiscoveryInProgress}
                          onShowSettings={() => setShowSettings(true)}
                          onScanFromMain={handleOpenScanModalFromMain}
                        />
                      )}
                    </Stack.Screen>
                  )}
                </Stack.Navigator>
              </NavigationContainer>
            </SafeAreaProvider>
          </SheetProvider>
        </ActionSheetProvider>
      </GestureHandlerRootView>
    );
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      {renderContent()}
      
      {/* Global ScanNetworkModal - outside navigation to prevent unmounting */}
      <ScanNetworkModal
        isVisible={showScanNetworkModal}
        onClose={handleCloseScanModal}
        onDeviceAdded={handleAddDevice}
        isDark={settings?.theme !== 'light'}
        existingDevices={devices}
        backgroundScanDevices={backgroundScanDevices}
        setIsDiscoveryInProgress={setIsDiscoveryInProgress}
      />
      
      {/* Global SettingsModal */}
      {settings && (
        <SettingsModal
          isVisible={showSettings}
          onClose={() => setShowSettings(false)}
          isDark={settings.theme !== 'light'}
          theme={settings.theme}
          onThemeChange={(theme) => handleUpdateSettings({ ...settings, theme })}
          scheduleMode={settings.scheduleMode}
          onScheduleModeChange={(mode) => handleUpdateSettings({ ...settings, scheduleMode: mode })}
          devices={devices}
          onDeviceRemove={handleDeleteDevice}
          onAddDevice={() => { setShowSettings(false); setAddModalOpenedFrom('settings'); setShowAddManuallyModal(true); }}
          onScanForDevices={handleOpenScanModalFromSettings}
          settings={settings}
        />
      )}

      {/* Global AddDeviceManuallyModal */}
      <AddDeviceManuallyModal
        isVisible={showAddManuallyModal}
        onClose={handleCloseAddManuallyModal}
        onDeviceAdded={handleAddDevice}
        isDark={settings?.theme !== 'light'}
        existingDevices={devices}
      />
    </Animated.View>
  );
}