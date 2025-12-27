const express = require('express');
const EquipmentController = require('../controllers/equipmentController');
const { authenticate } = require('../middleware/auth');
const { 
  requireAuthenticated,
  requireEquipmentManagement,
  requireAdminOrManager
} = require('../middleware/rbac');
const {
  validateEquipmentCreation,
  validateEquipmentUpdate,
  validateIdParam,
  validateTeamIdParam,
  validatePaginationQuery
} = require('../middleware/validation');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /api/equipment
 * @desc    Create new equipment
 * @access  Admin, Manager
 */
router.post(
  '/',
  requireEquipmentManagement(),
  validateEquipmentCreation,
  EquipmentController.createEquipment
);

/**
 * @route   GET /api/equipment
 * @desc    Get all equipment with filtering and pagination
 * @access  Admin, Manager, Technician (team-filtered)
 */
router.get(
  '/',
  requireAuthenticated(),
  validatePaginationQuery,
  EquipmentController.getEquipment
);

/**
 * @route   GET /api/equipment/basic
 * @desc    Get equipment for dropdown/select (basic info only)
 * @access  Admin, Manager, Technician (team-filtered)
 */
router.get(
  '/basic',
  requireAuthenticated(),
  EquipmentController.getEquipmentBasic
);

/**
 * @route   GET /api/equipment/statistics
 * @desc    Get equipment statistics
 * @access  Admin, Manager
 */
router.get(
  '/statistics',
  requireAdminOrManager(),
  EquipmentController.getEquipmentStatistics
);

/**
 * @route   GET /api/equipment/team/:teamId
 * @desc    Get equipment by team
 * @access  Admin, Manager, Technician (same team only)
 */
router.get(
  '/team/:teamId',
  requireAuthenticated(),
  validateTeamIdParam,
  EquipmentController.getEquipmentByTeam
);

/**
 * @route   GET /api/equipment/:id
 * @desc    Get equipment by ID
 * @access  Admin, Manager, Technician (team-filtered)
 */
router.get(
  '/:id',
  requireAuthenticated(),
  validateIdParam,
  EquipmentController.getEquipmentById
);

/**
 * @route   PUT /api/equipment/:id
 * @desc    Update equipment
 * @access  Admin, Manager
 */
router.put(
  '/:id',
  requireEquipmentManagement(),
  validateIdParam,
  validateEquipmentUpdate,
  EquipmentController.updateEquipment
);

/**
 * @route   PATCH /api/equipment/:id/scrap
 * @desc    Mark equipment as scrapped
 * @access  Admin, Manager
 */
router.patch(
  '/:id/scrap',
  requireEquipmentManagement(),
  validateIdParam,
  EquipmentController.scrapEquipment
);

/**
 * @route   DELETE /api/equipment/:id
 * @desc    Delete equipment (only if no maintenance requests)
 * @access  Admin, Manager
 */
router.delete(
  '/:id',
  requireEquipmentManagement(),
  validateIdParam,
  EquipmentController.deleteEquipment
);

module.exports = router;