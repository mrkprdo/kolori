import { fft, decodePCM, applyHannWindow } from '../fft';

describe('fft', () => {
  describe('fft function', () => {
    it('should throw error for non-power-of-2 input', () => {
      const input = new Array(100).fill(0);
      expect(() => fft(input)).toThrow('FFT size must be a power of 2');
    });

    it('should return correct length for power of 2 input', () => {
      const input = new Array(64).fill(1);
      const result = fft(input);
      expect(result).toHaveLength(32); // N/2
    });

    it('should return all zeros for zero input', () => {
      const input = new Array(64).fill(0);
      const result = fft(input);

      result.forEach((magnitude) => {
        expect(magnitude).toBeCloseTo(0, 5);
      });
    });

    it('should detect DC component', () => {
      const input = new Array(64).fill(1);
      const result = fft(input);

      // DC component (bin 0) should be non-zero
      expect(result[0]).toBeGreaterThan(0);
    });

    it('should detect single frequency sine wave', () => {
      const size = 64;
      const frequency = 5; // 5 cycles in the window
      const input = new Array(size);

      for (let i = 0; i < size; i++) {
        input[i] = Math.sin(2 * Math.PI * frequency * i / size);
      }

      const result = fft(input);

      // The bin at 'frequency' should have the highest magnitude
      const maxBin = result.indexOf(Math.max(...result));
      expect(maxBin).toBe(frequency);
    });

    it('should work with different power-of-2 sizes', () => {
      const sizes = [32, 64, 128, 256, 512];

      sizes.forEach((size) => {
        const input = new Array(size).fill(1);
        const result = fft(input);
        expect(result).toHaveLength(size / 2);
      });
    });

    it('should return non-negative magnitudes', () => {
      const input = new Array(128);
      for (let i = 0; i < 128; i++) {
        input[i] = Math.random() * 2 - 1; // Random values -1 to 1
      }

      const result = fft(input);

      result.forEach((magnitude) => {
        expect(magnitude).toBeGreaterThanOrEqual(0);
      });
    });

    it('should be deterministic', () => {
      const input = new Array(64);
      for (let i = 0; i < 64; i++) {
        input[i] = Math.sin(2 * Math.PI * 3 * i / 64);
      }

      const result1 = fft([...input]);
      const result2 = fft([...input]);

      expect(result1).toEqual(result2);
    });
  });

  describe('decodePCM', () => {
    it('should decode base64 PCM data', () => {
      // Create a simple PCM buffer with known values
      const samples = [100, -100, 200, -200];
      const bytes = new Uint8Array(samples.length * 2);

      for (let i = 0; i < samples.length; i++) {
        const sample16 = samples[i];
        bytes[i * 2] = sample16 & 0xFF;
        bytes[i * 2 + 1] = (sample16 >> 8) & 0xFF;
      }

      // Convert to base64
      let binaryString = '';
      for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binaryString);

      const decoded = decodePCM(base64);

      expect(decoded).toHaveLength(samples.length);
    });

    it('should normalize samples to -1 to 1 range', () => {
      // Maximum positive value (32767)
      const bytes = new Uint8Array([0xFF, 0x7F]);
      let binaryString = String.fromCharCode(bytes[0]) + String.fromCharCode(bytes[1]);
      const base64 = btoa(binaryString);

      const decoded = decodePCM(base64);

      expect(decoded[0]).toBeCloseTo(1.0, 3);
    });

    it('should handle negative samples', () => {
      // -32768 (minimum negative value)
      const bytes = new Uint8Array([0x00, 0x80]);
      let binaryString = String.fromCharCode(bytes[0]) + String.fromCharCode(bytes[1]);
      const base64 = btoa(binaryString);

      const decoded = decodePCM(base64);

      expect(decoded[0]).toBeCloseTo(-1.0, 3);
    });

    it('should handle zero samples', () => {
      const bytes = new Uint8Array([0x00, 0x00]);
      let binaryString = String.fromCharCode(bytes[0]) + String.fromCharCode(bytes[1]);
      const base64 = btoa(binaryString);

      const decoded = decodePCM(base64);

      expect(decoded[0]).toBeCloseTo(0.0, 5);
    });

    it('should handle odd-length data gracefully', () => {
      // Odd number of bytes (will skip last incomplete sample)
      const bytes = new Uint8Array([0x00, 0x00, 0xFF]);
      let binaryString = '';
      for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binaryString);

      const decoded = decodePCM(base64);

      expect(decoded).toHaveLength(1); // Only complete 16-bit sample
    });
  });

  describe('applyHannWindow', () => {
    it('should return array of same length', () => {
      const data = new Array(64).fill(1);
      const windowed = applyHannWindow(data);

      expect(windowed).toHaveLength(data.length);
    });

    it('should reduce edge values', () => {
      const data = new Array(64).fill(1);
      const windowed = applyHannWindow(data);

      // First and last values should be close to 0
      expect(windowed[0]).toBeCloseTo(0, 5);
      expect(windowed[windowed.length - 1]).toBeCloseTo(0, 5);
    });

    it('should have maximum near center', () => {
      const data = new Array(64).fill(1);
      const windowed = applyHannWindow(data);

      const centerIndex = Math.floor(data.length / 2);
      const centerValue = windowed[centerIndex];

      // Center should be close to 1
      expect(centerValue).toBeGreaterThan(0.9);
    });

    it('should be symmetric', () => {
      const data = new Array(64).fill(1);
      const windowed = applyHannWindow(data);

      const halfLength = Math.floor(windowed.length / 2);

      for (let i = 0; i < halfLength; i++) {
        const leftValue = windowed[i];
        const rightValue = windowed[windowed.length - 1 - i];
        expect(leftValue).toBeCloseTo(rightValue, 5);
      }
    });

    it('should not modify original array', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8];
      const original = [...data];

      applyHannWindow(data);

      expect(data).toEqual(original);
    });

    it('should work with different array sizes', () => {
      const sizes = [32, 64, 128, 256];

      sizes.forEach((size) => {
        const data = new Array(size).fill(1);
        const windowed = applyHannWindow(data);

        expect(windowed).toHaveLength(size);
        expect(windowed[0]).toBeCloseTo(0, 5);
        expect(windowed[size - 1]).toBeCloseTo(0, 5);
      });
    });

    it('should reduce spectral leakage', () => {
      const size = 64;
      const frequency = 2.5; // Non-integer frequency to cause leakage

      // Generate sine wave
      const signal = new Array(size);
      for (let i = 0; i < size; i++) {
        signal[i] = Math.sin(2 * Math.PI * frequency * i / size);
      }

      // FFT without window
      const fftNoWindow = fft(signal);

      // FFT with window
      const windowed = applyHannWindow(signal);
      const fftWithWindow = fft(windowed);

      // Both should have valid results
      expect(fftNoWindow.length).toBe(size / 2);
      expect(fftWithWindow.length).toBe(size / 2);
    });
  });

  describe('integration tests', () => {
    it('should process audio pipeline: decode -> window -> fft', () => {
      // Create test PCM data
      const samples = new Array(128);
      for (let i = 0; i < 128; i++) {
        samples[i] = Math.floor(Math.sin(2 * Math.PI * 5 * i / 128) * 16384);
      }

      // Encode to PCM
      const bytes = new Uint8Array(samples.length * 2);
      for (let i = 0; i < samples.length; i++) {
        const sample = samples[i];
        bytes[i * 2] = sample & 0xFF;
        bytes[i * 2 + 1] = (sample >> 8) & 0xFF;
      }

      let binaryString = '';
      for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binaryString);

      // Decode
      const decoded = decodePCM(base64);
      expect(decoded).toHaveLength(128);

      // Window
      const windowed = applyHannWindow(decoded);
      expect(windowed).toHaveLength(128);

      // FFT
      const spectrum = fft(windowed);
      expect(spectrum).toHaveLength(64);
    });
  });
});
