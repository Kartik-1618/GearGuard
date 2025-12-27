const RequestService = require('../services/requestService');
const { HTTP_STATUS, SUCCESS_MESSAGES } = require('../utils/constants');

/**
 * Maintenance Request controller handling HTTP requests for request management
 */
class RequestController {
  /**
   * Create new maintenance request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async createRequest(req, res, next) {
    try {
      const requestData = {
        ...req.body,
        createdBy: req.user.id
      };

      const request = await RequestService.createRequest(requestData);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: SUCCESS_MESSAGES.REQUEST_CREATED,
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all maintenance requests with filtering and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getRequests(req, res, next) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        teamId: req.query.teamId ? parseInt(req.query.teamId) : undefined,
        assignedTo: req.query.assignedTo ? parseInt(req.query.assignedTo) : undefined,
        status: req.query.status,
        type: req.query.type,
        equipmentId: req.query.equipmentId ? parseInt(req.query.equipmentId) : undefined,
        search: req.query.search
      };

      // Apply role-based filtering
      if (req.user.role === 'TECHNICIAN') {
        // Technicians can only see requests assigned to them or in their team
        if (req.query.assignedTo && parseInt(req.query.assignedTo) !== req.user.id) {
          // If they're trying to filter by someone else's assignments, show empty results
          filters.assignedTo = -1; // Non-existent user ID
        } else if (!req.query.assignedTo) {
          // If no specific assignment filter, show their team's requests
          filters.teamId = req.user.teamId;
        } else {
          // Show only their assigned requests
          filters.assignedTo = req.user.id;
        }
      } else if (req.user.role === 'MANAGER' && req.user.teamId) {
        // Managers can see all requests in their team
        if (!filters.teamId) {
          filters.teamId = req.user.teamId;
        } else if (filters.teamId !== req.user.teamId) {
          // Prevent managers from seeing other teams' requests
          filters.teamId = req.user.teamId;
        }
      }
      // Admins can see all requests without filtering

      const result = await RequestService.getRequests(filters);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get maintenance request by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getRequestById(req, res, next) {
    try {
      const requestId = parseInt(req.params.id);
      const includeLogs = req.query.includeLogs === 'true';

      const request = await RequestService.getRequestById(requestId, includeLogs);

      // Check access permissions
      if (req.user.role === 'TECHNICIAN') {
        // Technicians can only view requests assigned to them or in their team
        if (request.assignedTo !== req.user.id && request.teamId !== req.user.teamId) {
          return res.status(HTTP_STATUS.FORBIDDEN).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'Access denied: You can only view requests assigned to you or in your team',
              timestamp: new Date().toISOString()
            }
          });
        }
      } else if (req.user.role === 'MANAGER') {
        // Managers can only view requests in their team
        if (request.teamId !== req.user.teamId) {
          return res.status(HTTP_STATUS.FORBIDDEN).json({
            success: false,
            error: {
              code: 'TEAM_ACCESS_DENIED',
              message: 'Access denied: Request belongs to different team',
              timestamp: new Date().toISOString()
            }
          });
        }
      }
      // Admins can view any request

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign maintenance request to technician
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async assignRequest(req, res, next) {
    try {
      const requestId = parseInt(req.params.id);
      const { technicianId } = req.body;

      const request = await RequestService.assignRequest(requestId, technicianId, req.user.id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: SUCCESS_MESSAGES.REQUEST_ASSIGNED,
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update maintenance request status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async updateStatus(req, res, next) {
    try {
      const requestId = parseInt(req.params.id);
      const { status } = req.body;

      const request = await RequestService.updateStatus(requestId, status, req.user.id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: SUCCESS_MESSAGES.REQUEST_UPDATED,
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete maintenance request with duration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async completeRequest(req, res, next) {
    try {
      const requestId = parseInt(req.params.id);
      const { durationHours } = req.body;

      const request = await RequestService.completeRequest(requestId, durationHours, req.user.id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: SUCCESS_MESSAGES.REQUEST_COMPLETED,
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Scrap maintenance request and associated equipment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async scrapRequest(req, res, next) {
    try {
      const requestId = parseInt(req.params.id);

      const request = await RequestService.scrapRequest(requestId, req.user.id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: SUCCESS_MESSAGES.REQUEST_SCRAPPED,
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get requests assigned to current user (technician view)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getMyRequests(req, res, next) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        assignedTo: req.user.id,
        status: req.query.status,
        type: req.query.type,
        search: req.query.search,
        scheduledDateFrom: req.query.scheduledDateFrom,
        scheduledDateTo: req.query.scheduledDateTo,
        overdue: req.query.overdue === 'true'
      };

      const result = await RequestService.getRequests(filters);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get technician dashboard data with request statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getTechnicianDashboard(req, res, next) {
    try {
      const technicianId = req.user.id;
      const teamId = req.user.teamId;

      // Get technician's assigned requests with statistics
      const dashboardData = await RequestService.getTechnicianDashboard(technicianId, teamId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update request status (technician-friendly endpoint)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async updateMyRequestStatus(req, res, next) {
    try {
      const requestId = parseInt(req.params.id);
      const { status } = req.body;

      // Verify the request is assigned to the current technician
      const request = await RequestService.getRequestById(requestId);
      
      if (req.user.role === 'TECHNICIAN' && request.assignedTo !== req.user.id) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only update requests assigned to you',
            timestamp: new Date().toISOString()
          }
        });
      }

      const updatedRequest = await RequestService.updateStatus(requestId, status, req.user.id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: SUCCESS_MESSAGES.REQUEST_UPDATED,
        data: updatedRequest
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete request (technician-friendly endpoint)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async completeMyRequest(req, res, next) {
    try {
      const requestId = parseInt(req.params.id);
      const { durationHours } = req.body;

      // Verify the request is assigned to the current technician
      const request = await RequestService.getRequestById(requestId);
      
      if (req.user.role === 'TECHNICIAN' && request.assignedTo !== req.user.id) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only complete requests assigned to you',
            timestamp: new Date().toISOString()
          }
        });
      }

      const completedRequest = await RequestService.completeRequest(requestId, durationHours, req.user.id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: SUCCESS_MESSAGES.REQUEST_COMPLETED,
        data: completedRequest
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get requests by team
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getRequestsByTeam(req, res, next) {
    try {
      const teamId = parseInt(req.params.teamId);

      // Check team access for non-admin users
      if (req.user.role === 'MANAGER' && req.user.teamId !== teamId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            code: 'TEAM_ACCESS_DENIED',
            message: 'Access denied: Cannot view requests from different team',
            timestamp: new Date().toISOString()
          }
        });
      }

      if (req.user.role === 'TECHNICIAN' && req.user.teamId !== teamId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            code: 'TEAM_ACCESS_DENIED',
            message: 'Access denied: Cannot view requests from different team',
            timestamp: new Date().toISOString()
          }
        });
      }

      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        teamId,
        status: req.query.status,
        type: req.query.type,
        assignedTo: req.query.assignedTo ? parseInt(req.query.assignedTo) : undefined,
        search: req.query.search
      };

      const result = await RequestService.getRequests(filters);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RequestController;