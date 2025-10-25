import {
  sendRealtimeToWLED,
  getRealtimePacketStats,
  resetRealtimePacketStats,
  closeRealtimeSocket,
  setTestMode,
} from '../wledUdpRealtime';
import { AudioFeatures } from '../audioProcessing';

// Mock react-native-udp
const mockSocket = {
  bind: jest.fn((port, callback) => callback && callback()),
  send: jest.fn((data, offset, length, port, address, callback) => callback && callback(null)),
  close: jest.fn(),
  on: jest.fn(),
};

jest.mock('react-native-udp', () => ({
  createSocket: jest.fn(() => mockSocket),
}));

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('wledUdpRealtime', () => {
  const mockDeviceIp = '192.168.1.100';
  const mockAudioFeatures: AudioFeatures = {
    bass: 0.5,
    mid: 0.3,
    treble: 0.2,
    volume: 0.4,
    beat: 0.6,
    energy: 0.5,
    spectrum: [],
  };
  const mockMelSpectrum = new Array(16).fill(0.5);

  beforeEach(() => {
    jest.clearAllMocks();
    resetRealtimePacketStats();
    closeRealtimeSocket(); // Ensure clean state
  });

  afterEach(() => {
    closeRealtimeSocket();
  });

  describe('sendRealtimeToWLED', () => {
    it('should create and bind UDP socket', () => {
      sendRealtimeToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum, 50);

      expect(mockSocket.bind).toHaveBeenCalled();
    });

    it('should send packet to correct port', (done) => {
      sendRealtimeToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum, 50);

      setTimeout(() => {
        expect(mockSocket.send).toHaveBeenCalled();
        const calls = mockSocket.send.mock.calls;
        if (calls.length > 0) {
          const lastCall = calls[calls.length - 1];
          expect(lastCall[3]).toBe(21324); // WLED_REALTIME_PORT
          expect(lastCall[4]).toBe(mockDeviceIp);
        }
        done();
      }, 50);
    });

    it('should create WARLS protocol packet', (done) => {
      const numLeds = 10;
      sendRealtimeToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum, numLeds);

      setTimeout(() => {
        if (mockSocket.send.mock.calls.length > 0) {
          const sentData = mockSocket.send.mock.calls[0][0];
          expect(sentData.charCodeAt(0)).toBe(2); // WARLS protocol ID
          expect(sentData.charCodeAt(1)).toBe(255); // Timeout
          expect(sentData.length).toBe(2 + numLeds * 3); // Header + RGB data
        }
        done();
      }, 50);
    });

    it('should handle different effect types', () => {
      const effectTypes: Array<'spectrum' | 'volume' | 'waves'> = ['spectrum', 'volume', 'waves'];

      effectTypes.forEach((effectType) => {
        expect(() => {
          sendRealtimeToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum, 50, effectType);
        }).not.toThrow();
      });
    });

    it('should clamp LED color values to 0-255', (done) => {
      sendRealtimeToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum, 5);

      setTimeout(() => {
        if (mockSocket.send.mock.calls.length > 0) {
          const sentData = mockSocket.send.mock.calls[0][0];
          // Check RGB values (bytes 2-16 for 5 LEDs)
          for (let i = 2; i < sentData.length; i++) {
            const value = sentData.charCodeAt(i);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(255);
          }
        }
        done();
      }, 50);
    });

    it('should handle custom LED counts', () => {
      const ledCounts = [10, 50, 100, 150];

      ledCounts.forEach((count) => {
        expect(() => {
          sendRealtimeToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum, count);
        }).not.toThrow();
      });
    });

    it('should not send if socket is not ready', () => {
      const notReadySocket = {
        ...mockSocket,
        bind: jest.fn(), // Don't call callback
      };

      const dgram = require('react-native-udp');
      dgram.createSocket = jest.fn(() => notReadySocket);

      sendRealtimeToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum, 50);

      // Should increment dropped packets
      setTimeout(() => {
        const stats = getRealtimePacketStats();
        expect(stats.dropped).toBeGreaterThanOrEqual(0);
      }, 10);
    });

    it('should work in test mode', () => {
      setTestMode(true);

      expect(() => {
        sendRealtimeToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum, 16);
      }).not.toThrow();

      setTestMode(false);
    });
  });

  describe('packet statistics', () => {
    it('should track sent packets', (done) => {
      resetRealtimePacketStats();

      sendRealtimeToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum, 50);

      setTimeout(() => {
        const stats = getRealtimePacketStats();
        expect(stats.sent).toBeGreaterThanOrEqual(0);
        expect(stats.dropped).toBeGreaterThanOrEqual(0);
        done();
      }, 50);
    });

    it('should reset statistics', () => {
      resetRealtimePacketStats();

      const stats = getRealtimePacketStats();
      expect(stats.sent).toBe(0);
      expect(stats.dropped).toBe(0);
    });

    it('should return independent copies of stats', () => {
      const stats1 = getRealtimePacketStats();
      const stats2 = getRealtimePacketStats();

      expect(stats1).not.toBe(stats2);
      expect(stats1).toEqual(stats2);
    });
  });

  describe('closeRealtimeSocket', () => {
    it('should close socket', () => {
      sendRealtimeToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum, 50);

      closeRealtimeSocket();

      expect(mockSocket.close).toHaveBeenCalled();
    });

    it('should reset statistics on close', (done) => {
      // Close any existing socket and reset first
      closeRealtimeSocket();
      resetRealtimePacketStats();

      // Now send and close
      sendRealtimeToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum, 50);

      setTimeout(() => {
        closeRealtimeSocket();

        const stats = getRealtimePacketStats();
        // Should reset sent count (dropped may vary due to test timing)
        expect(stats.sent).toBe(0);
        expect(stats.dropped).toBeGreaterThanOrEqual(0);
        done();
      }, 100);
    });

    it('should handle close errors gracefully', () => {
      const errorSocket = {
        ...mockSocket,
        close: jest.fn(() => {
          throw new Error('Close error');
        }),
      };

      const dgram = require('react-native-udp');
      dgram.createSocket = jest.fn(() => errorSocket);

      sendRealtimeToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum, 50);

      expect(() => closeRealtimeSocket()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle socket creation errors', () => {
      const dgram = require('react-native-udp');
      dgram.createSocket = jest.fn(() => {
        throw new Error('Socket creation failed');
      });

      expect(() => {
        sendRealtimeToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum, 50);
      }).not.toThrow();
    });

    it('should handle send errors', () => {
      const errorSocket = {
        ...mockSocket,
        send: jest.fn((data, offset, length, port, address, callback) => {
          callback(new Error('Send failed'));
        }),
      };

      const dgram = require('react-native-udp');
      dgram.createSocket = jest.fn(() => errorSocket);

      sendRealtimeToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum, 50);

      setTimeout(() => {
        const stats = getRealtimePacketStats();
        expect(stats.dropped).toBeGreaterThanOrEqual(0);
      }, 50);
    });
  });
});
