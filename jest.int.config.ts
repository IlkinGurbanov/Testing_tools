// jest.int.config.ts
import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

export default createJestConfig({
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/contract/**/*.test.ts',
  ],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  setupFiles: ['<rootDir>/tests/setup/env.ts'],
  globalSetup: '<rootDir>/tests/setup/global-setup.ts',
  collectCoverageFrom: ['src/server/**/*.ts', 'src/lib/**/*.ts', 'src/app/api/**/*.ts'],
  // testTimeout: 20000,
});