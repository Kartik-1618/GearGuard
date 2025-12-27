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
      const type = req.body.type;
      
      // Preventive maintenance requires scheduled date
      if (type === MAINTENANCE_TYPES.PREVENTIVE && !value) {
        throw new Error('Scheduled date is required for preventive maintenance');
      }
      
      if (value) {
        const scheduledDate = new Date(value);
        const now = new Date();
        
        // For preventive maintenance, scheduled date cannot be in the past (allow same day)
        if (type === MAINTENANCE_TYPES.PREVENTIVE) {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (scheduledDate < today) {
            throw new Error('Scheduled date cannot be in the past for preventive maintenance');
          }
          
          // Cannot be more than 2 years in the future
          const maxFutureDate = new Date(now.getTime() + (2 * 365 * 24 * 60 * 60 * 1000));
          if (scheduledDate > maxFutureDate) {
            throw new Error('Scheduled date cannot be more than 2 years in the future');
          }
        }
        
        // For corrective maintenance, scheduled date should not be in the future
        if (type === MAINTENANCE_TYPES.CORRECTIVE && scheduledDate > now) {
          throw new Error('Corrective maintenance cannot be scheduled for future dates');
        }
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

    // Date filtering validation
    if (req.query.scheduledDateFrom) {
      const dateFrom = new Date(req.query.scheduledDateFrom);
      if (isNaN(dateFrom.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'scheduledDateFrom must be a valid date',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    if (req.query.scheduledDateTo) {
      const dateTo = new Date(req.query.scheduledDateTo);
      if (isNaN(dateTo.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'scheduledDateTo must be a valid date',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Validate date range
    if (req.query.scheduledDateFrom && req.query.scheduledDateTo) {
      const dateFrom = new Date(req.query.scheduledDateFrom);
      const dateTo = new Date(req.query.scheduledDateTo);
      if (dateFrom > dateTo) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'scheduledDateFrom must be before scheduledDateTo',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Overdue filter validation
    if (req.query.overdue && !['true', 'false'].includes(req.query.overdue)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'overdue must be true or false',
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  }
];

/**
 * Validation rules for calendar view query parameters
 */
const validateCalendarQuery = [
  (req, res, next) => {
    // Start date validation
    if (req.query.startDate) {
      const startDate = new Date(req.query.startDate);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'startDate must be a valid date',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // End date validation
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'endDate must be a valid date',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Validate date range
    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);
      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'startDate must be before endDate',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Limit date range to maximum 1 year
      const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      if (endDate.getTime() - startDate.getTime() > maxRange) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Date range cannot exceed 1 year',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Team ID validation
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

    // Type validation
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
  validatePaginationQuery,
  validateCalendarQuery
};