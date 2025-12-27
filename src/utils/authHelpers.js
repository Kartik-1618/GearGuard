/**
 * Authorization helper functions for use in controllers and services
 * These functions provide reusable authorization logic
 */

/**
 * Check if user has any of the specified roles
 * @param {Object} user - User object with role property
 * @param {...string} roles - Roles to check against
 * @returns {boolean} True if user has any of the specified roles
 */
const hasRole = (user, ...roles) => {
  if (!user || !user.role) {
    return false;
  }
  return roles.includes(user.role);
};

/**
 * Check if user is an admin
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user is an admin
 */
const isAdmin = (user) => {
  return hasRole(user, 'ADMIN');
};

/**
 * Check if user is a manager
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user is a manager
 */
const isManager = (user) => {
  return hasRole(user, 'MANAGER');
};

/**
 * Check if user is a technician
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user is a technician
 */
const isTechnician = (user) => {
  return hasRole(user, 'TECHNICIAN');
};

/**
 * Check if user is admin or manager
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user is admin or manager
 */
const isAdminOrManager = (user) => {
  return hasRole(user, 'ADMIN', 'MANAGER');
};

/**
 * Check if user belongs to the specified team
 * @param {Object} user - User object with teamId property
 * @param {number} teamId - Team ID to check against
 * @returns {boolean} True if user belongs to the team
 */
const belongsToTeam = (user, teamId) => {
  if (!user || !user.teamId || !teamId) {
    return false;
  }
  return user.teamId === parseInt(teamId);
};

/**
 * Check if user can access team resources
 * Admins can access any team, others only their own team
 * @param {Object} user - User object with role and teamId properties
 * @param {number} teamId - Team ID to check access for
 * @returns {boolean} True if user can access the team's resources
 */
const canAccessTeam = (user, teamId) => {
  if (!user) {
    return false;
  }
  
  // Admins can access any team
  if (isAdmin(user)) {
    return true;
  }
  
  // Others can only access their own team
  return belongsToTeam(user, teamId);
};

/**
 * Check if user can manage other users
 * Only admins can manage users
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user can manage other users
 */
const canManageUsers = (user) => {
  return isAdmin(user);
};

/**
 * Check if user can manage equipment
 * Admins and managers can manage equipment
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user can manage equipment
 */
const canManageEquipment = (user) => {
  return isAdminOrManager(user);
};

/**
 * Check if user can create maintenance requests
 * Admins and managers can create requests
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user can create maintenance requests
 */
const canCreateRequests = (user) => {
  return isAdminOrManager(user);
};

/**
 * Check if user can assign maintenance requests
 * Admins and managers can assign requests
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user can assign maintenance requests
 */
const canAssignRequests = (user) => {
  return isAdminOrManager(user);
};

/**
 * Check if user can update maintenance request status
 * All authenticated users can update status (with business logic restrictions)
 * @param {Object} user - User object
 * @returns {boolean} True if user can update request status
 */
const canUpdateRequestStatus = (user) => {
  return !!user; // Any authenticated user
};

/**
 * Check if user can view specific maintenance request
 * - Admins can view any request
 * - Managers can view requests from their team
 * - Technicians can view requests assigned to them or from their team
 * @param {Object} user - User object with role and teamId properties
 * @param {Object} request - Maintenance request object with teamId and assignedTo properties
 * @returns {boolean} True if user can view the request
 */
const canViewRequest = (user, request) => {
  if (!user || !request) {
    return false;
  }

  // Admins can view any request
  if (isAdmin(user)) {
    return true;
  }

  // Managers can view requests from their team
  if (isManager(user) && belongsToTeam(user, request.teamId)) {
    return true;
  }

  // Technicians can view requests assigned to them or from their team
  if (isTechnician(user)) {
    return (request.assignedTo === user.id) || belongsToTeam(user, request.teamId);
  }

  return false;
};

/**
 * Check if user can modify specific maintenance request
 * - Admins can modify any request
 * - Managers can modify requests from their team
 * - Technicians can modify requests assigned to them
 * @param {Object} user - User object with role and teamId properties
 * @param {Object} request - Maintenance request object with teamId and assignedTo properties
 * @returns {boolean} True if user can modify the request
 */
const canModifyRequest = (user, request) => {
  if (!user || !request) {
    return false;
  }

  // Admins can modify any request
  if (isAdmin(user)) {
    return true;
  }

  // Managers can modify requests from their team
  if (isManager(user) && belongsToTeam(user, request.teamId)) {
    return true;
  }

  // Technicians can modify requests assigned to them
  if (isTechnician(user) && request.assignedTo === user.id) {
    return true;
  }

  return false;
};

/**
 * Check if user can view dashboard and reports
 * Admins and managers can view dashboard
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user can view dashboard
 */
const canViewDashboard = (user) => {
  return isAdminOrManager(user);
};

/**
 * Check if user can scrap equipment
 * Admins and managers can scrap equipment
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user can scrap equipment
 */
const canScrapEquipment = (user) => {
  return isAdminOrManager(user);
};

/**
 * Get filtered data based on user permissions
 * Returns appropriate data scope based on user role and team
 * @param {Object} user - User object with role and teamId properties
 * @param {string} dataType - Type of data ('equipment', 'requests', 'users', etc.)
 * @returns {Object} Filter conditions for database queries
 */
const getDataFilter = (user, dataType) => {
  if (!user) {
    return null;
  }

  // Admins can see all data
  if (isAdmin(user)) {
    return {};
  }

  // For other roles, filter by team
  switch (dataType) {
    case 'equipment':
    case 'requests':
      return user.teamId ? { teamId: user.teamId } : null;
    
    case 'users':
      // Only admins can see all users, others see team members
      return user.teamId ? { teamId: user.teamId } : null;
    
    case 'assigned_requests':
      // Technicians see only their assigned requests
      if (isTechnician(user)) {
        return { assignedTo: user.id };
      }
      // Managers see team requests
      return user.teamId ? { teamId: user.teamId } : null;
    
    default:
      return user.teamId ? { teamId: user.teamId } : null;
  }
};

/**
 * Throw authorization error with consistent format
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} details - Additional error details
 * @throws {Error} Authorization error
 */
const throwAuthError = (message, code = 'AUTHORIZATION_ERROR', details = {}) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 403;
  error.details = details;
  throw error;
};

/**
 * Assert that user has required permissions
 * Throws error if user doesn't have permissions
 * @param {boolean} hasPermission - Whether user has permission
 * @param {string} message - Error message if permission denied
 * @param {string} code - Error code
 * @param {Object} details - Additional error details
 * @throws {Error} Authorization error if no permission
 */
const assertPermission = (hasPermission, message, code = 'INSUFFICIENT_PERMISSIONS', details = {}) => {
  if (!hasPermission) {
    throwAuthError(message, code, details);
  }
};

module.exports = {
  hasRole,
  isAdmin,
  isManager,
  isTechnician,
  isAdminOrManager,
  belongsToTeam,
  canAccessTeam,
  canManageUsers,
  canManageEquipment,
  canCreateRequests,
  canAssignRequests,
  canUpdateRequestStatus,
  canViewRequest,
  canModifyRequest,
  canViewDashboard,
  canScrapEquipment,
  getDataFilter,
  throwAuthError,
  assertPermission
};