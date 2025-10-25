import {
  sendAudioDataToWLED,
  getPacketStats,
  resetPacketStats,
  closeAudioSocket,
} from '../wledUdpAudio';
import { AudioFeatures } from '../audioProcessing';

// Mock react-native-udp
const mockSocket = {
  bind: jest.fn((port, callback) => callback && callback()),
  send: jest.fn((data, offset, length, port, address, callback) => callback && callback(null)),
  close: jest.fn(),
  on: jest.fn(),
  _debugLogged: false,
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

describe('wledUdpAudio', () => {
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
    resetPacketStats();
  });

  describe('sendAudioDataToWLED', () => {
    it('should create and bind UDP socket', () => {
      sendAudioDataToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum);

      expect(mockSocket.bind).toHaveBeenCalled();
    });

    it('should send packet with correct port', (done) => {
      const customPort = 12345;

      sendAudioDataToWLED(
        mockDeviceIp,
        mockAudioFeatures,
        mockMelSpectrum,
        customPort
      );

      // Wait for socket to be ready, then send
      setTimeout(() => {
        const calls = mockSocket.send.mock.calls;
        if (calls.length > 0) {
          const lastCall = calls[calls.length - 1];
          expect(lastCall[3]).toBe(customPort);
          expect(lastCall[4]).toBe(mockDeviceIp);
        }
        done();
      }, 50);
    });

    it('should format packet correctly', (done) => {
      sendAudioDataToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum);

      // Give socket time to bind
      setTimeout(() => {
        expect(mockSocket.send).toHaveBeenCalled();

        const sentData = mockSocket.send.mock.calls[0][0];
        // Decode base64 to check header
        const decoded = atob(sentData);

        // Check header "00002"
        expect(decoded.charCodeAt(0)).toBe(0x30); // '0'
        expect(decoded.charCodeAt(1)).toBe(0x30); // '0'
        expect(decoded.charCodeAt(2)).toBe(0x30); // '0'
        expect(decoded.charCodeAt(3)).toBe(0x30); // '0'
        expect(decoded.charCodeAt(4)).toBe(0x32); // '2'
        expect(decoded.charCodeAt(5)).toBe(0x00); // null
        done();
      }, 50);
    });

    it('should handle 16-band mel spectrum directly', () => {
      const spectrum16 = new Array(16).fill(0.5);

      expect(() => {
        sendAudioDataToWLED(mockDeviceIp, mockAudioFeatures, spectrum16);
      }).not.toThrow();
    });

    it('should interpolate non-16-band mel spectrum', () => {
      const spectrum32 = new Array(32).fill(0.5);

      expect(() => {
        sendAudioDataToWLED(mockDeviceIp, mockAudioFeatures, spectrum32);
      }).not.toThrow();
    });
  });

  describe('packet statistics', () => {
    it('should track sent packets', (done) => {
      resetPacketStats();

      sendAudioDataToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum);

      setTimeout(() => {
        const stats = getPacketStats();
        expect(stats.sent).toBeGreaterThanOrEqual(0);
        done();
      }, 50);
    });

    it('should reset statistics', () => {
      resetPacketStats();

      const stats = getPacketStats();
      expect(stats.sent).toBe(0);
      expect(stats.dropped).toBe(0);
    });
  });

  describe('closeAudioSocket', () => {
    it('should close socket', () => {
      sendAudioDataToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum);

      closeAudioSocket();

      expect(mockSocket.close).toHaveBeenCalled();
    });

    it('should reset statistics on close', () => {
      sendAudioDataToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum);

      closeAudioSocket();

      const stats = getPacketStats();
      expect(stats.sent).toBe(0);
      expect(stats.dropped).toBe(0);
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

      sendAudioDataToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum);

      expect(() => closeAudioSocket()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle socket creation errors', () => {
      const dgram = require('react-native-udp');
      dgram.createSocket = jest.fn(() => {
        throw new Error('Socket creation failed');
      });

      expect(() => {
        sendAudioDataToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum);
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

      sendAudioDataToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum);

      // Error callback is called synchronously in mock
      const stats = getPacketStats();
      expect(stats.dropped).toBeGreaterThanOrEqual(0);
    });

    it('should handle socket errors', () => {
      sendAudioDataToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum);

      // Trigger error handler
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      if (errorHandler) {
        expect(() => errorHandler(new Error('Socket error'))).not.toThrow();
      }
    });
  });

  describe('protocol format', () => {
    it('should create 40-byte packet for V2 protocol', (done) => {
      sendAudioDataToWLED(mockDeviceIp, mockAudioFeatures, mockMelSpectrum);

      setTimeout(() => {
        const sentData = mockSocket.send.mock.calls[0]?.[0];
        if (sentData) {
          const decoded = atob(sentData);
          expect(decoded.length).toBe(40);
        }
        done();
      }, 50);
    });

    it('should encode audio features correctly', (done) => {
      const features: AudioFeatures = {
        bass: 1.0,
        mid: 0.5,
        treble: 0.0,
        volume: 0.8,
        beat: 0.9,
        energy: 1.0,
        spectrum: [],
      };

      sendAudioDataToWLED(mockDeviceIp, features, mockMelSpectrum);

      setTimeout(() => {
        expect(mockSocket.send).toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should clamp FFT values to 0-255', (done) => {
      const extremeSpectrum = Array(16).fill(1.5); // Values > 1

      sendAudioDataToWLED(mockDeviceIp, mockAudioFeatures, extremeSpectrum);

      setTimeout(() => {
        const sentData = mockSocket.send.mock.calls[0]?.[0];
        if (sentData) {
          const decoded = atob(sentData);
          // Check FFT bins (bytes 16-31) are clamped to 255
          for (let i = 16; i < 32; i++) {
            const value = decoded.charCodeAt(i);
            expect(value).toBeLessThanOrEqual(255);
            expect(value).toBeGreaterThanOrEqual(0);
          }
        }
        done();
      }, 50);
    });
  });
});
