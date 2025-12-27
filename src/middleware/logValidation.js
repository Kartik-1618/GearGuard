const { body, param, query, validationResult } = require('express-validator');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Handle validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
        timestamp: new Date().toISOString()
      }
    });
  }
  next();
};

/**
 * Validate request ID parameter
 */
const validateRequestIdParam = [
  param('requestId')
    .isInt({ min: 1 })
    .withMessage('Request ID must be a positive integer'),
  handleValidationErrors
];

/**
 * Validate pagination query parameters
 */
const validatePaginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

/**
 * Validate log filtering query parameters
 */
const validateLogFilters = [
  query('requestId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Request ID must be a positive integer'),
  query('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  query('status')
    .optional()
    .isIn(['NEW', 'IN_PROGRESS', 'REPAIRED', 'SCRAP'])
    .withMessage('Status must be one of: NEW, IN_PROGRESS, REPAIRED, SCRAP'),
  query('fromDate')
    .optional()
    .isISO8601()
    .withMessage('From date must be a valid ISO 8601 date'),
  query('toDate')
    .optional()
    .isISO8601()
    .withMessage('To date must be a valid ISO 8601 date'),
  handleValidationErrors
];

/**
 * Validate date range for statistics
 */
const validateStatisticsFilters = [
  query('fromDate')
    .optional()
    .isISO8601()
    .withMessage('From date must be a valid ISO 8601 date'),
  query('toDate')
    .optional()
    .isISO8601()
    .withMessage('To date must be a valid ISO 8601 date'),
  // Custom validation to ensure fromDate is before toDate
  query('fromDate').custom((fromDate, { req }) => {
    if (fromDate && req.query.toDate) {
      const from = new Date(fromDate);
      const to = new Date(req.query.toDate);
      if (from >= to) {
        throw new Error('From date must be before to date');
      }
    }
    return true;
  }),
  handleValidationErrors
];

module.exports = {
  validateRequestIdParam,
  validatePaginationQuery,
  validateLogFilters,
  validateStatisticsFilters
};