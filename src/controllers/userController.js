const UserService = require('../services/userService');
const { SUCCESS_MESSAGES, HTTP_STATUS } = require('../utils/constants');

/**
 * User controller handling HTTP requests for user management
 */
class UserController {
  /**
   * Create a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async createUser(req, res, next) {
    try {
      const { name, email, password, role, teamId } = req.body;

      const user = await UserService.createUser({
        name,
        email,
        password,
        role,
        teamId
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: SUCCESS_MESSAGES.USER_CREATED,
        data: { user },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all users with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getUsers(req, res, next) {
    try {
      const { role, teamId, page, limit } = req.query;

      const filters = {};
      if (role) filters.role = role;
      if (teamId) filters.teamId = parseInt(teamId);
      if (page) filters.page = parseInt(page);
      if (limit) filters.limit = parseInt(limit);

      const result = await UserService.getUsers(filters);

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
   * Get user by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = parseInt(id);

      const user = await UserService.getUserById(userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { user },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      const { name, email, password, role, teamId } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (password !== undefined) updateData.password = password;
      if (role !== undefined) updateData.role = role;
      if (teamId !== undefined) updateData.teamId = teamId;

      const user = await UserService.updateUser(userId, updateData);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: SUCCESS_MESSAGES.USER_UPDATED,
        data: { user },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const userId = parseInt(id);

      await UserService.deleteUser(userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: SUCCESS_MESSAGES.USER_DELETED,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get users by team
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getUsersByTeam(req, res, next) {
    try {
      const { teamId } = req.params;
      const teamIdInt = parseInt(teamId);

      const users = await UserService.getUsersByTeam(teamIdInt);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { users },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign user to team
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async assignUserToTeam(req, res, next) {
    try {
      const { id } = req.params;
      const { teamId } = req.body;
      const userId = parseInt(id);
      const teamIdInt = parseInt(teamId);

      const user = await UserService.assignUserToTeam(userId, teamIdInt);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'User assigned to team successfully',
        data: { user },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove user from team
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async removeUserFromTeam(req, res, next) {
    try {
      const { id } = req.params;
      const userId = parseInt(id);

      const user = await UserService.removeUserFromTeam(userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'User removed from team successfully',
        data: { user },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile (from token)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getCurrentUser(req, res, next) {
    try {
      const userId = req.user.userId;
      const user = await UserService.getUserById(userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { user },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;