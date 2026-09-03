import { describe, it, expect } from 'vitest';
import {
  calculateNextScheduled,
  getMedicationStockStatus,
  isDuplicateAdministration,
} from './medicationScheduler';

describe('medicationScheduler utilities', () => {
  describe('calculateNextScheduled', () => {
    it('calculates the next slot today if upcoming', () => {
      const baseDate = new Date('2026-09-03T09:30:00');
      const schedule = ['08:00', '12:00', '18:00'];
      const next = calculateNextScheduled(schedule, baseDate);
      const nextDate = new Date(next);

      expect(nextDate.getFullYear()).toBe(2026);
      expect(nextDate.getMonth()).toBe(8); // 0-indexed September is 8
      expect(nextDate.getDate()).toBe(3);
      expect(nextDate.getHours()).toBe(12);
      expect(nextDate.getMinutes()).toBe(0);
    });

    it('calculates first slot tomorrow if all slots passed today', () => {
      const baseDate = new Date('2026-09-03T19:30:00');
      const schedule = ['08:00', '12:00', '18:00'];
      const next = calculateNextScheduled(schedule, baseDate);
      const nextDate = new Date(next);

      expect(nextDate.getDate()).toBe(4);
      expect(nextDate.getHours()).toBe(8);
      expect(nextDate.getMinutes()).toBe(0);
    });

    it('handles empty schedule (PRN)', () => {
      const baseDate = new Date('2026-09-03T10:00:00');
      const next = calculateNextScheduled([], baseDate);
      const nextDate = new Date(next);

      expect(nextDate.getTime()).toBeGreaterThan(baseDate.getTime());
    });
  });

  describe('getMedicationStockStatus', () => {
    it('returns OutOfStock when 0 or less', () => {
      expect(getMedicationStockStatus(0, 15)).toBe('OutOfStock');
      expect(getMedicationStockStatus(-1, 15)).toBe('OutOfStock');
    });

    it('returns RunningLow when <= threshold', () => {
      expect(getMedicationStockStatus(5, 15)).toBe('RunningLow');
      expect(getMedicationStockStatus(15, 15)).toBe('RunningLow');
    });

    it('returns Normal when > threshold', () => {
      expect(getMedicationStockStatus(16, 15)).toBe('Normal');
      expect(getMedicationStockStatus(50, 15)).toBe('Normal');
    });
  });

  describe('isDuplicateAdministration', () => {
    it('returns true for same resident, medication and close timestamps within 30 min', () => {
      const adminA = {
        residentId: '0040',
        medicationId: 'MED-001',
        actualTime: '2026-09-03T08:00:00Z',
      };
      const adminB = {
        residentId: '0040',
        medicationId: 'MED-001',
        actualTime: '2026-09-03T08:15:00Z',
      };
      expect(isDuplicateAdministration(adminA, adminB)).toBe(true);
    });

    it('returns false for different resident or medication or >30 min apart', () => {
      const adminA = {
        residentId: '0040',
        medicationId: 'MED-001',
        actualTime: '2026-09-03T08:00:00Z',
      };
      const adminB = {
        residentId: '0066',
        medicationId: 'MED-001',
        actualTime: '2026-09-03T08:10:00Z',
      };
      expect(isDuplicateAdministration(adminA, adminB)).toBe(false);

      const adminC = {
        residentId: '0040',
        medicationId: 'MED-001',
        actualTime: '2026-09-03T12:00:00Z',
      };
      expect(isDuplicateAdministration(adminA, adminC)).toBe(false);
    });
  });
});
