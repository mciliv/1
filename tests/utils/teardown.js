/**
 * Global teardown for all tests
 * This runs once after all test suites complete
 */

const fs = require('fs');
const path = require('path');

module.exports = async (globalConfig) => {
  console.log('Running global test teardown...');

  // Clean up test files if not in CI
  if (!process.env.CI) {
    // data/sdf is the shared cache — don't delete it after tests
  }

  // Close any open database connections
  if (global.__TEST_DB__) {
    try {
      await global.__TEST_DB__.close();
      console.log('Closed test database connection');
    } catch (error) {
      console.warn('Failed to close test database:', error.message);
    }
  }

  // Clean up any test server instances
  if (global.__TEST_SERVER__) {
    try {
      await new Promise((resolve, reject) => {
        global.__TEST_SERVER__.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('Closed test server');
    } catch (error) {
      console.warn('Failed to close test server:', error.message);
    }
  }

  console.log('Global test teardown complete');
};
