import { extractPrimaryColor, getSeasonalGradient, parseGradientString } from '../presetUtils';

describe('presetUtils', () => {
  describe('extractPrimaryColor', () => {
    it('should extract hex color from gradient string', () => {
      const gradient = 'linear-gradient(135deg, #ff6600, #ff9933)';
      expect(extractPrimaryColor(gradient)).toBe('#ff6600');
    });

    it('should extract 3-digit hex color', () => {
      const gradient = 'linear-gradient(135deg, #f60, #f93)';
      expect(extractPrimaryColor(gradient)).toBe('#f60');
    });

    it('should extract RGB color from gradient string', () => {
      const gradient = 'linear-gradient(135deg, rgb(255, 102, 0), rgb(255, 153, 51))';
      expect(extractPrimaryColor(gradient)).toBe('rgb(255, 102, 0)');
    });

    it('should extract RGB color with spaces', () => {
      const gradient = 'linear-gradient(135deg, rgb(255,  102,  0), rgb(255, 153, 51))';
      expect(extractPrimaryColor(gradient)).toBe('rgb(255,  102,  0)');
    });

    it('should return fallback color for invalid gradient', () => {
      const gradient = 'not a gradient';
      expect(extractPrimaryColor(gradient)).toBe('#6366f1');
    });

    it('should return fallback color for empty string', () => {
      const gradient = '';
      expect(extractPrimaryColor(gradient)).toBe('#6366f1');
    });

    it('should return fallback color for null input', () => {
      const gradient = null as any;
      expect(extractPrimaryColor(gradient)).toBe('#6366f1');
    });

    it('should return fallback color for undefined input', () => {
      const gradient = undefined as any;
      expect(extractPrimaryColor(gradient)).toBe('#6366f1');
    });

    it('should return fallback color for non-string input', () => {
      const gradient = 123 as any;
      expect(extractPrimaryColor(gradient)).toBe('#6366f1');
    });

    it('should extract uppercase hex color', () => {
      const gradient = 'linear-gradient(135deg, #FF6600, #FF9933)';
      expect(extractPrimaryColor(gradient)).toBe('#FF6600');
    });

    it('should extract mixed case hex color', () => {
      const gradient = 'linear-gradient(135deg, #Ff6600, #fF9933)';
      expect(extractPrimaryColor(gradient)).toBe('#Ff6600');
    });

    it('should extract first color when multiple colors present', () => {
      const gradient = 'linear-gradient(135deg, #ff0000, #00ff00, #0000ff)';
      expect(extractPrimaryColor(gradient)).toBe('#ff0000');
    });

    it('should handle gradients with percentages', () => {
      const gradient = 'linear-gradient(135deg, #ff6600 0%, #ff9933 100%)';
      expect(extractPrimaryColor(gradient)).toBe('#ff6600');
    });

    it('should handle radial gradients', () => {
      const gradient = 'radial-gradient(circle, #ff6600, #ff9933)';
      expect(extractPrimaryColor(gradient)).toBe('#ff6600');
    });
  });

  describe('getSeasonalGradient', () => {
    describe('Halloween/Fall/Autumn', () => {
      it('should return orange gradient for halloween', () => {
        expect(getSeasonalGradient('Halloween')).toBe('linear-gradient(135deg, #ff6600, #ff9933)');
      });

      it('should return orange gradient for fall', () => {
        expect(getSeasonalGradient('Fall Colors')).toBe('linear-gradient(135deg, #ff6600, #ff9933)');
      });

      it('should return orange gradient for autumn', () => {
        expect(getSeasonalGradient('Autumn Leaves')).toBe('linear-gradient(135deg, #ff6600, #ff9933)');
      });

      it('should be case insensitive for halloween', () => {
        expect(getSeasonalGradient('HALLOWEEN')).toBe('linear-gradient(135deg, #ff6600, #ff9933)');
        expect(getSeasonalGradient('halloween')).toBe('linear-gradient(135deg, #ff6600, #ff9933)');
      });
    });

    describe('Canada Day', () => {
      it('should return red gradient for canada', () => {
        expect(getSeasonalGradient('Canada Day')).toBe('linear-gradient(135deg, #ff0000, #ff4444)');
      });

      it('should be case insensitive for canada', () => {
        expect(getSeasonalGradient('CANADA')).toBe('linear-gradient(135deg, #ff0000, #ff4444)');
      });
    });

    describe('Christmas/Holiday', () => {
      it('should return green gradient for christmas', () => {
        expect(getSeasonalGradient('Christmas')).toBe('linear-gradient(135deg, #228B22, #32CD32)');
      });

      it('should return green gradient for holiday', () => {
        expect(getSeasonalGradient('Holiday Lights')).toBe('linear-gradient(135deg, #228B22, #32CD32)');
      });

      it('should be case insensitive for christmas', () => {
        expect(getSeasonalGradient('CHRISTMAS')).toBe('linear-gradient(135deg, #228B22, #32CD32)');
      });
    });

    describe('Valentine', () => {
      it('should return pink gradient for valentine', () => {
        expect(getSeasonalGradient('Valentine')).toBe('linear-gradient(135deg, #ff1493, #ff69b4)');
      });

      it('should be case insensitive for valentine', () => {
        expect(getSeasonalGradient('VALENTINE')).toBe('linear-gradient(135deg, #ff1493, #ff69b4)');
      });
    });

    describe('Easter/Spring', () => {
      it('should return pastel gradient for easter', () => {
        expect(getSeasonalGradient('Easter')).toBe('linear-gradient(135deg, #98fb98, #ffb6c1)');
      });

      it('should return pastel gradient for spring', () => {
        expect(getSeasonalGradient('Spring Time')).toBe('linear-gradient(135deg, #98fb98, #ffb6c1)');
      });

      it('should be case insensitive for easter', () => {
        expect(getSeasonalGradient('EASTER')).toBe('linear-gradient(135deg, #98fb98, #ffb6c1)');
      });
    });

    describe('July 4th/Independence Day', () => {
      it('should return patriotic gradient for july', () => {
        expect(getSeasonalGradient('July 4th')).toBe('linear-gradient(135deg, #0066cc, #ff0000)');
      });

      it('should return patriotic gradient for independence', () => {
        expect(getSeasonalGradient('Independence Day')).toBe('linear-gradient(135deg, #0066cc, #ff0000)');
      });

      it('should be case insensitive for july', () => {
        expect(getSeasonalGradient('JULY')).toBe('linear-gradient(135deg, #0066cc, #ff0000)');
      });
    });

    describe('Default gradient', () => {
      it('should return default gradient for unknown preset', () => {
        expect(getSeasonalGradient('Unknown Preset')).toBe('linear-gradient(135deg, #6366f1, #8b5cf6)');
      });

      it('should return default gradient for empty string', () => {
        expect(getSeasonalGradient('')).toBe('linear-gradient(135deg, #6366f1, #8b5cf6)');
      });

      it('should return default gradient for random text', () => {
        expect(getSeasonalGradient('Random Text')).toBe('linear-gradient(135deg, #6366f1, #8b5cf6)');
      });
    });

    describe('Partial matches', () => {
      it('should match halloween in longer strings', () => {
        expect(getSeasonalGradient('Spooky Halloween Party')).toBe('linear-gradient(135deg, #ff6600, #ff9933)');
      });

      it('should match christmas in longer strings', () => {
        expect(getSeasonalGradient('Merry Christmas Everyone')).toBe('linear-gradient(135deg, #228B22, #32CD32)');
      });
    });
  });

  describe('parseGradientString', () => {
    describe('RGB gradients', () => {
      it('should parse RGB gradient with multiple colors', () => {
        const gradient = 'linear-gradient(135deg, rgb(255, 170, 0), rgb(255, 0, 0), rgb(0, 255, 0))';
        const result = parseGradientString(gradient);
        expect(result.colors).toEqual(['rgb(255, 170, 0)', 'rgb(255, 0, 0)', 'rgb(0, 255, 0)']);
      });

      it('should parse RGB gradient with spaces', () => {
        const gradient = 'linear-gradient(135deg, rgb(  255 ,  170 ,  0  ), rgb( 255, 0, 0 ))';
        const result = parseGradientString(gradient);
        expect(result.colors).toHaveLength(2);
      });

      it('should duplicate single RGB color for LinearGradient', () => {
        const gradient = 'linear-gradient(135deg, rgb(255, 0, 0))';
        const result = parseGradientString(gradient);
        expect(result.colors).toEqual(['rgb(255, 0, 0)', 'rgb(255, 0, 0)']);
      });

      it('should parse RGB gradient with two colors', () => {
        const gradient = 'linear-gradient(135deg, rgb(255, 0, 0), rgb(0, 255, 0))';
        const result = parseGradientString(gradient);
        expect(result.colors).toEqual(['rgb(255, 0, 0)', 'rgb(0, 255, 0)']);
      });
    });

    describe('Hex gradients', () => {
      it('should parse hex gradient with multiple colors', () => {
        const gradient = 'linear-gradient(135deg, #ff6600, #ff9933, #ffcc66)';
        const result = parseGradientString(gradient);
        expect(result.colors).toEqual(['#ff6600', '#ff9933', '#ffcc66']);
      });

      it('should parse 3-digit hex colors', () => {
        const gradient = 'linear-gradient(135deg, #f60, #f93)';
        const result = parseGradientString(gradient);
        expect(result.colors).toEqual(['#f60', '#f93']);
      });

      it('should duplicate single hex color for LinearGradient', () => {
        const gradient = 'linear-gradient(135deg, #ff6600)';
        const result = parseGradientString(gradient);
        expect(result.colors).toEqual(['#ff6600', '#ff6600']);
      });

      it('should parse uppercase hex colors', () => {
        const gradient = 'linear-gradient(135deg, #FF6600, #FF9933)';
        const result = parseGradientString(gradient);
        expect(result.colors).toEqual(['#FF6600', '#FF9933']);
      });

      it('should parse mixed case hex colors', () => {
        const gradient = 'linear-gradient(135deg, #Ff6600, #fF9933)';
        const result = parseGradientString(gradient);
        expect(result.colors).toEqual(['#Ff6600', '#fF9933']);
      });
    });

    describe('Fallback behavior', () => {
      it('should return default colors for empty string', () => {
        const result = parseGradientString('');
        expect(result.colors).toEqual(['#6366f1', '#8b5cf6']);
      });

      it('should return default colors for null', () => {
        const result = parseGradientString(null as any);
        expect(result.colors).toEqual(['#6366f1', '#8b5cf6']);
      });

      it('should return default colors for undefined', () => {
        const result = parseGradientString(undefined as any);
        expect(result.colors).toEqual(['#6366f1', '#8b5cf6']);
      });

      it('should return default colors for non-string input', () => {
        const result = parseGradientString(123 as any);
        expect(result.colors).toEqual(['#6366f1', '#8b5cf6']);
      });

      it('should return default colors for gradient without colors', () => {
        const result = parseGradientString('linear-gradient(135deg)');
        expect(result.colors).toEqual(['#6366f1', '#8b5cf6']);
      });

      it('should return default colors for invalid gradient', () => {
        const result = parseGradientString('not a gradient');
        expect(result.colors).toEqual(['#6366f1', '#8b5cf6']);
      });
    });

    describe('RGB fallback to hex', () => {
      it('should try hex colors if RGB not found', () => {
        const gradient = 'linear-gradient(135deg, #ff6600, #ff9933)';
        const result = parseGradientString(gradient);
        expect(result.colors).toEqual(['#ff6600', '#ff9933']);
      });

      it('should prefer RGB over hex when both present', () => {
        const gradient = 'linear-gradient(135deg, rgb(255, 0, 0), #ff9933)';
        const result = parseGradientString(gradient);
        // Since there's only 1 RGB match, it gets duplicated
        expect(result.colors).toEqual(['rgb(255, 0, 0)', 'rgb(255, 0, 0)']);
      });
    });

    describe('Edge cases', () => {
      it('should handle gradients with percentages', () => {
        const gradient = 'linear-gradient(135deg, rgb(255, 0, 0) 0%, rgb(0, 255, 0) 100%)';
        const result = parseGradientString(gradient);
        expect(result.colors).toHaveLength(2);
      });

      it('should handle radial gradients', () => {
        const gradient = 'radial-gradient(circle, rgb(255, 0, 0), rgb(0, 255, 0))';
        const result = parseGradientString(gradient);
        expect(result.colors).toHaveLength(2);
      });

      it('should handle gradients with many colors', () => {
        const gradient = 'linear-gradient(135deg, rgb(255, 0, 0), rgb(0, 255, 0), rgb(0, 0, 255), rgb(255, 255, 0), rgb(255, 0, 255))';
        const result = parseGradientString(gradient);
        expect(result.colors).toHaveLength(5);
      });

      it('should return object with colors property', () => {
        const result = parseGradientString('linear-gradient(135deg, #ff6600, #ff9933)');
        expect(result).toHaveProperty('colors');
        expect(Array.isArray(result.colors)).toBe(true);
      });

      it('should not include locations by default', () => {
        const result = parseGradientString('linear-gradient(135deg, #ff6600, #ff9933)');
        expect(result.locations).toBeUndefined();
      });

      it('should handle very long gradient strings', () => {
        const colors = Array(100).fill(0).map((_, i) => `rgb(${i}, ${i}, ${i})`).join(', ');
        const gradient = `linear-gradient(135deg, ${colors})`;
        const result = parseGradientString(gradient);
        expect(result.colors.length).toBe(100);
      });
    });
  });
});
