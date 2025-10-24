import { ipToDeviceId, deviceIdToIp } from '../deviceId';

describe('deviceId utilities', () => {
  describe('ipToDeviceId', () => {
    it('should convert valid IPv4 address to numeric ID', () => {
      const ip = '192.168.137.163';
      const id = ipToDeviceId(ip);
      expect(id).toBe(3232270755); // 192*256^3 + 168*256^2 + 137*256 + 163
    });

    it('should handle IP addresses with protocol prefix', () => {
      const httpIp = 'http://192.168.137.163';
      const httpsIp = 'https://192.168.137.163';
      const expectedId = 3232270755;

      expect(ipToDeviceId(httpIp)).toBe(expectedId);
      expect(ipToDeviceId(httpsIp)).toBe(expectedId);
    });

    it('should handle IP addresses with port numbers', () => {
      const ipWithPort = '192.168.137.163:80';
      const expectedId = 3232270755;
      expect(ipToDeviceId(ipWithPort)).toBe(expectedId);
    });

    it('should handle IP addresses with both protocol and port', () => {
      const fullAddress = 'http://192.168.137.163:8080';
      const expectedId = 3232270755;
      expect(ipToDeviceId(fullAddress)).toBe(expectedId);
    });

    it('should handle minimum IP address (0.0.0.0)', () => {
      const ip = '0.0.0.0';
      expect(ipToDeviceId(ip)).toBe(0);
    });

    it('should handle maximum IP address (255.255.255.255)', () => {
      const ip = '255.255.255.255';
      expect(ipToDeviceId(ip)).toBe(4294967295); // 2^32 - 1
    });

    it('should handle localhost', () => {
      const ip = '127.0.0.1';
      expect(ipToDeviceId(ip)).toBe(2130706433);
    });

    it('should handle IP with whitespace', () => {
      const ip = '  192.168.137.163  ';
      const expectedId = 3232270755;
      expect(ipToDeviceId(ip)).toBe(expectedId);
    });

    it('should use hash fallback for invalid IP format', () => {
      const invalidIp = '999.999.999.999';
      const id = ipToDeviceId(invalidIp);
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });

    it('should use hash fallback for non-IP strings', () => {
      const hostname = 'wled-device.local';
      const id = ipToDeviceId(hostname);
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });

    it('should use hash fallback for malformed IP (too few octets)', () => {
      const malformedIp = '192.168.1';
      const id = ipToDeviceId(malformedIp);
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });

    it('should use hash fallback for malformed IP (too many octets)', () => {
      const malformedIp = '192.168.1.1.1';
      const id = ipToDeviceId(malformedIp);
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });

    it('should use hash fallback for IP with non-numeric octets', () => {
      const invalidIp = '192.168.abc.100';
      const id = ipToDeviceId(invalidIp);
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });

    it('should use hash fallback for negative octets', () => {
      const invalidIp = '192.168.-1.100';
      const id = ipToDeviceId(invalidIp);
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });

    it('should produce consistent IDs for the same IP', () => {
      const ip = '192.168.1.100';
      const id1 = ipToDeviceId(ip);
      const id2 = ipToDeviceId(ip);
      expect(id1).toBe(id2);
    });

    it('should produce consistent hash IDs for the same invalid input', () => {
      const hostname = 'wled-device.local';
      const id1 = ipToDeviceId(hostname);
      const id2 = ipToDeviceId(hostname);
      expect(id1).toBe(id2);
    });

    it('should produce different IDs for different IPs', () => {
      const ip1 = '192.168.1.100';
      const ip2 = '192.168.1.101';
      const id1 = ipToDeviceId(ip1);
      const id2 = ipToDeviceId(ip2);
      expect(id1).not.toBe(id2);
    });
  });

  describe('deviceIdToIp', () => {
    it('should convert numeric ID back to IP address', () => {
      const id = 3232235876; // 192.168.1.100
      const ip = deviceIdToIp(id);
      expect(ip).toBe('192.168.1.100');
    });

    it('should handle ID 0 (0.0.0.0)', () => {
      const id = 0;
      const ip = deviceIdToIp(id);
      expect(ip).toBe('0.0.0.0');
    });

    it('should handle maximum valid ID (255.255.255.255)', () => {
      const id = 4294967295; // 2^32 - 1
      const ip = deviceIdToIp(id);
      expect(ip).toBe('255.255.255.255');
    });

    it('should handle localhost ID', () => {
      const id = 2130706433; // 127.0.0.1
      const ip = deviceIdToIp(id);
      expect(ip).toBe('127.0.0.1');
    });

    it('should return null for negative IDs', () => {
      const id = -1;
      const ip = deviceIdToIp(id);
      expect(ip).toBeNull();
    });

    it('should return null for IDs exceeding IPv4 max', () => {
      const id = 4294967296; // 2^32
      const ip = deviceIdToIp(id);
      expect(ip).toBeNull();
    });

    it('should return null for extremely large IDs', () => {
      const id = Number.MAX_SAFE_INTEGER;
      const ip = deviceIdToIp(id);
      expect(ip).toBeNull();
    });

    it('should correctly handle edge case IPs', () => {
      const testCases = [
        { ip: '10.0.0.1', id: 167772161 },
        { ip: '172.16.0.1', id: 2886729729 },
        { ip: '192.0.2.1', id: 3221225985 },
      ];

      testCases.forEach(({ ip, id }) => {
        expect(deviceIdToIp(id)).toBe(ip);
      });
    });
  });

  describe('round-trip conversion', () => {
    it('should successfully round-trip convert valid IPs', () => {
      const testIps = [
        '192.168.137.163',
        '10.0.0.1',
        '172.16.0.1',
        '127.0.0.1',
        '0.0.0.0',
        '255.255.255.255',
        '8.8.8.8',
        '1.1.1.1',
      ];

      testIps.forEach(ip => {
        const id = ipToDeviceId(ip);
        const convertedIp = deviceIdToIp(id);
        expect(convertedIp).toBe(ip);
      });
    });

    it('should successfully round-trip convert IDs', () => {
      const testIds = [
        0,
        1,
        16777216, // 1.0.0.0
        167772160, // 10.0.0.0
        2130706433, // 127.0.0.1
        3232235776, // 192.168.1.0
        4294967295, // 255.255.255.255
      ];

      testIds.forEach(id => {
        const ip = deviceIdToIp(id);
        expect(ip).not.toBeNull();
        const convertedId = ipToDeviceId(ip!);
        expect(convertedId).toBe(id);
      });
    });

    it('should handle round-trip with protocol and port', () => {
      const fullAddress = 'https://192.168.137.163:8080';
      const id = ipToDeviceId(fullAddress);
      const ip = deviceIdToIp(id);
      expect(ip).toBe('192.168.137.163');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty string', () => {
      const id = ipToDeviceId('');
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThanOrEqual(0);
    });

    it('should handle string with only protocol', () => {
      const id = ipToDeviceId('http://');
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThanOrEqual(0);
    });

    it('should handle special characters', () => {
      const id = ipToDeviceId('!@#$%^&*()');
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      const id = ipToDeviceId(longString);
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThanOrEqual(0);
    });

    it('should handle unicode characters', () => {
      const unicode = '192.168.1.100😀';
      const id = ipToDeviceId(unicode);
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThanOrEqual(0);
    });
  });
});
