/**
 * Jest test setup file
 * Global test configuration and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';

// Global test utilities
global.mockUser = (overrides = {}) => ({
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 'TECHNICIAN',
  teamId: 1,
  createdAt: new Date(),
  ...overrides
});

global.mockRequest = (overrides = {}) => ({
  id: 1,
  subject: 'Test Request',
  description: 'Test Description',
  type: 'CORRECTIVE',
  status: 'NEW',
  equipmentId: 1,
  teamId: 1,
  assignedTo: null,
  scheduledDate: null,
  durationHours: null,
  createdBy: 1,
  createdAt: new Date(),
  ...overrides
});

global.mockEquipment = (overrides = {}) => ({
  id: 1,
  name: 'Test Equipment',
  serialNumber: 'TEST-001',
  department: 'IT',
  location: 'Office A',
  purchaseDate: new Date('2023-01-01'),
  warrantyEnd: new Date('2025-01-01'),
  teamId: 1,
  isScrapped: false,
  createdAt: new Date(),
  ...overrides
});

// Suppress console.error during tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning') || args[0]?.includes?.('Error:')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});