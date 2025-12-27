const EquipmentService = require('../services/equipmentService');
const { HTTP_STATUS, SUCCESS_MESSAGES } = require('../utils/constants');

/**
 * Equipment controller handling HTTP requests for equipment management
 */
class EquipmentController {
  /**
   * Create new equipment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async createEquipment(req, res, next) {
    try {
      const equipment = await EquipmentService.createEquipment(req.body);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: SUCCESS_MESSAGES.EQUIPMENT_CREATED,
        data: equipment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all equipment with filtering and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getEquipment(req, res, next) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        teamId: req.query.teamId ? parseInt(req.query.teamId) : undefined,
        includeTeam: req.query.includeTeam !== 'false',
        includeScrapped: req.query.includeScrapped !== 'false',
        search: req.query.search,
        department: req.query.department,
        location: req.query.location
      };

      // Apply team-based filtering for non-admin users
      if (req.user.role === 'TECHNICIAN' && req.user.teamId) {
        filters.teamId = req.user.teamId;
      }

      const result = await EquipmentService.getEquipment(filters);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get equipment by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getEquipmentById(req, res, next) {
    try {
      const equipmentId = parseInt(req.params.id);
      const includeTeam = req.query.includeTeam !== 'false';
      const includeRequests = req.query.includeRequests === 'true';

      const equipment = await EquipmentService.getEquipmentById(
        equipmentId,
        includeTeam,
        includeRequests
      );

      // Check team access for technicians
      if (req.user.role === 'TECHNICIAN' && req.user.teamId !== equipment.teamId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            code: 'TEAM_ACCESS_DENIED',
            message: 'Access denied: Equipment belongs to different team',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: equipment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update equipment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async updateEquipment(req, res, next) {
    try {
      const equipmentId = parseInt(req.params.id);
      const equipment = await EquipmentService.updateEquipment(equipmentId, req.body);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: SUCCESS_MESSAGES.EQUIPMENT_UPDATED,
        data: equipment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Scrap equipment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async scrapEquipment(req, res, next) {
    try {
      const equipmentId = parseInt(req.params.id);
      const equipment = await EquipmentService.scrapEquipment(equipmentId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: SUCCESS_MESSAGES.EQUIPMENT_SCRAPPED,
        data: equipment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete equipment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async deleteEquipment(req, res, next) {
    try {
      const equipmentId = parseInt(req.params.id);
      await EquipmentService.deleteEquipment(equipmentId);

      res.status(HTTP_STATUS.NO_CONTENT).json({
        success: true,
        message: 'Equipment deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get equipment by team
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getEquipmentByTeam(req, res, next) {
    try {
      const teamId = parseInt(req.params.teamId);
      const includeScrapped = req.query.includeScrapped !== 'false';

      // Check team access for technicians
      if (req.user.role === 'TECHNICIAN' && req.user.teamId !== teamId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            code: 'TEAM_ACCESS_DENIED',
            message: 'Access denied: Cannot view equipment from different team',
            timestamp: new Date().toISOString()
          }
        });
      }

      const equipment = await EquipmentService.getEquipmentByTeam(teamId, includeScrapped);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: equipment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get equipment statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getEquipmentStatistics(req, res, next) {
    try {
      let teamId = req.query.teamId ? parseInt(req.query.teamId) : null;

      // Apply team filtering for technicians
      if (req.user.role === 'TECHNICIAN' && req.user.teamId) {
        teamId = req.user.teamId;
      }

      const statistics = await EquipmentService.getEquipmentStatistics(teamId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get equipment for dropdown/select
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getEquipmentBasic(req, res, next) {
    try {
      let teamId = req.query.teamId ? parseInt(req.query.teamId) : null;
      const activeOnly = req.query.activeOnly !== 'false';

      // Apply team filtering for technicians
      if (req.user.role === 'TECHNICIAN' && req.user.teamId) {
        teamId = req.user.teamId;
      }

      const equipment = await EquipmentService.getEquipmentBasic(teamId, activeOnly);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: equipment
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EquipmentController;