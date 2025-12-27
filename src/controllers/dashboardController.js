const RequestService = require('../services/requestService');
const EquipmentService = require('../services/equipmentService');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Dashboard controller handling dashboard statistics and reporting
 */
class DashboardController {
  /**
   * Get manager dashboard with comprehensive statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getManagerDashboard(req, res, next) {
    try {
      let teamId = null;
      
      // Managers can only see their team's data
      if (req.user.role === 'MANAGER') {
        teamId = req.user.teamId;
      } else if (req.query.teamId) {
        // Admins can filter by specific team
        teamId = parseInt(req.query.teamId);
      }

      const dashboardData = await RequestService.getManagerDashboard(teamId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get preventive maintenance overview
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getPreventiveMaintenanceOverview(req, res, next) {
    try {
      const { days = 30 } = req.query;
      let teamId = null;

      // Apply role-based filtering
      if (req.user.role === 'TECHNICIAN') {
        teamId = req.user.teamId;
      } else if (req.user.role === 'MANAGER') {
        teamId = req.user.teamId;
      } else if (req.query.teamId) {
        // Admins can filter by specific team
        teamId = parseInt(req.query.teamId);
      }

      const upcomingPreventive = await RequestService.getUpcomingPreventiveMaintenance({
        teamId,
        days: parseInt(days)
      });

      // Get overdue preventive maintenance
      const overduePreventive = await RequestService.getRequests({
        type: 'PREVENTIVE',
        overdue: true,
        teamId,
        limit: 100
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          upcoming: upcomingPreventive,
          overdue: overduePreventive.requests,
          summary: {
            upcomingCount: upcomingPreventive.length,
            overdueCount: overduePreventive.requests.length,
            daysAhead: parseInt(days)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get maintenance statistics by type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getMaintenanceStatistics(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      let teamId = null;

      // Apply role-based filtering
      if (req.user.role === 'TECHNICIAN') {
        teamId = req.user.teamId;
      } else if (req.user.role === 'MANAGER') {
        teamId = req.user.teamId;
      } else if (req.query.teamId) {
        // Admins can filter by specific team
        teamId = parseInt(req.query.teamId);
      }

      const statistics = await RequestService.getMaintenanceStatistics({
        teamId,
        startDate,
        endDate
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get reports for requests grouped by team
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getRequestsByTeamReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      // Only admins can view all teams, managers see their team only
      let teamId = null;
      if (req.user.role === 'MANAGER') {
        teamId = req.user.teamId;
      } else if (req.query.teamId) {
        teamId = parseInt(req.query.teamId);
      }

      const report = await RequestService.getRequestsByTeamReport({
        teamId,
        startDate,
        endDate
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get reports for requests grouped by equipment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getRequestsByEquipmentReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      let teamId = null;

      // Apply role-based filtering
      if (req.user.role === 'TECHNICIAN') {
        teamId = req.user.teamId;
      } else if (req.user.role === 'MANAGER') {
        teamId = req.user.teamId;
      } else if (req.query.teamId) {
        // Admins can filter by specific team
        teamId = parseInt(req.query.teamId);
      }

      const report = await RequestService.getRequestsByEquipmentReport({
        teamId,
        startDate,
        endDate
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get overdue requests report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getOverdueRequestsReport(req, res, next) {
    try {
      let teamId = null;

      // Apply role-based filtering
      if (req.user.role === 'TECHNICIAN') {
        teamId = req.user.teamId;
      } else if (req.user.role === 'MANAGER') {
        teamId = req.user.teamId;
      } else if (req.query.teamId) {
        // Admins can filter by specific team
        teamId = parseInt(req.query.teamId);
      }

      const report = await RequestService.getOverdueRequestsReport({ teamId });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DashboardController;