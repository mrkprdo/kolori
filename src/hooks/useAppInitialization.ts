import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { hasValidAgreement, saveAgreementSignature } from '../utils/userAgreement';
import { TIMING } from '../constants/defaults';

type AppScreen = 'loading' | 'agreement' | 'main';

export interface UseAppInitializationReturn {
  isLoading: boolean;
  hasAgreed: boolean | null;
  currentScreen: AppScreen;
  fadeAnim: Animated.Value;
  handleAgreementAccept: () => Promise<void>;
  initialize: (initCallback: () => Promise<{ hasAgreed: boolean }>) => Promise<void>;
}

/**
 * Custom hook to manage app initialization, screen transitions, and user agreement
 */
export function useAppInitialization(): UseAppInitializationReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAgreed, setHasAgreed] = useState<boolean | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('loading');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  /**
   * Transition between screens with fade animation
   */
  const transitionToScreen = useCallback((nextScreen: AppScreen) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: TIMING.SCREEN_TRANSITION_FADE_OUT,
      useNativeDriver: false,
    }).start(() => {
      setCurrentScreen(nextScreen);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: TIMING.SCREEN_TRANSITION_FADE_IN,
        useNativeDriver: false,
      }).start();
    });
  }, [fadeAnim]);

  /**
   * Handle user agreement acceptance
   */
  const handleAgreementAccept = useCallback(async () => {
    await saveAgreementSignature();
    setHasAgreed(true);
    transitionToScreen('main');
  }, [transitionToScreen]);

  /**
   * Initialize the app with custom initialization logic
   * @param initCallback - Async function that performs app initialization
   */
  const initialize = useCallback(async (
    initCallback: () => Promise<{ hasAgreed: boolean }>
  ) => {
    const startTime = Date.now();

    try {
      // Run initialization logic
      const result = await initCallback();

      // Check user agreement status
      const agreementResult = await hasValidAgreement();
      setHasAgreed(agreementResult);

      // Transition to appropriate screen
      if (!agreementResult) {
        transitionToScreen('agreement');
      } else {
        transitionToScreen('main');
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setHasAgreed(false);
      transitionToScreen('agreement');
    } finally {
      // Ensure loading screen shows for minimum duration
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, TIMING.MIN_LOADING_SCREEN_DURATION - elapsedTime);

      setTimeout(() => {
        setIsLoading(false);
      }, remainingTime);
    }
  }, [transitionToScreen]);

  return {
    isLoading,
    hasAgreed,
    currentScreen,
    fadeAnim,
    handleAgreementAccept,
    initialize,
  };
}
