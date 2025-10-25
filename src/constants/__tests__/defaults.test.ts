import { DEFAULT_SEASONAL_PRESETS, DEFAULT_SETTINGS, TIMING } from '../defaults';

describe('defaults constants', () => {
  describe('DEFAULT_SEASONAL_PRESETS', () => {
    it('should have three seasonal presets', () => {
      expect(DEFAULT_SEASONAL_PRESETS).toHaveLength(3);
    });

    it('should have Halloween preset', () => {
      const halloween = DEFAULT_SEASONAL_PRESETS.find(p => p.name === 'Halloween');
      expect(halloween).toBeDefined();
      expect(halloween?.icon).toBe('🎃');
      expect(halloween?.presetId).toBe(1);
    });

    it('should have Canada Day preset', () => {
      const canadaDay = DEFAULT_SEASONAL_PRESETS.find(p => p.name === 'Canada Day');
      expect(canadaDay).toBeDefined();
      expect(canadaDay?.icon).toBe('🇨🇦');
      expect(canadaDay?.presetId).toBe(2);
    });

    it('should have Holidays preset', () => {
      const holidays = DEFAULT_SEASONAL_PRESETS.find(p => p.name === 'Holidays');
      expect(holidays).toBeDefined();
      expect(holidays?.icon).toBe('🎄');
      expect(holidays?.presetId).toBe(3);
    });

    it('should have unique IDs', () => {
      const ids = DEFAULT_SEASONAL_PRESETS.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should have correct default theme', () => {
      expect(DEFAULT_SETTINGS.theme).toBe('system');
    });

    it('should have correct default schedule mode', () => {
      expect(DEFAULT_SETTINGS.scheduleMode).toBe('all-day');
    });

    it('should have live view disabled by default', () => {
      expect(DEFAULT_SETTINGS.liveViewEnabled).toBe(false);
    });

    it('should have auto scan enabled by default', () => {
      expect(DEFAULT_SETTINGS.autoScan).toBe(true);
    });

    it('should have debug logs disabled by default', () => {
      expect(DEFAULT_SETTINGS.debugLogs).toBe(false);
    });

    it('should have correct scan timeout', () => {
      expect(DEFAULT_SETTINGS.scanTimeout).toBe(15);
    });

    it('should have correct max devices', () => {
      expect(DEFAULT_SETTINGS.maxDevices).toBe(10);
    });

    it('should have background scan enabled by default', () => {
      expect(DEFAULT_SETTINGS.backgroundScanEnabled).toBe(true);
    });

    it('should include seasonal presets', () => {
      expect(DEFAULT_SETTINGS.seasonalPresets).toEqual(DEFAULT_SEASONAL_PRESETS);
    });
  });

  describe('TIMING', () => {
    it('should have minimum loading screen duration', () => {
      expect(TIMING.MIN_LOADING_SCREEN_DURATION).toBe(2000);
    });

    it('should have screen transition fade out time', () => {
      expect(TIMING.SCREEN_TRANSITION_FADE_OUT).toBe(200);
    });

    it('should have screen transition fade in time', () => {
      expect(TIMING.SCREEN_TRANSITION_FADE_IN).toBe(300);
    });
  });
});
