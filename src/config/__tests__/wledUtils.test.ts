import {
  buildWledUrl,
  fetchWithTimeout,
  formatApiResponse,
  parseTimeString,
  convertDaysToWledBitmask,
  extractNumericValue,
  extractStringValue,
} from '../wledUtils';

// Mock global fetch
global.fetch = jest.fn();

describe('wledUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('buildWledUrl', () => {
    it('should build URL with IP address', () => {
      const url = buildWledUrl('192.168.137.163', 'http', '/json');
      expect(url).toBe('http://192.168.137.163/json');
    });

    it('should build URL with HTTPS protocol', () => {
      const url = buildWledUrl('192.168.137.163', 'https', '/json/state');
      expect(url).toBe('https://192.168.137.163/json/state');
    });

    it('should append .local to mDNS names', () => {
      const url = buildWledUrl('wled-device', 'http', '/json');
      expect(url).toBe('http://wled-device.local/json');
    });

    it('should not append .local if already present', () => {
      const url = buildWledUrl('wled-device.local', 'http', '/json');
      expect(url).toBe('http://wled-device.local/json');
    });

    it('should not append .local to IP addresses', () => {
      const url = buildWledUrl('10.0.0.1', 'http', '/json');
      expect(url).toBe('http://10.0.0.1/json');
    });

    it('should handle edge case IP addresses', () => {
      expect(buildWledUrl('0.0.0.0', 'http', '/test')).toBe('http://0.0.0.0/test');
      expect(buildWledUrl('255.255.255.255', 'http', '/test')).toBe('http://255.255.255.255/test');
      expect(buildWledUrl('127.0.0.1', 'http', '/test')).toBe('http://127.0.0.1/test');
    });

    it('should handle hostnames with ports', () => {
      const url = buildWledUrl('192.168.1.1:8080', 'http', '/json');
      expect(url).toBe('http://192.168.1.1:8080/json');
    });

    it('should handle various path formats', () => {
      expect(buildWledUrl('192.168.1.1', 'http', '/json')).toBe('http://192.168.1.1/json');
      expect(buildWledUrl('192.168.1.1', 'http', '/api/state')).toBe('http://192.168.1.1/api/state');
      expect(buildWledUrl('192.168.1.1', 'http', '')).toBe('http://192.168.1.1');
    });

    it('should handle default protocol parameter', () => {
      // Function has default parameter = 'http'
      const url = buildWledUrl('192.168.1.1', undefined as any, '/json');
      expect(url).toBe('http://192.168.1.1/json');
    });

    it('should handle empty device address', () => {
      const url = buildWledUrl('', 'http', '/json');
      expect(url).toBe('http:///json');
    });
  });

  describe('fetchWithTimeout', () => {
    it('should successfully fetch and parse JSON', async () => {
      const mockData = { state: { on: true } };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const promise = fetchWithTimeout('http://test.local/json');
      jest.runAllTimers();
      const result = await promise;

      expect(result).toEqual({
        success: true,
        data: mockData,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test.local/json',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('should handle custom timeout', async () => {
      const mockData = { test: 'data' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const promise = fetchWithTimeout('http://test.local/json', { timeout: 10000 });
      jest.runAllTimers();
      const result = await promise;

      expect(result.success).toBe(true);
    });

    it('should handle HTTP error responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const promise = fetchWithTimeout('http://test.local/json');
      jest.runAllTimers();
      const result = await promise;

      expect(result).toEqual({
        success: false,
        status: 404,
        error: 'HTTP 404: Not Found',
      });
    });

    it('should handle parse errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      const promise = fetchWithTimeout('http://test.local/json');
      jest.runAllTimers();
      const result = await promise;

      expect(result).toEqual({
        success: false,
        error: 'Parse error: Invalid JSON',
      });
    });

    it('should handle abort errors', async () => {
      // Test that AbortError is handled correctly
      (global.fetch as jest.Mock).mockRejectedValueOnce({
        name: 'AbortError',
        message: 'The operation was aborted',
      });

      const promise = fetchWithTimeout('http://test.local/json');
      jest.runAllTimers();
      const result = await promise;

      expect(result).toEqual({
        success: false,
        error: 'Request timeout',
      });
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const promise = fetchWithTimeout('http://test.local/json');
      jest.runAllTimers();
      const result = await promise;

      expect(result).toEqual({
        success: false,
        error: 'Request failed: Network error',
      });
    });

    it('should use custom parse function', async () => {
      const mockText = 'custom text response';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockText),
      });

      const customParser = (r: Response) => r.text();
      const promise = fetchWithTimeout('http://test.local/data', {}, customParser);
      jest.runAllTimers();
      const result = await promise;

      expect(result).toEqual({
        success: true,
        data: mockText,
      });
    });

    it('should include custom fetch options', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      const promise = fetchWithTimeout('http://test.local/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });
      jest.runAllTimers();
      await promise;

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test.local/json',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true }),
        })
      );
    });
  });

  describe('formatApiResponse', () => {
    it('should format successful response without data', () => {
      const response = formatApiResponse(true, 'Operation successful');
      expect(response).toEqual({
        success: true,
        message: 'Operation successful',
      });
    });

    it('should format successful response with data', () => {
      const data = { presets: [1, 2, 3] };
      const response = formatApiResponse(true, 'Presets loaded', data);
      expect(response).toEqual({
        success: true,
        message: 'Presets loaded',
        data,
      });
    });

    it('should format error response', () => {
      const response = formatApiResponse(false, 'Operation failed');
      expect(response).toEqual({
        success: false,
        message: 'Operation failed',
      });
    });

    it('should handle undefined data', () => {
      const response = formatApiResponse(true, 'Success', undefined);
      expect(response).toEqual({
        success: true,
        message: 'Success',
      });
    });

    it('should handle null data', () => {
      const response = formatApiResponse(true, 'Success', null);
      expect(response).toEqual({
        success: true,
        message: 'Success',
      });
    });

    it('should handle empty object data', () => {
      const response = formatApiResponse(true, 'Success', {});
      expect(response).toEqual({
        success: true,
        message: 'Success',
        data: {},
      });
    });

    it('should handle empty string message', () => {
      const response = formatApiResponse(true, '');
      expect(response).toEqual({
        success: true,
        message: '',
      });
    });
  });

  describe('parseTimeString', () => {
    it('should parse valid time string', () => {
      const result = parseTimeString('14:30');
      expect(result).toEqual({ hour: 14, minute: 30 });
    });

    it('should parse midnight', () => {
      const result = parseTimeString('00:00');
      expect(result).toEqual({ hour: 0, minute: 0 });
    });

    it('should parse noon', () => {
      const result = parseTimeString('12:00');
      expect(result).toEqual({ hour: 12, minute: 0 });
    });

    it('should parse end of day', () => {
      const result = parseTimeString('23:59');
      expect(result).toEqual({ hour: 23, minute: 59 });
    });

    it('should handle single digit hours', () => {
      const result = parseTimeString('9:15');
      expect(result).toEqual({ hour: 9, minute: 15 });
    });

    it('should handle single digit minutes', () => {
      const result = parseTimeString('14:5');
      expect(result).toEqual({ hour: 14, minute: 5 });
    });

    it('should handle invalid time string', () => {
      const result = parseTimeString('invalid');
      expect(result).toEqual({ hour: 0, minute: 0 });
    });

    it('should handle empty string', () => {
      const result = parseTimeString('');
      expect(result).toEqual({ hour: 0, minute: 0 });
    });

    it('should handle missing minute', () => {
      const result = parseTimeString('14:');
      expect(result).toEqual({ hour: 14, minute: 0 });
    });

    it('should handle missing hour', () => {
      const result = parseTimeString(':30');
      expect(result).toEqual({ hour: 0, minute: 30 });
    });
  });

  describe('convertDaysToWledBitmask', () => {
    it('should convert empty set to 0', () => {
      const result = convertDaysToWledBitmask(new Set());
      expect(result).toBe(0);
    });

    it('should convert Monday (1) to WLED bit 1', () => {
      const result = convertDaysToWledBitmask(new Set([1]));
      // Bit 1 = 2, plus enable bit (1) = 3
      expect(result).toBe(3);
    });

    it('should convert Sunday (0) to WLED bit 7', () => {
      const result = convertDaysToWledBitmask(new Set([0]));
      // Bit 7 = 128, plus enable bit (1) = 129
      expect(result).toBe(129);
    });

    it('should convert Saturday (6) to WLED bit 6', () => {
      const result = convertDaysToWledBitmask(new Set([6]));
      // Bit 6 = 64, plus enable bit (1) = 65
      expect(result).toBe(65);
    });

    it('should convert all weekdays (Mon-Fri)', () => {
      const result = convertDaysToWledBitmask(new Set([1, 2, 3, 4, 5]));
      // Bits 1-5: 2+4+8+16+32 = 62, plus enable bit = 63
      expect(result).toBe(63);
    });

    it('should convert all days (0-6)', () => {
      const result = convertDaysToWledBitmask(new Set([0, 1, 2, 3, 4, 5, 6]));
      // All bits 1-7: 2+4+8+16+32+64+128 = 254, plus enable bit = 255
      expect(result).toBe(255);
    });

    it('should convert weekend (Sat-Sun)', () => {
      const result = convertDaysToWledBitmask(new Set([0, 6]));
      // Bits 7 and 6: 128+64 = 192, plus enable bit = 193
      expect(result).toBe(193);
    });

    it('should handle single day (Tuesday)', () => {
      const result = convertDaysToWledBitmask(new Set([2]));
      // Bit 2 = 4, plus enable bit = 5
      expect(result).toBe(5);
    });

    it('should handle non-contiguous days', () => {
      const result = convertDaysToWledBitmask(new Set([1, 3, 5]));
      // Bits 1, 3, 5: 2+8+32 = 42, plus enable bit = 43
      expect(result).toBe(43);
    });

    it('should ignore invalid day values', () => {
      const result = convertDaysToWledBitmask(new Set([1, 99]));
      // Only bit 1 valid: 2, plus enable bit = 3
      expect(result).toBe(3);
    });

    it('should ignore negative day values', () => {
      const result = convertDaysToWledBitmask(new Set([-1, 1]));
      // Only bit 1 valid: 2, plus enable bit = 3
      expect(result).toBe(3);
    });
  });

  describe('extractNumericValue', () => {
    it('should extract numeric value from JavaScript string', () => {
      const jsText = 'd.Sf.field1.value = 123;';
      const result = extractNumericValue(jsText, 'field1');
      expect(result).toBe(123);
    });

    it('should extract value with multiple digits', () => {
      const jsText = 'd.Sf.brightness.value = 255;';
      const result = extractNumericValue(jsText, 'brightness');
      expect(result).toBe(255);
    });

    it('should extract zero value', () => {
      const jsText = 'd.Sf.counter.value = 0;';
      const result = extractNumericValue(jsText, 'counter');
      expect(result).toBe(0);
    });

    it('should return null for non-existent field', () => {
      const jsText = 'd.Sf.field1.value = 123;';
      const result = extractNumericValue(jsText, 'field2');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = extractNumericValue('', 'field1');
      expect(result).toBeNull();
    });

    it('should handle whitespace in JavaScript', () => {
      const jsText = 'd.Sf.field1.value  =  123 ;';
      const result = extractNumericValue(jsText, 'field1');
      expect(result).toBe(123);
    });

    it('should extract from string with multiple fields', () => {
      const jsText = `
        d.Sf.field1.value = 123;
        d.Sf.field2.value = 456;
        d.Sf.field3.value = 789;
      `;
      expect(extractNumericValue(jsText, 'field1')).toBe(123);
      expect(extractNumericValue(jsText, 'field2')).toBe(456);
      expect(extractNumericValue(jsText, 'field3')).toBe(789);
    });

    it('should return null for string value', () => {
      const jsText = 'd.Sf.field1.value = "123";';
      const result = extractNumericValue(jsText, 'field1');
      expect(result).toBeNull();
    });
  });

  describe('extractStringValue', () => {
    it('should extract string value from JavaScript string', () => {
      const jsText = 'd.Sf.deviceName.value = "My WLED";';
      const result = extractStringValue(jsText, 'deviceName');
      expect(result).toBe('My WLED');
    });

    it('should extract empty string', () => {
      const jsText = 'd.Sf.field1.value = "";';
      const result = extractStringValue(jsText, 'field1');
      expect(result).toBe('');
    });

    it('should return null for non-existent field', () => {
      const jsText = 'd.Sf.field1.value = "test";';
      const result = extractStringValue(jsText, 'field2');
      expect(result).toBeNull();
    });

    it('should return null for empty input', () => {
      const result = extractStringValue('', 'field1');
      expect(result).toBeNull();
    });

    it('should handle whitespace in JavaScript', () => {
      const jsText = 'd.Sf.field1.value  =  "test" ;';
      const result = extractStringValue(jsText, 'field1');
      expect(result).toBe('test');
    });

    it('should extract from string with multiple fields', () => {
      const jsText = `
        d.Sf.name.value = "Device 1";
        d.Sf.location.value = "Living Room";
      `;
      expect(extractStringValue(jsText, 'name')).toBe('Device 1');
      expect(extractStringValue(jsText, 'location')).toBe('Living Room');
    });

    it('should handle strings with spaces', () => {
      const jsText = 'd.Sf.field1.value = "test value with spaces";';
      const result = extractStringValue(jsText, 'field1');
      expect(result).toBe('test value with spaces');
    });

    it('should return null for numeric value', () => {
      const jsText = 'd.Sf.field1.value = 123;';
      const result = extractStringValue(jsText, 'field1');
      expect(result).toBeNull();
    });

    it('should handle special characters in string', () => {
      const jsText = 'd.Sf.field1.value = "test-value_123";';
      const result = extractStringValue(jsText, 'field1');
      expect(result).toBe('test-value_123');
    });
  });
});
