const { verifyToken, extractTokenFromHeader } = require('../config/jwt');
const { prisma } = require('../models');

/**
 * Authentication middleware to verify JWT tokens and attach user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify the token
    const decoded = verifyToken(token);

    // Fetch user from database to ensure they still exist and get latest data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with token not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Attach user to request object (without password)
    const { password: _, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired',
          timestamp: new Date().toISOString()
        }
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Internal authentication error',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated vs anonymous users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    // Verify the token
    const decoded = verifyToken(token);

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      req.user = userWithoutPassword;
      req.token = token;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    req.user = null;
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate
};