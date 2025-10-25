import { WLED_EFFECTS, getEffectData, getEffectByName } from '../wledEffects';

describe('wledEffects', () => {
  describe('WLED_EFFECTS array', () => {
    it('should have 187 effects', () => {
      expect(WLED_EFFECTS).toHaveLength(187);
    });

    it('should have Solid effect at index 0', () => {
      const solid = WLED_EFFECTS[0];
      expect(solid).toBeDefined();
      expect(solid.name).toBe('Solid');
      expect(solid.id).toBe(0);
    });

    it('should have all effects with valid structure', () => {
      WLED_EFFECTS.forEach((effect) => {
        expect(effect).toHaveProperty('name');
        expect(effect).toHaveProperty('displayName');
        expect(effect).toHaveProperty('description');
        expect(effect).toHaveProperty('id');
        expect(effect).toHaveProperty('flags');
        expect(effect).toHaveProperty('colors');
        expect(effect).toHaveProperty('parameters');
        expect(effect).toHaveProperty('isAudioReactive');
        expect(effect).toHaveProperty('supportsPalette');
        expect(effect).toHaveProperty('supports1D');
        expect(effect).toHaveProperty('supports2D');
      });
    });

    it('should have correct flags for audio reactive effects', () => {
      WLED_EFFECTS.forEach((effect) => {
        if (effect.isAudioReactive) {
          expect(
            effect.flags.includes('♪') || effect.flags.includes('♫')
          ).toBe(true);
        }
      });
    });

    it('should have correct flags for 1D effects', () => {
      WLED_EFFECTS.forEach((effect) => {
        if (effect.supports1D) {
          expect(effect.flags.includes('⋮')).toBe(true);
        }
      });
    });

    it('should have correct flags for 2D effects', () => {
      WLED_EFFECTS.forEach((effect) => {
        if (effect.supports2D) {
          expect(effect.flags.includes('▦')).toBe(true);
        }
      });
    });

  });

  describe('getEffectData', () => {
    it('should return effect by valid ID', () => {
      const effect = getEffectData(0);
      expect(effect).toBeDefined();
      expect(effect?.name).toBe('Solid');
      expect(effect?.id).toBe(0);
    });

    it('should return null for invalid ID', () => {
      const effect = getEffectData(999);
      expect(effect).toBeNull();
    });

    it('should return null for negative ID', () => {
      const effect = getEffectData(-1);
      expect(effect).toBeNull();
    });

    it('should return correct effect for known effects', () => {
      // Test a few known effects
      const blink = getEffectData(1);
      expect(blink?.name).toBe('Blink');

      const rainbow = getEffectData(9);
      expect(rainbow?.name).toBe('Rainbow');

      const fire = getEffectData(66);
      expect(fire?.name).toBe('Fire 2012');
    });
  });

  describe('getEffectByName', () => {
    it('should return effect by exact name match', () => {
      const effect = getEffectByName('Solid');
      expect(effect).toBeDefined();
      expect(effect?.id).toBe(0);
    });

    it('should return null for non-existent name', () => {
      const effect = getEffectByName('NonExistentEffect');
      expect(effect).toBeNull();
    });

    it('should be case sensitive', () => {
      const effect = getEffectByName('solid');
      expect(effect).toBeNull();
    });

    it('should find known effects by name', () => {
      const blink = getEffectByName('Blink');
      expect(blink?.id).toBe(1);

      const rainbow = getEffectByName('Rainbow');
      expect(rainbow?.id).toBe(9);

      const fire = getEffectByName('Fire 2012');
      expect(fire?.id).toBe(66);
    });

    it('should handle effects with special characters', () => {
      const chase2 = getEffectByName('Chase 2');
      expect(chase2).toBeDefined();

      const sparkle = getEffectByName('Sparkle+');
      expect(sparkle).toBeDefined();
    });
  });

  describe('effect properties', () => {
    it('should have some audio reactive effects', () => {
      const audioReactiveEffects = WLED_EFFECTS.filter(e => e.isAudioReactive);
      expect(audioReactiveEffects.length).toBeGreaterThan(0);
    });

    it('should have some 2D effects', () => {
      const effects2D = WLED_EFFECTS.filter(e => e.supports2D);
      expect(effects2D.length).toBeGreaterThan(0);
    });

    it('should have some 1D effects', () => {
      const effects1D = WLED_EFFECTS.filter(e => e.supports1D);
      expect(effects1D.length).toBeGreaterThan(0);
    });

    it('should have displayName with indicators', () => {
      const audioEffect = WLED_EFFECTS.find(e => e.isAudioReactive);
      expect(audioEffect?.displayName).toContain(audioEffect?.name);
    });
  });
});
