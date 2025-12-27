const { prisma } = require('../models');
const { ERROR_CODES } = require('../utils/constants');

/**
 * Equipment service handling equipment management operations
 */
class EquipmentService {
  /**
   * Create new equipment
   * @param {Object} equipmentData - Equipment data
   * @param {string} equipmentData.name - Equipment name
   * @param {string} equipmentData.serialNumber - Serial number
   * @param {string} equipmentData.department - Department
   * @param {string} equipmentData.location - Location
   * @param {string} equipmentData.purchaseDate - Purchase date
   * @param {string} [equipmentData.warrantyEnd] - Warranty end date
   * @param {number} equipmentData.teamId - Team ID
   * @returns {Promise<Object>} Created equipment
   */
  static async createEquipment(equipmentData) {
    const {
      name,
      serialNumber,
      department,
      location,
      purchaseDate,
      warrantyEnd,
      teamId
    } = equipmentData;

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

    // Check if serial number already exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { serialNumber }
    });

    if (existingEquipment) {
      const error = new Error('Equipment with this serial number already exists');
      error.code = ERROR_CODES.VALIDATION_ERROR;
      error.statusCode = 409;
      throw error;
    }

    // Create equipment
    const equipment = await prisma.equipment.create({
      data: {
        name,
        serialNumber,
        department,
        location,
        purchaseDate: new Date(purchaseDate),
        warrantyEnd: warrantyEnd ? new Date(warrantyEnd) : null,
        teamId
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            maintenanceRequests: true
          }
        }
      }
    });

    return equipment;
  }

  /**
   * Get all equipment with filtering and pagination
   * @param {Object} filters - Filter options
   * @param {number} [filters.page] - Page number
   * @param {number} [filters.limit] - Items per page
   * @param {number} [filters.teamId] - Filter by team ID
   * @param {boolean} [filters.includeTeam] - Include team data
   * @param {boolean} [filters.includeScrapped] - Include scrapped equipment
   * @param {string} [filters.search] - Search term for name or serial number
   * @param {string} [filters.department] - Filter by department
   * @param {string} [filters.location] - Filter by location
   * @returns {Promise<Object>} Equipment list with pagination
   */
  static async getEquipment(filters = {}) {
    const {
      page = 1,
      limit = 20,
      teamId,
      includeTeam = true,
      includeScrapped = true,
      search,
      department,
      location
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};

    if (teamId) {
      where.teamId = teamId;
    }

    if (!includeScrapped) {
      where.isScrapped = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (department) {
      where.department = { contains: department, mode: 'insensitive' };
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // Build include clause
    const include = {
      _count: {
        select: {
          maintenanceRequests: true
        }
      }
    };

    if (includeTeam) {
      include.team = {
        select: {
          id: true,
          name: true
        }
      };
    }

    const [equipment, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        skip,
        take: limit,
        include,
        orderBy: [
          { isScrapped: 'asc' },
          { name: 'asc' }
        ]
      }),
      prisma.equipment.count({ where })
    ]);

    return {
      equipment,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get equipment by ID
   * @param {number} equipmentId - Equipment ID
   * @param {boolean} [includeTeam] - Include team data
   * @param {boolean} [includeRequests] - Include maintenance requests
   * @returns {Promise<Object>} Equipment with related data
   */
  static async getEquipmentById(equipmentId, includeTeam = true, includeRequests = false) {
    const include = {
      _count: {
        select: {
          maintenanceRequests: true
        }
      }
    };

    if (includeTeam) {
      include.team = {
        select: {
          id: true,
          name: true
        }
      };
    }

    if (includeRequests) {
      include.maintenanceRequests = {
        select: {
          id: true,
          subject: true,
          type: true,
          status: true,
          createdAt: true,
          scheduledDate: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10 // Limit to recent requests
      };
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include
    });

    if (!equipment) {
      const error = new Error('Equipment not found');
      error.code = ERROR_CODES.EQUIPMENT_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    return equipment;
  }

  /**
   * Update equipment
   * @param {number} equipmentId - Equipment ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated equipment
   */
  static async updateEquipment(equipmentId, updateData) {
    const {
      name,
      serialNumber,
      department,
      location,
      purchaseDate,
      warrantyEnd,
      teamId
    } = updateData;

    // Check if equipment exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id: equipmentId }
    });

    if (!existingEquipment) {
      const error = new Error('Equipment not found');
      error.code = ERROR_CODES.EQUIPMENT_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Check if equipment is scrapped
    if (existingEquipment.isScrapped) {
      const error = new Error('Cannot update scrapped equipment');
      error.code = ERROR_CODES.EQUIPMENT_SCRAPPED;
      error.statusCode = 400;
      throw error;
    }

    // Check if serial number is being changed and if it's already taken
    if (serialNumber && serialNumber !== existingEquipment.serialNumber) {
      const serialExists = await prisma.equipment.findUnique({
        where: { serialNumber }
      });

      if (serialExists) {
        const error = new Error('Equipment with this serial number already exists');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        error.statusCode = 409;
        throw error;
      }
    }

    // Check if team exists (if teamId is being updated)
    if (teamId && teamId !== existingEquipment.teamId) {
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

    // Prepare update data
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (serialNumber !== undefined) updateFields.serialNumber = serialNumber;
    if (department !== undefined) updateFields.department = department;
    if (location !== undefined) updateFields.location = location;
    if (purchaseDate !== undefined) updateFields.purchaseDate = new Date(purchaseDate);
    if (warrantyEnd !== undefined) updateFields.warrantyEnd = warrantyEnd ? new Date(warrantyEnd) : null;
    if (teamId !== undefined) updateFields.teamId = teamId;

    // Update equipment
    const equipment = await prisma.equipment.update({
      where: { id: equipmentId },
      data: updateFields,
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            maintenanceRequests: true
          }
        }
      }
    });

    return equipment;
  }

  /**
   * Scrap equipment
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<Object>} Updated equipment
   */
  static async scrapEquipment(equipmentId) {
    // Check if equipment exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id: equipmentId }
    });

    if (!existingEquipment) {
      const error = new Error('Equipment not found');
      error.code = ERROR_CODES.EQUIPMENT_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Check if equipment is already scrapped
    if (existingEquipment.isScrapped) {
      const error = new Error('Equipment is already scrapped');
      error.code = ERROR_CODES.VALIDATION_ERROR;
      error.statusCode = 400;
      throw error;
    }

    // Update equipment to scrapped status
    const equipment = await prisma.equipment.update({
      where: { id: equipmentId },
      data: { isScrapped: true },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            maintenanceRequests: true
          }
        }
      }
    });

    return equipment;
  }

  /**
   * Delete equipment (only if no maintenance requests exist)
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<void>}
   */
  static async deleteEquipment(equipmentId) {
    // Check if equipment exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        _count: {
          select: {
            maintenanceRequests: true
          }
        }
      }
    });

    if (!existingEquipment) {
      const error = new Error('Equipment not found');
      error.code = ERROR_CODES.EQUIPMENT_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Check if equipment has maintenance requests
    if (existingEquipment._count.maintenanceRequests > 0) {
      const error = new Error('Cannot delete equipment with maintenance requests');
      error.code = ERROR_CODES.VALIDATION_ERROR;
      error.statusCode = 400;
      throw error;
    }

    // Delete equipment
    await prisma.equipment.delete({
      where: { id: equipmentId }
    });
  }

  /**
   * Get equipment by team ID
   * @param {number} teamId - Team ID
   * @param {boolean} [includeScrapped] - Include scrapped equipment
   * @returns {Promise<Array>} Equipment list
   */
  static async getEquipmentByTeam(teamId, includeScrapped = true) {
    const where = { teamId };
    
    if (!includeScrapped) {
      where.isScrapped = false;
    }

    const equipment = await prisma.equipment.findMany({
      where,
      select: {
        id: true,
        name: true,
        serialNumber: true,
        department: true,
        location: true,
        isScrapped: true,
        createdAt: true
      },
      orderBy: [
        { isScrapped: 'asc' },
        { name: 'asc' }
      ]
    });

    return equipment;
  }

  /**
   * Validate equipment for maintenance request creation
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<boolean>} True if equipment is valid for requests
   */
  static async validateEquipmentForRequest(equipmentId) {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: {
        id: true,
        isScrapped: true
      }
    });

    if (!equipment) {
      const error = new Error('Equipment not found');
      error.code = ERROR_CODES.EQUIPMENT_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    if (equipment.isScrapped) {
      const error = new Error('Cannot create maintenance request for scrapped equipment');
      error.code = ERROR_CODES.EQUIPMENT_SCRAPPED;
      error.statusCode = 400;
      throw error;
    }

    return true;
  }

  /**
   * Get equipment statistics
   * @param {number} [teamId] - Optional team ID filter
   * @returns {Promise<Object>} Equipment statistics
   */
  static async getEquipmentStatistics(teamId = null) {
    const where = teamId ? { teamId } : {};

    const [
      totalEquipment,
      activeEquipment,
      scrappedEquipment,
      equipmentWithRequests,
      equipmentByDepartment
    ] = await Promise.all([
      prisma.equipment.count({ where }),
      prisma.equipment.count({ where: { ...where, isScrapped: false } }),
      prisma.equipment.count({ where: { ...where, isScrapped: true } }),
      prisma.equipment.count({
        where: {
          ...where,
          maintenanceRequests: {
            some: {}
          }
        }
      }),
      prisma.equipment.groupBy({
        by: ['department'],
        where,
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      })
    ]);

    return {
      total: totalEquipment,
      active: activeEquipment,
      scrapped: scrappedEquipment,
      withRequests: equipmentWithRequests,
      byDepartment: equipmentByDepartment.map(dept => ({
        department: dept.department,
        count: dept._count.id
      }))
    };
  }

  /**
   * Get equipment for dropdown/select (basic info only)
   * @param {number} [teamId] - Optional team ID filter
   * @param {boolean} [activeOnly] - Only return active equipment
   * @returns {Promise<Array>} Equipment with id, name, and serial number
   */
  static async getEquipmentBasic(teamId = null, activeOnly = true) {
    const where = {};
    
    if (teamId) {
      where.teamId = teamId;
    }
    
    if (activeOnly) {
      where.isScrapped = false;
    }

    const equipment = await prisma.equipment.findMany({
      where,
      select: {
        id: true,
        name: true,
        serialNumber: true,
        isScrapped: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return equipment;
  }
}

module.exports = EquipmentService;