import { describe, it, expect } from 'vitest';
import { ResidentCreateSchema, CareRecordCreateSchema, MedicationCreateSchema, CarePlanCreateSchema } from './index';

describe('Shared Types Validation', () => {
  describe('ResidentCreateSchema', () => {
    it('validates a correct resident input', () => {
      const validInput = {
        name: '王大明',
        gender: 'Male' as const,
        dateOfBirth: '1945-03-15',
        address: '台北市大安區仁愛路四段 123 號',
        insuranceId: 'A123456789',
        diagnosis: '高血壓、糖尿病',
        admissionDate: '2023-06-01',
        specialNeeds: '需協助進食',
        hasThreePipe: true,
      };

      const result = ResidentCreateSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const invalidInput = {
        name: '',
        gender: 'Male' as const,
        dateOfBirth: '1945-03-15',
        address: '台北市大安區仁愛路四段 123 號',
        insuranceId: 'A123456789',
      };

      const result = ResidentCreateSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });

    it('rejects invalid date format', () => {
      const invalidInput = {
        name: '王大明',
        gender: 'Male' as const,
        dateOfBirth: '15-03-1945',
        address: '台北市大安區仁愛路四段 123 號',
        insuranceId: 'A123456789',
        admissionDate: '2023-06-01',
      };

      const result = ResidentCreateSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('CareRecordCreateSchema', () => {
    it('validates a correct care record input', () => {
      const validInput = {
        residentId: 'RES-001',
        timestamp: '2024-01-15T08:00:00+08:00',
        activities: [
          {
            type: 'VitalSigns' as const,
            timestamp: '2024-01-15T08:00:00+08:00',
            assistanceLevel: 'TotalAssist' as const,
            notes: '血壓 140/90',
          },
        ],
        staffId: 'user-001',
        staffName: '陳照護',
        notes: '住民狀況穩定',
      };

      const result = CareRecordCreateSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('rejects empty activities array', () => {
      const invalidInput = {
        residentId: 'RES-001',
        timestamp: '2024-01-15T08:00:00+08:00',
        activities: [],
        staffId: 'user-001',
        staffName: '陳照護',
      };

      const result = CareRecordCreateSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('MedicationCreateSchema', () => {
    it('validates a correct medication input', () => {
      const validInput = {
        residentId: 'RES-001',
        name: '降壓錠',
        dosage: '10mg',
        frequency: 'OnceDaily' as const,
        schedule: ['08:00'],
        stockLevel: 30,
        reorderThreshold: 15,
        notes: '早餐前服用',
      };

      const result = MedicationCreateSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('rejects invalid time format in schedule', () => {
      const invalidInput = {
        residentId: 'RES-001',
        name: '降壓錠',
        dosage: '10mg',
        frequency: 'OnceDaily' as const,
        schedule: ['8:00'],
        stockLevel: 30,
        reorderThreshold: 15,
      };

      const result = MedicationCreateSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('CarePlanCreateSchema', () => {
    it('validates a correct care plan input', () => {
      const validInput = {
        residentId: 'RES-001',
        assessmentDate: '2024-01-01',
        goals: [
          {
            description: '維持血壓在 140/90 以下',
            targetDate: '2024-06-30',
            status: 'InProgress' as const,
            progressNotes: '定期監測中',
          },
        ],
        serviceItems: [
          {
            name: '血壓測量',
            frequency: '每日兩次',
            responsibleRole: 'Nurse' as const,
            notes: '早晚各一次',
          },
        ],
        reviewDate: '2024-04-01',
        createdBy: 'user-002',
      };

      const result = CarePlanCreateSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('rejects empty goals array', () => {
      const invalidInput = {
        residentId: 'RES-001',
        assessmentDate: '2024-01-01',
        goals: [],
        serviceItems: [
          {
            name: '血壓測量',
            frequency: '每日兩次',
            responsibleRole: 'Nurse' as const,
            notes: '早晚各一次',
          },
        ],
        reviewDate: '2024-04-01',
        createdBy: 'user-002',
      };

      const result = CarePlanCreateSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});