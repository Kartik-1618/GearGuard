const RequestService = require('../../src/services/requestService');
const { prisma } = require('../../src/models');
const { MAINTENANCE_STATUS, MAINTENANCE_TYPES, ERROR_CODES } = require('../../src/utils/constants');

// Mock Prisma
jest.mock('../../src/models', () => ({
  prisma: {
    equipment: {
      findUnique: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    },
    maintenanceRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    },
    requestLog: {
      create: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

describe('RequestService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRequest', () => {
    const mockRequestData = {
      subject: 'Test Request',
      description: 'Test Description',
      type: MAINTENANCE_TYPES.CORRECTIVE,
      equipmentId: 1,
      createdBy: 1
    };

    const mockEquipment = {
      id: 1,
      name: 'Test Equipment',
      isScrapped: false,
      teamId: 1,
      team: { id: 1, name: 'Test Team' }
    };

    const mockCreator = {
      id: 1,
      name: 'Test User',
      role: 'MANAGER'
    };

    const mockCreatedRequest = {
      id: 1,
      ...mockRequestData,
      teamId: 1,
      status: MAINTENANCE_STATUS.NEW,
      equipment: { id: 1, name: 'Test Equipment', serialNumber: 'SN001' },
      team: { id: 1, name: 'Test Team' },
      creator: mockCreator,
      assignee: null
    };

    it('should create maintenance request successfully', async () => {
      prisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      prisma.user.findUnique.mockResolvedValue(mockCreator);
      prisma.maintenanceRequest.create.mockResolvedValue(mockCreatedRequest);
      prisma.requestLog.create.mockResolvedValue({});

      const result = await RequestService.createRequest(mockRequestData);

      expect(prisma.equipment.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          name: true,
          isScrapped: true,
          teamId: true,
          team: { select: { id: true, name: true } }
        }
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, name: true, role: true }
      });

      expect(prisma.maintenanceRequest.create).toHaveBeenCalledWith({
        data: {
          subject: 'Test Request',
          description: 'Test Description',
          type: MAINTENANCE_TYPES.CORRECTIVE,
          equipmentId: 1,
          teamId: 1,
          scheduledDate: null,
          createdBy: 1,
          status: MAINTENANCE_STATUS.NEW
        },
        include: expect.any(Object)
      });

      expect(result).toEqual(mockCreatedRequest);
    });

    it('should throw error for non-existent equipment', async () => {
      prisma.equipment.findUnique.mockResolvedValue(null);

      await expect(RequestService.createRequest(mockRequestData))
        .rejects
        .toThrow('Equipment not found');
    });

    it('should throw error for scrapped equipment', async () => {
      prisma.equipment.findUnique.mockResolvedValue({
        ...mockEquipment,
        isScrapped: true
      });

      await expect(RequestService.createRequest(mockRequestData))
        .rejects
        .toThrow('Cannot create maintenance request for scrapped equipment');
    });

    it('should require scheduled date for preventive maintenance', async () => {
      const preventiveRequestData = {
        ...mockRequestData,
        type: MAINTENANCE_TYPES.PREVENTIVE
      };

      prisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      prisma.user.findUnique.mockResolvedValue(mockCreator);

      await expect(RequestService.createRequest(preventiveRequestData))
        .rejects
        .toThrow('Scheduled date is required for preventive maintenance');
    });
  });

  describe('assignRequest', () => {
    const mockRequest = {
      id: 1,
      status: MAINTENANCE_STATUS.NEW,
      teamId: 1,
      team: { id: 1 }
    };

    const mockTechnician = {
      id: 2,
      name: 'Test Technician',
      role: 'TECHNICIAN',
      teamId: 1
    };

    const mockUpdatedRequest = {
      ...mockRequest,
      assignedTo: 2,
      status: MAINTENANCE_STATUS.IN_PROGRESS,
      assignee: mockTechnician
    };

    it('should assign request to technician successfully', async () => {
      prisma.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);
      prisma.user.findUnique.mockResolvedValue(mockTechnician);
      prisma.maintenanceRequest.update.mockResolvedValue(mockUpdatedRequest);
      prisma.requestLog.create.mockResolvedValue({});

      const result = await RequestService.assignRequest(1, 2, 1);

      expect(prisma.maintenanceRequest.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          assignedTo: 2,
          status: MAINTENANCE_STATUS.IN_PROGRESS
        },
        include: expect.any(Object)
      });

      expect(result).toEqual(mockUpdatedRequest);
    });

    it('should throw error for non-existent request', async () => {
      prisma.maintenanceRequest.findUnique.mockResolvedValue(null);

      await expect(RequestService.assignRequest(1, 2, 1))
        .rejects
        .toThrow('Maintenance request not found');
    });

    it('should throw error for non-technician user', async () => {
      prisma.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);
      prisma.user.findUnique.mockResolvedValue({
        ...mockTechnician,
        role: 'MANAGER'
      });

      await expect(RequestService.assignRequest(1, 2, 1))
        .rejects
        .toThrow('User must be a technician to be assigned maintenance requests');
    });

    it('should throw error for team mismatch', async () => {
      prisma.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);
      prisma.user.findUnique.mockResolvedValue({
        ...mockTechnician,
        teamId: 2
      });

      await expect(RequestService.assignRequest(1, 2, 1))
        .rejects
        .toThrow('Technician must belong to the same team as the equipment');
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(() => {
        RequestService.validateStatusTransition(MAINTENANCE_STATUS.NEW, MAINTENANCE_STATUS.IN_PROGRESS);
      }).not.toThrow();

      expect(() => {
        RequestService.validateStatusTransition(MAINTENANCE_STATUS.IN_PROGRESS, MAINTENANCE_STATUS.REPAIRED);
      }).not.toThrow();

      expect(() => {
        RequestService.validateStatusTransition(MAINTENANCE_STATUS.IN_PROGRESS, MAINTENANCE_STATUS.SCRAP);
      }).not.toThrow();
    });

    it('should reject invalid transitions', () => {
      expect(() => {
        RequestService.validateStatusTransition(MAINTENANCE_STATUS.REPAIRED, MAINTENANCE_STATUS.NEW);
      }).toThrow('Invalid status transition');

      expect(() => {
        RequestService.validateStatusTransition(MAINTENANCE_STATUS.SCRAP, MAINTENANCE_STATUS.IN_PROGRESS);
      }).toThrow('Invalid status transition');

      expect(() => {
        RequestService.validateStatusTransition(MAINTENANCE_STATUS.NEW, MAINTENANCE_STATUS.REPAIRED);
      }).toThrow('Invalid status transition');
    });
  });

  describe('completeRequest', () => {
    const mockRequest = {
      id: 1,
      status: MAINTENANCE_STATUS.IN_PROGRESS,
      assignedTo: 2,
      teamId: 1
    };

    const mockUser = {
      id: 2,
      role: 'TECHNICIAN',
      teamId: 1
    };

    const mockCompletedRequest = {
      ...mockRequest,
      status: MAINTENANCE_STATUS.REPAIRED,
      durationHours: 2.5
    };

    it('should complete request successfully', async () => {
      prisma.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.maintenanceRequest.update.mockResolvedValue(mockCompletedRequest);
      prisma.requestLog.create.mockResolvedValue({});

      const result = await RequestService.completeRequest(1, 2.5, 2);

      expect(prisma.maintenanceRequest.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: MAINTENANCE_STATUS.REPAIRED,
          durationHours: 2.5
        },
        include: expect.any(Object)
      });

      expect(result).toEqual(mockCompletedRequest);
    });

    it('should throw error for invalid status', async () => {
      prisma.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MAINTENANCE_STATUS.NEW
      });

      await expect(RequestService.completeRequest(1, 2.5, 2))
        .rejects
        .toThrow('Only in-progress requests can be completed');
    });

    it('should throw error for invalid duration', async () => {
      prisma.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(RequestService.completeRequest(1, 0, 2))
        .rejects
        .toThrow('Duration in hours is required and must be greater than 0');
    });
  });
});