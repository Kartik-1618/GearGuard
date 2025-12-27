/**
 * RBAC Middleware Tests
 * Tests for role-based access control functionality
 */

const request = require('supertest');
const express = require('express');
const {
  requireRoles,
  requireAdmin,
  requireAdminOrManager,
  requireAuthenticated,
  requireSameTeam,
  requireUserManagement,
  requireEquipmentManagement,
  requireRequestCreation,
  requireRequestAssignment,
  requireRequestStatusUpdate,
  requireDashboardAccess
} = require('../../src/middleware/rbac');

// Mock app for testing
const createTestApp = (middleware, user = null) => {
  const app = express();
  app.use(express.json());
  
  // Mock authentication middleware
  if (user) {
    app.use((req, res, next) => {
      req.user = user;
      next();
    });
  }
  
  // Test endpoint with middleware
  app.get('/test', middleware, (req, res) => {
    res.json({ success: true, message: 'Access granted' });
  });
  
  return app;
};

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

describe('RBAC Middleware Tests', () => {
  describe('requireRoles', () => {
    test('should allow access for users with correct role', async () => {
      const app = createTestApp(requireRoles('ADMIN', 'MANAGER'), mockUsers.admin);
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should deny access for users without correct role', async () => {
      const app = createTestApp(requireRoles('ADMIN'), mockUsers.technician);
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should deny access for unauthenticated users', async () => {
      const app = createTestApp(requireRoles('ADMIN'));
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('requireAdmin', () => {
    test('should allow access for admin users', async () => {
      const app = createTestApp(requireAdmin(), mockUsers.admin);
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });

    test('should deny access for non-admin users', async () => {
      const app = createTestApp(requireAdmin(), mockUsers.manager);
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(403);
    });
  });

  describe('requireAdminOrManager', () => {
    test('should allow access for admin users', async () => {
      const app = createTestApp(requireAdminOrManager(), mockUsers.admin);
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });

    test('should allow access for manager users', async () => {
      const app = createTestApp(requireAdminOrManager(), mockUsers.manager);
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });

    test('should deny access for technician users', async () => {
      const app = createTestApp(requireAdminOrManager(), mockUsers.technician);
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(403);
    });
  });

  describe('requireAuthenticated', () => {
    test('should allow access for any authenticated user', async () => {
      const app = createTestApp(requireAuthenticated(), mockUsers.technician);
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });

    test('should deny access for unauthenticated users', async () => {
      const app = createTestApp(requireAuthenticated());
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(401);
    });
  });

  describe('requireSameTeam', () => {
    test('should allow access for admin users regardless of team', async () => {
      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = mockUsers.admin;
        next();
      });
      app.get('/teams/:teamId/test', requireSameTeam('params'), (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app).get('/teams/2/test');
      expect(response.status).toBe(200);
    });

    test('should allow access for users from same team', async () => {
      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = mockUsers.manager; // teamId: 1
        next();
      });
      app.get('/teams/:teamId/test', requireSameTeam('params'), (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app).get('/teams/1/test');
      expect(response.status).toBe(200);
    });

    test('should deny access for users from different team', async () => {
      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = mockUsers.technician; // teamId: 1
        next();
      });
      app.get('/teams/:teamId/test', requireSameTeam('params'), (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app).get('/teams/2/test');
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('TEAM_ACCESS_DENIED');
    });

    test('should handle team ID from request body', async () => {
      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = mockUsers.manager; // teamId: 1
        next();
      });
      app.post('/test', requireSameTeam('body'), (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app)
        .post('/test')
        .send({ teamId: 1 });
      
      expect(response.status).toBe(200);
    });

    test('should handle team ID from query parameters', async () => {
      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = mockUsers.manager; // teamId: 1
        next();
      });
      app.get('/test', requireSameTeam('query'), (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app).get('/test?teamId=1');
      expect(response.status).toBe(200);
    });

    test('should return error for missing team ID', async () => {
      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = mockUsers.manager;
        next();
      });
      app.get('/teams/:teamId/test', requireSameTeam('params'), (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app).get('/teams/invalid/test');
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_TEAM_ID');
    });
  });

  describe('Specific permission middleware', () => {
    test('requireUserManagement should only allow admins', async () => {
      // Test admin access
      const app = createTestApp(requireUserManagement(), mockUsers.admin);
      let response = await request(app).get('/test');
      expect(response.status).toBe(200);
      
      // Test manager access (should be denied)
      const app2 = createTestApp(requireUserManagement(), mockUsers.manager);
      response = await request(app2).get('/test');
      expect(response.status).toBe(403);
    });

    test('requireEquipmentManagement should allow admins and managers', async () => {
      // Test admin access
      const app = createTestApp(requireEquipmentManagement(), mockUsers.admin);
      let response = await request(app).get('/test');
      expect(response.status).toBe(200);
      
      // Test manager access
      const app2 = createTestApp(requireEquipmentManagement(), mockUsers.manager);
      response = await request(app2).get('/test');
      expect(response.status).toBe(200);
      
      // Test technician access (should be denied)
      const app3 = createTestApp(requireEquipmentManagement(), mockUsers.technician);
      response = await request(app3).get('/test');
      expect(response.status).toBe(403);
    });

    test('requireRequestCreation should allow admins and managers', async () => {
      const app = createTestApp(requireRequestCreation(), mockUsers.manager);
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });

    test('requireRequestStatusUpdate should allow any authenticated user', async () => {
      const app = createTestApp(requireRequestStatusUpdate(), mockUsers.technician);
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });

    test('requireDashboardAccess should allow admins and managers', async () => {
      const app = createTestApp(requireDashboardAccess(), mockUsers.manager);
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });
  });

  describe('Error response format', () => {
    test('should return consistent error format', async () => {
      const app = createTestApp(requireAdmin(), mockUsers.technician);
      
      const response = await request(app).get('/test');
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should include user role and required roles in error details', async () => {
      const app = createTestApp(requireRoles('ADMIN', 'MANAGER'), mockUsers.technician);
      
      const response = await request(app).get('/test');
      
      expect(response.body.error).toHaveProperty('details');
      expect(response.body.error.details).toHaveProperty('userRole', 'TECHNICIAN');
      expect(response.body.error.details).toHaveProperty('requiredRoles');
      expect(response.body.error.details.requiredRoles).toContain('ADMIN');
      expect(response.body.error.details.requiredRoles).toContain('MANAGER');
    });
  });
});