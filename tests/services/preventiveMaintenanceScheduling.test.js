const RequestService = require('../../src/services/requestService');
const { MAINTENANCE_TYPES } = require('../../src/utils/constants');

describe('Preventive Maintenance Scheduling - Validation Only', () => {
  describe('validatePreventiveMaintenanceScheduling', () => {
    it('should require scheduled date for preventive maintenance', () => {
      const requestData = {
        type: MAINTENANCE_TYPES.PREVENTIVE
        // No scheduledDate
      };

      expect(() => {
        RequestService.validatePreventiveMaintenanceScheduling(requestData);
      }).toThrow('Scheduled date is required for preventive maintenance requests');
    });

    it('should reject past dates for preventive maintenance', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const requestData = {
        type: MAINTENANCE_TYPES.PREVENTIVE,
        scheduledDate: yesterday.toISOString()
      };

      expect(() => {
        RequestService.validatePreventiveMaintenanceScheduling(requestData);
      }).toThrow('Scheduled date cannot be in the past');
    });

    it('should reject dates more than 2 years in the future', () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 3);

      const requestData = {
        type: MAINTENANCE_TYPES.PREVENTIVE,
        scheduledDate: farFuture.toISOString()
      };

      expect(() => {
        RequestService.validatePreventiveMaintenanceScheduling(requestData);
      }).toThrow('Scheduled date cannot be more than 2 years in the future');
    });

    it('should accept valid future dates for preventive maintenance', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const requestData = {
        type: MAINTENANCE_TYPES.PREVENTIVE,
        scheduledDate: tomorrow.toISOString()
      };

      expect(() => {
        RequestService.validatePreventiveMaintenanceScheduling(requestData);
      }).not.toThrow();
    });

    it('should accept today as valid date for preventive maintenance', () => {
      const today = new Date();

      const requestData = {
        type: MAINTENANCE_TYPES.PREVENTIVE,
        scheduledDate: today.toISOString()
      };

      expect(() => {
        RequestService.validatePreventiveMaintenanceScheduling(requestData);
      }).not.toThrow();
    });

    it('should reject future dates for corrective maintenance', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const requestData = {
        type: MAINTENANCE_TYPES.CORRECTIVE,
        scheduledDate: tomorrow.toISOString()
      };

      expect(() => {
        RequestService.validatePreventiveMaintenanceScheduling(requestData);
      }).toThrow('Corrective maintenance cannot be scheduled for future dates');
    });

    it('should allow current or past dates for corrective maintenance', () => {
      const now = new Date();

      const requestData = {
        type: MAINTENANCE_TYPES.CORRECTIVE,
        scheduledDate: now.toISOString()
      };

      expect(() => {
        RequestService.validatePreventiveMaintenanceScheduling(requestData);
      }).not.toThrow();
    });

    it('should allow corrective maintenance without scheduled date', () => {
      const requestData = {
        type: MAINTENANCE_TYPES.CORRECTIVE
        // No scheduledDate - should be allowed
      };

      expect(() => {
        RequestService.validatePreventiveMaintenanceScheduling(requestData);
      }).not.toThrow();
    });

    it('should handle edge case of exactly 2 years in the future', () => {
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);

      const requestData = {
        type: MAINTENANCE_TYPES.PREVENTIVE,
        scheduledDate: twoYearsFromNow.toISOString()
      };

      expect(() => {
        RequestService.validatePreventiveMaintenanceScheduling(requestData);
      }).not.toThrow();
    });

    it('should handle edge case of just over 2 years in the future', () => {
      const justOverTwoYears = new Date();
      justOverTwoYears.setFullYear(justOverTwoYears.getFullYear() + 2);
      justOverTwoYears.setDate(justOverTwoYears.getDate() + 1);

      const requestData = {
        type: MAINTENANCE_TYPES.PREVENTIVE,
        scheduledDate: justOverTwoYears.toISOString()
      };

      expect(() => {
        RequestService.validatePreventiveMaintenanceScheduling(requestData);
      }).toThrow('Scheduled date cannot be more than 2 years in the future');
    });
  });
});