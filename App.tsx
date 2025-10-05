import 'react-native-gesture-handler';
import './global.css';
import React, { useState, useEffect } from 'react';
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

// Hooks
import { useDeviceManagement } from './src/hooks/useDeviceManagement';
import { useSettingsManagement } from './src/hooks/useSettingsManagement';
import { useModalManager } from './src/hooks/useModalManager';
import { useAppInitialization } from './src/hooks/useAppInitialization';

// Types
import { MdnsWledDevice } from './src/utils/wledMdnsDiscovery';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

export default function App() {
  // Custom Hooks
  const deviceManager = useDeviceManagement();
  const settingsManager = useSettingsManagement();
  const modalManager = useModalManager();
  const appInit = useAppInitialization();

  // Local State
  const [isDiscoveryInProgress, setIsDiscoveryInProgress] = useState(false);
  const [backgroundScanDevices, setBackgroundScanDevices] = useState<MdnsWledDevice[]>([]);

  // Initialize app on mount
  useEffect(() => {
    appInit.initialize(async () => {
      // Load devices and settings
      const { devices, activeDeviceId } = await deviceManager.loadInitialDevices();

      // Find active device
      const activeDevice = activeDeviceId
        ? devices.find(d => d.id === activeDeviceId) || null
        : null;

      // Load settings with device-specific presets
      await settingsManager.loadInitialSettings(activeDevice);

      return { hasAgreed: true }; // Will be checked by appInit
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper to get current theme isDark value
  const getIsDark = (theme: string | undefined) => {
    if (!theme) return settingsManager.isDark;
    if (theme === 'system') {
      return settingsManager.isDark;
    }
    return theme === 'dark';
  };

  const renderContent = () => {
    if (appInit.isLoading || appInit.hasAgreed === null || settingsManager.settings === null || appInit.currentScreen === 'loading') {
      return (
        <LoadingScreen
          isDark={getIsDark(settingsManager.settings?.theme)}
          activeDevice={deviceManager.activeDevice || undefined}
        />
      );
    }

    if (appInit.currentScreen === 'agreement') {
      return (
        <UserAgreement
          isDark={getIsDark(settingsManager.settings.theme)}
          onAccept={appInit.handleAgreementAccept}
          onReject={() => BackHandler.exitApp()}
        />
      );
    }

    const isDark = getIsDark(settingsManager.settings.theme);

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ActionSheetProvider>
          <SheetProvider>
            <SafeAreaProvider>
              <NavigationContainer ref={navigationRef}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <Stack.Navigator
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: isDark ? '#121212' : '#FFFFFF' }
                  }}
                >
                  {(deviceManager.devices.length === 0 && !isDiscoveryInProgress) ? (
                    <Stack.Screen name="DeviceOnboarding">
                      {(props) => (
                        <DeviceOnboardingScreen
                          {...props}
                          isDark={isDark}
                          onDeviceAdded={(device) =>
                            deviceManager.handleAddDevice(
                              device,
                              settingsManager.settings,
                              settingsManager.handleUpdateSettings
                            )
                          }
                          backgroundScanDevices={backgroundScanDevices}
                          existingDevices={deviceManager.devices}
                          showScanNetworkModal={modalManager.showScanNetworkModal}
                          setShowScanNetworkModal={(show) => {
                            if (show) modalManager.openScanModalFromMain();
                          }}
                          setIsDiscoveryInProgress={setIsDiscoveryInProgress}
                        />
                      )}
                    </Stack.Screen>
                  ) : (
                    <Stack.Screen name="KoloriApp">
                      {(props) => (
                        <KoloriApp
                          {...props}
                          devices={deviceManager.devices}
                          activeDeviceId={deviceManager.activeDeviceId}
                          settings={settingsManager.settings!}
                          onDeviceAdd={(device) =>
                            deviceManager.handleAddDevice(
                              device,
                              settingsManager.settings,
                              settingsManager.handleUpdateSettings
                            )
                          }
                          onDeviceUpdate={deviceManager.handleUpdateDevice}
                          onDeviceDelete={(deviceId) =>
                            deviceManager.handleDeleteDevice(
                              deviceId,
                              settingsManager.settings,
                              settingsManager.handleUpdateSettings
                            )
                          }
                          onSettingsUpdate={settingsManager.handleUpdateSettings}
                          onSetActiveDeviceId={(id) =>
                            deviceManager.handleSetActiveDeviceId(
                              id,
                              settingsManager.settings,
                              settingsManager.handleUpdateSettings
                            )
                          }
                          showScanNetworkModal={modalManager.showScanNetworkModal}
                          setShowScanNetworkModal={(show) => {
                            if (show) modalManager.openScanModalFromMain();
                          }}
                          setIsDiscoveryInProgress={setIsDiscoveryInProgress}
                          onShowSettings={modalManager.openSettings}
                          onScanFromMain={modalManager.openScanModalFromMain}
                          onShowAddManually={modalManager.openAddManuallyModalFromMain}
                          isAnyModalOpen={modalManager.isAnyModalOpen}
                          isCustomEffectsModalOpen={modalManager.isCustomEffectsModalOpen}
                          updateChildModalState={modalManager.updateChildModalState}
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
    <Animated.View style={{ flex: 1, opacity: appInit.fadeAnim }}>
      {renderContent()}

      {/* Global ScanNetworkModal - outside navigation to prevent unmounting */}
      <ScanNetworkModal
        isVisible={modalManager.showScanNetworkModal}
        onClose={modalManager.closeScanModal}
        onDeviceAdded={(device) =>
          deviceManager.handleAddDevice(
            device,
            settingsManager.settings,
            settingsManager.handleUpdateSettings
          )
        }
        isDark={getIsDark(settingsManager.settings?.theme)}
        existingDevices={deviceManager.devices}
        backgroundScanDevices={backgroundScanDevices}
        setIsDiscoveryInProgress={setIsDiscoveryInProgress}
        onManualEntry={modalManager.openAddManuallyModalFromMain}
      />

      {/* Global SettingsModal */}
      {settingsManager.settings && (
        <SettingsModal
          isVisible={modalManager.showSettings}
          onClose={modalManager.closeSettings}
          isDark={getIsDark(settingsManager.settings.theme)}
          theme={settingsManager.settings.theme}
          onThemeChange={(theme) =>
            settingsManager.handleUpdateSettings({ ...settingsManager.settings!, theme })
          }
          scheduleMode={settingsManager.settings.scheduleMode}
          onScheduleModeChange={(mode) =>
            settingsManager.handleUpdateSettings({ ...settingsManager.settings!, scheduleMode: mode })
          }
          settings={settingsManager.settings}
          onSettingsUpdate={settingsManager.handleUpdateSettings}
          activeDevice={deviceManager.activeDevice}
          updateChildModalState={modalManager.updateChildModalState}
        />
      )}

      {/* Global AddDeviceManuallyModal */}
      <AddDeviceManuallyModal
        isVisible={modalManager.showAddManuallyModal}
        onClose={modalManager.closeAddManuallyModal}
        onDeviceAdded={(device) =>
          deviceManager.handleAddDevice(
            device,
            settingsManager.settings,
            settingsManager.handleUpdateSettings
          )
        }
        isDark={getIsDark(settingsManager.settings?.theme)}
        existingDevices={deviceManager.devices}
      />
    </Animated.View>
  );
}