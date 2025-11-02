/**
 * LedFx Classic Effects
 *
 * Audio reactive effects inspired by LedFx's classic visualizations
 * All effects process audio and generate RGB pixel data for DDP transmission
 */

import { AudioFeatures } from "./audioProcessing";

// Color utilities
interface RGB {
  r: number;
  g: number;
  b: number;
}

// Gradient/Color palette helpers
function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return {
    r: Math.floor((r + m) * 255),
    g: Math.floor((g + m) * 255),
    b: Math.floor((b + m) * 255),
  };
}

function interpolateColor(color1: RGB, color2: RGB, factor: number): RGB {
  return {
    r: Math.floor(color1.r + (color2.r - color1.r) * factor),
    g: Math.floor(color1.g + (color2.g - color1.g) * factor),
    b: Math.floor(color1.b + (color2.b - color1.b) * factor),
  };
}

// Effect configuration types
export interface EffectConfig {
  brightness?: number;  // 0-1
  speed?: number;       // Effect-specific
  blur?: number;        // Smoothing amount
}

export type EffectType =
  | 'wavelength'  // Classic spectrum across strip
  | 'energy'      // Frequency bands extend from center
  | 'scroll'      // Scrolling frequencies
  | 'bars'        // Equalizer bars
  | 'pulse'       // Whole strip pulses with beat
  | 'wave'        // Traveling wave effect;

// Effect state for animations
let scrollBuffer: RGB[] = [];
let wavePhase: number = 0;

/**
 * WAVELENGTH Effect
 * Maps frequency spectrum across the LED strip (like a rainbow spectrum analyzer)
 * Low frequencies = Blue, High frequencies = Red
 */
export function wavelengthEffect(
  audioFeatures: AudioFeatures,
  melSpectrum: number[],
  numLeds: number,
  config: EffectConfig = {}
): RGB[] {
  const { brightness = 1.0, blur = 0.3 } = config;
  const colors: RGB[] = [];

  for (let i = 0; i < numLeds; i++) {
    const bandIndex = Math.floor((i / numLeds) * melSpectrum.length);
    const intensity = melSpectrum[bandIndex] || 0;

    // Rainbow spectrum: Blue (240°) -> Red (0°)
    // Get FULL brightness color at this position
    const hue = 240 - (i / (numLeds - 1)) * 240;
    const fullColor = hsvToRgb(hue, 1.0, 1.0); // Always full brightness

    // Scale by intensity (already 0-1) and user brightness
    // This is how LedFx does it: gradient_color * intensity_value
    colors.push({
      r: Math.floor(fullColor.r * intensity * brightness),
      g: Math.floor(fullColor.g * intensity * brightness),
      b: Math.floor(fullColor.b * intensity * brightness),
    });
  }

  // Apply blur/smoothing
  if (blur > 0 && colors.length > 2) {
    return applySmoothing(colors, blur);
  }

  return colors;
}

/**
 * ENERGY Effect
 * Three frequency bands (bass, mid, treble) extend from center
 * Each band has its own color and extends based on intensity
 */
export function energyEffect(
  audioFeatures: AudioFeatures,
  melSpectrum: number[],
  numLeds: number,
  config: EffectConfig = {}
): RGB[] {
  const { brightness = 1.0 } = config;
  // Create array with unique objects for each element
  const colors: RGB[] = Array.from({ length: numLeds }, () => ({ r: 0, g: 0, b: 0 }));

  // Define colors for each frequency band (full brightness)
  const bassColor: RGB = { r: 255, g: 0, b: 0 };    // Red
  const midColor: RGB = { r: 0, g: 255, b: 0 };     // Green
  const trebleColor: RGB = { r: 0, g: 0, b: 255 };  // Blue

  // Calculate how many LEDs each band extends (use direct feature values, already 0-1)
  const bassExtent = Math.floor(audioFeatures.bass * numLeds);
  const midExtent = Math.floor(audioFeatures.mid * numLeds);
  const trebleExtent = Math.floor(audioFeatures.treble * numLeds);

  // Fill from center outward
  const center = Math.floor(numLeds / 2);

  for (let i = 0; i < numLeds; i++) {
    const distFromCenter = Math.abs(i - center);
    let color: RGB = { r: 0, g: 0, b: 0 };

    // Layer the frequencies (bass is widest, treble is narrowest)
    if (distFromCenter < bassExtent) {
      color = { ...bassColor };
    }
    if (distFromCenter < midExtent) {
      // Blend mid over bass
      color = interpolateColor(color, midColor, 0.5);
    }
    if (distFromCenter < trebleExtent) {
      // Blend treble over mix
      color = interpolateColor(color, trebleColor, 0.5);
    }

    // Apply brightness
    colors[i] = {
      r: Math.floor(color.r * brightness),
      g: Math.floor(color.g * brightness),
      b: Math.floor(color.b * brightness),
    };
  }

  return colors;
}

/**
 * SCROLL Effect
 * Frequencies scroll across the strip like a waterfall
 * New pixels added at the top, old pixels scroll down
 */
export function scrollEffect(
  audioFeatures: AudioFeatures,
  melSpectrum: number[],
  numLeds: number,
  config: EffectConfig = {}
): RGB[] {
  const { brightness = 1.0, speed = 2 } = config;

  // Initialize scroll buffer if needed
  if (scrollBuffer.length !== numLeds) {
    scrollBuffer = new Array(numLeds).fill({ r: 0, g: 0, b: 0 });
  }

  // Shift pixels down by speed amount
  for (let i = numLeds - 1; i >= speed; i--) {
    scrollBuffer[i] = { ...scrollBuffer[i - speed] };
  }

  // Add new pixels at top based on frequency bands
  const bassIntensity = audioFeatures.bass;
  const midIntensity = audioFeatures.mid;
  const trebleIntensity = audioFeatures.treble;

  for (let i = 0; i < Math.min(speed, numLeds); i++) {
    // Mix the three frequency bands (direct scaling, values already 0-1)
    const r = Math.floor(bassIntensity * 255 * brightness);
    const g = Math.floor(midIntensity * 255 * brightness);
    const b = Math.floor(trebleIntensity * 255 * brightness);
    scrollBuffer[i] = { r, g, b };
  }

  // Apply decay to create trailing effect
  for (let i = 0; i < numLeds; i++) {
    scrollBuffer[i] = {
      r: Math.floor(scrollBuffer[i].r * 0.95),
      g: Math.floor(scrollBuffer[i].g * 0.95),
      b: Math.floor(scrollBuffer[i].b * 0.95),
    };
  }

  return [...scrollBuffer];
}

/**
 * BARS Effect
 * Classic equalizer bars - each LED represents a frequency band
 */
export function barsEffect(
  audioFeatures: AudioFeatures,
  melSpectrum: number[],
  numLeds: number,
  config: EffectConfig = {}
): RGB[] {
  const { brightness = 1.0 } = config;
  const colors: RGB[] = [];

  // Resample mel spectrum to match LED count
  for (let i = 0; i < numLeds; i++) {
    const bandIndex = Math.floor((i / numLeds) * melSpectrum.length);
    const intensity = melSpectrum[bandIndex] || 0;

    // Color based on frequency (low=red, mid=green, high=blue)
    let hue: number;
    if (i < numLeds / 3) {
      hue = 0; // Red (bass)
    } else if (i < (numLeds * 2) / 3) {
      hue = 120; // Green (mid)
    } else {
      hue = 240; // Blue (treble)
    }

    // Get full brightness color, then scale by intensity
    const fullColor = hsvToRgb(hue, 1.0, 1.0);
    colors.push({
      r: Math.floor(fullColor.r * intensity * brightness),
      g: Math.floor(fullColor.g * intensity * brightness),
      b: Math.floor(fullColor.b * intensity * brightness),
    });
  }

  return colors;
}

/**
 * PULSE Effect
 * Entire strip pulses with the beat/volume
 * Color shifts based on dominant frequency
 */
export function pulseEffect(
  audioFeatures: AudioFeatures,
  melSpectrum: number[],
  numLeds: number,
  config: EffectConfig = {}
): RGB[] {
  const { brightness = 1.0 } = config;
  const colors: RGB[] = [];

  // Determine dominant frequency and create full brightness color
  let fullColor: RGB;
  if (audioFeatures.bass > audioFeatures.mid && audioFeatures.bass > audioFeatures.treble) {
    // Bass dominant - red
    fullColor = { r: 255, g: 0, b: 0 };
  } else if (audioFeatures.mid > audioFeatures.treble) {
    // Mid dominant - green
    fullColor = { r: 0, g: 255, b: 0 };
  } else {
    // Treble dominant - blue
    fullColor = { r: 0, g: 0, b: 255 };
  }

  // Scale by volume (already 0-1) and user brightness
  const color: RGB = {
    r: Math.floor(fullColor.r * audioFeatures.volume * brightness),
    g: Math.floor(fullColor.g * audioFeatures.volume * brightness),
    b: Math.floor(fullColor.b * audioFeatures.volume * brightness),
  };

  // Fill entire strip with same color
  for (let i = 0; i < numLeds; i++) {
    colors.push({ ...color });
  }

  return colors;
}

/**
 * WAVE Effect
 * Traveling sine wave modulated by audio
 * Wave speed and amplitude respond to music
 */
export function waveEffect(
  audioFeatures: AudioFeatures,
  melSpectrum: number[],
  numLeds: number,
  config: EffectConfig = {}
): RGB[] {
  const { brightness = 1.0, speed = 1 } = config;
  const colors: RGB[] = [];

  // Update wave phase
  wavePhase += speed * audioFeatures.volume * 0.1;
  if (wavePhase > Math.PI * 2) wavePhase -= Math.PI * 2;

  for (let i = 0; i < numLeds; i++) {
    const position = (i / numLeds) * Math.PI * 2;
    const wave = (Math.sin(position + wavePhase) + 1) / 2; // 0-1

    // Modulate wave by frequency content (direct scaling, values already 0-1)
    const bass = audioFeatures.bass * wave;
    const mid = audioFeatures.mid * wave;
    const treble = audioFeatures.treble * wave;

    colors.push({
      r: Math.floor(bass * 255 * brightness),
      g: Math.floor(mid * 255 * brightness),
      b: Math.floor(treble * 255 * brightness),
    });
  }

  return colors;
}

/**
 * Apply smoothing/blur to colors
 */
function applySmoothing(colors: RGB[], amount: number): RGB[] {
  const smoothed: RGB[] = [];
  const weight = Math.min(1, amount);

  for (let i = 0; i < colors.length; i++) {
    if (i === 0 || i === colors.length - 1) {
      smoothed.push({ ...colors[i] });
      continue;
    }

    const prev = colors[i - 1];
    const curr = colors[i];
    const next = colors[i + 1];

    smoothed.push({
      r: Math.floor((prev.r + curr.r * 2 + next.r) / 4 * weight + curr.r * (1 - weight)),
      g: Math.floor((prev.g + curr.g * 2 + next.g) / 4 * weight + curr.g * (1 - weight)),
      b: Math.floor((prev.b + curr.b * 2 + next.b) / 4 * weight + curr.b * (1 - weight)),
    });
  }

  return smoothed;
}

/**
 * Main effect router - calls the appropriate effect function
 */
export function generateEffectColors(
  effectType: EffectType,
  audioFeatures: AudioFeatures,
  melSpectrum: number[],
  numLeds: number,
  config: EffectConfig = {}
): RGB[] {
  switch (effectType) {
    case 'wavelength':
      return wavelengthEffect(audioFeatures, melSpectrum, numLeds, config);
    case 'energy':
      return energyEffect(audioFeatures, melSpectrum, numLeds, config);
    case 'scroll':
      return scrollEffect(audioFeatures, melSpectrum, numLeds, config);
    case 'bars':
      return barsEffect(audioFeatures, melSpectrum, numLeds, config);
    case 'pulse':
      return pulseEffect(audioFeatures, melSpectrum, numLeds, config);
    case 'wave':
      return waveEffect(audioFeatures, melSpectrum, numLeds, config);
    default:
      return wavelengthEffect(audioFeatures, melSpectrum, numLeds, config);
  }
}

/**
 * Reset effect state (call when changing effects or stopping)
 */
export function resetEffectState(): void {
  scrollBuffer = [];
  wavePhase = 0;
}

/**
 * Effect metadata for UI
 */
export interface EffectPreset {
  id: EffectType;
  name: string;
  description: string;
  icon: string;
}

export const LEDFX_EFFECTS: EffectPreset[] = [
  {
    id: 'wavelength',
    name: 'Wavelength',
    description: 'Classic spectrum analyzer - frequency rainbow across strip',
    icon: 'radio',
  },
  {
    id: 'energy',
    name: 'Energy',
    description: 'Frequency bands extend from center with layered colors',
    icon: 'flash',
  },
  {
    id: 'scroll',
    name: 'Scroll',
    description: 'Frequencies scroll like a waterfall with trailing effect',
    icon: 'arrow-down',
  },
  {
    id: 'bars',
    name: 'Bars',
    description: 'Classic equalizer bars - each LED is a frequency band',
    icon: 'stats-chart',
  },
  {
    id: 'pulse',
    name: 'Pulse',
    description: 'Entire strip pulses with beat, color shifts by frequency',
    icon: 'pulse',
  },
  {
    id: 'wave',
    name: 'Wave',
    description: 'Traveling sine wave modulated by audio intensity',
    icon: 'analytics',
  },
];
