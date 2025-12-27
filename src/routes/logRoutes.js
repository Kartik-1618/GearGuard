const express = require('express');
const LogController = require('../controllers/logController');
const { authenticate } = require('../middleware/auth');
const { requireAuthenticated } = require('../middleware/rbac');
const {
  validateRequestIdParam,
  validatePaginationQuery,
  validateLogFilters,
  validateStatisticsFilters
} = require('../middleware/logValidation');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/logs/requests/:requestId
 * @desc    Get logs for a specific maintenance request
 * @access  Admin, Manager (same team), Technician (assigned/same team)
 */
router.get(
  '/requests/:requestId',
  requireAuthenticated(),
  validateRequestIdParam,
  validatePaginationQuery,
  LogController.getRequestLogs
);

/**
 * @route   GET /api/logs
 * @desc    Get all logs with filtering and pagination
 * @access  Admin (all), Manager (team), Technician (team)
 */
router.get(
  '/',
  requireAuthenticated(),
  validateLogFilters,
  validatePaginationQuery,
  LogController.getLogs
);

/**
 * @route   GET /api/logs/statistics
 * @desc    Get log statistics and analytics
 * @access  Admin (all), Manager (team), Technician (team)
 */
router.get(
  '/statistics',
  requireAuthenticated(),
  validateStatisticsFilters,
  LogController.getLogStatistics
);

module.exports = router;