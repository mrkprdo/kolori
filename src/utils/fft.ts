/**
 * Simple FFT implementation for audio processing
 * Based on Cooley-Tukey FFT algorithm
 */

/**
 * Perform FFT on real-valued input data
 * @param input Real-valued input array (must be power of 2 length)
 * @returns Array of magnitude values
 */
export function fft(input: number[]): number[] {
  const n = input.length;

  // Check if power of 2
  if ((n & (n - 1)) !== 0) {
    throw new Error("FFT size must be a power of 2");
  }

  // Create complex arrays (real and imaginary parts)
  const real = new Array(n);
  const imag = new Array(n);

  // Copy input to real part, zero imaginary
  for (let i = 0; i < n; i++) {
    real[i] = input[i];
    imag[i] = 0;
  }

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tempReal = real[i];
      const tempImag = imag[i];
      real[i] = real[j];
      imag[i] = imag[j];
      real[j] = tempReal;
      imag[j] = tempImag;
    }

    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Cooley-Tukey FFT
  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const step = Math.PI / halfSize;

    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const angle = j * step;
        const wReal = Math.cos(angle);
        const wImag = -Math.sin(angle);

        const k = i + j;
        const l = k + halfSize;

        const tReal = wReal * real[l] - wImag * imag[l];
        const tImag = wReal * imag[l] + wImag * real[l];

        real[l] = real[k] - tReal;
        imag[l] = imag[k] - tImag;
        real[k] += tReal;
        imag[k] += tImag;
      }
    }
  }

  // Calculate magnitudes
  const magnitudes = new Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }

  return magnitudes;
}

/**
 * Decode base64 PCM data to float array
 * @param base64 Base64 encoded PCM data
 * @returns Array of float values normalized to -1 to 1
 */
export function decodePCM(base64: string): number[] {
  // Decode base64 to binary string
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Convert bytes to 16-bit PCM samples
  const samples: number[] = [];
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      // Little-endian 16-bit signed integer
      const sample = (bytes[i + 1] << 8) | bytes[i];
      // Convert to signed
      const signedSample = sample > 32767 ? sample - 65536 : sample;
      // Normalize to -1 to 1
      samples.push(signedSample / 32768);
    }
  }

  return samples;
}

/**
 * Apply Hann window to reduce spectral leakage
 * @param data Input data
 * @returns Windowed data
 */
export function applyHannWindow(data: number[]): number[] {
  const n = data.length;
  const windowed = new Array(n);

  for (let i = 0; i < n; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    windowed[i] = data[i] * window;
  }

  return windowed;
}
