import { Platform } from 'react-native';
import {
  generateAgreementSignature,
  saveAgreementSignature,
  getAgreementSignature,
  hasValidAgreement,
  clearAgreement,
  AgreementSignature,
} from '../userAgreement';
import { storage, STORAGE_KEYS } from '../storage';

// Mock the storage module
jest.mock('../storage', () => ({
  storage: {
    saveToStorage: jest.fn(),
    loadFromStorage: jest.fn(),
    removeFromStorage: jest.fn(),
  },
  STORAGE_KEYS: {
    USER_AGREEMENT: 'user_agreement',
  },
}));

// Mock the UserAgreement component
jest.mock('../../components/UserAgreement', () => ({
  AGREEMENT_VERSION: '2025-01-v1.0',
}));

describe('userAgreement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Date.now to a consistent value
    jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateAgreementSignature', () => {
    it('should generate valid signature with all required fields', () => {
      const signature = generateAgreementSignature();

      expect(signature).toHaveProperty('version');
      expect(signature).toHaveProperty('timestamp');
      expect(signature).toHaveProperty('deviceInfo');
      expect(signature).toHaveProperty('hash');
    });

    it('should include correct version', () => {
      const signature = generateAgreementSignature();
      expect(signature.version).toBe('2025-01-v1.0');
    });

    it('should include timestamp', () => {
      const signature = generateAgreementSignature();
      expect(signature.timestamp).toBe(1234567890000);
    });

    it('should include device info with platform OS and version', () => {
      const signature = generateAgreementSignature();
      expect(signature.deviceInfo).toContain(Platform.OS);
      expect(signature.deviceInfo).toContain(String(Platform.Version));
    });

    it('should generate hash from signature data', () => {
      const signature = generateAgreementSignature();
      expect(signature.hash).toBeDefined();
      expect(typeof signature.hash).toBe('string');
      expect(signature.hash.length).toBeGreaterThan(0);
    });

    it('should generate consistent hash for same inputs', () => {
      const sig1 = generateAgreementSignature();
      const sig2 = generateAgreementSignature();
      // Since timestamp is mocked to same value, hashes should match
      expect(sig1.hash).toBe(sig2.hash);
    });

    it('should generate different hash for different timestamps', () => {
      const sig1 = generateAgreementSignature();

      jest.spyOn(Date, 'now').mockReturnValue(9999999999999);
      const sig2 = generateAgreementSignature();

      expect(sig1.hash).not.toBe(sig2.hash);
    });

    it('should return hash in hexadecimal format', () => {
      const signature = generateAgreementSignature();
      expect(signature.hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate signature object matching AgreementSignature interface', () => {
      const signature = generateAgreementSignature();

      const expectedSignature: AgreementSignature = {
        version: expect.any(String),
        timestamp: expect.any(Number),
        deviceInfo: expect.any(String),
        hash: expect.any(String),
      };

      expect(signature).toMatchObject(expectedSignature);
    });
  });

  describe('saveAgreementSignature', () => {
    it('should call storage.saveToStorage with correct key and signature', async () => {
      (storage.saveToStorage as jest.Mock).mockResolvedValue(true);

      const result = await saveAgreementSignature();

      expect(storage.saveToStorage).toHaveBeenCalledWith(
        STORAGE_KEYS.USER_AGREEMENT,
        expect.objectContaining({
          version: '2025-01-v1.0',
          timestamp: 1234567890000,
          deviceInfo: expect.any(String),
          hash: expect.any(String),
        })
      );
      expect(result).toBe(true);
    });

    it('should return true on successful save', async () => {
      (storage.saveToStorage as jest.Mock).mockResolvedValue(true);

      const result = await saveAgreementSignature();
      expect(result).toBe(true);
    });

    it('should return false on failed save', async () => {
      (storage.saveToStorage as jest.Mock).mockResolvedValue(false);

      const result = await saveAgreementSignature();
      expect(result).toBe(false);
    });

    it('should handle storage errors', async () => {
      (storage.saveToStorage as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(saveAgreementSignature()).rejects.toThrow('Storage error');
    });

    it('should call storage.saveToStorage exactly once', async () => {
      (storage.saveToStorage as jest.Mock).mockResolvedValue(true);

      await saveAgreementSignature();
      expect(storage.saveToStorage).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAgreementSignature', () => {
    it('should call storage.loadFromStorage with correct key', async () => {
      const mockSignature: AgreementSignature = {
        version: '2025-01-v1.0',
        timestamp: 1234567890000,
        deviceInfo: 'ios-14.5',
        hash: 'abc123',
      };
      (storage.loadFromStorage as jest.Mock).mockResolvedValue(mockSignature);

      const result = await getAgreementSignature();

      expect(storage.loadFromStorage).toHaveBeenCalledWith(
        STORAGE_KEYS.USER_AGREEMENT,
        null
      );
      expect(result).toEqual(mockSignature);
    });

    it('should return null when no signature exists', async () => {
      (storage.loadFromStorage as jest.Mock).mockResolvedValue(null);

      const result = await getAgreementSignature();
      expect(result).toBeNull();
    });

    it('should return stored signature', async () => {
      const mockSignature: AgreementSignature = {
        version: '2025-01-v1.0',
        timestamp: 1234567890000,
        deviceInfo: 'android-11',
        hash: 'def456',
      };
      (storage.loadFromStorage as jest.Mock).mockResolvedValue(mockSignature);

      const result = await getAgreementSignature();
      expect(result).toEqual(mockSignature);
    });

    it('should handle storage errors', async () => {
      (storage.loadFromStorage as jest.Mock).mockRejectedValue(new Error('Load error'));

      await expect(getAgreementSignature()).rejects.toThrow('Load error');
    });

    it('should call storage.loadFromStorage exactly once', async () => {
      (storage.loadFromStorage as jest.Mock).mockResolvedValue(null);

      await getAgreementSignature();
      expect(storage.loadFromStorage).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasValidAgreement', () => {
    it('should return true when signature version matches current version', async () => {
      const mockSignature: AgreementSignature = {
        version: '2025-01-v1.0',
        timestamp: 1234567890000,
        deviceInfo: 'ios-14.5',
        hash: 'abc123',
      };
      (storage.loadFromStorage as jest.Mock).mockResolvedValue(mockSignature);

      const result = await hasValidAgreement();
      expect(result).toBe(true);
    });

    it('should return false when signature version does not match', async () => {
      const mockSignature: AgreementSignature = {
        version: '2024-01-v0.9', // old version
        timestamp: 1234567890000,
        deviceInfo: 'ios-14.5',
        hash: 'abc123',
      };
      (storage.loadFromStorage as jest.Mock).mockResolvedValue(mockSignature);

      const result = await hasValidAgreement();
      expect(result).toBe(false);
    });

    it('should return false when no signature exists', async () => {
      (storage.loadFromStorage as jest.Mock).mockResolvedValue(null);

      const result = await hasValidAgreement();
      expect(result).toBe(false);
    });

    it('should return false when signature is undefined', async () => {
      (storage.loadFromStorage as jest.Mock).mockResolvedValue(undefined);

      const result = await hasValidAgreement();
      expect(result).toBe(false);
    });

    it('should handle storage errors gracefully', async () => {
      (storage.loadFromStorage as jest.Mock).mockRejectedValue(new Error('Load error'));

      await expect(hasValidAgreement()).rejects.toThrow('Load error');
    });

    it('should validate version string exactly', async () => {
      const mockSignature: AgreementSignature = {
        version: '2025-01-v1.0 ', // with trailing space
        timestamp: 1234567890000,
        deviceInfo: 'ios-14.5',
        hash: 'abc123',
      };
      (storage.loadFromStorage as jest.Mock).mockResolvedValue(mockSignature);

      const result = await hasValidAgreement();
      expect(result).toBe(false); // should not match due to trailing space
    });

    it('should call getAgreementSignature internally', async () => {
      (storage.loadFromStorage as jest.Mock).mockResolvedValue(null);

      await hasValidAgreement();
      expect(storage.loadFromStorage).toHaveBeenCalledWith(
        STORAGE_KEYS.USER_AGREEMENT,
        null
      );
    });
  });

  describe('clearAgreement', () => {
    it('should call storage.removeFromStorage with correct key', async () => {
      (storage.removeFromStorage as jest.Mock).mockResolvedValue(true);

      const result = await clearAgreement();

      expect(storage.removeFromStorage).toHaveBeenCalledWith(STORAGE_KEYS.USER_AGREEMENT);
      expect(result).toBe(true);
    });

    it('should return true on successful removal', async () => {
      (storage.removeFromStorage as jest.Mock).mockResolvedValue(true);

      const result = await clearAgreement();
      expect(result).toBe(true);
    });

    it('should return false on failed removal', async () => {
      (storage.removeFromStorage as jest.Mock).mockResolvedValue(false);

      const result = await clearAgreement();
      expect(result).toBe(false);
    });

    it('should handle storage errors', async () => {
      (storage.removeFromStorage as jest.Mock).mockRejectedValue(new Error('Remove error'));

      await expect(clearAgreement()).rejects.toThrow('Remove error');
    });

    it('should call storage.removeFromStorage exactly once', async () => {
      (storage.removeFromStorage as jest.Mock).mockResolvedValue(true);

      await clearAgreement();
      expect(storage.removeFromStorage).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration workflow', () => {
    it('should save and retrieve agreement signature', async () => {
      let savedSignature: AgreementSignature | null = null;

      (storage.saveToStorage as jest.Mock).mockImplementation(async (key, value) => {
        savedSignature = value;
        return true;
      });
      (storage.loadFromStorage as jest.Mock).mockImplementation(async () => savedSignature);

      // Save signature
      const saveResult = await saveAgreementSignature();
      expect(saveResult).toBe(true);

      // Retrieve signature
      const retrievedSignature = await getAgreementSignature();
      expect(retrievedSignature).toEqual(savedSignature);
      expect(retrievedSignature?.version).toBe('2025-01-v1.0');
    });

    it('should validate saved agreement', async () => {
      let savedSignature: AgreementSignature | null = null;

      (storage.saveToStorage as jest.Mock).mockImplementation(async (key, value) => {
        savedSignature = value;
        return true;
      });
      (storage.loadFromStorage as jest.Mock).mockImplementation(async () => savedSignature);

      // Save and validate
      await saveAgreementSignature();
      const isValid = await hasValidAgreement();
      expect(isValid).toBe(true);
    });

    it('should clear agreement after saving', async () => {
      let savedSignature: AgreementSignature | null = generateAgreementSignature();

      (storage.saveToStorage as jest.Mock).mockImplementation(async (key, value) => {
        savedSignature = value;
        return true;
      });
      (storage.loadFromStorage as jest.Mock).mockImplementation(async () => savedSignature);
      (storage.removeFromStorage as jest.Mock).mockImplementation(async () => {
        savedSignature = null;
        return true;
      });

      // Save, clear, and check
      await saveAgreementSignature();
      await clearAgreement();

      const signature = await getAgreementSignature();
      expect(signature).toBeNull();
    });

    it('should invalidate agreement after version change', async () => {
      const oldSignature: AgreementSignature = {
        version: '2024-12-v0.9',
        timestamp: 1234567890000,
        deviceInfo: 'ios-14.5',
        hash: 'old123',
      };
      (storage.loadFromStorage as jest.Mock).mockResolvedValue(oldSignature);

      const isValid = await hasValidAgreement();
      expect(isValid).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty device info', () => {
      // Mock Platform to return empty values
      Object.defineProperty(Platform, 'OS', { value: '', configurable: true });
      Object.defineProperty(Platform, 'Version', { value: '', configurable: true });

      const signature = generateAgreementSignature();
      expect(signature.deviceInfo).toBe('-');
    });

    it('should handle very long hash generation', () => {
      const signature = generateAgreementSignature();
      // Hash should be hex string, could be any reasonable length
      expect(signature.hash.length).toBeGreaterThan(0);
      expect(signature.hash.length).toBeLessThan(100);
    });

    it('should generate positive hash values', () => {
      const signature = generateAgreementSignature();
      const hashValue = parseInt(signature.hash, 16);
      expect(hashValue).toBeGreaterThanOrEqual(0);
    });
  });
});
