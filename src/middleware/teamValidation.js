const { body, param, query, validationResult } = require('express-validator');
const { VALIDATION_RULES, ERROR_CODES, HTTP_STATUS } = require('../utils/constants');

/**
 * Validation middleware for team operations
 */

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: errors.array(),
        timestamp: new Date().toISOString()
      }
    });
  }
  next();
};

/**
 * Validation rules for creating a team
 */
const validateCreateTeam = [
  body('name')
    .trim()
    .isLength({ min: VALIDATION_RULES.NAME_MIN_LENGTH, max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Team name must be between ${VALIDATION_RULES.NAME_MIN_LENGTH} and ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Team name can only contain letters, numbers, spaces, hyphens, and underscores'),

  handleValidationErrors
];

/**
 * Validation rules for updating a team
 */
const validateUpdateTeam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: VALIDATION_RULES.NAME_MIN_LENGTH, max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Team name must be between ${VALIDATION_RULES.NAME_MIN_LENGTH} and ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Team name can only contain letters, numbers, spaces, hyphens, and underscores'),

  handleValidationErrors
];

/**
 * Validation rules for team ID parameter
 */
const validateTeamId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer'),

  handleValidationErrors
];

/**
 * Validation rules for team query parameters
 */
const validateTeamQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('includeUsers')
    .optional()
    .isBoolean()
    .withMessage('includeUsers must be a boolean value'),

  query('includeEquipment')
    .optional()
    .isBoolean()
    .withMessage('includeEquipment must be a boolean value'),

  handleValidationErrors
];

module.exports = {
  validateCreateTeam,
  validateUpdateTeam,
  validateTeamId,
  validateTeamQuery,
  handleValidationErrors
};