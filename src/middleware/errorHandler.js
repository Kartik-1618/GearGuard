const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error response
  let error = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }
  };

  // Handle different error types
  if (err.name === 'ValidationError') {
    error.error.code = 'VALIDATION_ERROR';
    error.error.message = 'Invalid input data';
    error.error.details = err.details || {};
    return res.status(400).json(error);
  }

  if (err.name === 'JsonWebTokenError') {
    error.error.code = 'INVALID_TOKEN';
    error.error.message = 'Invalid authentication token';
    return res.status(401).json(error);
  }

  if (err.name === 'TokenExpiredError') {
    error.error.code = 'TOKEN_EXPIRED';
    error.error.message = 'Authentication token has expired';
    return res.status(401).json(error);
  }

  if (err.code === 'P2002') { // Prisma unique constraint error
    error.error.code = 'DUPLICATE_ENTRY';
    error.error.message = 'A record with this information already exists';
    return res.status(409).json(error);
  }

  if (err.code === 'P2025') { // Prisma record not found error
    error.error.code = 'NOT_FOUND';
    error.error.message = 'The requested resource was not found';
    return res.status(404).json(error);
  }

  // Custom application errors
  if (err.statusCode) {
    error.error.code = err.code || 'APPLICATION_ERROR';
    error.error.message = err.message;
    return res.status(err.statusCode).json(error);
  }

  // Default server error
  res.status(500).json(error);
};

module.exports = errorHandler;