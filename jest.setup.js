// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-udp
jest.mock('react-native-udp', () => ({
  createSocket: jest.fn(() => ({
    bind: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
}));

// Mock expo-audio
jest.mock('expo-audio', () => ({
  Audio: {
    Recording: jest.fn(),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  },
}));

// Mock expo-font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

// Mock react-native-service-discovery
jest.mock('@inthepocket/react-native-service-discovery', () => ({
  ServiceDiscovery: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    on: jest.fn(),
  })),
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock Text component for font setup
jest.mock('react-native/Libraries/Text/Text', () => 'Text');

// Global fetch mock
global.fetch = jest.fn();

// Global __DEV__ flag
global.__DEV__ = true;

// Suppress console warnings/errors during tests (optional)
global.console = {
  ...console,
  // Uncomment to suppress logs during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
