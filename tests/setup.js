/**
 * Jest setup file for all test environments
 */

// Load environment variables for testing (optional)
// require('../src/core/services');

// Polyfill window.matchMedia for jsdom (used by device.js, xterm, etc.)
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {} });
}

// Mock fetch globally for tests (skip smoke tests)
const isSmokeTest = process.env.npm_lifecycle_event === 'test:smoke' || 
                   (typeof expect !== 'undefined' && expect.getState().testPath.includes('smoke.test.js'));
if (!isSmokeTest) {
  global.fetch = jest.fn();
}

// Setup console spies for cleaner test output
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to mock environment variables
  mockEnv: (envVars) => {
    const originalEnv = { ...process.env };
    Object.assign(process.env, envVars);
    return () => Object.assign(process.env, originalEnv);
  }
};