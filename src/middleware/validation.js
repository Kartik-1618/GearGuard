/**
 * Validation middleware using express-validator
 * Provides input validation with RBAC integration
 */

const { body, param, query, validationResult } = require('express-validator');
const { ROLES, MAINTENANCE_TYPES, MAINTENANCE_STATUS, VALIDATION_RULES } = require('../utils/constants');

/**
 * Handle validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationError = new Error('Invalid input data');
    validationError.name = 'ValidationError';
    validationError.code = 'VALIDATION_ERROR';
    validationError.statusCode = 400;
    validationError.details = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    return next(validationError);
  }
  next();
};

/**
 * User validation rules
 */
const validateUserCreation = [
  body('name')
    .trim()
    .isLength({ min: VALIDATION_RULES.NAME_MIN_LENGTH, max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Name must be between ${VALIDATION_RULES.NAME_MIN_LENGTH} and ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .isLength({ max: VALIDATION_RULES.EMAIL_MAX_LENGTH })
    .withMessage('Valid email is required'),
  
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

const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: VALIDATION_RULES.NAME_MIN_LENGTH, max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Name must be between ${VALIDATION_RULES.NAME_MIN_LENGTH} and ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .isLength({ max: VALIDATION_RULES.EMAIL_MAX_LENGTH })
    .withMessage('Valid email is required'),
  
  body('role')
    .optional()
    .isIn(Object.values(ROLES))
    .withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),
  
  body('teamId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer'),
  
  handleValidationErrors
];

/**
 * Team validation rules
 */
const validateTeamCreation = [
  body('name')
    .trim()
    .isLength({ min: VALIDATION_RULES.NAME_MIN_LENGTH, max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Team name must be between ${VALIDATION_RULES.NAME_MIN_LENGTH} and ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  
  handleValidationErrors
];

/**
 * Equipment validation rules
 */
const validateEquipmentCreation = [
  body('name')
    .trim()
    .isLength({ min: VALIDATION_RULES.NAME_MIN_LENGTH, max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Equipment name must be between ${VALIDATION_RULES.NAME_MIN_LENGTH} and ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  
  body('serialNumber')
    .trim()
    .isLength({ min: 1, max: VALIDATION_RULES.SERIAL_NUMBER_MAX_LENGTH })
    .withMessage(`Serial number is required and must be less than ${VALIDATION_RULES.SERIAL_NUMBER_MAX_LENGTH} characters`),
  
  body('department')
    .trim()
    .isLength({ min: 1, max: VALIDATION_RULES.DEPARTMENT_MAX_LENGTH })
    .withMessage(`Department is required and must be less than ${VALIDATION_RULES.DEPARTMENT_MAX_LENGTH} characters`),
  
  body('location')
    .trim()
    .isLength({ min: 1, max: VALIDATION_RULES.LOCATION_MAX_LENGTH })
    .withMessage(`Location is required and must be less than ${VALIDATION_RULES.LOCATION_MAX_LENGTH} characters`),
  
  body('purchaseDate')
    .isISO8601()
    .withMessage('Purchase date must be a valid date'),
  
  body('warrantyEnd')
    .optional()
    .isISO8601()
    .withMessage('Warranty end date must be a valid date'),
  
  body('teamId')
    .isInt({ min: 1 })
    .withMessage('Team ID is required and must be a positive integer'),
  
  handleValidationErrors
];

const validateEquipmentUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: VALIDATION_RULES.NAME_MIN_LENGTH, max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Equipment name must be between ${VALIDATION_RULES.NAME_MIN_LENGTH} and ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  
  body('serialNumber')
    .optional()
    .trim()
    .isLength({ min: 1, max: VALIDATION_RULES.SERIAL_NUMBER_MAX_LENGTH })
    .withMessage(`Serial number must be less than ${VALIDATION_RULES.SERIAL_NUMBER_MAX_LENGTH} characters`),
  
  body('department')
    .optional()
    .trim()
    .isLength({ min: 1, max: VALIDATION_RULES.DEPARTMENT_MAX_LENGTH })
    .withMessage(`Department must be less than ${VALIDATION_RULES.DEPARTMENT_MAX_LENGTH} characters`),
  
  body('location')
    .optional()
    .trim()
    .isLength({ min: 1, max: VALIDATION_RULES.LOCATION_MAX_LENGTH })
    .withMessage(`Location must be less than ${VALIDATION_RULES.LOCATION_MAX_LENGTH} characters`),
  
  body('purchaseDate')
    .optional()
    .isISO8601()
    .withMessage('Purchase date must be a valid date'),
  
  body('warrantyEnd')
    .optional()
    .isISO8601()
    .withMessage('Warranty end date must be a valid date'),
  
  body('teamId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer'),
  
  handleValidationErrors
];

/**
 * Maintenance request validation rules
 */
const validateRequestCreation = [
  body('subject')
    .trim()
    .isLength({ min: 1, max: VALIDATION_RULES.SUBJECT_MAX_LENGTH })
    .withMessage(`Subject is required and must be less than ${VALIDATION_RULES.SUBJECT_MAX_LENGTH} characters`),
  
  body('description')
    .trim()
    .isLength({ min: 1, max: VALIDATION_RULES.DESCRIPTION_MAX_LENGTH })
    .withMessage(`Description is required and must be less than ${VALIDATION_RULES.DESCRIPTION_MAX_LENGTH} characters`),
  
  body('type')
    .isIn(Object.values(MAINTENANCE_TYPES))
    .withMessage(`Maintenance type must be one of: ${Object.values(MAINTENANCE_TYPES).join(', ')}`),
  
  body('equipmentId')
    .isInt({ min: 1 })
    .withMessage('Equipment ID is required and must be a positive integer'),
  
  body('scheduledDate')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid date'),
  
  // Custom validation for preventive maintenance requiring scheduled date
  body('scheduledDate').custom((value, { req }) => {
    if (req.body.type === MAINTENANCE_TYPES.PREVENTIVE && !value) {
      throw new Error('Scheduled date is required for preventive maintenance');
    }
    return true;
  }),
  
  handleValidationErrors
];

const validateRequestUpdate = [
  body('subject')
    .optional()
    .trim()
    .isLength({ min: 1, max: VALIDATION_RULES.SUBJECT_MAX_LENGTH })
    .withMessage(`Subject must be less than ${VALIDATION_RULES.SUBJECT_MAX_LENGTH} characters`),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: VALIDATION_RULES.DESCRIPTION_MAX_LENGTH })
    .withMessage(`Description must be less than ${VALIDATION_RULES.DESCRIPTION_MAX_LENGTH} characters`),
  
  body('scheduledDate')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid date'),
  
  handleValidationErrors
];

const validateRequestAssignment = [
  body('assignedTo')
    .isInt({ min: 1 })
    .withMessage('Assigned technician ID is required and must be a positive integer'),
  
  handleValidationErrors
];

const validateRequestStatusUpdate = [
  body('status')
    .isIn(Object.values(MAINTENANCE_STATUS))
    .withMessage(`Status must be one of: ${Object.values(MAINTENANCE_STATUS).join(', ')}`),
  
  body('durationHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Duration must be a positive number'),
  
  // Custom validation for completion requiring duration
  body('durationHours').custom((value, { req }) => {
    if (req.body.status === MAINTENANCE_STATUS.REPAIRED && !value) {
      throw new Error('Duration in hours is required when marking request as repaired');
    }
    return true;
  }),
  
  handleValidationErrors
];

/**
 * Authentication validation rules
 */
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Parameter validation rules
 */
const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  
  handleValidationErrors
];

const validateTeamIdParam = [
  param('teamId')
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer'),
  
  handleValidationErrors
];

/**
 * Query parameter validation
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

const validateDateRangeQuery = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  // Custom validation to ensure end date is after start date
  query('endDate').custom((value, { req }) => {
    if (value && req.query.startDate && new Date(value) <= new Date(req.query.startDate)) {
      throw new Error('End date must be after start date');
    }
    return true;
  }),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserCreation,
  validateUserUpdate,
  validateTeamCreation,
  validateEquipmentCreation,
  validateEquipmentUpdate,
  validateRequestCreation,
  validateRequestUpdate,
  validateRequestAssignment,
  validateRequestStatusUpdate,
  validateLogin,
  validateIdParam,
  validateTeamIdParam,
  validatePaginationQuery,
  validateDateRangeQuery
};