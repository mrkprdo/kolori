import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import LiveAudioStream from 'react-native-live-audio-fft';
import {
  createMelFilterbank,
  applyMelFilterbank,
  smoothMelSpectrum,
  normalizeMelSpectrum,
  extractAudioFeatures,
  AudioFeatures,
} from '../utils/audioProcessing';
import { decodePCM, applyHannWindow, fft as performFFT } from '../utils/fft';
import { logger } from '../utils/logger';

export interface AudioReactiveConfig {
  numMelBands: number;       // Number of mel frequency bands (e.g., 16, 32)
  fftSize: number;           // FFT size (must be power of 2)
  sampleRate: number;        // Audio sample rate in Hz
  minFreq: number;           // Minimum frequency to analyze (Hz)
  maxFreq: number;           // Maximum frequency to analyze (Hz)
  smoothingFactor: number;   // Spectrum smoothing (0-1)
  sensitivity: number;       // Audio reactivity sensitivity (0.1-2.0)
}

export interface UseAudioReactiveReturn {
  isRecording: boolean;
  audioFeatures: AudioFeatures | null;
  melSpectrum: number[];
  startAudioCapture: () => Promise<boolean>;
  stopAudioCapture: () => void;
  config: AudioReactiveConfig;
  updateConfig: (newConfig: Partial<AudioReactiveConfig>) => void;
  error: string | null;
}

const DEFAULT_CONFIG: AudioReactiveConfig = {
  numMelBands: 32,
  fftSize: 2048,
  sampleRate: 44100,
  minFreq: 20,
  maxFreq: 20000,
  smoothingFactor: 0.3,
  sensitivity: 1.5,
};

/**
 * Hook for audio reactive LED control using FFT and mel filterbank
 *
 * Based on LedFx's audio processing algorithm
 */
export function useAudioReactive(
  initialConfig: Partial<AudioReactiveConfig> = {}
): UseAudioReactiveReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [melSpectrum, setMelSpectrum] = useState<number[]>([]);
  const [config, setConfig] = useState<AudioReactiveConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  const [error, setError] = useState<string | null>(null);

  const melFilterbankRef = useRef<number[][]>([]);
  const previousMelSpectrumRef = useRef<number[]>([]);
  const audioStreamRef = useRef<any>(null);
  const audioLevelRef = useRef<number>(0.5); // For AGC (Automatic Gain Control)
  const peakHoldRef = useRef<number>(0); // For peak detection

  // Initialize mel filterbank when config changes
  useEffect(() => {
    melFilterbankRef.current = createMelFilterbank(
      config.numMelBands,
      config.fftSize,
      config.sampleRate,
      config.minFreq,
      config.maxFreq
    );
    logger.log(`🎵 Mel filterbank created: ${config.numMelBands} bands`);
  }, [config.numMelBands, config.fftSize, config.sampleRate, config.minFreq, config.maxFreq]);

  // Request audio permissions
  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Kolori needs access to your microphone for audio reactive effects',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          logger.log('🎤 Microphone permission granted');
          return true;
        } else {
          logger.warn('🎤 Microphone permission denied');
          setError('Microphone permission denied');
          return false;
        }
      } catch (err) {
        logger.error('🎤 Error requesting microphone permission:', err);
        setError('Failed to request microphone permission');
        return false;
      }
    }
    // iOS permissions handled by expo-audio
    return true;
  };

  // Process PCM data from audio stream
  const processAudioData = useCallback((pcmDataBase64: string) => {
    try {
      if (!pcmDataBase64 || typeof pcmDataBase64 !== 'string') {
        return;
      }

      // Decode base64 PCM data
      const pcmSamples = decodePCM(pcmDataBase64);

      if (!pcmSamples || pcmSamples.length === 0) {
        return;
      }

      // Take a chunk of samples for FFT (must be power of 2)
      const fftSize = config.fftSize;
      let chunk = pcmSamples.slice(0, fftSize);

      // Pad with zeros if needed
      if (chunk.length < fftSize) {
        chunk = [...chunk, ...new Array(fftSize - chunk.length).fill(0)];
      }

      // Apply window function to reduce spectral leakage
      const windowedChunk = applyHannWindow(chunk);

      // Perform FFT
      const fftMagnitudes = performFFT(windowedChunk);

      // Apply mel filterbank to get mel spectrum
      let melSpec = applyMelFilterbank(fftMagnitudes, melFilterbankRef.current);

      // Smooth the mel spectrum
      melSpec = smoothMelSpectrum(
        melSpec,
        previousMelSpectrumRef.current,
        config.smoothingFactor
      );

      // Simple normalization: find max and normalize to that
      const maxVal = Math.max(...melSpec, 0.001); // Prevent division by zero

      // Update peak with decay
      if (maxVal > peakHoldRef.current) {
        peakHoldRef.current = maxVal;
      } else {
        peakHoldRef.current *= 0.9; // Slower decay for stability
      }

      // Keep peak above a minimum to prevent over-amplification
      const normPeak = Math.max(peakHoldRef.current, 0.05);

      // Normalize and apply sensitivity
      const normalizedMelSpec = melSpec.map(val => {
        const normalized = val / normPeak;
        // Apply sensitivity
        return Math.min(1, normalized * config.sensitivity);
      });

      // Extract audio features
      const features = extractAudioFeatures(normalizedMelSpec);

      // Update state
      setAudioFeatures(features);
      setMelSpectrum(normalizedMelSpec);
      previousMelSpectrumRef.current = normalizedMelSpec;
    } catch (err) {
      logger.error('🎵 Error processing audio data:', err);
    }
  }, [config.smoothingFactor, config.sensitivity, config.fftSize]);

  // Start audio capture
  const startAudioCapture = useCallback(async (): Promise<boolean> => {
    try {
      logger.log('🎤 Requesting audio permissions...');
      const permissionStart = Date.now();

      // Request permissions
      const hasPermission = await requestPermissions();

      logger.log(`✅ Permission check took ${Date.now() - permissionStart}ms`);

      if (!hasPermission) {
        return false;
      }

      // Reset all processing state when starting new session
      previousMelSpectrumRef.current = [];
      peakHoldRef.current = 0;
      audioLevelRef.current = 0.5;

      // Clear any stale audio data from previous session
      setAudioFeatures(null);
      setMelSpectrum([]);

      logger.log('🔄 Initializing audio stream...');
      const initStart = Date.now();

      // Initialize audio stream
      LiveAudioStream.init({
        sampleRate: config.sampleRate,
        bufferSize: config.fftSize,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 1, // MIC (1) for music - better frequency response than VOICE_RECOGNITION (6)
        wavFile: '', // No file recording
      });

      logger.log(`✅ Audio init took ${Date.now() - initStart}ms`);

      // Listen for PCM data before starting
      LiveAudioStream.on('data', processAudioData);

      // Start audio stream
      logger.log('🎵 Starting audio stream...');
      const startTime = Date.now();

      LiveAudioStream.start();
      audioStreamRef.current = true; // Mark as initialized

      logger.log(`✅ Audio stream started in ${Date.now() - startTime}ms`);

      setIsRecording(true);
      setError(null);
      logger.log('🎵 Audio capture ready');
      return true;
    } catch (err) {
      logger.error('🎵 Error starting audio capture:', err);
      setError('Failed to start audio capture');
      setIsRecording(false);
      return false;
    }
  }, [config.sampleRate, config.fftSize, processAudioData]);

  // Stop audio capture
  const stopAudioCapture = useCallback(() => {
    try {
      if (audioStreamRef.current) {
        LiveAudioStream.stop();
        audioStreamRef.current = null;
      }

      setIsRecording(false);
      setAudioFeatures(null);
      setMelSpectrum([]);
      previousMelSpectrumRef.current = [];
      logger.log('🎵 Audio capture stopped');
    } catch (err) {
      logger.error('🎵 Error stopping audio capture:', err);
    }
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<AudioReactiveConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    logger.log('🎵 Audio config updated:', newConfig);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioCapture();
    };
  }, [stopAudioCapture]);

  return {
    isRecording,
    audioFeatures,
    melSpectrum,
    startAudioCapture,
    stopAudioCapture,
    config,
    updateConfig,
    error,
  };
}
