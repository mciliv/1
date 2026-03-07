const base = require('./jest.base');

module.exports = {
  ...base,
  displayName: 'unit',
  testMatch: [
    '<rootDir>/tests/suites/unit/**/*.test.js',
    '<rootDir>/tests/unit/**/*.spec.js',
    '<rootDir>/tests/unit/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/client/dist/**',
    '!src/**/*.test.{js,jsx}',
    '!src/**/*.spec.{js,jsx}'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10
    }
  }
};
