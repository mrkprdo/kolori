import {
  hzToMel,
  melToHz,
  createMelFilterbank,
  applyMelFilterbank,
  smoothMelSpectrum,
  normalizeMelSpectrum,
  extractAudioFeatures,
  audioToBrightness,
  audioToColor,
  AudioFeatures,
} from '../audioProcessing';

describe('audioProcessing', () => {
  describe('hzToMel', () => {
    it('should convert 0 Hz to 0 Mel', () => {
      expect(hzToMel(0)).toBeCloseTo(0, 1);
    });

    it('should convert 1000 Hz to approximately 1000 Mel', () => {
      expect(hzToMel(1000)).toBeCloseTo(1000, 0);
    });

    it('should be monotonically increasing', () => {
      expect(hzToMel(100)).toBeLessThan(hzToMel(200));
      expect(hzToMel(200)).toBeLessThan(hzToMel(500));
      expect(hzToMel(500)).toBeLessThan(hzToMel(1000));
    });
  });

  describe('melToHz', () => {
    it('should convert 0 Mel to 0 Hz', () => {
      expect(melToHz(0)).toBeCloseTo(0, 1);
    });

    it('should be inverse of hzToMel', () => {
      const frequencies = [100, 500, 1000, 5000, 10000];
      frequencies.forEach((hz) => {
        const mel = hzToMel(hz);
        const backToHz = melToHz(mel);
        expect(backToHz).toBeCloseTo(hz, 0);
      });
    });
  });

  describe('createMelFilterbank', () => {
    it('should create filterbank with correct dimensions', () => {
      const numBands = 16;
      const fftSize = 512;
      const sampleRate = 44100;

      const filterbank = createMelFilterbank(numBands, fftSize, sampleRate);

      expect(filterbank).toHaveLength(numBands);
      expect(filterbank[0]).toHaveLength(Math.floor(fftSize / 2) + 1);
    });

    it('should create triangular filters', () => {
      const filterbank = createMelFilterbank(16, 512, 44100);

      // Each filter should have a peak and slopes
      filterbank.forEach((filter) => {
        const nonZeroValues = filter.filter((v) => v > 0);
        expect(nonZeroValues.length).toBeGreaterThan(0);

        // Find peak value
        const maxValue = Math.max(...filter);
        expect(maxValue).toBeCloseTo(1, 5);
      });
    });

    it('should respect frequency bounds', () => {
      const filterbank = createMelFilterbank(
        16,
        512,
        44100,
        100, // minFreq
        8000 // maxFreq
      );
      expect(filterbank).toHaveLength(16);
    });
  });

  describe('applyMelFilterbank', () => {
    it('should return mel spectrum with correct length', () => {
      const numBands = 16;
      const filterbank = createMelFilterbank(numBands, 512, 44100);
      const fftMagnitudes = new Array(257).fill(1);

      const melSpectrum = applyMelFilterbank(fftMagnitudes, filterbank);

      expect(melSpectrum).toHaveLength(numBands);
    });

    it('should calculate energy correctly', () => {
      const numBands = 4;
      const filterbank = createMelFilterbank(numBands, 128, 44100);
      const fftMagnitudes = new Array(65).fill(1);

      const melSpectrum = applyMelFilterbank(fftMagnitudes, filterbank);

      // All values should be non-negative
      melSpectrum.forEach((energy) => {
        expect(energy).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return zeros for zero input', () => {
      const numBands = 16;
      const filterbank = createMelFilterbank(numBands, 512, 44100);
      const fftMagnitudes = new Array(257).fill(0);

      const melSpectrum = applyMelFilterbank(fftMagnitudes, filterbank);

      melSpectrum.forEach((energy) => {
        expect(energy).toBe(0);
      });
    });
  });

  describe('smoothMelSpectrum', () => {
    it('should return current spectrum if previous is empty', () => {
      const current = [1, 2, 3, 4];
      const previous: number[] = [];

      const smoothed = smoothMelSpectrum(current, previous, 0.5);

      expect(smoothed).toEqual(current);
    });

    it('should blend current and previous spectra', () => {
      const current = [1, 1, 1, 1];
      const previous = [0, 0, 0, 0];
      const smoothingFactor = 0.5;

      const smoothed = smoothMelSpectrum(current, previous, smoothingFactor);

      // Should be halfway between current and previous
      smoothed.forEach((value) => {
        expect(value).toBeCloseTo(0.5, 5);
      });
    });

    it('should approach current with low smoothing factor', () => {
      const current = [1, 1, 1, 1];
      const previous = [0, 0, 0, 0];
      const smoothingFactor = 0.1;

      const smoothed = smoothMelSpectrum(current, previous, smoothingFactor);

      // Should be close to current
      smoothed.forEach((value) => {
        expect(value).toBeCloseTo(0.9, 5);
      });
    });
  });

  describe('normalizeMelSpectrum', () => {
    it('should normalize to 0-1 range', () => {
      const spectrum = [100, 200, 300, 400];

      const normalized = normalizeMelSpectrum(spectrum);

      normalized.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should handle zero energy', () => {
      const spectrum = [0, 0, 0, 0];

      const normalized = normalizeMelSpectrum(spectrum);

      normalized.forEach((value) => {
        expect(value).toBe(0);
      });
    });

    it('should respect dB bounds', () => {
      const spectrum = [1000, 2000, 3000];
      const minDb = -60;
      const maxDb = 0;

      const normalized = normalizeMelSpectrum(spectrum, minDb, maxDb);

      normalized.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('extractAudioFeatures', () => {
    it('should extract all required features', () => {
      const melSpectrum = new Array(16).fill(0.5);

      const features = extractAudioFeatures(melSpectrum);

      expect(features).toHaveProperty('bass');
      expect(features).toHaveProperty('mid');
      expect(features).toHaveProperty('treble');
      expect(features).toHaveProperty('volume');
      expect(features).toHaveProperty('beat');
      expect(features).toHaveProperty('energy');
      expect(features).toHaveProperty('spectrum');
    });

    it('should calculate bass from low frequencies', () => {
      const melSpectrum = new Array(16).fill(0);
      // Set first 20% to high values (bass region)
      for (let i = 0; i < 3; i++) {
        melSpectrum[i] = 1.0;
      }

      const features = extractAudioFeatures(melSpectrum);

      expect(features.bass).toBeGreaterThan(features.mid);
      expect(features.bass).toBeGreaterThan(features.treble);
    });

    it('should calculate mid from middle frequencies', () => {
      const melSpectrum = new Array(16).fill(0);
      // Set middle 50% to high values (mid region)
      for (let i = 3; i < 11; i++) {
        melSpectrum[i] = 1.0;
      }

      const features = extractAudioFeatures(melSpectrum);

      expect(features.mid).toBeGreaterThan(features.bass);
      expect(features.mid).toBeGreaterThan(features.treble);
    });

    it('should calculate treble from high frequencies', () => {
      const melSpectrum = new Array(16).fill(0);
      // Set last 30% to high values (treble region)
      for (let i = 11; i < 16; i++) {
        melSpectrum[i] = 1.0;
      }

      const features = extractAudioFeatures(melSpectrum);

      expect(features.treble).toBeGreaterThan(features.bass);
      expect(features.treble).toBeGreaterThan(features.mid);
    });

    it('should calculate beat based on bass', () => {
      const melSpectrum = new Array(16).fill(0);
      melSpectrum[0] = 1.0; // High bass

      const features = extractAudioFeatures(melSpectrum);

      expect(features.beat).toBeGreaterThan(0);
    });

    it('should include original spectrum', () => {
      const melSpectrum = [0.1, 0.2, 0.3, 0.4];

      const features = extractAudioFeatures(melSpectrum);

      expect(features.spectrum).toEqual(melSpectrum);
    });
  });

  describe('audioToBrightness', () => {
    it('should return brightness in 0-255 range', () => {
      const features: AudioFeatures = {
        bass: 0.5,
        mid: 0.5,
        treble: 0.5,
        volume: 0.5,
        beat: 0.5,
        energy: 0.5,
        spectrum: [],
      };

      const brightness = audioToBrightness(features);

      expect(brightness).toBeGreaterThanOrEqual(0);
      expect(brightness).toBeLessThanOrEqual(255);
    });

    it('should scale with sensitivity', () => {
      const features: AudioFeatures = {
        bass: 0.5,
        mid: 0.5,
        treble: 0.5,
        volume: 0.5,
        beat: 0.5,
        energy: 0.5,
        spectrum: [],
      };

      const normal = audioToBrightness(features, 1.0);
      const sensitive = audioToBrightness(features, 2.0);

      expect(sensitive).toBeGreaterThan(normal);
    });

    it('should clamp to valid range', () => {
      const features: AudioFeatures = {
        bass: 1.0,
        mid: 1.0,
        treble: 1.0,
        volume: 1.0,
        beat: 1.0,
        energy: 1.0,
        spectrum: [],
      };

      const brightness = audioToBrightness(features, 10.0); // Very high sensitivity

      expect(brightness).toBeLessThanOrEqual(255);
    });
  });

  describe('audioToColor', () => {
    it('should return valid HSV color', () => {
      const features: AudioFeatures = {
        bass: 0.5,
        mid: 0.5,
        treble: 0.5,
        volume: 0.5,
        beat: 0.5,
        energy: 0.5,
        spectrum: [],
      };

      const color = audioToColor(features);

      expect(color.hue).toBeGreaterThanOrEqual(0);
      expect(color.hue).toBeLessThan(360);
      expect(color.saturation).toBeGreaterThanOrEqual(0);
      expect(color.saturation).toBeLessThanOrEqual(100);
      expect(color.value).toBeGreaterThanOrEqual(0);
      expect(color.value).toBeLessThanOrEqual(100);
    });

    it('should map bass to red/orange hues', () => {
      const features: AudioFeatures = {
        bass: 1.0,
        mid: 0.0,
        treble: 0.0,
        volume: 0.5,
        beat: 0.5,
        energy: 0.5,
        spectrum: [],
      };

      const color = audioToColor(features);

      // Bass should be in red range (0-60)
      expect(color.hue).toBeLessThan(120);
    });

    it('should map mid to green/yellow hues', () => {
      const features: AudioFeatures = {
        bass: 0.0,
        mid: 1.0,
        treble: 0.0,
        volume: 0.5,
        beat: 0.5,
        energy: 0.5,
        spectrum: [],
      };

      const color = audioToColor(features);

      // Mid should be in green range (120-180)
      expect(color.hue).toBeGreaterThanOrEqual(120);
      expect(color.hue).toBeLessThan(240);
    });

    it('should map treble to blue/purple hues', () => {
      const features: AudioFeatures = {
        bass: 0.0,
        mid: 0.0,
        treble: 1.0,
        volume: 0.5,
        beat: 0.5,
        energy: 0.5,
        spectrum: [],
      };

      const color = audioToColor(features);

      // Treble should be in blue range (240-300)
      expect(color.hue).toBeGreaterThanOrEqual(240);
    });

    it('should scale saturation and value with volume', () => {
      const lowVolume: AudioFeatures = {
        bass: 0.5,
        mid: 0.5,
        treble: 0.5,
        volume: 0.2,
        beat: 0.5,
        energy: 0.5,
        spectrum: [],
      };

      const highVolume: AudioFeatures = {
        ...lowVolume,
        volume: 0.8,
      };

      const lowColor = audioToColor(lowVolume);
      const highColor = audioToColor(highVolume);

      expect(highColor.value).toBeGreaterThan(lowColor.value);
    });
  });
});
