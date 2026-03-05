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
    '!src/**/*.test.{js,jsx}',
    '!src/**/*.spec.{js,jsx}'
  ]
};
