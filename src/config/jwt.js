const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload containing user data
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'gearguard-api',
    audience: 'gearguard-client'
  });
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload containing user data
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required for refresh tokens');
  }
  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'gearguard-api',
    audience: 'gearguard-client'
  });
};

/**
 * Verify JWT access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'gearguard-api',
    audience: 'gearguard-client'
  });
};

/**
 * Verify JWT refresh token
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required for refresh tokens');
  }
  return jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer: 'gearguard-api',
    audience: 'gearguard-client'
  });
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN
};