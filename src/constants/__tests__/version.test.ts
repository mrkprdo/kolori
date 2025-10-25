import { APP_VERSION, APP_NAME } from '../version';

describe('version constants', () => {
  describe('APP_VERSION', () => {
    it('should be defined', () => {
      expect(APP_VERSION).toBeDefined();
    });

    it('should be a string', () => {
      expect(typeof APP_VERSION).toBe('string');
    });

    it('should match semver format', () => {
      // Matches x.y.z or x.y.z-beta etc
      const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
      expect(APP_VERSION).toMatch(semverRegex);
    });
  });

  describe('APP_NAME', () => {
    it('should be "Kolori"', () => {
      expect(APP_NAME).toBe('Kolori');
    });

    it('should be a string', () => {
      expect(typeof APP_NAME).toBe('string');
    });

    it('should not be empty', () => {
      expect(APP_NAME.length).toBeGreaterThan(0);
    });
  });
});
