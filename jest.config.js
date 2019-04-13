module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/src'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testRegex: '^.+\\/test\\/.+\\.test\\.ts$',
  moduleFileExtensions: ['ts', 'js'],
  coverageReporters: ['text', 'html', 'lcov'],
  coverageThreshold: { global: { statements: 100, branches: 100 } },
  collectCoverageFrom: ['src/**/*.ts'],
}
