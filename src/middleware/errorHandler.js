const { ERROR_CODES, HTTP_STATUS } = require('../utils/constants');

/**
 * Comprehensive error handler middleware
 * Handles all types of errors with consistent formatting and proper logging
 */
const errorHandler = (err, req, res, next) => {
  // Log error details for debugging and monitoring
  logError(err, req);

  // Default error response structure
  let errorResponse = {
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId: req.id || generateRequestId()
    }
  };

  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;

  // Handle different error types with specific logic
  const errorHandlers = {
    // Express-validator validation errors
    ValidationError: () => handleValidationError(err, errorResponse),
    
    // JWT authentication errors
    JsonWebTokenError: () => handleJWTError(err, errorResponse),
    TokenExpiredError: () => handleTokenExpiredError(err, errorResponse),
    
    // Prisma database errors
    PrismaClientKnownRequestError: () => handlePrismaError(err, errorResponse),
    PrismaClientUnknownRequestError: () => handlePrismaUnknownError(err, errorResponse),
    PrismaClientValidationError: () => handlePrismaValidationError(err, errorResponse),
    
    // Custom application errors
    ApplicationError: () => handleApplicationError(err, errorResponse),
    
    // Node.js built-in errors
    SyntaxError: () => handleSyntaxError(err, errorResponse),
    TypeError: () => handleTypeError(err, errorResponse),
    ReferenceError: () => handleReferenceError(err, errorResponse)
  };

  // Handle specific error types
  if (errorHandlers[err.name]) {
    const result = errorHandlers[err.name]();
    statusCode = result.statusCode;
    errorResponse = result.errorResponse;
  } else if (err.statusCode && err.code) {
    // Handle custom application errors with statusCode and code
    const result = handleApplicationError(err, errorResponse);
    statusCode = result.statusCode;
    errorResponse = result.errorResponse;
  } else if (err.code && err.code.startsWith('P')) {
    // Handle Prisma errors by code
    const result = handlePrismaError(err, errorResponse);
    statusCode = result.statusCode;
    errorResponse = result.errorResponse;
  }

  // Add development-specific error details
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = {
      name: err.name,
      originalMessage: err.message,
      ...(err.details && { validationDetails: err.details })
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Log error details for debugging and monitoring
 */
function logError(err, req) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    requestId: req.id || generateRequestId(),
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.userId || 'anonymous',
    error: {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack
    }
  };

  // Log based on error severity
  if (err.statusCode >= 500 || !err.statusCode) {
    console.error('CRITICAL ERROR:', JSON.stringify(errorLog, null, 2));
  } else if (err.statusCode >= 400) {
    console.warn('CLIENT ERROR:', JSON.stringify(errorLog, null, 2));
  } else {
    console.info('INFO ERROR:', JSON.stringify(errorLog, null, 2));
  }
}

/**
 * Handle express-validator validation errors
 */
function handleValidationError(err, errorResponse) {
  errorResponse.error.code = ERROR_CODES.VALIDATION_ERROR;
  errorResponse.error.message = 'Invalid input data provided';
  
  if (err.details && Array.isArray(err.details)) {
    errorResponse.error.details = err.details.map(detail => ({
      field: detail.path || detail.param,
      message: detail.msg,
      value: detail.value,
      location: detail.location
    }));
  }

  return {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    errorResponse
  };
}

/**
 * Handle JWT authentication errors
 */
function handleJWTError(err, errorResponse) {
  errorResponse.error.code = ERROR_CODES.INVALID_TOKEN;
  errorResponse.error.message = 'Invalid authentication token provided';
  
  return {
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    errorResponse
  };
}

/**
 * Handle JWT token expiration errors
 */
function handleTokenExpiredError(err, errorResponse) {
  errorResponse.error.code = ERROR_CODES.TOKEN_EXPIRED;
  errorResponse.error.message = 'Authentication token has expired';
  
  return {
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    errorResponse
  };
}

/**
 * Handle Prisma database errors
 */
function handlePrismaError(err, errorResponse) {
  const prismaErrorMap = {
    P2002: {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'A record with this information already exists',
      statusCode: HTTP_STATUS.CONFLICT
    },
    P2025: {
      code: ERROR_CODES.NOT_FOUND,
      message: 'The requested resource was not found',
      statusCode: HTTP_STATUS.NOT_FOUND
    },
    P2003: {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Foreign key constraint violation',
      statusCode: HTTP_STATUS.BAD_REQUEST
    },
    P2014: {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Invalid relationship data provided',
      statusCode: HTTP_STATUS.BAD_REQUEST
    },
    P2016: {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Query interpretation error',
      statusCode: HTTP_STATUS.BAD_REQUEST
    },
    P2021: {
      code: ERROR_CODES.DATABASE_ERROR,
      message: 'Table does not exist in the database',
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR
    },
    P2022: {
      code: ERROR_CODES.DATABASE_ERROR,
      message: 'Column does not exist in the database',
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR
    }
  };

  const prismaError = prismaErrorMap[err.code];
  if (prismaError) {
    errorResponse.error.code = prismaError.code;
    errorResponse.error.message = prismaError.message;
    
    // Add field information for unique constraint violations
    if (err.code === 'P2002' && err.meta?.target) {
      errorResponse.error.details = {
        fields: err.meta.target,
        constraint: 'unique'
      };
    }
    
    return {
      statusCode: prismaError.statusCode,
      errorResponse
    };
  }

  // Default Prisma error handling
  errorResponse.error.code = ERROR_CODES.DATABASE_ERROR;
  errorResponse.error.message = 'Database operation failed';
  
  return {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorResponse
  };
}

/**
 * Handle unknown Prisma errors
 */
function handlePrismaUnknownError(err, errorResponse) {
  errorResponse.error.code = ERROR_CODES.DATABASE_ERROR;
  errorResponse.error.message = 'An unknown database error occurred';
  
  return {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorResponse
  };
}

/**
 * Handle Prisma validation errors
 */
function handlePrismaValidationError(err, errorResponse) {
  errorResponse.error.code = ERROR_CODES.VALIDATION_ERROR;
  errorResponse.error.message = 'Database validation error';
  
  return {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    errorResponse
  };
}

/**
 * Handle custom application errors
 */
function handleApplicationError(err, errorResponse) {
  errorResponse.error.code = err.code || ERROR_CODES.INTERNAL_ERROR;
  errorResponse.error.message = err.message || 'Application error occurred';
  
  if (err.details) {
    errorResponse.error.details = err.details;
  }
  
  return {
    statusCode: err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorResponse
  };
}

/**
 * Handle JSON syntax errors
 */
function handleSyntaxError(err, errorResponse) {
  if (err.message.includes('JSON')) {
    errorResponse.error.code = ERROR_CODES.INVALID_INPUT;
    errorResponse.error.message = 'Invalid JSON format in request body';
    
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      errorResponse
    };
  }
  
  return {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorResponse
  };
}

/**
 * Handle type errors
 */
function handleTypeError(err, errorResponse) {
  errorResponse.error.code = ERROR_CODES.INTERNAL_ERROR;
  errorResponse.error.message = 'Internal type error occurred';
  
  return {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorResponse
  };
}

/**
 * Handle reference errors
 */
function handleReferenceError(err, errorResponse) {
  errorResponse.error.code = ERROR_CODES.INTERNAL_ERROR;
  errorResponse.error.message = 'Internal reference error occurred';
  
  return {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorResponse
  };
}

/**
 * Generate a unique request ID for error tracking
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a custom application error
 */
class ApplicationError extends Error {
  constructor(message, code = ERROR_CODES.INTERNAL_ERROR, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Create specific error types for common scenarios
 */
class ValidationError extends ApplicationError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST, details);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends ApplicationError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends ApplicationError {
  constructor(message = 'Authentication required') {
    super(message, ERROR_CODES.AUTHENTICATION_REQUIRED, HTTP_STATUS.UNAUTHORIZED);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends ApplicationError {
  constructor(message = 'Insufficient permissions') {
    super(message, ERROR_CODES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN);
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends ApplicationError {
  constructor(message = 'Resource conflict') {
    super(message, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.CONFLICT);
    this.name = 'ConflictError';
  }
}

module.exports = {
  errorHandler,
  ApplicationError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError
};