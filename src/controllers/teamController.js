const TeamService = require('../services/teamService');
const { SUCCESS_MESSAGES, HTTP_STATUS } = require('../utils/constants');

/**
 * Team controller handling HTTP requests for team management
 */
class TeamController {
  /**
   * Create a new team
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async createTeam(req, res, next) {
    try {
      const { name } = req.body;

      const team = await TeamService.createTeam({ name });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: SUCCESS_MESSAGES.TEAM_CREATED,
        data: { team },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all teams with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getTeams(req, res, next) {
    try {
      const { page, limit, includeUsers, includeEquipment } = req.query;

      const filters = {};
      if (page) filters.page = parseInt(page);
      if (limit) filters.limit = parseInt(limit);
      if (includeUsers) filters.includeUsers = includeUsers === 'true';
      if (includeEquipment) filters.includeEquipment = includeEquipment === 'true';

      const result = await TeamService.getTeams(filters);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get team by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getTeamById(req, res, next) {
    try {
      const { id } = req.params;
      const { includeUsers, includeEquipment } = req.query;
      const teamId = parseInt(id);

      const team = await TeamService.getTeamById(
        teamId,
        includeUsers !== 'false',
        includeEquipment !== 'false'
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { team },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update team
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async updateTeam(req, res, next) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const teamId = parseInt(id);

      const updateData = {};
      if (name !== undefined) updateData.name = name;

      const team = await TeamService.updateTeam(teamId, updateData);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: SUCCESS_MESSAGES.TEAM_UPDATED,
        data: { team },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete team
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async deleteTeam(req, res, next) {
    try {
      const { id } = req.params;
      const teamId = parseInt(id);

      await TeamService.deleteTeam(teamId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Team deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get team statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getTeamStatistics(req, res, next) {
    try {
      const { id } = req.params;
      const teamId = parseInt(id);

      const statistics = await TeamService.getTeamStatistics(teamId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { statistics },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get teams basic info (for dropdowns)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getTeamsBasic(req, res, next) {
    try {
      const teams = await TeamService.getTeamsBasic();

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { teams },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TeamController;