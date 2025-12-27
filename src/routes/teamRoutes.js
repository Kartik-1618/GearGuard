const express = require('express');
const TeamController = require('../controllers/teamController');
const { authenticate } = require('../middleware/auth');
const { requireAuthenticated, requireAdmin } = require('../middleware/rbac');
const {
  validateCreateTeam,
  validateUpdateTeam,
  validateTeamId,
  validateTeamQuery
} = require('../middleware/teamValidation');

const router = express.Router();

/**
 * Team management routes
 * All routes require authentication
 * Most routes are admin-only except for basic team info
 */

// Apply authentication middleware to all routes
router.use(authenticate);

// Basic team info (any authenticated user can view)
router.get('/basic', requireAuthenticated(), TeamController.getTeamsBasic);

// Admin-only team management routes
router.post('/', requireAdmin(), validateCreateTeam, TeamController.createTeam);
router.get('/', requireAdmin(), validateTeamQuery, TeamController.getTeams);
router.get('/:id', requireAdmin(), validateTeamId, TeamController.getTeamById);
router.put('/:id', requireAdmin(), validateUpdateTeam, TeamController.updateTeam);
router.delete('/:id', requireAdmin(), validateTeamId, TeamController.deleteTeam);

// Team statistics (admin-only)
router.get('/:id/statistics', requireAdmin(), validateTeamId, TeamController.getTeamStatistics);

module.exports = router;