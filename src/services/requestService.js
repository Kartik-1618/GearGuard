const { prisma } = require('../models');
const LogService = require('./logService');
const { ERROR_CODES, MAINTENANCE_STATUS, MAINTENANCE_TYPES } = require('../utils/constants');

/**
 * Maintenance Request service handling request management operations
 */
class RequestService {
  /**
   * Create new maintenance request
   * @param {Object} requestData - Request data
   * @param {string} requestData.subject - Request subject
   * @param {string} requestData.description - Request description
   * @param {string} requestData.type - Maintenance type (CORRECTIVE/PREVENTIVE)
   * @param {number} requestData.equipmentId - Equipment ID
   * @param {string} [requestData.scheduledDate] - Scheduled date for preventive maintenance
   * @param {number} requestData.createdBy - User ID who created the request
   * @returns {Promise<Object>} Created maintenance request
   */
  static async createRequest(requestData) {
    const {
      subject,
      description,
      type,
      equipmentId,
      scheduledDate,
      createdBy
    } = requestData;

    // Validate preventive maintenance scheduling requirements
    this.validatePreventiveMaintenanceScheduling({ type, scheduledDate });

    // Validate equipment exists and is not scrapped
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: {
        id: true,
        name: true,
        isScrapped: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true
          }
        }
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

    // Validate creator exists
    const creator = await prisma.user.findUnique({
      where: { id: createdBy },
      select: { id: true, name: true, role: true }
    });

    if (!creator) {
      const error = new Error('Creator user not found');
      error.code = ERROR_CODES.USER_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Create maintenance request with automatic team assignment
    const request = await prisma.maintenanceRequest.create({
      data: {
        subject,
        description,
        type,
        equipmentId,
        teamId: equipment.teamId, // Automatic team assignment based on equipment
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        createdBy,
        status: MAINTENANCE_STATUS.NEW
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            serialNumber: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    // Create initial log entry
    await LogService.createLogEntry(request.id, null, MAINTENANCE_STATUS.NEW, createdBy);

    return request;
  }

  /**
   * Assign maintenance request to technician
   * @param {number} requestId - Request ID
   * @param {number} technicianId - Technician user ID
   * @param {number} assignedBy - User ID who assigned the request
   * @returns {Promise<Object>} Updated maintenance request
   */
  static async assignRequest(requestId, technicianId, assignedBy) {
    // Get request with team info
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: {
        team: { select: { id: true } }
      }
    });

    if (!request) {
      const error = new Error('Maintenance request not found');
      error.code = ERROR_CODES.REQUEST_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Validate technician exists and belongs to same team
    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
      select: {
        id: true,
        name: true,
        role: true,
        teamId: true
      }
    });

    if (!technician) {
      const error = new Error('Technician not found');
      error.code = ERROR_CODES.USER_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    if (technician.role !== 'TECHNICIAN') {
      const error = new Error('User must be a technician to be assigned maintenance requests');
      error.code = ERROR_CODES.VALIDATION_ERROR;
      error.statusCode = 400;
      throw error;
    }

    if (technician.teamId !== request.teamId) {
      const error = new Error('Technician must belong to the same team as the equipment');
      error.code = ERROR_CODES.TEAM_ASSIGNMENT_MISMATCH;
      error.statusCode = 400;
      throw error;
    }

    // Update request assignment and status
    const updatedRequest = await prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        assignedTo: technicianId,
        status: MAINTENANCE_STATUS.IN_PROGRESS
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            serialNumber: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    // Create log entry for assignment
    await LogService.createLogEntry(requestId, request.status, MAINTENANCE_STATUS.IN_PROGRESS, assignedBy);

    return updatedRequest;
  }

  /**
   * Update maintenance request status
   * @param {number} requestId - Request ID
   * @param {string} newStatus - New status
   * @param {number} userId - User ID making the change
   * @returns {Promise<Object>} Updated maintenance request
   */
  static async updateStatus(requestId, newStatus, userId) {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        assignedTo: true,
        teamId: true
      }
    });

    if (!request) {
      const error = new Error('Maintenance request not found');
      error.code = ERROR_CODES.REQUEST_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Validate status transition
    this.validateStatusTransition(request.status, newStatus);

    // Validate user permissions for status update
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, teamId: true }
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = ERROR_CODES.USER_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Check permissions based on role and assignment
    if (user.role === 'TECHNICIAN') {
      // Technicians can only update requests assigned to them
      if (request.assignedTo !== userId) {
        const error = new Error('Technicians can only update requests assigned to them');
        error.code = ERROR_CODES.INSUFFICIENT_PERMISSIONS;
        error.statusCode = 403;
        throw error;
      }
      // Technicians can only update to REPAIRED or SCRAP
      if (![MAINTENANCE_STATUS.REPAIRED, MAINTENANCE_STATUS.SCRAP].includes(newStatus)) {
        const error = new Error('Technicians can only mark requests as REPAIRED or SCRAP');
        error.code = ERROR_CODES.INVALID_STATUS_TRANSITION;
        error.statusCode = 400;
        throw error;
      }
    } else if (user.role === 'MANAGER') {
      // Managers can only update requests in their team
      if (user.teamId !== request.teamId) {
        const error = new Error('Managers can only update requests in their team');
        error.code = ERROR_CODES.TEAM_ACCESS_DENIED;
        error.statusCode = 403;
        throw error;
      }
    }
    // Admins can update any request

    const oldStatus = request.status;

    // Update request status
    const updatedRequest = await prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            serialNumber: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    // Create log entry
    await LogService.createLogEntry(requestId, oldStatus, newStatus, userId);

    return updatedRequest;
  }

  /**
   * Complete maintenance request with duration
   * @param {number} requestId - Request ID
   * @param {number} durationHours - Duration in hours
   * @param {number} userId - User ID completing the request
   * @returns {Promise<Object>} Updated maintenance request
   */
  static async completeRequest(requestId, durationHours, userId) {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        assignedTo: true,
        teamId: true
      }
    });

    if (!request) {
      const error = new Error('Maintenance request not found');
      error.code = ERROR_CODES.REQUEST_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Validate current status allows completion
    if (request.status !== MAINTENANCE_STATUS.IN_PROGRESS) {
      const error = new Error('Only in-progress requests can be completed');
      error.code = ERROR_CODES.INVALID_STATUS_TRANSITION;
      error.statusCode = 400;
      throw error;
    }

    // Validate user permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, teamId: true }
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = ERROR_CODES.USER_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    if (user.role === 'TECHNICIAN' && request.assignedTo !== userId) {
      const error = new Error('Technicians can only complete requests assigned to them');
      error.code = ERROR_CODES.INSUFFICIENT_PERMISSIONS;
      error.statusCode = 403;
      throw error;
    }

    if (user.role === 'MANAGER' && user.teamId !== request.teamId) {
      const error = new Error('Managers can only complete requests in their team');
      error.code = ERROR_CODES.TEAM_ACCESS_DENIED;
      error.statusCode = 403;
      throw error;
    }

    // Validate duration
    if (!durationHours || durationHours <= 0) {
      const error = new Error('Duration in hours is required and must be greater than 0');
      error.code = ERROR_CODES.VALIDATION_ERROR;
      error.statusCode = 400;
      throw error;
    }

    const oldStatus = request.status;

    // Update request with completion data
    const updatedRequest = await prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: MAINTENANCE_STATUS.REPAIRED,
        durationHours: parseFloat(durationHours)
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            serialNumber: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    // Create log entry
    await LogService.createLogEntry(requestId, oldStatus, MAINTENANCE_STATUS.REPAIRED, userId);

    return updatedRequest;
  }

  /**
   * Scrap maintenance request and associated equipment
   * @param {number} requestId - Request ID
   * @param {number} userId - User ID scrapping the request
   * @returns {Promise<Object>} Updated maintenance request
   */
  static async scrapRequest(requestId, userId) {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: {
        equipment: {
          select: {
            id: true,
            isScrapped: true
          }
        }
      }
    });

    if (!request) {
      const error = new Error('Maintenance request not found');
      error.code = ERROR_CODES.REQUEST_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    // Validate user permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, teamId: true }
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = ERROR_CODES.USER_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    if (user.role === 'TECHNICIAN' && request.assignedTo !== userId) {
      const error = new Error('Technicians can only scrap requests assigned to them');
      error.code = ERROR_CODES.INSUFFICIENT_PERMISSIONS;
      error.statusCode = 403;
      throw error;
    }

    if (user.role === 'MANAGER' && user.teamId !== request.teamId) {
      const error = new Error('Managers can only scrap requests in their team');
      error.code = ERROR_CODES.TEAM_ACCESS_DENIED;
      error.statusCode = 403;
      throw error;
    }

    const oldStatus = request.status;

    // Use transaction to update both request and equipment
    const result = await prisma.$transaction(async (tx) => {
      // Update request status to SCRAP
      const updatedRequest = await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: { status: MAINTENANCE_STATUS.SCRAP },
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              serialNumber: true,
              isScrapped: true
            }
          },
          team: {
            select: {
              id: true,
              name: true
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      });

      // Scrap the associated equipment if not already scrapped
      if (!request.equipment.isScrapped) {
        await tx.equipment.update({
          where: { id: request.equipmentId },
          data: { isScrapped: true }
        });
      }

      return updatedRequest;
    });

    // Create log entry
    await LogService.createLogEntry(requestId, oldStatus, MAINTENANCE_STATUS.SCRAP, userId);

    return result;
  }

  /**
   * Get maintenance requests with filtering and pagination
   * @param {Object} filters - Filter options
   * @param {number} [filters.page] - Page number
   * @param {number} [filters.limit] - Items per page
   * @param {number} [filters.teamId] - Filter by team ID
   * @param {number} [filters.assignedTo] - Filter by assigned technician
   * @param {string} [filters.status] - Filter by status
   * @param {string} [filters.type] - Filter by maintenance type
   * @param {number} [filters.equipmentId] - Filter by equipment ID
   * @param {string} [filters.search] - Search term for subject
   * @param {string} [filters.scheduledDateFrom] - Filter by scheduled date from
   * @param {string} [filters.scheduledDateTo] - Filter by scheduled date to
   * @param {boolean} [filters.overdue] - Filter overdue requests
   * @returns {Promise<Object>} Requests list with pagination
   */
  static async getRequests(filters = {}) {
    const {
      page = 1,
      limit = 20,
      teamId,
      assignedTo,
      status,
      type,
      equipmentId,
      search,
      scheduledDateFrom,
      scheduledDateTo,
      overdue
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};

    if (teamId) where.teamId = teamId;
    if (assignedTo) where.assignedTo = assignedTo;
    if (status) where.status = status;
    if (type) where.type = type;
    if (equipmentId) where.equipmentId = equipmentId;

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Date filtering
    if (scheduledDateFrom || scheduledDateTo) {
      where.scheduledDate = {};
      if (scheduledDateFrom) {
        where.scheduledDate.gte = new Date(scheduledDateFrom);
      }
      if (scheduledDateTo) {
        where.scheduledDate.lte = new Date(scheduledDateTo);
      }
    }

    // Overdue filtering (scheduled date is in the past and status is not REPAIRED or SCRAP)
    if (overdue) {
      where.scheduledDate = {
        lt: new Date()
      };
      where.status = {
        notIn: [MAINTENANCE_STATUS.REPAIRED, MAINTENANCE_STATUS.SCRAP]
      };
    }

    const [requests, total] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              serialNumber: true
            }
          },
          team: {
            select: {
              id: true,
              name: true
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.maintenanceRequest.count({ where })
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get technician dashboard data with request statistics
   * @param {number} technicianId - Technician user ID
   * @param {number} teamId - Team ID
   * @returns {Promise<Object>} Dashboard data with statistics
   */
  static async getTechnicianDashboard(technicianId, teamId) {
    const now = new Date();

    // Get assigned requests statistics
    const [
      assignedRequests,
      newRequests,
      inProgressRequests,
      completedThisWeek,
      overdueRequests,
      upcomingPreventive
    ] = await Promise.all([
      // All assigned requests
      prisma.maintenanceRequest.findMany({
        where: {
          assignedTo: technicianId,
          status: {
            notIn: [MAINTENANCE_STATUS.REPAIRED, MAINTENANCE_STATUS.SCRAP]
          }
        },
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              serialNumber: true
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { scheduledDate: 'asc' },
          { createdAt: 'desc' }
        ]
      }),

      // New requests in team (unassigned)
      prisma.maintenanceRequest.findMany({
        where: {
          teamId: teamId,
          assignedTo: null,
          status: MAINTENANCE_STATUS.NEW
        },
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              serialNumber: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      }),

      // In-progress requests count
      prisma.maintenanceRequest.count({
        where: {
          assignedTo: technicianId,
          status: MAINTENANCE_STATUS.IN_PROGRESS
        }
      }),

      // Completed this week
      prisma.maintenanceRequest.count({
        where: {
          assignedTo: technicianId,
          status: MAINTENANCE_STATUS.REPAIRED,
          updatedAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Overdue requests
      prisma.maintenanceRequest.findMany({
        where: {
          assignedTo: technicianId,
          scheduledDate: {
            lt: now
          },
          status: {
            notIn: [MAINTENANCE_STATUS.REPAIRED, MAINTENANCE_STATUS.SCRAP]
          }
        },
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              serialNumber: true
            }
          }
        },
        orderBy: {
          scheduledDate: 'asc'
        }
      }),

      // Upcoming preventive maintenance (next 7 days)
      prisma.maintenanceRequest.findMany({
        where: {
          OR: [
            { assignedTo: technicianId },
            { teamId: teamId, assignedTo: null }
          ],
          type: MAINTENANCE_TYPES.PREVENTIVE,
          scheduledDate: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          },
          status: {
            notIn: [MAINTENANCE_STATUS.REPAIRED, MAINTENANCE_STATUS.SCRAP]
          }
        },
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              serialNumber: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          scheduledDate: 'asc'
        }
      })
    ]);

    return {
      statistics: {
        totalAssigned: assignedRequests.length,
        inProgress: inProgressRequests,
        completedThisWeek: completedThisWeek,
        overdue: overdueRequests.length,
        upcomingPreventive: upcomingPreventive.length
      },
      assignedRequests: assignedRequests.slice(0, 10), // Limit to 10 most recent
      newTeamRequests: newRequests,
      overdueRequests,
      upcomingPreventive
    };
  }

  /**
   * Get maintenance request by ID
   * @param {number} requestId - Request ID
   * @param {boolean} [includeLogs] - Include request logs
   * @returns {Promise<Object>} Maintenance request with related data
   */
  static async getRequestById(requestId, includeLogs = false) {
    const include = {
      equipment: {
        select: {
          id: true,
          name: true,
          serialNumber: true,
          department: true,
          location: true
        }
      },
      team: {
        select: {
          id: true,
          name: true
        }
      },
      creator: {
        select: {
          id: true,
          name: true,
          role: true
        }
      },
      assignee: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    };

    if (includeLogs) {
      include.logs = {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          changedAt: 'desc'
        }
      };
    }

    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include
    });

    if (!request) {
      const error = new Error('Maintenance request not found');
      error.code = ERROR_CODES.REQUEST_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    return request;
  }

  /**
   * Validate status transition
   * @param {string} currentStatus - Current status
   * @param {string} newStatus - New status
   * @throws {Error} If transition is invalid
   */
  static validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      [MAINTENANCE_STATUS.NEW]: [MAINTENANCE_STATUS.IN_PROGRESS, MAINTENANCE_STATUS.SCRAP],
      [MAINTENANCE_STATUS.IN_PROGRESS]: [MAINTENANCE_STATUS.REPAIRED, MAINTENANCE_STATUS.SCRAP],
      [MAINTENANCE_STATUS.REPAIRED]: [], // Terminal state
      [MAINTENANCE_STATUS.SCRAP]: [] // Terminal state
    };

    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(newStatus)) {
      const error = new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
      error.code = ERROR_CODES.INVALID_STATUS_TRANSITION;
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * Get calendar view data for scheduled maintenance requests
   * @param {Object} filters - Filter options
   * @param {string} [filters.startDate] - Start date for calendar view
   * @param {string} [filters.endDate] - End date for calendar view
   * @param {number} [filters.teamId] - Filter by team ID
   * @param {string} [filters.type] - Filter by maintenance type
   * @returns {Promise<Object>} Calendar view data with scheduled requests
   */
  static async getCalendarView(filters = {}) {
    const {
      startDate,
      endDate,
      teamId,
      type
    } = filters;

    // Default to current month if no dates provided
    const now = new Date();
    const defaultStartDate = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEndDate = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Build where clause for scheduled requests
    const where = {
      scheduledDate: {
        gte: defaultStartDate,
        lte: defaultEndDate
      },
      status: {
        notIn: [MAINTENANCE_STATUS.REPAIRED, MAINTENANCE_STATUS.SCRAP]
      }
    };

    if (teamId) where.teamId = teamId;
    if (type) where.type = type;

    const scheduledRequests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            serialNumber: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    });

    // Group requests by date for calendar display
    const calendarData = {};
    scheduledRequests.forEach(request => {
      const dateKey = request.scheduledDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
      }
      
      calendarData[dateKey].push({
        id: request.id,
        subject: request.subject,
        type: request.type,
        status: request.status,
        equipment: request.equipment,
        team: request.team,
        assignee: request.assignee,
        scheduledDate: request.scheduledDate
      });
    });

    // Calculate summary statistics
    const totalScheduled = scheduledRequests.length;
    const preventiveCount = scheduledRequests.filter(r => r.type === MAINTENANCE_TYPES.PREVENTIVE).length;
    const correctiveCount = scheduledRequests.filter(r => r.type === MAINTENANCE_TYPES.CORRECTIVE).length;
    const overdueCount = scheduledRequests.filter(r => r.scheduledDate < now).length;

    return {
      calendarData,
      summary: {
        totalScheduled,
        preventiveCount,
        correctiveCount,
        overdueCount,
        dateRange: {
          startDate: defaultStartDate.toISOString().split('T')[0],
          endDate: defaultEndDate.toISOString().split('T')[0]
        }
      }
    };
  }

  /**
   * Get upcoming preventive maintenance requests
   * @param {Object} filters - Filter options
   * @param {number} [filters.teamId] - Filter by team ID
   * @param {number} [filters.days] - Number of days to look ahead (default: 30)
   * @returns {Promise<Array>} Upcoming preventive maintenance requests
   */
  static async getUpcomingPreventiveMaintenance(filters = {}) {
    const {
      teamId,
      days = 30
    } = filters;

    const now = new Date();
    const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

    const where = {
      type: MAINTENANCE_TYPES.PREVENTIVE,
      scheduledDate: {
        gte: now,
        lte: futureDate
      },
      status: {
        notIn: [MAINTENANCE_STATUS.REPAIRED, MAINTENANCE_STATUS.SCRAP]
      }
    };

    if (teamId) where.teamId = teamId;

    const upcomingRequests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            department: true,
            location: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    });

    return upcomingRequests;
  }

  /**
   * Validate preventive maintenance scheduling requirements
   * @param {Object} requestData - Request data to validate
   * @throws {Error} If validation fails
   */
  static validatePreventiveMaintenanceScheduling(requestData) {
    const { type, scheduledDate } = requestData;

    // Preventive maintenance must have a scheduled date
    if (type === MAINTENANCE_TYPES.PREVENTIVE) {
      if (!scheduledDate) {
        const error = new Error('Scheduled date is required for preventive maintenance requests');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        error.statusCode = 400;
        throw error;
      }

      const scheduledDateTime = new Date(scheduledDate);
      const now = new Date();

      // Scheduled date cannot be in the past (allow same day)
      if (scheduledDateTime < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        const error = new Error('Scheduled date cannot be in the past');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        error.statusCode = 400;
        throw error;
      }

      // Scheduled date cannot be more than 2 years in the future
      const maxFutureDate = new Date(now.getTime() + (2 * 365 * 24 * 60 * 60 * 1000));
      if (scheduledDateTime > maxFutureDate) {
        const error = new Error('Scheduled date cannot be more than 2 years in the future');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        error.statusCode = 400;
        throw error;
      }
    }

    // Corrective maintenance should not have a scheduled date in the future
    if (type === MAINTENANCE_TYPES.CORRECTIVE && scheduledDate) {
      const scheduledDateTime = new Date(scheduledDate);
      const now = new Date();

      if (scheduledDateTime > now) {
        const error = new Error('Corrective maintenance cannot be scheduled for future dates');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        error.statusCode = 400;
        throw error;
      }
    }
  }

  /**
   * Get manager dashboard data with comprehensive statistics
   * @param {number} [teamId] - Filter by team ID
   * @returns {Promise<Object>} Dashboard data with statistics
   */
  static async getManagerDashboard(teamId = null) {
    const now = new Date();
    const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const next30Days = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    // Build base where clause
    const baseWhere = teamId ? { teamId } : {};

    const [
      totalEquipment,
      totalRequests,
      openRequests,
      inProgressRequests,
      completedThisWeek,
      completedThisMonth,
      overdueRequests,
      upcomingPreventive,
      preventiveVsCorrectiveStats,
      recentRequests
    ] = await Promise.all([
      // Total equipment count
      prisma.equipment.count({
        where: {
          ...baseWhere,
          isScrapped: false
        }
      }),

      // Total requests count
      prisma.maintenanceRequest.count({
        where: baseWhere
      }),

      // Open requests (NEW status)
      prisma.maintenanceRequest.count({
        where: {
          ...baseWhere,
          status: MAINTENANCE_STATUS.NEW
        }
      }),

      // In-progress requests
      prisma.maintenanceRequest.count({
        where: {
          ...baseWhere,
          status: MAINTENANCE_STATUS.IN_PROGRESS
        }
      }),

      // Completed this week
      prisma.maintenanceRequest.count({
        where: {
          ...baseWhere,
          status: MAINTENANCE_STATUS.REPAIRED,
          updatedAt: {
            gte: startOfWeek
          }
        }
      }),

      // Completed this month
      prisma.maintenanceRequest.count({
        where: {
          ...baseWhere,
          status: MAINTENANCE_STATUS.REPAIRED,
          updatedAt: {
            gte: startOfMonth
          }
        }
      }),

      // Overdue requests
      prisma.maintenanceRequest.count({
        where: {
          ...baseWhere,
          scheduledDate: {
            lt: now
          },
          status: {
            notIn: [MAINTENANCE_STATUS.REPAIRED, MAINTENANCE_STATUS.SCRAP]
          }
        }
      }),

      // Upcoming preventive maintenance (next 30 days)
      prisma.maintenanceRequest.count({
        where: {
          ...baseWhere,
          type: MAINTENANCE_TYPES.PREVENTIVE,
          scheduledDate: {
            gte: now,
            lte: next30Days
          },
          status: {
            notIn: [MAINTENANCE_STATUS.REPAIRED, MAINTENANCE_STATUS.SCRAP]
          }
        }
      }),

      // Preventive vs Corrective statistics
      prisma.maintenanceRequest.groupBy({
        by: ['type'],
        where: {
          ...baseWhere,
          createdAt: {
            gte: startOfMonth
          }
        },
        _count: {
          id: true
        }
      }),

      // Recent requests (last 10)
      prisma.maintenanceRequest.findMany({
        where: baseWhere,
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              serialNumber: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      })
    ]);

    // Process preventive vs corrective stats
    const typeStats = {
      preventive: 0,
      corrective: 0
    };

    preventiveVsCorrectiveStats.forEach(stat => {
      if (stat.type === MAINTENANCE_TYPES.PREVENTIVE) {
        typeStats.preventive = stat._count.id;
      } else if (stat.type === MAINTENANCE_TYPES.CORRECTIVE) {
        typeStats.corrective = stat._count.id;
      }
    });

    return {
      statistics: {
        equipment: {
          total: totalEquipment
        },
        requests: {
          total: totalRequests,
          open: openRequests,
          inProgress: inProgressRequests,
          overdue: overdueRequests,
          completedThisWeek: completedThisWeek,
          completedThisMonth: completedThisMonth
        },
        preventiveMaintenance: {
          upcoming30Days: upcomingPreventive
        },
        typeBreakdown: {
          preventiveThisMonth: typeStats.preventive,
          correctiveThisMonth: typeStats.corrective
        }
      },
      recentRequests
    };
  }

  /**
   * Get maintenance statistics by type and date range
   * @param {Object} filters - Filter options
   * @param {number} [filters.teamId] - Filter by team ID
   * @param {string} [filters.startDate] - Start date for statistics
   * @param {string} [filters.endDate] - End date for statistics
   * @returns {Promise<Object>} Maintenance statistics
   */
  static async getMaintenanceStatistics(filters = {}) {
    const {
      teamId,
      startDate,
      endDate
    } = filters;

    // Default to current month if no dates provided
    const now = new Date();
    const defaultStartDate = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEndDate = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const baseWhere = {
      createdAt: {
        gte: defaultStartDate,
        lte: defaultEndDate
      }
    };

    if (teamId) baseWhere.teamId = teamId;

    const [
      requestsByType,
      requestsByStatus,
      averageCompletionTime,
      equipmentWithMostRequests
    ] = await Promise.all([
      // Requests by type
      prisma.maintenanceRequest.groupBy({
        by: ['type'],
        where: baseWhere,
        _count: {
          id: true
        }
      }),

      // Requests by status
      prisma.maintenanceRequest.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: {
          id: true
        }
      }),

      // Average completion time for completed requests
      prisma.maintenanceRequest.aggregate({
        where: {
          ...baseWhere,
          status: MAINTENANCE_STATUS.REPAIRED,
          durationHours: {
            not: null
          }
        },
        _avg: {
          durationHours: true
        }
      }),

      // Equipment with most requests
      prisma.maintenanceRequest.groupBy({
        by: ['equipmentId'],
        where: baseWhere,
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 5
      })
    ]);

    // Get equipment details for top equipment
    const equipmentIds = equipmentWithMostRequests.map(item => item.equipmentId);
    const equipmentDetails = await prisma.equipment.findMany({
      where: {
        id: {
          in: equipmentIds
        }
      },
      select: {
        id: true,
        name: true,
        serialNumber: true
      }
    });

    // Combine equipment details with request counts
    const topEquipment = equipmentWithMostRequests.map(item => {
      const equipment = equipmentDetails.find(eq => eq.id === item.equipmentId);
      return {
        equipment,
        requestCount: item._count.id
      };
    });

    return {
      dateRange: {
        startDate: defaultStartDate.toISOString().split('T')[0],
        endDate: defaultEndDate.toISOString().split('T')[0]
      },
      requestsByType: requestsByType.reduce((acc, item) => {
        acc[item.type.toLowerCase()] = item._count.id;
        return acc;
      }, {}),
      requestsByStatus: requestsByStatus.reduce((acc, item) => {
        acc[item.status.toLowerCase()] = item._count.id;
        return acc;
      }, {}),
      averageCompletionTime: averageCompletionTime._avg.durationHours || 0,
      topEquipment
    };
  }

  /**
   * Get requests grouped by team report
   * @param {Object} filters - Filter options
   * @param {number} [filters.teamId] - Filter by specific team ID
   * @param {string} [filters.startDate] - Start date for report
   * @param {string} [filters.endDate] - End date for report
   * @returns {Promise<Object>} Requests grouped by team
   */
  static async getRequestsByTeamReport(filters = {}) {
    const {
      teamId,
      startDate,
      endDate
    } = filters;

    // Default to current month if no dates provided
    const now = new Date();
    const defaultStartDate = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEndDate = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const baseWhere = {
      createdAt: {
        gte: defaultStartDate,
        lte: defaultEndDate
      }
    };

    if (teamId) baseWhere.teamId = teamId;

    // Get requests grouped by team
    const requestsByTeam = await prisma.maintenanceRequest.groupBy({
      by: ['teamId'],
      where: baseWhere,
      _count: {
        id: true
      },
      _avg: {
        durationHours: true
      }
    });

    // Get team details
    const teamIds = requestsByTeam.map(item => item.teamId);
    const teams = await prisma.team.findMany({
      where: {
        id: {
          in: teamIds
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    // Get detailed statistics for each team
    const teamReports = await Promise.all(
      requestsByTeam.map(async (teamData) => {
        const team = teams.find(t => t.id === teamData.teamId);
        
        // Get status breakdown for this team
        const statusBreakdown = await prisma.maintenanceRequest.groupBy({
          by: ['status'],
          where: {
            ...baseWhere,
            teamId: teamData.teamId
          },
          _count: {
            id: true
          }
        });

        // Get type breakdown for this team
        const typeBreakdown = await prisma.maintenanceRequest.groupBy({
          by: ['type'],
          where: {
            ...baseWhere,
            teamId: teamData.teamId
          },
          _count: {
            id: true
          }
        });

        // Get overdue count for this team
        const overdueCount = await prisma.maintenanceRequest.count({
          where: {
            teamId: teamData.teamId,
            scheduledDate: {
              lt: now
            },
            status: {
              notIn: [MAINTENANCE_STATUS.REPAIRED, MAINTENANCE_STATUS.SCRAP]
            }
          }
        });

        return {
          team,
          totalRequests: teamData._count.id,
          averageCompletionTime: teamData._avg.durationHours || 0,
          overdueRequests: overdueCount,
          statusBreakdown: statusBreakdown.reduce((acc, item) => {
            acc[item.status.toLowerCase()] = item._count.id;
            return acc;
          }, {}),
          typeBreakdown: typeBreakdown.reduce((acc, item) => {
            acc[item.type.toLowerCase()] = item._count.id;
            return acc;
          }, {})
        };
      })
    );

    return {
      dateRange: {
        startDate: defaultStartDate.toISOString().split('T')[0],
        endDate: defaultEndDate.toISOString().split('T')[0]
      },
      teams: teamReports.sort((a, b) => b.totalRequests - a.totalRequests)
    };
  }

  /**
   * Get requests grouped by equipment report
   * @param {Object} filters - Filter options
   * @param {number} [filters.teamId] - Filter by team ID
   * @param {string} [filters.startDate] - Start date for report
   * @param {string} [filters.endDate] - End date for report
   * @returns {Promise<Object>} Requests grouped by equipment
   */
  static async getRequestsByEquipmentReport(filters = {}) {
    const {
      teamId,
      startDate,
      endDate
    } = filters;

    // Default to current month if no dates provided
    const now = new Date();
    const defaultStartDate = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEndDate = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const baseWhere = {
      createdAt: {
        gte: defaultStartDate,
        lte: defaultEndDate
      }
    };

    if (teamId) baseWhere.teamId = teamId;

    // Get requests grouped by equipment
    const requestsByEquipment = await prisma.maintenanceRequest.groupBy({
      by: ['equipmentId'],
      where: baseWhere,
      _count: {
        id: true
      },
      _avg: {
        durationHours: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // Get equipment details
    const equipmentIds = requestsByEquipment.map(item => item.equipmentId);
    const equipment = await prisma.equipment.findMany({
      where: {
        id: {
          in: equipmentIds
        }
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

    // Get detailed statistics for each equipment
    const equipmentReports = await Promise.all(
      requestsByEquipment.map(async (equipmentData) => {
        const equipmentInfo = equipment.find(e => e.id === equipmentData.equipmentId);
        
        // Get status breakdown for this equipment
        const statusBreakdown = await prisma.maintenanceRequest.groupBy({
          by: ['status'],
          where: {
            ...baseWhere,
            equipmentId: equipmentData.equipmentId
          },
          _count: {
            id: true
          }
        });

        // Get type breakdown for this equipment
        const typeBreakdown = await prisma.maintenanceRequest.groupBy({
          by: ['type'],
          where: {
            ...baseWhere,
            equipmentId: equipmentData.equipmentId
          },
          _count: {
            id: true
          }
        });

        // Get overdue count for this equipment
        const overdueCount = await prisma.maintenanceRequest.count({
          where: {
            equipmentId: equipmentData.equipmentId,
            scheduledDate: {
              lt: now
            },
            status: {
              notIn: [MAINTENANCE_STATUS.REPAIRED, MAINTENANCE_STATUS.SCRAP]
            }
          }
        });

        return {
          equipment: {
            id: equipmentInfo.id,
            name: equipmentInfo.name,
            serialNumber: equipmentInfo.serialNumber,
            department: equipmentInfo.department,
            location: equipmentInfo.location,
            team: equipmentInfo.team
          },
          totalRequests: equipmentData._count.id,
          averageCompletionTime: equipmentData._avg.durationHours || 0,
          overdueRequests: overdueCount,
          statusBreakdown: statusBreakdown.reduce((acc, item) => {
            acc[item.status.toLowerCase()] = item._count.id;
            return acc;
          }, {}),
          typeBreakdown: typeBreakdown.reduce((acc, item) => {
            acc[item.type.toLowerCase()] = item._count.id;
            return acc;
          }, {})
        };
      })
    );

    return {
      dateRange: {
        startDate: defaultStartDate.toISOString().split('T')[0],
        endDate: defaultEndDate.toISOString().split('T')[0]
      },
      equipment: equipmentReports
    };
  }

  /**
   * Get overdue requests report
   * @param {Object} filters - Filter options
   * @param {number} [filters.teamId] - Filter by team ID
   * @returns {Promise<Object>} Overdue requests report
   */
  static async getOverdueRequestsReport(filters = {}) {
    const { teamId } = filters;
    const now = new Date();

    const baseWhere = {
      scheduledDate: {
        lt: now
      },
      status: {
        notIn: [MAINTENANCE_STATUS.REPAIRED, MAINTENANCE_STATUS.SCRAP]
      }
    };

    if (teamId) baseWhere.teamId = teamId;

    // Get overdue requests with details
    const overdueRequests = await prisma.maintenanceRequest.findMany({
      where: baseWhere,
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            department: true,
            location: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    });

    // Calculate overdue statistics
    const overdueStats = {
      total: overdueRequests.length,
      byType: {},
      byTeam: {},
      byStatus: {},
      averageDaysOverdue: 0
    };

    let totalDaysOverdue = 0;

    overdueRequests.forEach(request => {
      // Calculate days overdue
      const daysOverdue = Math.ceil((now - request.scheduledDate) / (1000 * 60 * 60 * 24));
      totalDaysOverdue += daysOverdue;

      // Group by type
      overdueStats.byType[request.type] = (overdueStats.byType[request.type] || 0) + 1;

      // Group by team
      const teamName = request.team.name;
      overdueStats.byTeam[teamName] = (overdueStats.byTeam[teamName] || 0) + 1;

      // Group by status
      overdueStats.byStatus[request.status] = (overdueStats.byStatus[request.status] || 0) + 1;
    });

    if (overdueRequests.length > 0) {
      overdueStats.averageDaysOverdue = Math.round(totalDaysOverdue / overdueRequests.length);
    }

    // Add days overdue to each request
    const requestsWithDaysOverdue = overdueRequests.map(request => ({
      ...request,
      daysOverdue: Math.ceil((now - request.scheduledDate) / (1000 * 60 * 60 * 24))
    }));

    return {
      statistics: overdueStats,
      requests: requestsWithDaysOverdue
    };
  }
}

module.exports = RequestService;