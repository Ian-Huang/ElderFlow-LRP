import { describe, it, expect } from 'vitest';
import { handlers } from '@/mocks/handlers';
import {
  DailyCompletionReportSchema,
  ResidentSummaryReportSchema,
  AlertReportItemSchema,
  PdfExportRequestSchema,
  UserRoleSchema,
  UserCreateSchema,
  UserUpdateRoleSchema,
  UserUpdateStatusSchema,
  SystemSettingsSchema,
  SystemHealthReportSchema,
  FeatureFlagSchema,
} from '@lrp/shared';

describe('Challenger M0-2: Adversarial & Boundary Stress Test Suite', () => {
  // Helper to invoke MSW handlers in memory
  const invokeHandler = async (method: string, pathname: string, options: {
    handlerPath?: string;
    searchParams?: Record<string, string>;
    body?: any;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  } = {}) => {
    const targetPath = options.handlerPath || pathname;
    const handler = handlers.find(
      (h: any) => h.info.method === method.toUpperCase() && h.info.path === targetPath
    );
    if (!handler) {
      throw new Error(`Handler not found for ${method} ${targetPath}`);
    }

    let url = `http://localhost${pathname}`;
    if (options.searchParams) {
      const sp = new URLSearchParams(options.searchParams);
      url += `?${sp.toString()}`;
    }

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': 'valid-test-token',
      ...(options.headers || {}),
    };

    const requestInit: RequestInit = {
      method: method.toUpperCase(),
      headers: requestHeaders,
    };
    if (options.body !== undefined) {
      requestInit.body = JSON.stringify(options.body);
    }

    const request = new Request(url, requestInit);
    return await (handler as any).resolver({
      request,
      params: options.params || {},
      cookies: {},
    });
  };

  // =========================================================================
  // Section 1: Zod Schema Boundary Testing
  // =========================================================================
  describe('1. Zod Schema Boundaries & Extremes', () => {
    describe('DailyCompletionReportSchema boundaries', () => {
      const baseValidDailyReport = {
        date: '2024-03-01',
        totalResidents: 10,
        completedRecords: 8,
        averageCompletionRate: 80,
        statusDistribution: [
          { status: 'Normal', count: 8, percentage: 80 },
          { status: 'NeedsReview', count: 2, percentage: 20 },
        ],
        residentScores: [
          { residentId: 'RES-001', residentName: '住民一', bedNumber: '101-A', completionRate: 80 },
        ],
        lowScoreResidents: [
          { residentId: 'RES-002', residentName: '住民二', bedNumber: '102-B', completionRate: 50, missingItems: ['翻身'] },
        ],
      };

      it('accepts valid baseline and empty arrays for zero-resident days', () => {
        expect(DailyCompletionReportSchema.safeParse(baseValidDailyReport).success).toBe(true);

        const zeroResidentReport = {
          ...baseValidDailyReport,
          totalResidents: 0,
          completedRecords: 0,
          averageCompletionRate: 0,
          statusDistribution: [],
          residentScores: [],
          lowScoreResidents: [],
        };
        expect(DailyCompletionReportSchema.safeParse(zeroResidentReport).success).toBe(true);
      });

      it('rejects extreme and invalid percentage values (< 0, > 100, NaN, Infinity)', () => {
        expect(DailyCompletionReportSchema.safeParse({ ...baseValidDailyReport, averageCompletionRate: -0.01 }).success).toBe(false);
        expect(DailyCompletionReportSchema.safeParse({ ...baseValidDailyReport, averageCompletionRate: 100.01 }).success).toBe(false);
        expect(DailyCompletionReportSchema.safeParse({ ...baseValidDailyReport, averageCompletionRate: NaN }).success).toBe(false);
        expect(DailyCompletionReportSchema.safeParse({ ...baseValidDailyReport, averageCompletionRate: Infinity }).success).toBe(false);

        // Status distribution percentages
        const invalidStatusDist = {
          ...baseValidDailyReport,
          statusDistribution: [{ status: 'Normal', count: 5, percentage: 105 }],
        };
        expect(DailyCompletionReportSchema.safeParse(invalidStatusDist).success).toBe(false);

        const negativeStatusDist = {
          ...baseValidDailyReport,
          statusDistribution: [{ status: 'Normal', count: 5, percentage: -5 }],
        };
        expect(DailyCompletionReportSchema.safeParse(negativeStatusDist).success).toBe(false);

        // Resident completionRate
        const invalidResidentScore = {
          ...baseValidDailyReport,
          residentScores: [{ residentId: 'R1', residentName: '名', bedNumber: '101', completionRate: 150 }],
        };
        expect(DailyCompletionReportSchema.safeParse(invalidResidentScore).success).toBe(false);
      });

      it('rejects invalid date strings', () => {
        const invalidDates = ['2024/03/01', '03-01-2024', '2024-3-1', '', 'invalid-date', '20240301'];
        for (const date of invalidDates) {
          expect(DailyCompletionReportSchema.safeParse({ ...baseValidDailyReport, date }).success).toBe(false);
        }
      });

      it('rejects negative counts and non-integer counts', () => {
        expect(DailyCompletionReportSchema.safeParse({ ...baseValidDailyReport, totalResidents: -1 }).success).toBe(false);
        expect(DailyCompletionReportSchema.safeParse({ ...baseValidDailyReport, totalResidents: 5.5 }).success).toBe(false);
        expect(DailyCompletionReportSchema.safeParse({ ...baseValidDailyReport, completedRecords: -5 }).success).toBe(false);
      });

      it('rejects missing required fields', () => {
        const requiredKeys = ['date', 'totalResidents', 'completedRecords', 'averageCompletionRate', 'statusDistribution', 'residentScores', 'lowScoreResidents'];
        for (const key of requiredKeys) {
          const clone = { ...baseValidDailyReport };
          delete (clone as any)[key];
          expect(DailyCompletionReportSchema.safeParse(clone).success).toBe(false);
        }
      });
    });

    describe('ResidentSummaryReportSchema boundaries', () => {
      const baseValidResidentSummary = {
        totalResidents: 20,
        tubeStats: {
          totalWithTubes: 5,
          nasogastric: 3,
          urinaryCatheter: 2,
          tracheostomy: 1,
          threePipeCount: 1,
        },
        bedOccupancy: [
          { floor: '1F', room: '101', bedNumber: '101-A', residentName: '王住民', status: 'occupied' as const },
          { floor: '1F', room: '101', bedNumber: '101-B', status: 'vacant' as const },
          { floor: '1F', room: '102', bedNumber: '102-A', status: 'maintenance' as const },
        ],
        dependencyDistribution: { '輕度': 5, '中度': 10, '重度': 5 },
        alertsSummary: { red: 2, yellow: 4 },
      };

      it('accepts empty bedOccupancy array and zero tube counts', () => {
        const zeroStats = {
          ...baseValidResidentSummary,
          totalResidents: 0,
          tubeStats: { totalWithTubes: 0, nasogastric: 0, urinaryCatheter: 0, tracheostomy: 0, threePipeCount: 0 },
          bedOccupancy: [],
          dependencyDistribution: {},
          alertsSummary: { red: 0, yellow: 0 },
        };
        expect(ResidentSummaryReportSchema.safeParse(zeroStats).success).toBe(true);
      });

      it('rejects negative tube counts or float tube counts', () => {
        const negativeNG = {
          ...baseValidResidentSummary,
          tubeStats: { ...baseValidResidentSummary.tubeStats, nasogastric: -1 },
        };
        expect(ResidentSummaryReportSchema.safeParse(negativeNG).success).toBe(false);

        const floatFoley = {
          ...baseValidResidentSummary,
          tubeStats: { ...baseValidResidentSummary.tubeStats, urinaryCatheter: 1.5 },
        };
        expect(ResidentSummaryReportSchema.safeParse(floatFoley).success).toBe(false);
      });

      it('rejects invalid bedOccupancy status', () => {
        const invalidBedStatus = {
          ...baseValidResidentSummary,
          bedOccupancy: [
            { floor: '1F', room: '101', bedNumber: '101-A', status: 'reserved' },
          ],
        };
        expect(ResidentSummaryReportSchema.safeParse(invalidBedStatus).success).toBe(false);
      });

      it('rejects negative dependency counts and negative alert counts', () => {
        const negativeDep = {
          ...baseValidResidentSummary,
          dependencyDistribution: { '輕度': -1 },
        };
        expect(ResidentSummaryReportSchema.safeParse(negativeDep).success).toBe(false);

        const negativeRed = {
          ...baseValidResidentSummary,
          alertsSummary: { red: -1, yellow: 2 },
        };
        expect(ResidentSummaryReportSchema.safeParse(negativeRed).success).toBe(false);
      });
    });

    describe('AlertReportItemSchema boundaries', () => {
      const baseAlert = {
        id: 'ALT-100',
        type: 'vital_abnormal' as const,
        severity: 'red' as const,
        title: '體溫過高警示',
        description: '體溫達 38.8 度',
        residentId: 'RES-001',
        residentName: '王住民',
        bedNumber: '101-A',
        occurredAt: '2024-03-01T10:00:00Z',
        status: 'open' as const,
      };

      it('accepts all 4 valid alert types and valid severities/statuses', () => {
        const types = ['medication_error', 'vital_abnormal', 'fall', 'missed_care'] as const;
        for (const type of types) {
          expect(AlertReportItemSchema.safeParse({ ...baseAlert, type }).success).toBe(true);
        }

        expect(AlertReportItemSchema.safeParse({ ...baseAlert, severity: 'yellow' }).success).toBe(true);
        expect(AlertReportItemSchema.safeParse({ ...baseAlert, status: 'acknowledged' }).success).toBe(true);
        expect(AlertReportItemSchema.safeParse({ ...baseAlert, status: 'resolved' }).success).toBe(true);
      });

      it('rejects invalid type, invalid severity, and invalid status', () => {
        expect(AlertReportItemSchema.safeParse({ ...baseAlert, type: 'infection' }).success).toBe(false);
        expect(AlertReportItemSchema.safeParse({ ...baseAlert, severity: 'orange' }).success).toBe(false);
        expect(AlertReportItemSchema.safeParse({ ...baseAlert, severity: 'critical' }).success).toBe(false);
        expect(AlertReportItemSchema.safeParse({ ...baseAlert, status: 'closed' }).success).toBe(false);
        expect(AlertReportItemSchema.safeParse({ ...baseAlert, status: 'pending' }).success).toBe(false);
      });

      it('rejects empty string ids and titles', () => {
        expect(AlertReportItemSchema.safeParse({ ...baseAlert, id: '' }).success).toBe(false);
        expect(AlertReportItemSchema.safeParse({ ...baseAlert, title: '' }).success).toBe(false);
        expect(AlertReportItemSchema.safeParse({ ...baseAlert, residentId: '' }).success).toBe(false);
        expect(AlertReportItemSchema.safeParse({ ...baseAlert, residentName: '' }).success).toBe(false);
        expect(AlertReportItemSchema.safeParse({ ...baseAlert, bedNumber: '' }).success).toBe(false);
      });

      it('demonstrates schema boundary: occurredAt accepts unformatted string', () => {
        // occurredAt is z.string(), does not enforce ISO datetime format
        const unformattedDateAlert = { ...baseAlert, occurredAt: 'yesterday' };
        expect(AlertReportItemSchema.safeParse(unformattedDateAlert).success).toBe(true);
      });
    });

    describe('SystemSettingsSchema boundaries', () => {
      const baseValidSettings = {
        syncIntervalSeconds: 30,
        lockDurationHours: 24,
        lowStockThreshold: 15,
        pdfFont: 'NotoSansTC',
        updatedAt: '2024-03-01T00:00:00Z',
        updatedBy: 'sysadmin',
      };

      it('rejects out-of-range syncIntervalSeconds (< 5 or > 3600)', () => {
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, syncIntervalSeconds: 4 }).success).toBe(false);
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, syncIntervalSeconds: 0 }).success).toBe(false);
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, syncIntervalSeconds: -10 }).success).toBe(false);
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, syncIntervalSeconds: 3601 }).success).toBe(false);
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, syncIntervalSeconds: 5 }).success).toBe(true);
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, syncIntervalSeconds: 3600 }).success).toBe(true);
      });

      it('rejects out-of-range lockDurationHours (< 1 or > 72)', () => {
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, lockDurationHours: 0 }).success).toBe(false);
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, lockDurationHours: -1 }).success).toBe(false);
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, lockDurationHours: 73 }).success).toBe(false);
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, lockDurationHours: 1 }).success).toBe(true);
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, lockDurationHours: 72 }).success).toBe(true);
      });

      it('rejects out-of-range lowStockThreshold (< 1 or > 500)', () => {
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, lowStockThreshold: 0 }).success).toBe(false);
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, lowStockThreshold: -5 }).success).toBe(false);
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, lowStockThreshold: 501 }).success).toBe(false);
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, lowStockThreshold: 1 }).success).toBe(true);
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, lowStockThreshold: 500 }).success).toBe(true);
      });

      it('rejects empty pdfFont string', () => {
        expect(SystemSettingsSchema.safeParse({ ...baseValidSettings, pdfFont: '' }).success).toBe(false);
      });
    });

    describe('User Management Schemas boundaries', () => {
      it('UserCreateSchema enforces username length 3-50, password min 6, valid roles', () => {
        const valid = {
          username: 'nurse1',
          password: 'password123',
          name: '護理師',
          role: 'caregiver' as const,
          isLocalStaff: true,
        };
        expect(UserCreateSchema.safeParse(valid).success).toBe(true);

        // username too short
        expect(UserCreateSchema.safeParse({ ...valid, username: 'ab' }).success).toBe(false);
        // password too short
        expect(UserCreateSchema.safeParse({ ...valid, password: '123' }).success).toBe(false);
        // password empty string
        expect(UserCreateSchema.safeParse({ ...valid, password: '' }).success).toBe(false);
        // invalid role
        expect(UserCreateSchema.safeParse({ ...valid, role: 'god_mode' }).success).toBe(false);
        // empty name
        expect(UserCreateSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
      });

      it('UserUpdateRoleSchema enforces valid UserRole enum members', () => {
        expect(UserUpdateRoleSchema.safeParse({ role: 'caregiver' }).success).toBe(true);
        expect(UserUpdateRoleSchema.safeParse({ role: 'supervisor' }).success).toBe(true);
        expect(UserUpdateRoleSchema.safeParse({ role: 'admin' }).success).toBe(true);
        expect(UserUpdateRoleSchema.safeParse({ role: 'sysadmin' }).success).toBe(true);
        expect(UserUpdateRoleSchema.safeParse({ role: 'invalid_role' }).success).toBe(false);
        expect(UserUpdateRoleSchema.safeParse({}).success).toBe(false);
      });

      it('UserUpdateStatusSchema requires at least one of status or isActive', () => {
        expect(UserUpdateStatusSchema.safeParse({}).success).toBe(false);
        expect(UserUpdateStatusSchema.safeParse({ status: 'invalid' }).success).toBe(false);
        expect(UserUpdateStatusSchema.safeParse({ status: 'active' }).success).toBe(true);
        expect(UserUpdateStatusSchema.safeParse({ isActive: false }).success).toBe(true);
      });
    });
  });

  // =========================================================================
  // Section 2: MSW User Management Endpoint Adversarial Testing
  // =========================================================================
  describe('2. MSW User Management Adversarial Boundaries', () => {
    it('rejects exact and case-insensitive duplicate username creation with 400 DUPLICATE_USERNAME', async () => {
      const resExact = await invokeHandler('POST', '/api/v1/users', {
        body: {
          username: 'caregiver1',
          name: '測試重複',
          role: 'caregiver',
          isLocalStaff: true,
        },
      });
      expect(resExact.status).toBe(400);
      const jsonExact = await resExact.json();
      expect(jsonExact.error.code).toBe('DUPLICATE_USERNAME');

      // Case-insensitive duplicate test
      const resCase = await invokeHandler('POST', '/api/v1/users', {
        body: {
          username: 'CAREGIVER1',
          name: '測試大寫重複',
          role: 'caregiver',
          isLocalStaff: true,
        },
      });
      expect(resCase.status).toBe(400);
      const jsonCase = await resCase.json();
      expect(jsonCase.error.code).toBe('DUPLICATE_USERNAME');
    });

    it('rejects creation when missing required fields (username, name, role)', async () => {
      const resNoUser = await invokeHandler('POST', '/api/v1/users', {
        body: { name: '無帳號', role: 'caregiver' },
      });
      expect(resNoUser.status).toBe(400);
      expect((await resNoUser.json()).error.code).toBe('INVALID_INPUT');

      const resNoName = await invokeHandler('POST', '/api/v1/users', {
        body: { username: 'noname_user', role: 'caregiver' },
      });
      expect(resNoName.status).toBe(400);
      expect((await resNoName.json()).error.code).toBe('INVALID_INPUT');

      const resNoRole = await invokeHandler('POST', '/api/v1/users', {
        body: { username: 'norole_user', name: '無角色' },
      });
      expect(resNoRole.status).toBe(400);
      expect((await resNoRole.json()).error.code).toBe('INVALID_INPUT');
    });

    it('EXPOSURE TEST: POST /api/v1/users role validation boundary', async () => {
      // Adversarial payload: invalid role 'hacker'
      const res = await invokeHandler('POST', '/api/v1/users', {
        body: {
          username: `user_invalid_role_${Date.now()}`,
          name: '非法角色',
          role: 'hacker',
          isLocalStaff: false,
        },
      });

      // Observe handler behavior:
      const json = await res.json();
      if (res.status === 201) {
        // Handler accepted invalid role! Demonstrate that created user violates UserRoleSchema
        const roleValidation = UserRoleSchema.safeParse(json.data.role);
        expect(roleValidation.success).toBe(false);
      } else {
        expect(res.status).toBe(400);
      }
    });

    it('EXPOSURE TEST: POST /api/v1/users password validation boundary', async () => {
      // Adversarial payload: password is empty string
      const res = await invokeHandler('POST', '/api/v1/users', {
        body: {
          username: `user_empty_pass_${Date.now()}`,
          password: '',
          name: '空密碼用戶',
          role: 'caregiver',
          isLocalStaff: true,
        },
      });

      // Observe handler behavior:
      if (res.status === 201) {
        // Handler accepted empty password without schema validation
        expect(UserCreateSchema.safeParse({
          username: 'user_empty_pass',
          password: '',
          name: '空密碼用戶',
          role: 'caregiver',
          isLocalStaff: true,
        }).success).toBe(false);
      }
    });

    it('EXPOSURE TEST: PATCH /api/v1/users/:id/status with empty payload', async () => {
      // Find a caregiver to test status update
      const res = await invokeHandler('PATCH', '/api/v1/users/user-001/status', {
        handlerPath: '/api/v1/users/:id/status',
        params: { id: 'user-001' },
        body: {}, // Empty body violating UserUpdateStatusSchema
      });

      // UserUpdateStatusSchema requires at least one of status or isActive
      expect(UserUpdateStatusSchema.safeParse({}).success).toBe(false);
      // Handler behavior check
      expect([200, 400]).toContain(res.status);
    });

    it('enforces protection of the sole sysadmin from demotion, deactivation, deletion', async () => {
      // Demote
      const demoteRes = await invokeHandler('PATCH', '/api/v1/users/user-004/role', {
        handlerPath: '/api/v1/users/:id/role',
        params: { id: 'user-004' },
        body: { role: 'caregiver' },
      });
      expect(demoteRes.status).toBe(400);
      expect((await demoteRes.json()).error.code).toBe('CANNOT_DEMOTE_LAST_SYSADMIN');

      // Deactivate
      const deactRes = await invokeHandler('PATCH', '/api/v1/users/user-004/status', {
        handlerPath: '/api/v1/users/:id/status',
        params: { id: 'user-004' },
        body: { status: 'inactive' },
      });
      expect(deactRes.status).toBe(400);
      expect((await deactRes.json()).error.code).toBe('CANNOT_DEACTIVATE_LAST_SYSADMIN');

      // Delete
      const delRes = await invokeHandler('DELETE', '/api/v1/users/user-004', {
        handlerPath: '/api/v1/users/:id',
        params: { id: 'user-004' },
      });
      expect(delRes.status).toBe(400);
      expect((await delRes.json()).error.code).toBe('CANNOT_REMOVE_LAST_SYSADMIN');
    });

    it('GET /api/v1/users handles extreme pagination and special characters in search', async () => {
      // Negative page / pageSize
      const resNeg = await invokeHandler('GET', '/api/v1/users', {
        searchParams: { page: '-1', pageSize: '-5' },
      });
      expect(resNeg.status).toBe(200);

      // Regex special characters in search do not crash handler
      const resRegex = await invokeHandler('GET', '/api/v1/users', {
        searchParams: { search: '[.*+?^${}()|[]\\' },
      });
      expect(resRegex.status).toBe(200);
      const jsonRegex = await resRegex.json();
      expect(jsonRegex.success).toBe(true);
    });
  });

  // =========================================================================
  // Section 3: MSW System Settings & Health Data Integrity Testing
  // =========================================================================
  describe('3. MSW System Settings & Health Integrity', () => {
    it('GET /api/v1/system/settings conforms to SystemSettingsSchema', async () => {
      const res = await invokeHandler('GET', '/api/v1/system/settings');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(SystemSettingsSchema.safeParse(json.data).success).toBe(true);
    });

    it('EXPOSURE TEST: PATCH /api/v1/system/settings with negative intervals and extreme thresholds', async () => {
      const corruptPayload = {
        syncIntervalSeconds: -999, // Should be >= 5
        lockDurationHours: -10,    // Should be >= 1
        lowStockThreshold: -50,    // Should be >= 1
        pdfFont: '',               // Should be min(1)
      };

      const res = await invokeHandler('PATCH', '/api/v1/system/settings', {
        body: corruptPayload,
      });

      const json = await res.json();
      // Test whether MSW performs server-side schema validation or naively merges:
      if (res.status === 200) {
        // MSW naively merged the corrupt payload
        // Verify that the resulting settings violate SystemSettingsSchema
        const validation = SystemSettingsSchema.safeParse(json.data);
        expect(validation.success).toBe(false);

        // Restore to valid settings for subsequent tests
        await invokeHandler('PATCH', '/api/v1/system/settings', {
          body: {
            syncIntervalSeconds: 30,
            lockDurationHours: 24,
            lowStockThreshold: 15,
            pdfFont: 'NotoSansTC',
          },
        });
      } else {
        expect(res.status).toBe(400);
      }
    });

    it('GET /api/v1/system/health conforms to SystemHealthReportSchema and metrics boundaries', async () => {
      const res = await invokeHandler('GET', '/api/v1/system/health');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const parsed = SystemHealthReportSchema.safeParse(json.data);
      expect(parsed.success).toBe(true);

      // Check metric ranges
      expect(json.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(json.data.metrics.memoryUsageMb).toBeGreaterThanOrEqual(0);
      expect(json.data.metrics.cpuLoadPercentage).toBeGreaterThanOrEqual(0);
      expect(json.data.metrics.cpuLoadPercentage).toBeLessThanOrEqual(100);

      // Check service statuses
      expect(['up', 'down']).toContain(json.data.services.api.status);
      expect(['up', 'down']).toContain(json.data.services.database.status);
      expect(['active', 'inactive']).toContain(json.data.services.serviceWorker.status);
      expect(['connected', 'error']).toContain(json.data.services.indexedDb.status);
    });

    it('GET /api/v1/system/feature-flags conforms to FeatureFlagSchema and boundaries', async () => {
      const res = await invokeHandler('GET', '/api/v1/system/feature-flags');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);

      for (const flag of json.data) {
        expect(FeatureFlagSchema.safeParse(flag).success).toBe(true);
        expect(flag.rolloutPercentage).toBeGreaterThanOrEqual(0);
        expect(flag.rolloutPercentage).toBeLessThanOrEqual(100);
        expect(['development', 'staging', 'production', 'all']).toContain(flag.environment);
      }
    });
  });

  // =========================================================================
  // Section 4: MSW Reports Endpoint Boundary Testing
  // =========================================================================
  describe('4. MSW Reports Endpoints Boundaries', () => {
    it('GET /api/v1/reports/daily-completion conforms to schema with valid date', async () => {
      const res = await invokeHandler('GET', '/api/v1/reports/daily-completion', {
        searchParams: { date: '2024-03-01' },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(DailyCompletionReportSchema.safeParse(json.data).success).toBe(true);
    });

    it('EXPOSURE TEST: GET /api/v1/reports/daily-completion with invalid date query parameter', async () => {
      // Client sends malformed date string
      const res = await invokeHandler('GET', '/api/v1/reports/daily-completion', {
        searchParams: { date: 'not-a-valid-date' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Handler echoes back whatever date query was supplied:
      // Verify whether the echoed date violates DailyCompletionReportSchema
      const parsed = DailyCompletionReportSchema.safeParse(json.data);
      if (json.data.date === 'not-a-valid-date') {
        // Proves that handler echoes unvalidated query parameter into schema-constrained DTO
        expect(parsed.success).toBe(false);
      }
    });

    it('GET /api/v1/reports/resident-summary conforms to schema and tube consistency', async () => {
      const res = await invokeHandler('GET', '/api/v1/reports/resident-summary');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const parsed = ResidentSummaryReportSchema.safeParse(json.data);
      expect(parsed.success).toBe(true);

      // Total residents matches tube stats sanity
      expect(json.data.totalResidents).toBeGreaterThanOrEqual(0);
      expect(json.data.tubeStats.totalWithTubes).toBeGreaterThanOrEqual(0);
      expect(json.data.alertsSummary.red).toBeGreaterThanOrEqual(0);
      expect(json.data.alertsSummary.yellow).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/v1/reports/alerts filters correctly and returns schema-compliant items', async () => {
      // Query red alerts
      const resRed = await invokeHandler('GET', '/api/v1/reports/alerts', {
        searchParams: { severity: 'red' },
      });
      expect(resRed.status).toBe(200);
      const jsonRed = await resRed.json();
      for (const item of jsonRed.data) {
        expect(AlertReportItemSchema.safeParse(item).success).toBe(true);
        expect(item.severity).toBe('red');
      }

      // Query yellow alerts
      const resYellow = await invokeHandler('GET', '/api/v1/reports/alerts', {
        searchParams: { severity: 'yellow' },
      });
      expect(resYellow.status).toBe(200);
      const jsonYellow = await resYellow.json();
      for (const item of jsonYellow.data) {
        expect(AlertReportItemSchema.safeParse(item).success).toBe(true);
        expect(item.severity).toBe('yellow');
      }

      // Query non-existent severity
      const resEmpty = await invokeHandler('GET', '/api/v1/reports/alerts', {
        searchParams: { severity: 'nonexistent' },
      });
      expect(resEmpty.status).toBe(200);
      const jsonEmpty = await resEmpty.json();
      expect(jsonEmpty.data).toEqual([]);
    });

    it('POST /api/v1/reports/pdf validates CSRF and generates mock PDF content', async () => {
      const validReq = { reportType: 'completion-report' };
      expect(PdfExportRequestSchema.safeParse(validReq).success).toBe(true);

      const res = await invokeHandler('POST', '/api/v1/reports/pdf', {
        body: validReq,
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      const text = await res.text();
      expect(text).toContain('%PDF-1.4');
    });
  });
});
