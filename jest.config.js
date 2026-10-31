/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      // Pure TS logic (src/core & src/storage): plain node env, fast, no RN mocks.
      displayName: 'core',
      modulePathIgnorePatterns: ['<rootDir>/outputs/'],
      preset: 'jest-expo',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/core/**/*.test.ts', '<rootDir>/src/storage/**/*.test.ts'],
    },
    {
      // Components & screens with React Native Testing Library.
      displayName: 'ui',
      modulePathIgnorePatterns: ['<rootDir>/outputs/'],
      preset: 'jest-expo/ios',
      testMatch: ['<rootDir>/src/**/*.test.tsx'],
    },
  ],
  collectCoverageFrom: ['src/core/**/*.ts', '!src/core/**/__tests__/**'],
  coverageThreshold: {
    './src/core/': { branches: 90, functions: 90, lines: 90, statements: 90 },
  },
};
