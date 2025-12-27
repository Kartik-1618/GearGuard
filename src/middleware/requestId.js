/**
 * Request ID middleware for error tracking and logging
 */

const crypto = require('crypto');

/**
 * Generate a unique request ID
 * @returns {string} Unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Middleware to add unique request ID to each request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requestIdMiddleware(req, res, next) {
  // Generate unique request ID
  req.id = req.get('X-Request-ID') || generateRequestId();
  
  // Add request ID to response headers for client tracking
  res.set('X-Request-ID', req.id);
  
  // Add request start time for performance tracking
  req.startTime = Date.now();
  
  next();
}

module.exports = {
  requestIdMiddleware,
  generateRequestId
};