const base = require('./jest.base');

module.exports = {
  ...base,
  displayName: 'integration',
  testMatch: [
    '<rootDir>/tests/suites/integration/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  testTimeout: 60000
};
