const express = require('express');
const UserController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { requireAuthenticated, requireAdmin } = require('../middleware/rbac');
const {
  validateCreateUser,
  validateUpdateUser,
  validateUserId,
  validateTeamId,
  validateUserQuery,
  validateAssignUserToTeam
} = require('../middleware/userValidation');

const router = express.Router();

/**
 * User management routes
 * All routes require authentication
 * Admin-only routes are marked with requireAdmin middleware
 */

// Apply authentication middleware to all routes
router.use(authenticate);

// Get current user profile (any authenticated user)
router.get('/me', requireAuthenticated(), UserController.getCurrentUser);

// Admin-only user management routes
router.post('/', requireAdmin(), validateCreateUser, UserController.createUser);
router.get('/', requireAdmin(), validateUserQuery, UserController.getUsers);
router.get('/:id', requireAdmin(), validateUserId, UserController.getUserById);
router.put('/:id', requireAdmin(), validateUpdateUser, UserController.updateUser);
router.delete('/:id', requireAdmin(), validateUserId, UserController.deleteUser);

// Team-related user routes (admin-only)
router.get('/team/:teamId', requireAdmin(), validateTeamId, UserController.getUsersByTeam);
router.put('/:id/assign-team', requireAdmin(), validateAssignUserToTeam, UserController.assignUserToTeam);
router.put('/:id/remove-team', requireAdmin(), validateUserId, UserController.removeUserFromTeam);

module.exports = router;