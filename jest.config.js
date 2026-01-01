/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/plugin/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'plugin/src/**/*.ts',
    '!plugin/src/**/*.d.ts',
    '!plugin/src/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};
