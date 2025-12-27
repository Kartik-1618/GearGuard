/**
 * Role-Based Access Control (RBAC) middleware
 * Provides role and permission checking functionality
 */

/**
 * Middleware to require specific roles
 * @param {...string} allowedRoles - Roles that are allowed to access the endpoint
 * @returns {Function} Express middleware function
 */
const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to access this resource',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          details: {
            userRole: req.user.role,
            requiredRoles: allowedRoles
          },
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  };
};

/**
 * Middleware to require admin role
 * @returns {Function} Express middleware function
 */
const requireAdmin = () => requireRoles('ADMIN');

/**
 * Middleware to require admin or manager role
 * @returns {Function} Express middleware function
 */
const requireAdminOrManager = () => requireRoles('ADMIN', 'MANAGER');

/**
 * Middleware to require any authenticated user
 * @returns {Function} Express middleware function
 */
const requireAuthenticated = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to access this resource',
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  };
};

/**
 * Middleware to check if user belongs to the same team as the resource
 * Requires teamId to be available in req.params, req.body, or req.query
 * @param {string} teamIdSource - Where to find teamId ('params', 'body', 'query')
 * @returns {Function} Express middleware function
 */
const requireSameTeam = (teamIdSource = 'params') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to access this resource',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Admins can access any team's resources
    if (req.user.role === 'ADMIN') {
      return next();
    }

    let resourceTeamId;
    switch (teamIdSource) {
      case 'params':
        resourceTeamId = parseInt(req.params.teamId);
        break;
      case 'body':
        resourceTeamId = parseInt(req.body.teamId);
        break;
      case 'query':
        resourceTeamId = parseInt(req.query.teamId);
        break;
      default:
        return res.status(500).json({
          success: false,
          error: {
            code: 'INVALID_TEAM_SOURCE',
            message: 'Invalid team ID source specified',
            timestamp: new Date().toISOString()
          }
        });
    }

    if (!resourceTeamId || isNaN(resourceTeamId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TEAM_ID',
          message: 'Team ID is required for this operation',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (req.user.teamId !== resourceTeamId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TEAM_ACCESS_DENIED',
          message: 'Access denied. You can only access resources from your own team',
          details: {
            userTeamId: req.user.teamId,
            resourceTeamId: resourceTeamId
          },
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  };
};

/**
 * Middleware to check if user can manage other users
 * Only admins can manage users
 * @returns {Function} Express middleware function
 */
const requireUserManagement = () => {
  return requireRoles('ADMIN');
};

/**
 * Middleware to check if user can manage equipment
 * Admins and managers can manage equipment
 * @returns {Function} Express middleware function
 */
const requireEquipmentManagement = () => {
  return requireRoles('ADMIN', 'MANAGER');
};

/**
 * Middleware to check if user can create maintenance requests
 * Admins and managers can create requests
 * @returns {Function} Express middleware function
 */
const requireRequestCreation = () => {
  return requireRoles('ADMIN', 'MANAGER');
};

/**
 * Middleware to check if user can assign maintenance requests
 * Admins and managers can assign requests
 * @returns {Function} Express middleware function
 */
const requireRequestAssignment = () => {
  return requireRoles('ADMIN', 'MANAGER');
};

/**
 * Middleware to check if user can update maintenance request status
 * All authenticated users can update status (with business logic restrictions)
 * @returns {Function} Express middleware function
 */
const requireRequestStatusUpdate = () => {
  return requireAuthenticated();
};

/**
 * Middleware to check if user can view dashboard/reports
 * Admins and managers can view dashboard
 * @returns {Function} Express middleware function
 */
const requireDashboardAccess = () => {
  return requireRoles('ADMIN', 'MANAGER');
};

module.exports = {
  requireRoles,
  requireAdmin,
  requireAdminOrManager,
  requireAuthenticated,
  requireSameTeam,
  requireUserManagement,
  requireEquipmentManagement,
  requireRequestCreation,
  requireRequestAssignment,
  requireRequestStatusUpdate,
  requireDashboardAccess
};