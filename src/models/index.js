const prisma = require('../config/database');
const { Role, MaintenanceType, MaintenanceStatus } = require('@prisma/client');

// Export Prisma client instance
module.exports = {
  prisma,
  // Export enums for easy access
  Role,
  MaintenanceType,
  MaintenanceStatus,
  // Export model references for convenience
  User: prisma.user,
  Team: prisma.team,
  Equipment: prisma.equipment,
  MaintenanceRequest: prisma.maintenanceRequest,
  RequestLog: prisma.requestLog,
};