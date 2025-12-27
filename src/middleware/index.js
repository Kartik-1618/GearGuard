/**
 * Middleware exports
 * Central export point for all middleware functions
 */

const { authenticate, optionalAuthenticate } = require('./auth');
const {
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
} = require('./rbac');
const {
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
} = require('./validation');

module.exports = {
  // Authentication middleware
  authenticate,
  optionalAuthenticate,
  
  // Role-based access control middleware
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
  requireDashboardAccess,
  
  // Validation middleware
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