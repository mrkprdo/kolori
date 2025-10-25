import {
  fetchWledTimerSettings,
  type WledTimer,
  type WledTimerSettings,
} from '../wledTimer';

// Mock dependencies
jest.mock('../wledUtils', () => ({
  buildWledUrl: (address: string, protocol: string, path: string) =>
    `${protocol}://${address}${path}`,
  fetchWithTimeout: jest.fn(),
  formatApiResponse: (success: boolean, message: string, data?: any) => ({
    success,
    message,
    data,
  }),
  extractNumericValue: jest.fn((text: string, key: string) => {
    const patterns: Record<string, number> = {
      H0: 8, N0: 30, T0: 1, W0: 255, M0: 1, P0: 1, D0: 31, E0: 1,
      CY: 20, CI: 1, CD: 1, CH: 0, CM: 0, CS: 0, A0: 0, A1: 0,
      O1: 0, O2: 29, OM: 0, MC: 0,
    };
    return patterns[key] || 0;
  }),
  extractStringValue: jest.fn(() => 'TestDevice'),
  convertDaysToWledBitmask: jest.fn((days: string[]) => {
    // Simple mock implementation
    let mask = 0;
    const dayMap: Record<string, number> = {
      Mon: 1, Tue: 2, Wed: 4, Thu: 8, Fri: 16, Sat: 32, Sun: 64
    };
    days.forEach(day => mask |= dayMap[day] || 0);
    return mask;
  }),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { fetchWithTimeout } from '../wledUtils';

describe('wledTimer', () => {
  const mockDeviceAddress = '192.168.1.100';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchWledTimerSettings', () => {
    const mockJsResponse = `
      d.Sf.H0.value = 8;
      d.Sf.N0.value = 30;
      d.Sf.T0.value = 1;
      d.Sf.W0.value = 255;
      d.Sf.M0.value = 1;
      d.Sf.P0.value = 1;
      d.Sf.D0.value = 31;
      d.Sf.E0.value = 1;
      d.Sf.CE.checked = 1;
      d.Sf.CY.value = 20;
      d.Sf.CI.value = 1;
      d.Sf.CD.value = 1;
      d.Sf.CH.value = 0;
      d.Sf.CM.value = 0;
      d.Sf.CS.value = 0;
      d.Sf.A0.value = 0;
      d.Sf.A1.value = 0;
      d.Sf.OL.checked = 1;
      d.Sf.O1.value = 0;
      d.Sf.O2.value = 29;
      d.Sf.OM.value = 0;
      d.Sf.OS.checked = 1;
      d.Sf.O5.checked = 1;
      d.Sf.OB.checked = 1;
      d.Sf.MC.value = 0;
      d.Sf.MN.value = "TestDevice";
    `;

    it('should fetch timer settings successfully', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: mockJsResponse,
      });

      const result = await fetchWledTimerSettings(mockDeviceAddress);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Timer settings retrieved successfully');
      expect(result.timerSettings).toBeDefined();
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        'http://192.168.1.100/settings/s.js?p=5',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should parse timer settings correctly', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: mockJsResponse,
      });

      const result = await fetchWledTimerSettings(mockDeviceAddress);

      expect(result.timerSettings).toBeDefined();
      expect(result.timerSettings?.timers).toHaveLength(8);
      expect(result.timerSettings?.countdown).toBeDefined();
      expect(result.timerSettings?.macro).toBeDefined();
      expect(result.timerSettings?.alexa).toBeDefined();
    });

    it('should handle fetch errors', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await fetchWledTimerSettings(mockDeviceAddress);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
      expect(result.timerSettings).toBeUndefined();
    });

    it('should use custom protocol', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: mockJsResponse,
      });

      await fetchWledTimerSettings(mockDeviceAddress, 'https');

      expect(fetchWithTimeout).toHaveBeenCalledWith(
        'https://192.168.1.100/settings/s.js?p=5',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should handle invalid/empty response', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: '',
      });

      const result = await fetchWledTimerSettings(mockDeviceAddress);

      // Should still parse but with default values
      expect(result.timerSettings).toBeDefined();
    });

    it('should handle malformed JavaScript', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        success: true,
        data: 'invalid javascript {{{',
      });

      const result = await fetchWledTimerSettings(mockDeviceAddress);

      // Parser should handle gracefully
      expect(result).toBeDefined();
    });
  });

  describe('WledTimer type', () => {
    it('should have correct structure', () => {
      const timer: WledTimer = {
        hour: 8,
        minute: 30,
        preset: 1,
        weekdays: 255,
        month: 1,
        dayStart: 1,
        dayEnd: 31,
        enabled: true,
      };

      expect(timer.hour).toBeGreaterThanOrEqual(0);
      expect(timer.hour).toBeLessThan(24);
      expect(timer.minute).toBeGreaterThanOrEqual(0);
      expect(timer.minute).toBeLessThan(60);
      expect(typeof timer.enabled).toBe('boolean');
    });
  });

  describe('WledTimerSettings type', () => {
    it('should have correct structure', () => {
      const settings: WledTimerSettings = {
        timers: [],
        countdown: {
          enabled: false,
          year: 20,
          month: 1,
          day: 1,
          hour: 0,
          minute: 0,
          second: 0,
          preset1: 0,
          preset2: 0,
        },
        macro: {
          enabled: false,
          start: 0,
          end: 29,
          mode: 0,
          sunrise: false,
          minutes: false,
          buttons: false,
        },
        alexa: {
          mode: 0,
          name: '',
        },
      };

      expect(settings).toHaveProperty('timers');
      expect(settings).toHaveProperty('countdown');
      expect(settings).toHaveProperty('macro');
      expect(settings).toHaveProperty('alexa');
      expect(Array.isArray(settings.timers)).toBe(true);
    });
  });
});
