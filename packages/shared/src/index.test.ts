import { describe, it, expect } from 'vitest';
import {
  ResidentCreateSchema,
  CareRecordCreateSchema,
  MedicationCreateSchema,
  CarePlanCreateSchema,
  DailyCompletionReportSchema,
  ResidentSummaryReportSchema,
  AlertReportItemSchema,
  PdfExportRequestSchema,
  UserCreateSchema,
  UserUpdateRoleSchema,
  UserUpdateStatusSchema,
  SystemSettingsSchema,
  SystemHealthReportSchema,
  FeatureFlagSchema,
} from './index';

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

    it('rejects future assessment date and invalid review date ordering', () => {
      const futureDate = '2099-01-01';
      const futureInput = {
        residentId: 'RES-001',
        assessmentDate: futureDate,
        goals: [
          {
            description: '目標',
            targetDate: '2099-06-30',
            progress: 20,
            status: 'InProgress' as const,
          },
        ],
        serviceItems: [
          {
            name: '項目',
            frequency: '每日一次',
            responsibleRole: 'Caregiver' as const,
          },
        ],
        reviewDate: '2099-07-01',
        createdBy: 'user-002',
      };
      expect(CarePlanCreateSchema.safeParse(futureInput).success).toBe(false);

      const invalidReviewOrder = {
        residentId: 'RES-001',
        assessmentDate: '2024-05-01',
        goals: [
          {
            description: '目標',
            targetDate: '2024-06-30',
            progress: 20,
            status: 'InProgress' as const,
          },
        ],
        serviceItems: [
          {
            name: '項目',
            frequency: '每日一次',
            responsibleRole: 'Caregiver' as const,
          },
        ],
        reviewDate: '2024-04-01', // earlier than assessmentDate
        createdBy: 'user-002',
      };
      expect(CarePlanCreateSchema.safeParse(invalidReviewOrder).success).toBe(false);
    });
  });

  describe('DailyCompletionReportSchema', () => {
    it('validates a correct daily completion report', () => {
      const valid = {
        date: '2024-03-01',
        totalResidents: 20,
        completedRecords: 18,
        averageCompletionRate: 90,
        statusDistribution: [
          { status: 'Normal', count: 16, percentage: 80 },
          { status: 'NeedsReview', count: 4, percentage: 20 },
        ],
        residentScores: [
          { residentId: 'RES-001', residentName: '王大明', bedNumber: '101-A', completionRate: 95 },
        ],
        lowScoreResidents: [
          { residentId: 'RES-002', residentName: '李小華', bedNumber: '102-B', completionRate: 50, missingItems: ['給藥', '翻身'] },
        ],
      };
      expect(DailyCompletionReportSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects invalid date or negative counts', () => {
      const invalid = {
        date: '2024/03/01',
        totalResidents: -1,
        completedRecords: 0,
        averageCompletionRate: 120,
        statusDistribution: [],
        residentScores: [],
        lowScoreResidents: [],
      };
      expect(DailyCompletionReportSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('ResidentSummaryReportSchema', () => {
    it('validates a correct resident summary report', () => {
      const valid = {
        totalResidents: 25,
        tubeStats: {
          totalWithTubes: 5,
          nasogastric: 3,
          urinaryCatheter: 2,
          tracheostomy: 1,
          threePipeCount: 1,
        },
        bedOccupancy: [
          { floor: '1F', room: '101', bedNumber: '101-A', residentName: '王大明', status: 'occupied' as const },
          { floor: '1F', room: '101', bedNumber: '101-B', status: 'vacant' as const },
        ],
        dependencyDistribution: { '輕度': 5, '中度': 10, '重度': 10 },
        alertsSummary: { red: 1, yellow: 3 },
      };
      expect(ResidentSummaryReportSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('AlertReportItemSchema', () => {
    it('validates alert report item', () => {
      const valid = {
        id: 'ALT-001',
        type: 'vital_abnormal' as const,
        severity: 'red' as const,
        title: '血氧過低',
        description: '住民血氧值 89% (低於 95%)',
        residentId: 'RES-001',
        residentName: '王大明',
        bedNumber: '101-A',
        occurredAt: '2024-03-01T08:00:00Z',
        status: 'open' as const,
      };
      expect(AlertReportItemSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('PdfExportRequestSchema', () => {
    it('validates valid export request types', () => {
      const valid = {
        reportType: 'completion-report' as const,
      };
      expect(PdfExportRequestSchema.safeParse(valid).success).toBe(true);
      expect(PdfExportRequestSchema.safeParse({ reportType: 'invalid-type' }).success).toBe(false);
    });
  });

  describe('UserCreateSchema & Update Schemas', () => {
    it('validates user create input', () => {
      const valid = {
        username: 'nurse_chen',
        password: 'password123',
        name: '陳小美',
        role: 'caregiver' as const,
        isLocalStaff: true,
      };
      expect(UserCreateSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects short username or invalid role', () => {
      expect(UserCreateSchema.safeParse({ username: 'ab', name: '名', role: 'caregiver', isLocalStaff: true }).success).toBe(false);
      expect(UserCreateSchema.safeParse({ username: 'valid_user', name: '名', role: 'superadmin', isLocalStaff: true }).success).toBe(false);
    });

    it('validates user role and status updates', () => {
      expect(UserUpdateRoleSchema.safeParse({ role: 'admin' }).success).toBe(true);
      expect(UserUpdateRoleSchema.safeParse({ role: 'unknown' }).success).toBe(false);

      expect(UserUpdateStatusSchema.safeParse({ status: 'active' }).success).toBe(true);
      expect(UserUpdateStatusSchema.safeParse({ isActive: false }).success).toBe(true);
      expect(UserUpdateStatusSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('SystemSettingsSchema', () => {
    it('validates valid system settings', () => {
      const valid = {
        syncIntervalSeconds: 30,
        lockDurationHours: 24,
        lowStockThreshold: 15,
        pdfFont: 'NotoSansTC',
        updatedAt: '2024-03-01T00:00:00Z',
        updatedBy: 'admin1',
      };
      expect(SystemSettingsSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects out-of-range parameters', () => {
      expect(SystemSettingsSchema.safeParse({
        syncIntervalSeconds: 1, // min 5
        lockDurationHours: 0,   // min 1
        lowStockThreshold: 0,
        pdfFont: '',
        updatedAt: '',
        updatedBy: '',
      }).success).toBe(false);
    });
  });

  describe('SystemHealthReportSchema & FeatureFlagSchema', () => {
    it('validates system health report', () => {
      const valid = {
        status: 'healthy' as const,
        uptimeSeconds: 86400,
        services: {
          api: { status: 'up' as const, latencyMs: 45 },
          database: { status: 'up' as const, latencyMs: 12 },
          serviceWorker: { status: 'active' as const, version: '1.0.0' },
          indexedDb: { status: 'connected' as const, sizeEstimateBytes: 1048576 },
        },
        metrics: {
          memoryUsageMb: 128,
          cpuLoadPercentage: 15,
        },
      };
      expect(SystemHealthReportSchema.safeParse(valid).success).toBe(true);
    });

    it('validates feature flag schema', () => {
      const valid = {
        id: 'flag-dark-mode',
        name: 'Dark Mode',
        description: 'Enables dark mode theme toggle',
        enabled: true,
        rolloutPercentage: 100,
        environment: 'all' as const,
      };
      expect(FeatureFlagSchema.safeParse(valid).success).toBe(true);
    });
  });
});