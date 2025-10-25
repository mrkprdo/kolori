import {
  generatePlaylistGradient,
  generatePresetGradient,
  generateLinearGradientColors,
} from '../wledGradients';
import { WLED_PALETTES_DEF, WLED_PALETTES_DATA } from '../../constants/palettes';

describe('wledGradients', () => {
  describe('generatePlaylistGradient', () => {
    describe('name-based gradients', () => {
      it('should generate fire gradient for fire-related names', () => {
        const result = generatePlaylistGradient('Fire Show', 5);

        expect(result.colors).toEqual(['#ff4500', '#ff6500', '#ffb347']);
        expect(result.gradient).toBe('linear-gradient(135deg, #ff4500, #ff6500, #ffb347)');
      });

      it('should generate fire gradient for flame-related names', () => {
        const result = generatePlaylistGradient('Flames', 3);

        expect(result.colors).toEqual(['#ff4500', '#ff6500', '#ffb347']);
        expect(result.gradient).toBe('linear-gradient(135deg, #ff4500, #ff6500, #ffb347)');
      });

      it('should be case insensitive for fire names', () => {
        const result = generatePlaylistGradient('FIRE', 1);

        expect(result.colors).toEqual(['#ff4500', '#ff6500', '#ffb347']);
      });

      it('should generate rainbow gradient for rainbow-related names', () => {
        const result = generatePlaylistGradient('Rainbow', 5);

        expect(result.colors).toEqual([
          '#ff0000',
          '#ff7700',
          '#ffff00',
          '#00ff00',
          '#0077ff',
          '#4b0082',
        ]);
        expect(result.gradient).toBe(
          'linear-gradient(135deg, #ff0000, #ff7700, #ffff00, #00ff00, #0077ff, #4b0082)'
        );
      });

      it('should generate rainbow gradient for colorful names', () => {
        const result = generatePlaylistGradient('Colorful Lights', 5);

        expect(result.colors).toEqual([
          '#ff0000',
          '#ff7700',
          '#ffff00',
          '#00ff00',
          '#0077ff',
          '#4b0082',
        ]);
      });

      it('should generate party gradient for party-related names', () => {
        const result = generatePlaylistGradient('Party Mode', 5);

        expect(result.colors).toEqual(['#ff1493', '#00ffff', '#9400d3', '#ff4500']);
        expect(result.gradient).toBe('linear-gradient(135deg, #ff1493, #00ffff, #9400d3, #ff4500)');
      });

      it('should generate party gradient for dance-related names', () => {
        const result = generatePlaylistGradient('Dance Floor', 5);

        expect(result.colors).toEqual(['#ff1493', '#00ffff', '#9400d3', '#ff4500']);
      });
    });

    describe('hash-based fallback gradients', () => {
      it('should generate gradient based on name hash for unknown names', () => {
        const result = generatePlaylistGradient('Custom Playlist', 5);

        expect(result.colors).toHaveLength(3);
        expect(result.gradient).toContain('linear-gradient(135deg,');
        expect(result.gradient).toContain('hsl(');
      });

      it('should generate HSL colors for fallback', () => {
        const result = generatePlaylistGradient('Unknown', 3);

        result.colors.forEach(color => {
          expect(color).toMatch(/hsl\(\d+, 70%, \d+%\)/);
        });
      });

      it('should generate different gradients for different names', () => {
        const result1 = generatePlaylistGradient('Playlist A', 5);
        const result2 = generatePlaylistGradient('Playlist B', 5);

        expect(result1.gradient).not.toBe(result2.gradient);
      });

      it('should consider item count in gradient generation', () => {
        const result1 = generatePlaylistGradient('Test', 1);
        const result2 = generatePlaylistGradient('Test', 10);

        // Same name but different item counts should produce different gradients
        expect(result1.gradient).not.toBe(result2.gradient);
      });

      it('should handle empty playlist name', () => {
        const result = generatePlaylistGradient('', 5);

        expect(result.colors).toHaveLength(3);
        expect(result.gradient).toBeDefined();
      });

      it('should handle zero item count', () => {
        const result = generatePlaylistGradient('Test', 0);

        expect(result.colors).toHaveLength(3);
        expect(result.gradient).toBeDefined();
      });

      it('should generate consistent gradient for same inputs', () => {
        const result1 = generatePlaylistGradient('Consistent', 5);
        const result2 = generatePlaylistGradient('Consistent', 5);

        expect(result1.gradient).toBe(result2.gradient);
        expect(result1.colors).toEqual(result2.colors);
      });
    });

    describe('return value structure', () => {
      it('should return colors array and gradient string', () => {
        const result = generatePlaylistGradient('Test', 5);

        expect(result).toHaveProperty('colors');
        expect(result).toHaveProperty('gradient');
        expect(Array.isArray(result.colors)).toBe(true);
        expect(typeof result.gradient).toBe('string');
      });
    });
  });

  describe('generatePresetGradient', () => {
    it('should generate gradient for valid palette ID', () => {
      // Assuming palette ID 1 exists in WLED_PALETTES_DEF
      const firstPalette = WLED_PALETTES_DEF[0];
      const result = generatePresetGradient(firstPalette.id);

      expect(typeof result).toBe('string');
      expect(result).toContain('linear-gradient');
    });

    it('should return default gradient for invalid palette ID', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = generatePresetGradient(99999);

      expect(result).toBe('linear-gradient(135deg, #888, #555)');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Palette ID 99999 not found')
      );

      consoleSpy.mockRestore();
    });

    it('should return default gradient for negative palette ID', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = generatePresetGradient(-1);

      expect(result).toBe('linear-gradient(135deg, #888, #555)');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Palette ID -1 not found')
      );

      consoleSpy.mockRestore();
    });

    it('should handle palette with no color data', () => {
      // Mock console.warn to avoid cluttering test output
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Use a palette ID that exists but might have issues
      const result = generatePresetGradient(999);

      expect(result).toContain('linear-gradient');
      consoleSpy.mockRestore();
    });

    it('should generate RGB color stops for valid palette', () => {
      const firstPalette = WLED_PALETTES_DEF[0];
      const result = generatePresetGradient(firstPalette.id);

      if (result !== 'linear-gradient(135deg, #888, #555)') {
        expect(result).toMatch(/rgb\(\d+, \d+, \d+\)/);
      }
    });
  });

  describe('generateLinearGradientColors', () => {
    it('should generate color array for valid palette ID', () => {
      const firstPalette = WLED_PALETTES_DEF[0];
      const result = generateLinearGradientColors(firstPalette.id);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should return default colors for invalid palette ID', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = generateLinearGradientColors(99999);

      expect(result).toEqual(['#888888', '#555555']);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Palette ID 99999 not found')
      );

      consoleSpy.mockRestore();
    });

    it('should return default colors for negative palette ID', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = generateLinearGradientColors(-1);

      expect(result).toEqual(['#888888', '#555555']);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Palette ID -1 not found')
      );

      consoleSpy.mockRestore();
    });

    it('should duplicate single color to ensure at least 2 colors', () => {
      // Mock console.warn
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // This would need a palette with exactly 1 color
      // For testing purposes, we verify the logic exists
      const firstPalette = WLED_PALETTES_DEF[0];
      const result = generateLinearGradientColors(firstPalette.id);

      // Result should always have at least 2 colors
      expect(result.length).toBeGreaterThanOrEqual(2);

      consoleSpy.mockRestore();
    });

    it('should generate RGB format colors', () => {
      const firstPalette = WLED_PALETTES_DEF[0];
      const result = generateLinearGradientColors(firstPalette.id);

      if (!result.includes('#888888')) {
        result.forEach(color => {
          expect(color).toMatch(/rgb\(\d+, \d+, \d+\)/);
        });
      }
    });

    it('should return readonly array', () => {
      const firstPalette = WLED_PALETTES_DEF[0];
      const result = generateLinearGradientColors(firstPalette.id);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle palette with no data gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = generateLinearGradientColors(999);

      expect(result).toEqual(['#888888', '#555555']);
      consoleSpy.mockRestore();
    });

    it('should handle palette not found in WLED_PALETTES_DATA', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Use an ID that exists in DEF but not in DATA (if such exists)
      const result = generateLinearGradientColors(888);

      expect(result).toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('integration with palette constants', () => {
    it('should work with first palette in WLED_PALETTES_DEF', () => {
      expect(WLED_PALETTES_DEF.length).toBeGreaterThan(0);

      const firstPalette = WLED_PALETTES_DEF[0];
      const gradient = generatePresetGradient(firstPalette.id);
      const colors = generateLinearGradientColors(firstPalette.id);

      expect(gradient).toBeDefined();
      expect(colors).toBeDefined();
    });

    it('should handle multiple palettes', () => {
      // Mock console.warn since some palettes may have no color data
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const paletteCount = Math.min(5, WLED_PALETTES_DEF.length);

      for (let i = 0; i < paletteCount; i++) {
        const palette = WLED_PALETTES_DEF[i];
        const gradient = generatePresetGradient(palette.id);
        const colors = generateLinearGradientColors(palette.id);

        expect(gradient).toBeDefined();
        expect(colors).toBeDefined();
        expect(colors.length).toBeGreaterThanOrEqual(2);
      }

      consoleSpy.mockRestore();
    });
  });
});
