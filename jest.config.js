module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@inthepocket/react-native-service-discovery)',
  ],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/types/**',
    // Exclude React components and hooks (need integration tests)
    '!src/components/**/*.tsx',
    '!src/hooks/**/*.ts',
    '!src/contexts/**/*.tsx',
    '!src/screens/**/*.tsx',
    // Exclude services that need integration tests
    '!src/services/deviceMonitor.ts',
    '!src/services/wled/WledWebSocketService.ts',
    // Exclude barrel exports (no logic)
    '!src/**/index.ts',
    '!src/config/wledApi.ts',
    // Exclude styles (no executable code - just style objects)
    '!src/**/*[Ss]tyles.ts',
    '!src/**/*[Ss]tyles.tsx',
    // Exclude files that require integration testing
    '!src/utils/wledMdnsDiscovery.ts',
    '!src/config/wledPresets.ts',
    '!src/config/wledTimer.ts',
    '!src/utils/wledUdpRealtime.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 75,
      statements: 75,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  globals: {
    __DEV__: true,
  },
};
