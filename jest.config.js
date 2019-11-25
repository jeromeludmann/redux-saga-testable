module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/src'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testRegex: '^.+\\/test\\/.+\\.test\\.ts$',
  moduleFileExtensions: ['ts', 'js'],
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: { global: { statements: 100, branches: 100 } },
  collectCoverageFrom: ['src/**/*.ts'],
  moduleNameMapper: {
    '^redux-saga-testable$': '<rootDir>/src/main.ts',
    '^redux-saga-testable/(.*)$': '<rootDir>/src/$1',
  },
};
