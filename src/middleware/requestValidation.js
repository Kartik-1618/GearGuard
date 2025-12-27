const { body, param, validationResult } = require('express-validator');
const { MAINTENANCE_TYPES, MAINTENANCE_STATUS, VALIDATION_RULES } = require('../utils/constants');

/**
 * Validation middleware for maintenance request operations
 */

/**
 * Validation rules for creating maintenance requests
 */
const validateRequestCreation = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ min: 1, max: VALIDATION_RULES.SUBJECT_MAX_LENGTH })
    .withMessage(`Subject must be between 1 and ${VALIDATION_RULES.SUBJECT_MAX_LENGTH} characters`),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 1, max: VALIDATION_RULES.DESCRIPTION_MAX_LENGTH })
    .withMessage(`Description must be between 1 and ${VALIDATION_RULES.DESCRIPTION_MAX_LENGTH} characters`),

  body('type')
    .notEmpty()
    .withMessage('Maintenance type is required')
    .isIn(Object.values(MAINTENANCE_TYPES))
    .withMessage(`Type must be one of: ${Object.values(MAINTENANCE_TYPES).join(', ')}`),

  body('equipmentId')
    .notEmpty()
    .withMessage('Equipment ID is required')
    .isInt({ min: 1 })
    .withMessage('Equipment ID must be a positive integer'),

  body('scheduledDate')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.body.type === MAINTENANCE_TYPES.PREVENTIVE && !value) {
        throw new Error('Scheduled date is required for preventive maintenance');
      }
      if (value && new Date(value) < new Date()) {
        throw new Error('Scheduled date cannot be in the past');
      }
      return true;
    }),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value
          })),
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  }
];

/**
 * Validation rules for assigning maintenance requests
 */
const validateRequestAssignment = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Request ID must be a positive integer'),

  body('technicianId')
    .notEmpty()
    .withMessage('Technician ID is required')
    .isInt({ min: 1 })
    .withMessage('Technician ID must be a positive integer'),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Assignment validation failed',
          details: errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value
          })),
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  }
];

/**
 * Validation rules for updating maintenance request status
 */
const validateStatusUpdate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Request ID must be a positive integer'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(Object.values(MAINTENANCE_STATUS))
    .withMessage(`Status must be one of: ${Object.values(MAINTENANCE_STATUS).join(', ')}`),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status update validation failed',
          details: errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value
          })),
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  }
];

/**
 * Validation rules for completing maintenance requests
 */
const validateRequestCompletion = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Request ID must be a positive integer'),

  body('durationHours')
    .notEmpty()
    .withMessage('Duration in hours is required')
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Duration must be between 0.1 and 1000 hours'),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request completion validation failed',
          details: errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value
          })),
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  }
];

/**
 * Validation rules for request ID parameter
 */
const validateRequestIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Request ID must be a positive integer'),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request ID',
          details: errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value
          })),
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  }
];

/**
 * Validation rules for team ID parameter
 */
const validateTeamIdParam = [
  param('teamId')
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer'),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid team ID',
          details: errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value
          })),
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  }
];

/**
 * Validation rules for pagination query parameters
 */
const validatePaginationQuery = [
  // Page validation
  (req, res, next) => {
    if (req.query.page) {
      const page = parseInt(req.query.page);
      if (isNaN(page) || page < 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Page must be a positive integer',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    if (req.query.limit) {
      const limit = parseInt(req.query.limit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Limit must be between 1 and 100',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    if (req.query.status && !Object.values(MAINTENANCE_STATUS).includes(req.query.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Status must be one of: ${Object.values(MAINTENANCE_STATUS).join(', ')}`,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (req.query.type && !Object.values(MAINTENANCE_TYPES).includes(req.query.type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Type must be one of: ${Object.values(MAINTENANCE_TYPES).join(', ')}`,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (req.query.teamId) {
      const teamId = parseInt(req.query.teamId);
      if (isNaN(teamId) || teamId < 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Team ID must be a positive integer',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    if (req.query.assignedTo) {
      const assignedTo = parseInt(req.query.assignedTo);
      if (isNaN(assignedTo) || assignedTo < 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Assigned to must be a positive integer',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    if (req.query.equipmentId) {
      const equipmentId = parseInt(req.query.equipmentId);
      if (isNaN(equipmentId) || equipmentId < 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Equipment ID must be a positive integer',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    next();
  }
];

module.exports = {
  validateRequestCreation,
  validateRequestAssignment,
  validateStatusUpdate,
  validateRequestCompletion,
  validateRequestIdParam,
  validateTeamIdParam,
  validatePaginationQuery
};