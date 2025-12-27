const { body, param, query, validationResult } = require('express-validator');
const { ROLES, VALIDATION_RULES, ERROR_CODES, HTTP_STATUS } = require('../utils/constants');

/**
 * Validation middleware for user operations
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
 * Validation rules for creating a user
 */
const validateCreateUser = [
  body('name')
    .trim()
    .isLength({ min: VALIDATION_RULES.NAME_MIN_LENGTH, max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Name must be between ${VALIDATION_RULES.NAME_MIN_LENGTH} and ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .isLength({ max: VALIDATION_RULES.EMAIL_MAX_LENGTH })
    .withMessage(`Email must not exceed ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`)
    .normalizeEmail(),

  body('password')
    .isLength({ min: VALIDATION_RULES.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('role')
    .isIn(Object.values(ROLES))
    .withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),

  body('teamId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer'),

  handleValidationErrors
];

/**
 * Validation rules for updating a user
 */
const validateUpdateUser = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: VALIDATION_RULES.NAME_MIN_LENGTH, max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Name must be between ${VALIDATION_RULES.NAME_MIN_LENGTH} and ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .isLength({ max: VALIDATION_RULES.EMAIL_MAX_LENGTH })
    .withMessage(`Email must not exceed ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`)
    .normalizeEmail(),

  body('password')
    .optional()
    .isLength({ min: VALIDATION_RULES.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('role')
    .optional()
    .isIn(Object.values(ROLES))
    .withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),

  body('teamId')
    .optional()
    .custom((value) => {
      if (value === null) return true; // Allow null to remove from team
      return Number.isInteger(value) && value > 0;
    })
    .withMessage('Team ID must be a positive integer or null'),

  handleValidationErrors
];

/**
 * Validation rules for user ID parameter
 */
const validateUserId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),

  handleValidationErrors
];

/**
 * Validation rules for team ID parameter
 */
const validateTeamId = [
  param('teamId')
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer'),

  handleValidationErrors
];

/**
 * Validation rules for user query parameters
 */
const validateUserQuery = [
  query('role')
    .optional()
    .isIn(Object.values(ROLES))
    .withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),

  query('teamId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer'),

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
 * Validation rules for assigning user to team
 */
const validateAssignUserToTeam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),

  body('teamId')
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer'),

  handleValidationErrors
];

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateUserId,
  validateTeamId,
  validateUserQuery,
  validateAssignUserToTeam,
  handleValidationErrors
};