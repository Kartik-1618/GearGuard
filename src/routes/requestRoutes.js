const express = require('express');
const RequestController = require('../controllers/requestController');
const { authenticate } = require('../middleware/auth');
const { 
  requireAuthenticated,
  requireRequestCreation,
  requireRequestAssignment,
  requireRequestStatusUpdate,
  requireRoles
} = require('../middleware/rbac');
const {
  validateRequestCreation,
  validateRequestAssignment,
  validateStatusUpdate,
  validateRequestCompletion,
  validateRequestIdParam,
  validateTeamIdParam,
  validatePaginationQuery
} = require('../middleware/requestValidation');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /api/requests
 * @desc    Create new maintenance request
 * @access  Admin, Manager
 */
router.post(
  '/',
  requireRequestCreation(),
  validateRequestCreation,
  RequestController.createRequest
);

/**
 * @route   GET /api/requests
 * @desc    Get all maintenance requests with filtering and pagination
 * @access  Admin (all), Manager (team), Technician (assigned/team)
 */
router.get(
  '/',
  requireAuthenticated(),
  validatePaginationQuery,
  RequestController.getRequests
);

/**
 * @route   GET /api/requests/my
 * @desc    Get requests assigned to current user (technician view)
 * @access  All authenticated users
 */
router.get(
  '/my',
  requireAuthenticated(),
  validatePaginationQuery,
  RequestController.getMyRequests
);

/**
 * @route   GET /api/requests/technician/dashboard
 * @desc    Get technician dashboard data with statistics
 * @access  Technicians only
 */
router.get(
  '/technician/dashboard',
  requireRoles('TECHNICIAN'),
  RequestController.getTechnicianDashboard
);

/**
 * @route   PATCH /api/requests/my/:id/status
 * @desc    Update status of assigned request (technician-friendly)
 * @access  Technicians (assigned requests only)
 */
router.patch(
  '/my/:id/status',
  requireAuthenticated(),
  validateStatusUpdate,
  RequestController.updateMyRequestStatus
);

/**
 * @route   PATCH /api/requests/my/:id/complete
 * @desc    Complete assigned request (technician-friendly)
 * @access  Technicians (assigned requests only)
 */
router.patch(
  '/my/:id/complete',
  requireAuthenticated(),
  validateRequestCompletion,
  RequestController.completeMyRequest
);

/**
 * @route   GET /api/requests/team/:teamId
 * @desc    Get requests by team
 * @access  Admin, Manager (same team), Technician (same team)
 */
router.get(
  '/team/:teamId',
  requireAuthenticated(),
  validateTeamIdParam,
  validatePaginationQuery,
  RequestController.getRequestsByTeam
);

/**
 * @route   GET /api/requests/:id
 * @desc    Get maintenance request by ID
 * @access  Admin, Manager (same team), Technician (assigned/same team)
 */
router.get(
  '/:id',
  requireAuthenticated(),
  validateRequestIdParam,
  RequestController.getRequestById
);

/**
 * @route   PATCH /api/requests/:id/assign
 * @desc    Assign maintenance request to technician
 * @access  Admin, Manager
 */
router.patch(
  '/:id/assign',
  requireRequestAssignment(),
  validateRequestAssignment,
  RequestController.assignRequest
);

/**
 * @route   PATCH /api/requests/:id/status
 * @desc    Update maintenance request status
 * @access  Admin, Manager (same team), Technician (assigned)
 */
router.patch(
  '/:id/status',
  requireRequestStatusUpdate(),
  validateStatusUpdate,
  RequestController.updateStatus
);

/**
 * @route   PATCH /api/requests/:id/complete
 * @desc    Complete maintenance request with duration
 * @access  Admin, Manager (same team), Technician (assigned)
 */
router.patch(
  '/:id/complete',
  requireRequestStatusUpdate(),
  validateRequestCompletion,
  RequestController.completeRequest
);

/**
 * @route   PATCH /api/requests/:id/scrap
 * @desc    Scrap maintenance request and associated equipment
 * @access  Admin, Manager (same team), Technician (assigned)
 */
router.patch(
  '/:id/scrap',
  requireRequestStatusUpdate(),
  validateRequestIdParam,
  RequestController.scrapRequest
);

module.exports = router;