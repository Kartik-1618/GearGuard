/**
 * Error handling utilities and helper functions
 */

const { ERROR_CODES, HTTP_STATUS } = require('./constants');

/**
 * Create a standardized error object
 * @param {string} message - Error message
 * @param {string} code - Error code from ERROR_CODES
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 * @returns {Error} Standardized error object
 */
function createError(message, code = ERROR_CODES.INTERNAL_ERROR, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  if (details) {
    error.details = details;
  }
  return error;
}

/**
 * Create a validation error with detailed field information
 * @param {string} message - Error message
 * @param {Array|Object} validationDetails - Validation error details
 * @returns {Error} Validation error object
 */
function createValidationError(message, validationDetails = null) {
  return createError(
    message,
    ERROR_CODES.VALIDATION_ERROR,
    HTTP_STATUS.BAD_REQUEST,
    validationDetails
  );
}

/**
 * Create a not found error
 * @param {string} resource - Resource name that was not found
 * @returns {Error} Not found error object
 */
function createNotFoundError(resource = 'Resource') {
  return createError(
    `${resource} not found`,
    ERROR_CODES.NOT_FOUND,
    HTTP_STATUS.NOT_FOUND
  );
}

/**
 * Create an unauthorized error
 * @param {string} message - Error message
 * @returns {Error} Unauthorized error object
 */
function createUnauthorizedError(message = 'Authentication required') {
  return createError(
    message,
    ERROR_CODES.AUTHENTICATION_REQUIRED,
    HTTP_STATUS.UNAUTHORIZED
  );
}

/**
 * Create a forbidden error
 * @param {string} message - Error message
 * @returns {Error} Forbidden error object
 */
function createForbiddenError(message = 'Insufficient permissions') {
  return createError(
    message,
    ERROR_CODES.INSUFFICIENT_PERMISSIONS,
    HTTP_STATUS.FORBIDDEN
  );
}

/**
 * Create a conflict error
 * @param {string} message - Error message
 * @param {Object} details - Conflict details
 * @returns {Error} Conflict error object
 */
function createConflictError(message = 'Resource conflict', details = null) {
  return createError(
    message,
    ERROR_CODES.RESOURCE_CONFLICT,
    HTTP_STATUS.CONFLICT,
    details
  );
}

/**
 * Create a business logic error
 * @param {string} message - Error message
 * @param {string} code - Specific business logic error code
 * @returns {Error} Business logic error object
 */
function createBusinessLogicError(message, code) {
  return createError(
    message,
    code,
    HTTP_STATUS.BAD_REQUEST
  );
}

/**
 * Create a database error
 * @param {string} message - Error message
 * @param {Object} details - Database error details
 * @returns {Error} Database error object
 */
function createDatabaseError(message = 'Database operation failed', details = null) {
  return createError(
    message,
    ERROR_CODES.DATABASE_ERROR,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details
  );
}

/**
 * Wrap async functions to automatically catch and forward errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validate required fields and throw validation error if missing
 * @param {Object} data - Data object to validate
 * @param {Array} requiredFields - Array of required field names
 * @param {string} context - Context for error message
 */
function validateRequiredFields(data, requiredFields, context = 'operation') {
  const missingFields = requiredFields.filter(field => 
    data[field] === undefined || data[field] === null || data[field] === ''
  );

  if (missingFields.length > 0) {
    throw createValidationError(
      `Missing required fields for ${context}`,
      {
        missingFields,
        providedFields: Object.keys(data)
      }
    );
  }
}

/**
 * Validate that a resource exists, throw not found error if not
 * @param {*} resource - Resource to check
 * @param {string} resourceName - Name of the resource for error message
 */
function validateResourceExists(resource, resourceName = 'Resource') {
  if (!resource) {
    throw createNotFoundError(resourceName);
  }
}

/**
 * Validate user permissions for a resource
 * @param {Object} user - User object
 * @param {Array} allowedRoles - Array of allowed roles
 * @param {string} action - Action being performed
 */
function validateUserPermissions(user, allowedRoles, action = 'perform this action') {
  if (!user) {
    throw createUnauthorizedError('Authentication required');
  }

  if (!allowedRoles.includes(user.role)) {
    throw createForbiddenError(`Insufficient permissions to ${action}`);
  }
}

/**
 * Validate team access for a user
 * @param {Object} user - User object
 * @param {number} requiredTeamId - Required team ID
 * @param {string} action - Action being performed
 */
function validateTeamAccess(user, requiredTeamId, action = 'access this resource') {
  if (!user) {
    throw createUnauthorizedError('Authentication required');
  }

  if (user.role !== 'ADMIN' && user.teamId !== requiredTeamId) {
    throw createForbiddenError(`Team access required to ${action}`);
  }
}

/**
 * Handle Prisma errors and convert to standardized errors
 * @param {Error} error - Prisma error
 * @returns {Error} Standardized error
 */
function handlePrismaError(error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    const fields = error.meta?.target || ['field'];
    return createConflictError(
      `A record with this ${fields.join(', ')} already exists`,
      { fields, constraint: 'unique' }
    );
  }

  if (error.code === 'P2025') {
    // Record not found
    return createNotFoundError('Record');
  }

  if (error.code === 'P2003') {
    // Foreign key constraint violation
    return createValidationError(
      'Invalid reference to related resource',
      { constraint: 'foreign_key', field: error.meta?.field_name }
    );
  }

  if (error.code === 'P2014') {
    // Invalid relationship data
    return createValidationError(
      'Invalid relationship data provided',
      { constraint: 'relationship' }
    );
  }

  // Default database error
  return createDatabaseError('Database operation failed', {
    code: error.code,
    meta: error.meta
  });
}

/**
 * Format validation errors from express-validator
 * @param {Array} errors - Array of validation errors
 * @returns {Object} Formatted validation details
 */
function formatValidationErrors(errors) {
  return {
    count: errors.length,
    errors: errors.map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }))
  };
}

/**
 * Check if error is a client error (4xx status code)
 * @param {Error} error - Error object
 * @returns {boolean} True if client error
 */
function isClientError(error) {
  return error.statusCode >= 400 && error.statusCode < 500;
}

/**
 * Check if error is a server error (5xx status code)
 * @param {Error} error - Error object
 * @returns {boolean} True if server error
 */
function isServerError(error) {
  return !error.statusCode || error.statusCode >= 500;
}

/**
 * Get error severity level for logging
 * @param {Error} error - Error object
 * @returns {string} Severity level (info, warn, error, critical)
 */
function getErrorSeverity(error) {
  if (!error.statusCode || error.statusCode >= 500) {
    return 'critical';
  }
  if (error.statusCode >= 400) {
    return 'warn';
  }
  return 'info';
}

module.exports = {
  createError,
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createConflictError,
  createBusinessLogicError,
  createDatabaseError,
  asyncHandler,
  validateRequiredFields,
  validateResourceExists,
  validateUserPermissions,
  validateTeamAccess,
  handlePrismaError,
  formatValidationErrors,
  isClientError,
  isServerError,
  getErrorSeverity
};