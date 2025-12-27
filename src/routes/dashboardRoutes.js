const express = require('express');
const DashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { 
  requireAuthenticated,
  requireRoles
} = require('../middleware/rbac');
const { validateCalendarQuery } = require('../middleware/requestValidation');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/dashboard/manager
 * @desc    Get manager dashboard with comprehensive statistics
 * @access  Admin, Manager
 */
router.get(
  '/manager',
  requireRoles('ADMIN', 'MANAGER'),
  DashboardController.getManagerDashboard
);

/**
 * @route   GET /api/dashboard/preventive-maintenance
 * @desc    Get preventive maintenance overview
 * @access  All authenticated users (filtered by role)
 */
router.get(
  '/preventive-maintenance',
  requireAuthenticated(),
  DashboardController.getPreventiveMaintenanceOverview
);

/**
 * @route   GET /api/dashboard/statistics
 * @desc    Get maintenance statistics by type and date range
 * @access  Admin, Manager
 */
router.get(
  '/statistics',
  requireRoles('ADMIN', 'MANAGER'),
  DashboardController.getMaintenanceStatistics
);

/**
 * @route   GET /api/dashboard/reports/teams
 * @desc    Get reports for requests grouped by team
 * @access  Admin, Manager
 */
router.get(
  '/reports/teams',
  requireRoles('ADMIN', 'MANAGER'),
  DashboardController.getRequestsByTeamReport
);

/**
 * @route   GET /api/dashboard/reports/equipment
 * @desc    Get reports for requests grouped by equipment
 * @access  Admin, Manager
 */
router.get(
  '/reports/equipment',
  requireRoles('ADMIN', 'MANAGER'),
  DashboardController.getRequestsByEquipmentReport
);

/**
 * @route   GET /api/dashboard/reports/overdue
 * @desc    Get overdue requests report
 * @access  Admin, Manager, Technician (filtered by role)
 */
router.get(
  '/reports/overdue',
  requireAuthenticated(),
  DashboardController.getOverdueRequestsReport
);

module.exports = router;