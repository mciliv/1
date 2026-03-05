/**
 * Environment configuration for frontend and tests
 */
module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.API_BASE_URL || '',
  DEBUG: process.env.DEBUG === 'true' || false,
  VERSION: '1.0.0'
};
