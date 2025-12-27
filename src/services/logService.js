const { prisma } = require('../models');
const { ERROR_CODES } = require('../utils/constants');

/**
 * Log service handling audit logging operations
 */
class LogService {
  /**
   * Get request logs by request ID
   * @param {number} requestId - Request ID
   * @param {Object} options - Query options
   * @param {number} [options.page] - Page number
   * @param {number} [options.limit] - Items per page
   * @returns {Promise<Object>} Request logs with pagination
   */
  static async getRequestLogs(requestId, options = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    // Verify request exists
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      select: { id: true }
    });

    if (!request) {
      const error = new Error('Maintenance request not found');
      error.code = ERROR_CODES.REQUEST_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    const [logs, total] = await Promise.all([
      prisma.requestLog.findMany({
        where: { requestId },
        skip,
        take: limit,
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
      }),
      prisma.requestLog.count({
        where: { requestId }
      })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get all logs with filtering
   * @param {Object} filters - Filter options
   * @param {number} [filters.page] - Page number
   * @param {number} [filters.limit] - Items per page
   * @param {number} [filters.requestId] - Filter by request ID
   * @param {number} [filters.userId] - Filter by user ID
   * @param {string} [filters.status] - Filter by new status
   * @param {string} [filters.fromDate] - Filter from date
   * @param {string} [filters.toDate] - Filter to date
   * @returns {Promise<Object>} Logs with pagination
   */
  static async getLogs(filters = {}) {
    const {
      page = 1,
      limit = 50,
      requestId,
      userId,
      status,
      fromDate,
      toDate
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};

    if (requestId) where.requestId = requestId;
    if (userId) where.changedBy = userId;
    if (status) where.newStatus = status;

    if (fromDate || toDate) {
      where.changedAt = {};
      if (fromDate) where.changedAt.gte = new Date(fromDate);
      if (toDate) where.changedAt.lte = new Date(toDate);
    }

    const [logs, total] = await Promise.all([
      prisma.requestLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          request: {
            select: {
              id: true,
              subject: true,
              equipment: {
                select: {
                  id: true,
                  name: true,
                  serialNumber: true
                }
              }
            }
          },
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
      }),
      prisma.requestLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get log statistics
   * @param {Object} filters - Filter options
   * @param {number} [filters.teamId] - Filter by team ID
   * @param {string} [filters.fromDate] - Filter from date
   * @param {string} [filters.toDate] - Filter to date
   * @returns {Promise<Object>} Log statistics
   */
  static async getLogStatistics(filters = {}) {
    const { teamId, fromDate, toDate } = filters;

    // Build where clause for logs
    const logWhere = {};
    if (fromDate || toDate) {
      logWhere.changedAt = {};
      if (fromDate) logWhere.changedAt.gte = new Date(fromDate);
      if (toDate) logWhere.changedAt.lte = new Date(toDate);
    }

    // Build where clause for requests (if team filtering is needed)
    const requestWhere = {};
    if (teamId) {
      requestWhere.teamId = teamId;
      logWhere.request = requestWhere;
    }

    const [
      totalLogs,
      logsByStatus,
      logsByUser,
      recentActivity
    ] = await Promise.all([
      prisma.requestLog.count({ where: logWhere }),
      
      prisma.requestLog.groupBy({
        by: ['newStatus'],
        where: logWhere,
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      }),

      prisma.requestLog.groupBy({
        by: ['changedBy'],
        where: logWhere,
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      }),

      prisma.requestLog.findMany({
        where: logWhere,
        include: {
          request: {
            select: {
              id: true,
              subject: true,
              equipment: {
                select: {
                  name: true,
                  serialNumber: true
                }
              }
            }
          },
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
        },
        take: 20
      })
    ]);

    // Get user details for top users
    const userIds = logsByUser.map(log => log.changedBy);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        role: true
      }
    });

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    return {
      total: totalLogs,
      byStatus: logsByStatus.map(stat => ({
        status: stat.newStatus,
        count: stat._count.id
      })),
      byUser: logsByUser.map(stat => ({
        user: userMap[stat.changedBy] || { id: stat.changedBy, name: 'Unknown', role: 'Unknown' },
        count: stat._count.id
      })),
      recentActivity
    };
  }

  /**
   * Create log entry (used internally by RequestService)
   * @param {number} requestId - Request ID
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {number} userId - User making the change
   * @returns {Promise<Object>} Created log entry
   */
  static async createLogEntry(requestId, oldStatus, newStatus, userId) {
    return await prisma.requestLog.create({
      data: {
        requestId,
        oldStatus,
        newStatus,
        changedBy: userId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });
  }
}

module.exports = LogService;