import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-audio';
import {
  createMelFilterbank,
  applyMelFilterbank,
  smoothMelSpectrum,
  extractAudioFeatures,
  AudioFeatures,
} from '../utils/audioProcessing';
import { applyHannWindow, fft as performFFT } from '../utils/fft';
import { logger } from '../utils/logger';

export interface AudioReactiveConfig {
  numMelBands: number;
  fftSize: number;
  sampleRate: number;
  minFreq: number;
  maxFreq: number;
  smoothingFactor: number;
  sensitivity: number;
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
 * Hook for audio reactive LED control using Expo Audio API
 *
 * This is a fallback implementation that uses expo-audio instead of
 * react-native-live-audio-fft for better Expo compatibility
 */
export function useAudioReactiveExpo(
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
  const recordingRef = useRef<Audio.Recording | null>(null);
  const peakHoldRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize mel filterbank
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

  // Simulate audio processing with fake data for now
  // TODO: Replace with actual expo-audio metering when available
  const simulateAudioProcessing = useCallback(() => {
    // Generate simulated audio data (sine waves)
    const time = Date.now() / 1000;
    const fftSize = config.fftSize;

    // Create simulated PCM samples (mix of frequencies)
    const samples = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      const t = i / config.sampleRate;
      // Mix multiple frequencies to simulate music
      samples[i] =
        Math.sin(2 * Math.PI * 100 * t) * 0.3 +  // Bass
        Math.sin(2 * Math.PI * 500 * t) * 0.2 +  // Mid
        Math.sin(2 * Math.PI * 2000 * t) * 0.1 + // Treble
        (Math.random() - 0.5) * 0.05; // Noise
    }

    // Apply window function
    const windowedSamples = applyHannWindow(Array.from(samples));

    // Perform FFT
    const fftMagnitudes = performFFT(windowedSamples);

    // Apply mel filterbank
    let melSpec = applyMelFilterbank(fftMagnitudes, melFilterbankRef.current);

    // Smooth the spectrum
    melSpec = smoothMelSpectrum(
      melSpec,
      previousMelSpectrumRef.current,
      config.smoothingFactor
    );

    // Normalize
    const maxVal = Math.max(...melSpec, 0.001);
    if (maxVal > peakHoldRef.current) {
      peakHoldRef.current = maxVal;
    } else {
      peakHoldRef.current *= 0.95;
    }

    const normPeak = Math.max(peakHoldRef.current, 0.05);
    const normalizedMelSpec = melSpec.map(val =>
      Math.min(1, (val / normPeak) * config.sensitivity)
    );

    // Extract features
    const features = extractAudioFeatures(normalizedMelSpec);

    // Update state
    setAudioFeatures(features);
    setMelSpectrum(normalizedMelSpec);
    previousMelSpectrumRef.current = normalizedMelSpec;

    // Continue animation loop
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(simulateAudioProcessing);
    }
  }, [config.smoothingFactor, config.sensitivity, config.fftSize, config.sampleRate, isRecording]);

  // Start audio capture
  const startAudioCapture = useCallback(async (): Promise<boolean> => {
    try {
      logger.log('🎤 Requesting audio permissions (Expo Audio)...');

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();

      if (status !== 'granted') {
        logger.warn('🎤 Microphone permission denied');
        setError('Microphone permission denied');
        return false;
      }

      logger.log('✅ Microphone permission granted');

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create recording
      const recording = new Audio.Recording();

      try {
        await recording.prepareToRecordAsync({
          isMeteringEnabled: true,
          android: {
            extension: '.m4a',
            outputFormat: 2, // MPEG_4
            audioEncoder: 3, // AAC
            sampleRate: config.sampleRate,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            outputFormat: 'kAudioFormatMPEG4AAC',
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: config.sampleRate,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        });

        await recording.startAsync();
        recordingRef.current = recording;

        logger.log('✅ Recording started');

        // Reset state
        previousMelSpectrumRef.current = [];
        peakHoldRef.current = 0;
        setAudioFeatures(null);
        setMelSpectrum([]);
        setIsRecording(true);
        setError(null);

        // Start simulated audio processing
        // Note: expo-audio doesn't provide real-time PCM data
        // This is a simulation until we can get actual audio data
        animationFrameRef.current = requestAnimationFrame(simulateAudioProcessing);

        logger.log('🎵 Audio capture ready (simulation mode)');
        logger.warn('⚠️ Using simulated audio data. Real-time audio processing requires native module.');

        return true;
      } catch (err) {
        logger.error('Failed to start recording:', err);
        throw err;
      }
    } catch (err) {
      logger.error('🎵 Error starting audio capture:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start audio capture';
      setError(errorMessage);
      setIsRecording(false);
      return false;
    }
  }, [config.sampleRate, simulateAudioProcessing]);

  // Stop audio capture
  const stopAudioCapture = useCallback(async () => {
    try {
      // Cancel animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Stop recording
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
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
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
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
