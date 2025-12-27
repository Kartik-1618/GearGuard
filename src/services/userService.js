const { prisma } = require('../models');
const AuthService = require('./authService');
const { ROLES, ERROR_CODES } = require('../utils/constants');

/**
 * User service handling user management operations
 */
class UserService {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} userData.name - User name
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.role - User role
   * @param {number} [userData.teamId] - Team ID (optional)
   * @returns {Promise<Object>} Created user without password
   */
  static async createUser(userData) {
    const { name, email, password, role, teamId } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      const error = new Error('User with this email already exists');
      error.code = ERROR_CODES.VALIDATION_ERROR;
      error.statusCode = 409;
      throw error;
    }

    // Validate role
    if (!Object.values(ROLES).includes(role)) {
      const error = new Error('Invalid role specified');
      error.code = ERROR_CODES.INVALID_INPUT;
      error.statusCode = 400;
      throw error;
    }

    // If teamId is provided, validate team exists
    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId }
      });

      if (!team) {
        const error = new Error('Team not found');
        error.code = ERROR_CODES.TEAM_NOT_FOUND;
        error.statusCode = 404;
        throw error;
      }
    }

    // Hash password
    const hashedPassword = await AuthService.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        teamId: teamId || null
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get all users with optional filtering
   * @param {Object} filters - Filter options
   * @param {string} [filters.role] - Filter by role
   * @param {number} [filters.teamId] - Filter by team ID
   * @param {number} [filters.page] - Page number for pagination
   * @param {number} [filters.limit] - Items per page
   * @returns {Promise<Object>} Users list with pagination info
   */
  static async getUsers(filters = {}) {
    const { role, teamId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where = {};
    if (role) where.role = role;
    if (teamId) where.teamId = teamId;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          team: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.user.count({ where })
    ]);

    // Remove passwords from response
    const usersWithoutPasswords = users.map(user => {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      users: usersWithoutPasswords,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get user by ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User without password
   */
  static async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = ERROR_CODES.USER_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user
   * @param {number} userId - User ID
   * @param {Object} updateData - Data to update
   * @param {string} [updateData.name] - User name
   * @param {string} [updateData.email] - User email
   * @param {string} [updateData.password] - User password
   * @param {string} [updateData.role] - User role
   * @param {number} [updateData.teamId] - Team ID
   * @returns {Promise<Object>} Updated user without password
   */
  static async updateUser(userId, updateData) {
    const { name, email, password, role, teamId } = updateData;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      const error = new Error('User not found');
      error.code = ERROR_CODES.USER_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        const error = new Error('User with this email already exists');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        error.statusCode = 409;
        throw error;
      }
    }

    // Validate role if provided
    if (role && !Object.values(ROLES).includes(role)) {
      const error = new Error('Invalid role specified');
      error.code = ERROR_CODES.INVALID_INPUT;
      error.statusCode = 400;
      throw error;
    }

    // If teamId is provided, validate team exists
    if (teamId !== undefined) {
      if (teamId !== null) {
        const team = await prisma.team.findUnique({
          where: { id: teamId }
        });

        if (!team) {
          const error = new Error('Team not found');
          error.code = ERROR_CODES.TEAM_NOT_FOUND;
          error.statusCode = 404;
          throw error;
        }
      }
    }

    // Prepare update data
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (role !== undefined) updateFields.role = role;
    if (teamId !== undefined) updateFields.teamId = teamId;

    // Hash password if provided
    if (password) {
      updateFields.password = await AuthService.hashPassword(password);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateFields,
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Delete user
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  static async deleteUser(userId) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      const error = new Error('User not found');
      error.code = ERROR_CODES.USER_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Check if user has assigned maintenance requests
    const assignedRequests = await prisma.maintenanceRequest.count({
      where: { assignedTo: userId }
    });

    if (assignedRequests > 0) {
      const error = new Error('Cannot delete user with assigned maintenance requests');
      error.code = ERROR_CODES.VALIDATION_ERROR;
      error.statusCode = 400;
      throw error;
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId }
    });
  }

  /**
   * Get users by team ID
   * @param {number} teamId - Team ID
   * @returns {Promise<Array>} Users in the team without passwords
   */
  static async getUsersByTeam(teamId) {
    const users = await prisma.user.findMany({
      where: { teamId },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Remove passwords from response
    return users.map(user => {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  /**
   * Assign user to team
   * @param {number} userId - User ID
   * @param {number} teamId - Team ID
   * @returns {Promise<Object>} Updated user without password
   */
  static async assignUserToTeam(userId, teamId) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = ERROR_CODES.USER_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team) {
      const error = new Error('Team not found');
      error.code = ERROR_CODES.TEAM_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Update user's team
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { teamId },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Remove user from team
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Updated user without password
   */
  static async removeUserFromTeam(userId) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = ERROR_CODES.USER_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Update user's team to null
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { teamId: null },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
}

module.exports = UserService;