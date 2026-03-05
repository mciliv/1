const base = require('./jest.base');

module.exports = {
  ...base,
  displayName: 'e2e',
  testMatch: [
    '<rootDir>/tests/suites/e2e/**/*.test.js'
  ],
  testTimeout: 120000,
  globalSetup: '<rootDir>/tests/e2e-setup.js',
  globalTeardown: '<rootDir>/tests/e2e-teardown.js'
};
