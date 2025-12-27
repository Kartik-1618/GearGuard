const { prisma } = require('../models');
const { ERROR_CODES } = require('../utils/constants');

/**
 * Team service handling team management operations
 */
class TeamService {
  /**
   * Create a new team
   * @param {Object} teamData - Team data
   * @param {string} teamData.name - Team name
   * @returns {Promise<Object>} Created team
   */
  static async createTeam(teamData) {
    const { name } = teamData;

    // Check if team already exists
    const existingTeam = await prisma.team.findUnique({
      where: { name }
    });

    if (existingTeam) {
      const error = new Error('Team with this name already exists');
      error.code = ERROR_CODES.VALIDATION_ERROR;
      error.statusCode = 409;
      throw error;
    }

    // Create team
    const team = await prisma.team.create({
      data: { name },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        equipment: {
          select: {
            id: true,
            name: true,
            serialNumber: true
          }
        },
        _count: {
          select: {
            users: true,
            equipment: true,
            maintenanceRequests: true
          }
        }
      }
    });

    return team;
  }

  /**
   * Get all teams with optional filtering
   * @param {Object} filters - Filter options
   * @param {number} [filters.page] - Page number for pagination
   * @param {number} [filters.limit] - Items per page
   * @param {boolean} [filters.includeUsers] - Include users in response
   * @param {boolean} [filters.includeEquipment] - Include equipment in response
   * @returns {Promise<Object>} Teams list with pagination info
   */
  static async getTeams(filters = {}) {
    const { page = 1, limit = 20, includeUsers = false, includeEquipment = false } = filters;
    const skip = (page - 1) * limit;

    const include = {
      _count: {
        select: {
          users: true,
          equipment: true,
          maintenanceRequests: true
        }
      }
    };

    if (includeUsers) {
      include.users = {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      };
    }

    if (includeEquipment) {
      include.equipment = {
        select: {
          id: true,
          name: true,
          serialNumber: true,
          isScrapped: true
        }
      };
    }

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        skip,
        take: limit,
        include,
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.team.count()
    ]);

    return {
      teams,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get team by ID
   * @param {number} teamId - Team ID
   * @param {boolean} [includeUsers] - Include users in response
   * @param {boolean} [includeEquipment] - Include equipment in response
   * @returns {Promise<Object>} Team with related data
   */
  static async getTeamById(teamId, includeUsers = true, includeEquipment = true) {
    const include = {
      _count: {
        select: {
          users: true,
          equipment: true,
          maintenanceRequests: true
        }
      }
    };

    if (includeUsers) {
      include.users = {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        },
        orderBy: {
          name: 'asc'
        }
      };
    }

    if (includeEquipment) {
      include.equipment = {
        select: {
          id: true,
          name: true,
          serialNumber: true,
          department: true,
          location: true,
          isScrapped: true,
          createdAt: true
        },
        orderBy: {
          name: 'asc'
        }
      };
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include
    });

    if (!team) {
      const error = new Error('Team not found');
      error.code = ERROR_CODES.TEAM_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    return team;
  }

  /**
   * Update team
   * @param {number} teamId - Team ID
   * @param {Object} updateData - Data to update
   * @param {string} [updateData.name] - Team name
   * @returns {Promise<Object>} Updated team
   */
  static async updateTeam(teamId, updateData) {
    const { name } = updateData;

    // Check if team exists
    const existingTeam = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!existingTeam) {
      const error = new Error('Team not found');
      error.code = ERROR_CODES.TEAM_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Check if name is being changed and if it's already taken
    if (name && name !== existingTeam.name) {
      const nameExists = await prisma.team.findUnique({
        where: { name }
      });

      if (nameExists) {
        const error = new Error('Team with this name already exists');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        error.statusCode = 409;
        throw error;
      }
    }

    // Prepare update data
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;

    // Update team
    const team = await prisma.team.update({
      where: { id: teamId },
      data: updateFields,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        equipment: {
          select: {
            id: true,
            name: true,
            serialNumber: true
          }
        },
        _count: {
          select: {
            users: true,
            equipment: true,
            maintenanceRequests: true
          }
        }
      }
    });

    return team;
  }

  /**
   * Delete team
   * @param {number} teamId - Team ID
   * @returns {Promise<void>}
   */
  static async deleteTeam(teamId) {
    // Check if team exists
    const existingTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        _count: {
          select: {
            users: true,
            equipment: true,
            maintenanceRequests: true
          }
        }
      }
    });

    if (!existingTeam) {
      const error = new Error('Team not found');
      error.code = ERROR_CODES.TEAM_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Check if team has users
    if (existingTeam._count.users > 0) {
      const error = new Error('Cannot delete team with assigned users');
      error.code = ERROR_CODES.VALIDATION_ERROR;
      error.statusCode = 400;
      throw error;
    }

    // Check if team has equipment
    if (existingTeam._count.equipment > 0) {
      const error = new Error('Cannot delete team with assigned equipment');
      error.code = ERROR_CODES.VALIDATION_ERROR;
      error.statusCode = 400;
      throw error;
    }

    // Check if team has maintenance requests
    if (existingTeam._count.maintenanceRequests > 0) {
      const error = new Error('Cannot delete team with maintenance requests');
      error.code = ERROR_CODES.VALIDATION_ERROR;
      error.statusCode = 400;
      throw error;
    }

    // Delete team
    await prisma.team.delete({
      where: { id: teamId }
    });
  }

  /**
   * Get team statistics
   * @param {number} teamId - Team ID
   * @returns {Promise<Object>} Team statistics
   */
  static async getTeamStatistics(teamId) {
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

    // Get statistics
    const [
      totalUsers,
      totalEquipment,
      activeEquipment,
      scrappedEquipment,
      totalRequests,
      openRequests,
      inProgressRequests,
      completedRequests
    ] = await Promise.all([
      prisma.user.count({ where: { teamId } }),
      prisma.equipment.count({ where: { teamId } }),
      prisma.equipment.count({ where: { teamId, isScrapped: false } }),
      prisma.equipment.count({ where: { teamId, isScrapped: true } }),
      prisma.maintenanceRequest.count({ where: { teamId } }),
      prisma.maintenanceRequest.count({ where: { teamId, status: 'NEW' } }),
      prisma.maintenanceRequest.count({ where: { teamId, status: 'IN_PROGRESS' } }),
      prisma.maintenanceRequest.count({ where: { teamId, status: 'REPAIRED' } })
    ]);

    return {
      team: {
        id: team.id,
        name: team.name
      },
      users: {
        total: totalUsers
      },
      equipment: {
        total: totalEquipment,
        active: activeEquipment,
        scrapped: scrappedEquipment
      },
      maintenanceRequests: {
        total: totalRequests,
        open: openRequests,
        inProgress: inProgressRequests,
        completed: completedRequests
      }
    };
  }

  /**
   * Get teams with basic info (for dropdowns/selects)
   * @returns {Promise<Array>} Teams with id and name only
   */
  static async getTeamsBasic() {
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return teams;
  }
}

module.exports = TeamService;