/**
 * Authorization Helpers Tests
 * Tests for authorization utility functions
 */

const {
  hasRole,
  isAdmin,
  isManager,
  isTechnician,
  isAdminOrManager,
  belongsToTeam,
  canAccessTeam,
  canManageUsers,
  canManageEquipment,
  canCreateRequests,
  canAssignRequests,
  canUpdateRequestStatus,
  canViewRequest,
  canModifyRequest,
  canViewDashboard,
  canScrapEquipment,
  getDataFilter,
  throwAuthError,
  assertPermission
} = require('../../src/utils/authHelpers');

// Mock user objects
const mockUsers = {
  admin: {
    id: 1,
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'ADMIN',
    teamId: 1
  },
  manager: {
    id: 2,
    name: 'Manager User',
    email: 'manager@test.com',
    role: 'MANAGER',
    teamId: 1
  },
  technician: {
    id: 3,
    name: 'Technician User',
    email: 'tech@test.com',
    role: 'TECHNICIAN',
    teamId: 1
  },
  technicianTeam2: {
    id: 4,
    name: 'Technician Team 2',
    email: 'tech2@test.com',
    role: 'TECHNICIAN',
    teamId: 2
  }
};

// Mock maintenance request objects
const mockRequests = {
  team1Request: {
    id: 1,
    subject: 'Test Request',
    teamId: 1,
    assignedTo: 3, // technician
    createdBy: 2   // manager
  },
  team2Request: {
    id: 2,
    subject: 'Test Request Team 2',
    teamId: 2,
    assignedTo: 4, // technicianTeam2
    createdBy: 1   // admin
  },
  unassignedRequest: {
    id: 3,
    subject: 'Unassigned Request',
    teamId: 1,
    assignedTo: null,
    createdBy: 2
  }
};

describe('Authorization Helpers Tests', () => {
  describe('Role checking functions', () => {
    describe('hasRole', () => {
      test('should return true for users with matching role', () => {
        expect(hasRole(mockUsers.admin, 'ADMIN')).toBe(true);
        expect(hasRole(mockUsers.manager, 'MANAGER')).toBe(true);
        expect(hasRole(mockUsers.technician, 'TECHNICIAN')).toBe(true);
      });

      test('should return true for users with any of multiple roles', () => {
        expect(hasRole(mockUsers.admin, 'ADMIN', 'MANAGER')).toBe(true);
        expect(hasRole(mockUsers.manager, 'ADMIN', 'MANAGER')).toBe(true);
        expect(hasRole(mockUsers.technician, 'TECHNICIAN', 'MANAGER')).toBe(true);
      });

      test('should return false for users without matching role', () => {
        expect(hasRole(mockUsers.technician, 'ADMIN')).toBe(false);
        expect(hasRole(mockUsers.manager, 'TECHNICIAN')).toBe(false);
        expect(hasRole(mockUsers.admin, 'TECHNICIAN')).toBe(false);
      });

      test('should return false for null or undefined users', () => {
        expect(hasRole(null, 'ADMIN')).toBe(false);
        expect(hasRole(undefined, 'ADMIN')).toBe(false);
        expect(hasRole({}, 'ADMIN')).toBe(false);
      });
    });

    describe('isAdmin', () => {
      test('should return true for admin users', () => {
        expect(isAdmin(mockUsers.admin)).toBe(true);
      });

      test('should return false for non-admin users', () => {
        expect(isAdmin(mockUsers.manager)).toBe(false);
        expect(isAdmin(mockUsers.technician)).toBe(false);
      });
    });

    describe('isManager', () => {
      test('should return true for manager users', () => {
        expect(isManager(mockUsers.manager)).toBe(true);
      });

      test('should return false for non-manager users', () => {
        expect(isManager(mockUsers.admin)).toBe(false);
        expect(isManager(mockUsers.technician)).toBe(false);
      });
    });

    describe('isTechnician', () => {
      test('should return true for technician users', () => {
        expect(isTechnician(mockUsers.technician)).toBe(true);
        expect(isTechnician(mockUsers.technicianTeam2)).toBe(true);
      });

      test('should return false for non-technician users', () => {
        expect(isTechnician(mockUsers.admin)).toBe(false);
        expect(isTechnician(mockUsers.manager)).toBe(false);
      });
    });

    describe('isAdminOrManager', () => {
      test('should return true for admin and manager users', () => {
        expect(isAdminOrManager(mockUsers.admin)).toBe(true);
        expect(isAdminOrManager(mockUsers.manager)).toBe(true);
      });

      test('should return false for technician users', () => {
        expect(isAdminOrManager(mockUsers.technician)).toBe(false);
      });
    });
  });

  describe('Team access functions', () => {
    describe('belongsToTeam', () => {
      test('should return true for users in the specified team', () => {
        expect(belongsToTeam(mockUsers.manager, 1)).toBe(true);
        expect(belongsToTeam(mockUsers.technician, 1)).toBe(true);
        expect(belongsToTeam(mockUsers.technicianTeam2, 2)).toBe(true);
      });

      test('should return false for users not in the specified team', () => {
        expect(belongsToTeam(mockUsers.manager, 2)).toBe(false);
        expect(belongsToTeam(mockUsers.technicianTeam2, 1)).toBe(false);
      });

      test('should handle string team IDs', () => {
        expect(belongsToTeam(mockUsers.manager, '1')).toBe(true);
        expect(belongsToTeam(mockUsers.manager, '2')).toBe(false);
      });

      test('should return false for invalid inputs', () => {
        expect(belongsToTeam(null, 1)).toBe(false);
        expect(belongsToTeam(mockUsers.manager, null)).toBe(false);
        expect(belongsToTeam({}, 1)).toBe(false);
      });
    });

    describe('canAccessTeam', () => {
      test('should allow admin users to access any team', () => {
        expect(canAccessTeam(mockUsers.admin, 1)).toBe(true);
        expect(canAccessTeam(mockUsers.admin, 2)).toBe(true);
        expect(canAccessTeam(mockUsers.admin, 999)).toBe(true);
      });

      test('should allow users to access their own team', () => {
        expect(canAccessTeam(mockUsers.manager, 1)).toBe(true);
        expect(canAccessTeam(mockUsers.technician, 1)).toBe(true);
        expect(canAccessTeam(mockUsers.technicianTeam2, 2)).toBe(true);
      });

      test('should deny users access to other teams', () => {
        expect(canAccessTeam(mockUsers.manager, 2)).toBe(false);
        expect(canAccessTeam(mockUsers.technician, 2)).toBe(false);
        expect(canAccessTeam(mockUsers.technicianTeam2, 1)).toBe(false);
      });
    });
  });

  describe('Permission checking functions', () => {
    describe('canManageUsers', () => {
      test('should allow only admin users', () => {
        expect(canManageUsers(mockUsers.admin)).toBe(true);
        expect(canManageUsers(mockUsers.manager)).toBe(false);
        expect(canManageUsers(mockUsers.technician)).toBe(false);
      });
    });

    describe('canManageEquipment', () => {
      test('should allow admin and manager users', () => {
        expect(canManageEquipment(mockUsers.admin)).toBe(true);
        expect(canManageEquipment(mockUsers.manager)).toBe(true);
        expect(canManageEquipment(mockUsers.technician)).toBe(false);
      });
    });

    describe('canCreateRequests', () => {
      test('should allow admin and manager users', () => {
        expect(canCreateRequests(mockUsers.admin)).toBe(true);
        expect(canCreateRequests(mockUsers.manager)).toBe(true);
        expect(canCreateRequests(mockUsers.technician)).toBe(false);
      });
    });

    describe('canAssignRequests', () => {
      test('should allow admin and manager users', () => {
        expect(canAssignRequests(mockUsers.admin)).toBe(true);
        expect(canAssignRequests(mockUsers.manager)).toBe(true);
        expect(canAssignRequests(mockUsers.technician)).toBe(false);
      });
    });

    describe('canUpdateRequestStatus', () => {
      test('should allow any authenticated user', () => {
        expect(canUpdateRequestStatus(mockUsers.admin)).toBe(true);
        expect(canUpdateRequestStatus(mockUsers.manager)).toBe(true);
        expect(canUpdateRequestStatus(mockUsers.technician)).toBe(true);
        expect(canUpdateRequestStatus(null)).toBe(false);
      });
    });

    describe('canViewDashboard', () => {
      test('should allow admin and manager users', () => {
        expect(canViewDashboard(mockUsers.admin)).toBe(true);
        expect(canViewDashboard(mockUsers.manager)).toBe(true);
        expect(canViewDashboard(mockUsers.technician)).toBe(false);
      });
    });

    describe('canScrapEquipment', () => {
      test('should allow admin and manager users', () => {
        expect(canScrapEquipment(mockUsers.admin)).toBe(true);
        expect(canScrapEquipment(mockUsers.manager)).toBe(true);
        expect(canScrapEquipment(mockUsers.technician)).toBe(false);
      });
    });
  });

  describe('Request-specific permissions', () => {
    describe('canViewRequest', () => {
      test('should allow admin users to view any request', () => {
        expect(canViewRequest(mockUsers.admin, mockRequests.team1Request)).toBe(true);
        expect(canViewRequest(mockUsers.admin, mockRequests.team2Request)).toBe(true);
      });

      test('should allow managers to view requests from their team', () => {
        expect(canViewRequest(mockUsers.manager, mockRequests.team1Request)).toBe(true);
        expect(canViewRequest(mockUsers.manager, mockRequests.team2Request)).toBe(false);
      });

      test('should allow technicians to view requests assigned to them', () => {
        expect(canViewRequest(mockUsers.technician, mockRequests.team1Request)).toBe(true);
        expect(canViewRequest(mockUsers.technician, mockRequests.team2Request)).toBe(false);
      });

      test('should allow technicians to view requests from their team', () => {
        expect(canViewRequest(mockUsers.technician, mockRequests.unassignedRequest)).toBe(true);
        expect(canViewRequest(mockUsers.technicianTeam2, mockRequests.team1Request)).toBe(false);
      });

      test('should return false for invalid inputs', () => {
        expect(canViewRequest(null, mockRequests.team1Request)).toBe(false);
        expect(canViewRequest(mockUsers.admin, null)).toBe(false);
      });
    });

    describe('canModifyRequest', () => {
      test('should allow admin users to modify any request', () => {
        expect(canModifyRequest(mockUsers.admin, mockRequests.team1Request)).toBe(true);
        expect(canModifyRequest(mockUsers.admin, mockRequests.team2Request)).toBe(true);
      });

      test('should allow managers to modify requests from their team', () => {
        expect(canModifyRequest(mockUsers.manager, mockRequests.team1Request)).toBe(true);
        expect(canModifyRequest(mockUsers.manager, mockRequests.team2Request)).toBe(false);
      });

      test('should allow technicians to modify requests assigned to them', () => {
        expect(canModifyRequest(mockUsers.technician, mockRequests.team1Request)).toBe(true);
        expect(canModifyRequest(mockUsers.technician, mockRequests.unassignedRequest)).toBe(false);
        expect(canModifyRequest(mockUsers.technicianTeam2, mockRequests.team1Request)).toBe(false);
      });
    });
  });

  describe('Data filtering', () => {
    describe('getDataFilter', () => {
      test('should return empty filter for admin users', () => {
        expect(getDataFilter(mockUsers.admin, 'equipment')).toEqual({});
        expect(getDataFilter(mockUsers.admin, 'requests')).toEqual({});
        expect(getDataFilter(mockUsers.admin, 'users')).toEqual({});
      });

      test('should return team filter for non-admin users', () => {
        expect(getDataFilter(mockUsers.manager, 'equipment')).toEqual({ teamId: 1 });
        expect(getDataFilter(mockUsers.technician, 'requests')).toEqual({ teamId: 1 });
        expect(getDataFilter(mockUsers.manager, 'users')).toEqual({ teamId: 1 });
      });

      test('should return assigned filter for technicians viewing assigned requests', () => {
        expect(getDataFilter(mockUsers.technician, 'assigned_requests')).toEqual({ assignedTo: 3 });
      });

      test('should return team filter for managers viewing assigned requests', () => {
        expect(getDataFilter(mockUsers.manager, 'assigned_requests')).toEqual({ teamId: 1 });
      });

      test('should return null for users without team', () => {
        const userWithoutTeam = { ...mockUsers.manager, teamId: null };
        expect(getDataFilter(userWithoutTeam, 'equipment')).toBe(null);
      });

      test('should return null for null user', () => {
        expect(getDataFilter(null, 'equipment')).toBe(null);
      });
    });
  });

  describe('Error handling utilities', () => {
    describe('throwAuthError', () => {
      test('should throw error with correct properties', () => {
        expect(() => {
          throwAuthError('Test error', 'TEST_CODE', { detail: 'test' });
        }).toThrow('Test error');

        try {
          throwAuthError('Test error', 'TEST_CODE', { detail: 'test' });
        } catch (error) {
          expect(error.code).toBe('TEST_CODE');
          expect(error.statusCode).toBe(403);
          expect(error.details).toEqual({ detail: 'test' });
        }
      });

      test('should use default values', () => {
        try {
          throwAuthError('Test error');
        } catch (error) {
          expect(error.code).toBe('AUTHORIZATION_ERROR');
          expect(error.statusCode).toBe(403);
          expect(error.details).toEqual({});
        }
      });
    });

    describe('assertPermission', () => {
      test('should not throw error when permission is true', () => {
        expect(() => {
          assertPermission(true, 'Should not throw');
        }).not.toThrow();
      });

      test('should throw error when permission is false', () => {
        expect(() => {
          assertPermission(false, 'Should throw');
        }).toThrow('Should throw');

        try {
          assertPermission(false, 'Test message', 'TEST_CODE', { test: true });
        } catch (error) {
          expect(error.message).toBe('Test message');
          expect(error.code).toBe('TEST_CODE');
          expect(error.details).toEqual({ test: true });
        }
      });
    });
  });
});