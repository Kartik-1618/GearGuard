const LogService = require('../services/logService');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Log controller handling HTTP requests for audit logging
 */
class LogController {
  /**
   * Get request logs by request ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getRequestLogs(req, res, next) {
    try {
      const requestId = parseInt(req.params.requestId);
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        user: req.user // Pass user context for access control
      };

      const result = await LogService.getRequestLogs(requestId, options);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all logs with filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getLogs(req, res, next) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        requestId: req.query.requestId ? parseInt(req.query.requestId) : undefined,
        userId: req.query.userId ? parseInt(req.query.userId) : undefined,
        status: req.query.status,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate
      };

      // Apply role-based filtering
      if (req.user.role === 'TECHNICIAN') {
        // Technicians can only see logs for requests in their team or assigned to them
        // This will be handled by the service layer by checking request access
        filters.teamId = req.user.teamId;
      } else if (req.user.role === 'MANAGER' && req.user.teamId) {
        // Managers can see logs for requests in their team
        filters.teamId = req.user.teamId;
      }
      // Admins can see all logs without filtering

      const result = await LogService.getLogs(filters);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get log statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getLogStatistics(req, res, next) {
    try {
      const filters = {
        fromDate: req.query.fromDate,
        toDate: req.query.toDate
      };

      // Apply role-based filtering
      if (req.user.role === 'MANAGER' && req.user.teamId) {
        filters.teamId = req.user.teamId;
      } else if (req.user.role === 'TECHNICIAN') {
        // Technicians can only see statistics for their team
        filters.teamId = req.user.teamId;
      }
      // Admins can see all statistics without filtering

      const result = await LogService.getLogStatistics(filters);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = LogController;