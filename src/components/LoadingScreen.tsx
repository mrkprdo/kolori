import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getWledPresets } from '../config/wledApi';
import { logger } from '../utils/logger';
import { Device as WledDevice } from '../types';
import { APP_VERSION, APP_NAME } from '../constants/version';

interface LoadingScreenProps {
  isDark?: boolean;
  onLoadingComplete?: () => void;
  activeDevice?: WledDevice;
}


export default function LoadingScreen({
  isDark = false,
  onLoadingComplete,
  activeDevice,
}: LoadingScreenProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulsing animation for logo
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Spinning animation for loading indicator
    const spinAnimation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    spinAnimation.start();

    return () => {
      pulseAnimation.stop();
      spinAnimation.stop();
    };
  }, []);

  // Fetch device data during loading
  useEffect(() => {
    let isMounted = true;

    const initializeDevice = async () => {
      if (!activeDevice?.isConnected) {
        logger.log('⏳ LoadingScreen: No active device or not connected, skipping data fetch');
        if (onLoadingComplete && isMounted) {
          setTimeout(onLoadingComplete, 1500); // Brief delay for visual effect
        }
        return;
      }

      const deviceAddress = activeDevice.bestAddress || activeDevice.ip;
      if (!deviceAddress) {
        logger.warn('⏳ LoadingScreen: No device address available');
        if (onLoadingComplete && isMounted) {
          setTimeout(onLoadingComplete, 1500);
        }
        return;
      }

      try {
        logger.log('⏳ LoadingScreen: Fetching device data for:', activeDevice.name);
        
        // Fetch presets in the background during loading
        const result = await getWledPresets(
          deviceAddress,
          activeDevice.protocol || "http"
        );

        if (result.success && isMounted) {
          logger.log('⏳ LoadingScreen: Successfully fetched device data:', 
            `${result.presets?.length || 0} presets, ${result.playlists?.length || 0} playlists`);
        } else {
          logger.warn('⏳ LoadingScreen: Failed to fetch device data:', result.message);
        }

      } catch (error) {
        logger.error('⏳ LoadingScreen: Error fetching device data:', error);
      } finally {
        // Complete loading after a minimum delay for smooth UX
        if (isMounted && onLoadingComplete) {
          setTimeout(onLoadingComplete, 2000);
        }
      }
    };

    initializeDevice();

    return () => {
      isMounted = false;
    };
  }, [activeDevice?.id, activeDevice?.isConnected, onLoadingComplete]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const backgroundColor = isDark ? '#111827' : '#f9fafb';
  const textColor = isDark ? '#ffffff' : '#111827';
  const subtextColor = isDark ? '#9ca3af' : '#6b7280';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View 
            style={[
              styles.logoContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <View style={[styles.logoBackground, { backgroundColor: isDark ? '#1f2937' : '#ffffff' }]}>
              <Text style={styles.logo}>
                <Text style={styles.logoBlue}>Ko</Text>
                <Text style={styles.logoPurple}>lori</Text>
              </Text>
            </View>
          </Animated.View>

          {/* Loading Spinner */}
          <Animated.View 
            style={[
              styles.spinner,
              { transform: [{ rotate: spin }] }
            ]}
          >
            <Ionicons 
              name="refresh" 
              size={32} 
              color={isDark ? '#60a5fa' : '#3b82f6'} 
            />
          </Animated.View>


          {/* Loading Details */}
          <View style={styles.detailsContainer}>
            <Text style={[styles.detailText, { color: subtextColor }]}>
              Initializing WLED controller
            </Text>
            <Text style={[styles.detailText, { color: subtextColor }]}>
              Setting up device communication
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: subtextColor }]}>
            {APP_NAME} v{APP_VERSION}
          </Text>
          <Text style={[styles.footerText, { color: subtextColor }]}>
            Open Source WLED Controller
          </Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  logoBlue: {
    color: '#2563eb',
  },
  logoPurple: {
    color: '#7c3aed',
  },
  spinner: {
    marginBottom: 24,
  },
  detailsContainer: {
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 2,
  },
});