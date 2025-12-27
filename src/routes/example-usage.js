/**
 * Example usage of RBAC middleware in routes
 * This file demonstrates how to use the authentication and authorization middleware
 * DO NOT USE IN PRODUCTION - This is for reference only
 */

const express = require('express');
const {
  authenticate,
  requireAdmin,
  requireAdminOrManager,
  requireAuthenticated,
  requireSameTeam,
  requireUserManagement,
  requireEquipmentManagement,
  requireRequestCreation,
  requireRequestAssignment,
  requireRequestStatusUpdate,
  requireDashboardAccess,
  validateUserCreation,
  validateUserUpdate,
  validateEquipmentCreation,
  validateRequestCreation,
  validateRequestStatusUpdate,
  validateIdParam
} = require('../middleware');

const router = express.Router();

// Example: Public endpoint (no authentication required)
router.get('/public', (req, res) => {
  res.json({ message: 'This is a public endpoint' });
});

// Example: Authenticated endpoint (any logged-in user)
router.get('/profile', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Example: Admin-only endpoint
router.post('/admin/system-config', authenticate, requireAdmin(), (req, res) => {
  res.json({ message: 'System configuration updated' });
});

// Example: Admin or Manager endpoint
router.get('/dashboard', authenticate, requireAdminOrManager(), (req, res) => {
  res.json({ message: 'Dashboard data' });
});

// Example: User management with validation (Admin only)
router.post('/users', 
  authenticate, 
  requireUserManagement(), 
  validateUserCreation,
  (req, res) => {
    res.json({ message: 'User created' });
  }
);

router.put('/users/:id', 
  authenticate, 
  requireUserManagement(), 
  validateIdParam,
  validateUserUpdate,
  (req, res) => {
    res.json({ message: 'User updated' });
  }
);

router.delete('/users/:id', 
  authenticate, 
  requireUserManagement(), 
  validateIdParam,
  (req, res) => {
    res.json({ message: 'User deleted' });
  }
);

// Example: Equipment management with validation (Admin or Manager)
router.post('/equipment', 
  authenticate, 
  requireEquipmentManagement(), 
  validateEquipmentCreation,
  (req, res) => {
    res.json({ message: 'Equipment created' });
  }
);

router.put('/equipment/:id', 
  authenticate, 
  requireEquipmentManagement(), 
  validateIdParam,
  (req, res) => {
    res.json({ message: 'Equipment updated' });
  }
);

// Example: Team-specific equipment access
router.get('/teams/:teamId/equipment', 
  authenticate, 
  requireSameTeam('params'), 
  (req, res) => {
    res.json({ message: `Equipment for team ${req.params.teamId}` });
  }
);

// Example: Maintenance request creation with validation (Admin or Manager)
router.post('/requests', 
  authenticate, 
  requireRequestCreation(), 
  validateRequestCreation,
  (req, res) => {
    res.json({ message: 'Maintenance request created' });
  }
);

// Example: Request assignment (Admin or Manager)
router.put('/requests/:id/assign', 
  authenticate, 
  requireRequestAssignment(), 
  validateIdParam,
  (req, res) => {
    res.json({ message: 'Request assigned' });
  }
);

// Example: Request status update with validation (Any authenticated user, with business logic in controller)
router.put('/requests/:id/status', 
  authenticate, 
  requireRequestStatusUpdate(), 
  validateIdParam,
  validateRequestStatusUpdate,
  (req, res) => {
    res.json({ message: 'Request status updated' });
  }
);

// Example: Dashboard access (Admin or Manager)
router.get('/dashboard/stats', authenticate, requireDashboardAccess(), (req, res) => {
  res.json({ message: 'Dashboard statistics' });
});

// Example: Multiple middleware chaining with validation
router.get('/teams/:teamId/requests',
  authenticate,                    // Must be authenticated
  requireAdminOrManager(),        // Must be admin or manager
  requireSameTeam('params'),      // Must belong to the team (unless admin)
  (req, res) => {
    res.json({ message: `Requests for team ${req.params.teamId}` });
  }
);

// Example: Using team ID from request body with validation
router.post('/equipment/bulk',
  authenticate,
  requireEquipmentManagement(),
  requireSameTeam('body'),        // teamId expected in request body
  (req, res) => {
    res.json({ message: 'Bulk equipment operation' });
  }
);

// Example: Using team ID from query parameters
router.get('/reports/equipment',
  authenticate,
  requireDashboardAccess(),
  requireSameTeam('query'),       // teamId expected in query params
  (req, res) => {
    res.json({ message: 'Equipment report' });
  }
);

// Example: Complex validation with business logic
router.post('/requests/preventive',
  authenticate,
  requireRequestCreation(),
  validateRequestCreation,        // This will validate that preventive requests have scheduled dates
  (req, res) => {
    res.json({ message: 'Preventive maintenance request created' });
  }
);

module.exports = router;