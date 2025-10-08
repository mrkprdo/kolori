/**
 * Audio Processing Utilities
 *
 * Based on LedFx's audio processing algorithm using FFT and Melbank (mel-filterbank)
 * for frequency band analysis and audio reactive LED effects.
 *
 * References:
 * - LedFx: https://github.com/LedFx/LedFx
 * - Scott's audio-reactive-led-strip: https://github.com/scottlawsonbc/audio-reactive-led-strip
 */

/**
 * Convert frequency (Hz) to Mel scale
 * Mel scale is a perceptual scale of pitches judged by listeners to be equal in distance
 */
export function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

/**
 * Convert Mel scale back to frequency (Hz)
 */
export function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

/**
 * Create Mel filterbank matrix
 *
 * @param numBands Number of mel bands to generate
 * @param fftSize Size of FFT (must be power of 2)
 * @param sampleRate Audio sample rate in Hz
 * @param minFreq Minimum frequency in Hz
 * @param maxFreq Maximum frequency in Hz
 * @returns Mel filterbank matrix [numBands x (fftSize/2 + 1)]
 */
export function createMelFilterbank(
  numBands: number,
  fftSize: number,
  sampleRate: number,
  minFreq: number = 20,
  maxFreq: number = 20000
): number[][] {
  const numFftBins = Math.floor(fftSize / 2) + 1;

  // Convert frequencies to mel scale
  const minMel = hzToMel(minFreq);
  const maxMel = hzToMel(maxFreq);

  // Create evenly spaced mel points
  const melPoints: number[] = [];
  for (let i = 0; i <= numBands + 1; i++) {
    melPoints.push(minMel + (i * (maxMel - minMel)) / (numBands + 1));
  }

  // Convert mel points back to Hz
  const hzPoints = melPoints.map(melToHz);

  // Convert Hz to FFT bin numbers
  const binPoints = hzPoints.map(hz => Math.floor((fftSize + 1) * hz / sampleRate));

  // Create filterbank matrix
  const filterbank: number[][] = [];

  for (let i = 0; i < numBands; i++) {
    const filter: number[] = new Array(numFftBins).fill(0);

    const leftBin = binPoints[i];
    const centerBin = binPoints[i + 1];
    const rightBin = binPoints[i + 2];

    // Rising slope
    for (let j = leftBin; j < centerBin; j++) {
      if (j >= 0 && j < numFftBins) {
        filter[j] = (j - leftBin) / (centerBin - leftBin);
      }
    }

    // Falling slope
    for (let j = centerBin; j < rightBin; j++) {
      if (j >= 0 && j < numFftBins) {
        filter[j] = (rightBin - j) / (rightBin - centerBin);
      }
    }

    filterbank.push(filter);
  }

  return filterbank;
}

/**
 * Apply mel filterbank to FFT magnitude data
 *
 * @param fftMagnitudes FFT magnitude spectrum
 * @param filterbank Mel filterbank matrix
 * @returns Mel spectrum (energy in each mel band)
 */
export function applyMelFilterbank(
  fftMagnitudes: number[],
  filterbank: number[][]
): number[] {
  const melSpectrum: number[] = [];

  for (const filter of filterbank) {
    let energy = 0;
    for (let i = 0; i < filter.length && i < fftMagnitudes.length; i++) {
      energy += filter[i] * fftMagnitudes[i] * fftMagnitudes[i]; // Square for power
    }
    melSpectrum.push(energy);
  }

  return melSpectrum;
}

/**
 * Apply smoothing to mel spectrum
 *
 * @param current Current mel spectrum
 * @param previous Previous mel spectrum
 * @param smoothingFactor Smoothing factor (0-1, higher = more smoothing)
 * @returns Smoothed mel spectrum
 */
export function smoothMelSpectrum(
  current: number[],
  previous: number[],
  smoothingFactor: number = 0.5
): number[] {
  if (previous.length === 0) return current;

  return current.map((val, i) =>
    smoothingFactor * (previous[i] || 0) + (1 - smoothingFactor) * val
  );
}

/**
 * Normalize mel spectrum to 0-1 range
 *
 * @param spectrum Mel spectrum
 * @param minDb Minimum dB value
 * @param maxDb Maximum dB value
 * @returns Normalized spectrum (0-1)
 */
export function normalizeMelSpectrum(
  spectrum: number[],
  minDb: number = -80,
  maxDb: number = 0
): number[] {
  return spectrum.map(energy => {
    // Convert to dB
    const db = energy > 0 ? 10 * Math.log10(energy) : minDb;

    // Normalize to 0-1
    const normalized = (db - minDb) / (maxDb - minDb);
    return Math.max(0, Math.min(1, normalized));
  });
}

/**
 * Extract audio features from mel spectrum for LED effects
 *
 * @param melSpectrum Normalized mel spectrum (0-1)
 * @returns Audio features object
 */
export interface AudioFeatures {
  bass: number;      // Low frequency energy (20-250 Hz)
  mid: number;       // Mid frequency energy (250-4000 Hz)
  treble: number;    // High frequency energy (4000+ Hz)
  volume: number;    // Overall volume/loudness
  beat: number;      // Beat intensity (bass + energy change)
  energy: number;    // Total spectral energy
  spectrum: number[]; // Full frequency spectrum
}

export function extractAudioFeatures(melSpectrum: number[]): AudioFeatures {
  const numBands = melSpectrum.length;

  // Divide spectrum into frequency ranges (mel scale is logarithmic, so adjust splits)
  // Bass: ~20-250 Hz (first ~20% of mel bands)
  // Mid: ~250-4000 Hz (next ~50% of mel bands)
  // Treble: ~4000-18000 Hz (last ~30% of mel bands)
  const bassEnd = Math.floor(numBands * 0.20);     // ~0-20% = bass
  const midEnd = Math.floor(numBands * 0.70);      // ~20-70% = mid
  // Rest is treble (30%)

  // Single-pass calculation for all features (optimized)
  let bassSum = 0, midSum = 0, trebleSum = 0;
  let bassCount = 0, midCount = 0, trebleCount = 0;
  let volumeSum = 0;
  let energySum = 0;

  for (let i = 0; i < numBands; i++) {
    const val = melSpectrum[i];

    // Accumulate for volume and energy
    volumeSum += val;
    energySum += val * val;

    // Categorize by frequency range
    if (i < bassEnd) {
      bassSum += val;
      bassCount++;
    } else if (i < midEnd) {
      midSum += val;
      midCount++;
    } else {
      trebleSum += val;
      trebleCount++;
    }
  }

  const bassEnergy = bassCount > 0 ? bassSum / bassCount : 0;
  const midEnergy = midCount > 0 ? midSum / midCount : 0;
  const trebleEnergy = trebleCount > 0 ? trebleSum / trebleCount : 0;
  const volume = numBands > 0 ? volumeSum / numBands : 0;
  const energy = energySum;

  // Beat detection (emphasize bass + recent energy change)
  const beat = bassEnergy * 1.5; // Simple beat detection based on bass

  return {
    bass: bassEnergy,
    mid: midEnergy,
    treble: trebleEnergy,
    volume,
    beat,
    energy,
    spectrum: melSpectrum,
  };
}

/**
 * Map audio features to LED brightness/color intensity
 *
 * @param features Audio features
 * @param sensitivity Sensitivity multiplier (1.0 = normal, higher = more reactive)
 * @returns Brightness value (0-255)
 */
export function audioToBrightness(features: AudioFeatures, sensitivity: number = 1.0): number {
  const brightness = Math.floor(features.volume * 255 * sensitivity);
  return Math.max(0, Math.min(255, brightness));
}

/**
 * Map audio features to color values (HSV)
 *
 * @param features Audio features
 * @returns HSV color { hue: 0-360, saturation: 0-100, value: 0-100 }
 */
export function audioToColor(features: AudioFeatures): { hue: number; saturation: number; value: number } {
  // Map frequency ranges to different hues
  // Bass = red/purple (0-60, 300-360)
  // Mid = green/yellow (60-180)
  // Treble = blue/cyan (180-300)

  let hue = 0;
  const dominant = Math.max(features.bass, features.mid, features.treble);

  if (dominant === features.bass) {
    hue = 0 + features.bass * 60; // Red to orange
  } else if (dominant === features.mid) {
    hue = 120 + features.mid * 60; // Green to yellow
  } else {
    hue = 240 + features.treble * 60; // Blue to purple
  }

  return {
    hue: Math.floor(hue % 360),
    saturation: Math.floor(80 + features.volume * 20), // 80-100%
    value: Math.floor(features.volume * 100), // 0-100%
  };
}
