import {
  checkWLEDAudioReactiveConfig,
  setWLEDUdpRealtime,
  rebootWLED,
  WLEDConfigStatus,
} from '../wledConfigChecker';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('wledConfigChecker', () => {
  const mockDeviceIp = '192.168.1.100';
  const mockConfig = {
    hw: {
      led: {
        ins: [{ order: 1 }],
      },
    },
    if: {
      live: {
        en: true,
        timeout: 25,
      },
      sync: {},
    },
  };

  const mockState = {
    seg: [{
      fx: 0,
      name: 'Test Effect',
    }],
  };

  const mockInfo = {
    u: {
      AudioReactive: {
        UDPSound: true,
        audioSource: 1,
      },
    },
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkWLEDAudioReactiveConfig', () => {
    it('should check WLED configuration successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConfig,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockState,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInfo,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInfo,
        });

      const status = await checkWLEDAudioReactiveConfig(mockDeviceIp);

      expect(status.isReady).toBe(true);
      expect(status.udpRealtimeEnabled).toBe(true);
      expect(status.realtimePort).toBe(21324);
      expect(status.hasAudioReactive).toBe(true);
      expect(status.udpSyncEnabled).toBe(true);
      expect(status.issues).toHaveLength(0);
    });

    it('should handle UDP Realtime disabled', async () => {
      const disabledConfig = {
        ...mockConfig,
        if: {
          ...mockConfig.if,
          live: { en: false },
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => disabledConfig,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockState,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInfo,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInfo,
        });

      const status = await checkWLEDAudioReactiveConfig(mockDeviceIp);

      expect(status.udpRealtimeEnabled).toBe(false);
      expect(status.isReady).toBe(false);
    });

    it('should handle missing AudioReactive usermod', async () => {
      const infoWithoutAR = { u: {} };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConfig,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockState,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => infoWithoutAR,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => infoWithoutAR,
        });

      const status = await checkWLEDAudioReactiveConfig(mockDeviceIp);

      expect(status.hasAudioReactive).toBe(false);
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const status = await checkWLEDAudioReactiveConfig(mockDeviceIp);

      expect(status.isReady).toBe(false);
      expect(status.issues.length).toBeGreaterThan(0);
      expect(status.issues[0]).toContain('Failed to connect');
    });

    it('should handle non-ok responses', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: false });

      const status = await checkWLEDAudioReactiveConfig(mockDeviceIp);

      expect(status.isReady).toBe(false);
      expect(status.issues).toContain('Failed to fetch WLED configuration');
    });

    it('should use custom port', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConfig,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockState,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInfo,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInfo,
        });

      const status = await checkWLEDAudioReactiveConfig(mockDeviceIp, 12345);

      expect(status.realtimePort).toBe(21324); // Always uses 21324
    });

    it('should detect audio source', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConfig,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockState,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInfo,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInfo,
        });

      const status = await checkWLEDAudioReactiveConfig(mockDeviceIp);

      expect(status.audioSource).toBe('Microphone');
    });

    it('should detect current effect', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConfig,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockState,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInfo,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInfo,
        });

      const status = await checkWLEDAudioReactiveConfig(mockDeviceIp);

      expect(status.currentEffect).toBe('Test Effect');
    });
  });

  describe('setWLEDUdpRealtime', () => {
    it('should enable UDP Realtime', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await setWLEDUdpRealtime(mockDeviceIp, true);

      expect(result.success).toBe(true);
      expect(result.needsReboot).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `http://${mockDeviceIp}/json/cfg`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            if: { live: { en: true } },
          }),
        })
      );
    });

    it('should disable UDP Realtime', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await setWLEDUdpRealtime(mockDeviceIp, false);

      expect(result.success).toBe(true);
      expect(result.needsReboot).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `http://${mockDeviceIp}/json/cfg`,
        expect.objectContaining({
          body: JSON.stringify({
            if: { live: { en: false } },
          }),
        })
      );
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await setWLEDUdpRealtime(mockDeviceIp, true);

      expect(result.success).toBe(false);
      expect(result.needsReboot).toBe(false);
    });

    it('should handle non-ok responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

      const result = await setWLEDUdpRealtime(mockDeviceIp, true);

      expect(result.success).toBe(false);
      expect(result.needsReboot).toBe(false);
    });
  });

  describe('rebootWLED', () => {
    it('should send reboot command', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await rebootWLED(mockDeviceIp);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `http://${mockDeviceIp}/json/state`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rb: true }),
        })
      );
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await rebootWLED(mockDeviceIp);

      expect(result).toBe(false);
    });

    it('should handle non-ok responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      const result = await rebootWLED(mockDeviceIp);

      expect(result).toBe(false);
    });
  });
});
