import { http, HttpResponse } from 'msw';
import type {
  Resident,
  CareRecord,
  Medication,
  CarePlan,
  User,
  AuthTokens,
  SwitchableUser,
  ApiResponse,
  PaginatedResponse,
  ComplianceCheck,
  Report,
  SyncConflict,
  MedicationAdministration,
} from '@lrp/shared';
import { mockMedicationsSeed } from './medicationSeedData';
import {
  calculateNextScheduled,
  getMedicationStockStatus,
  isDuplicateAdministration,
} from '@/utils/medicationScheduler';

// Mock data
const mockUsers: User[] = [
  {
    userId: 'user-001',
    username: 'caregiver1',
    name: '陳照護',
    role: 'caregiver',
    isLocalStaff: true,
    avatarUrl: undefined,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    userId: 'user-002',
    username: 'supervisor1',
    name: '林主管',
    role: 'supervisor',
    isLocalStaff: true,
    avatarUrl: undefined,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    userId: 'user-003',
    username: 'admin1',
    name: '張管理員',
    role: 'admin',
    isLocalStaff: false,
    avatarUrl: undefined,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
  },
];

import { seedResidents, transformRawResident, type RawResidentJson } from './residentSeedData';
import { isThreePipe, parsePipesString, rocToIso } from '@/utils/rocDate';

// Mock data
let mockResidents: Resident[] = [...seedResidents];

const mockCareRecords: CareRecord[] = [
  {
    recordId: 'CR-001',
    residentId: 'RES-001',
    timestamp: '2024-01-15T08:00:00+08:00',
    activities: [
      {
        activityId: 'ACT-001',
        type: 'VitalSigns',
        timestamp: '2024-01-15T08:00:00+08:00',
        assistanceLevel: 'TotalAssist',
        notes: '血壓 140/90, 心率 78, 體溫 36.5',
        evidence: [],
      },
      {
        activityId: 'ACT-002',
        type: 'Medication',
        timestamp: '2024-01-15T08:15:00+08:00',
        assistanceLevel: 'TotalAssist',
        notes: '早餐前給藥完成',
        evidence: [],
      },
    ],
    staffId: 'user-001',
    staffName: '陳照護',
    completenessScore: 85,
    status: 'Normal',
    evidence: [],
    notes: '住民狀況穩定',
    submittedAt: '2024-01-15T08:30:00+08:00',
    lockedAt: undefined,
    lockType: 'Editable',
    modificationHistory: [],
    createdAt: '2024-01-15T08:30:00+08:00',
    updatedAt: '2024-01-15T08:30:00+08:00',
  },
];

let mockMedications: Medication[] = [...mockMedicationsSeed];

const mockCarePlans: CarePlan[] = [
  {
    planId: 'CP-001',
    residentId: 'RES-001',
    assessmentDate: '2024-01-01',
    goals: [
      {
        goalId: 'G-001',
        description: '維持血壓在 140/90 以下',
        targetDate: '2024-06-30',
        status: 'InProgress',
        progressNotes: '定期監測中',
      },
    ],
    serviceItems: [
      {
        itemId: 'SI-001',
        name: '血壓測量',
        frequency: '每日兩次',
        responsibleRole: 'Nurse',
        notes: '早晚各一次',
      },
    ],
    reviewDate: '2024-04-01',
    status: 'Active',
    createdBy: 'user-002',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
];

const mockReports: Report[] = [
  {
    reportId: 'RPT-001',
    type: 'DailyCompletion',
    generatedAt: '2024-01-15T00:00:00Z',
    generatedBy: 'user-002',
    status: 'Completed',
    filePath: '/reports/daily-2024-01-15.pdf',
    parameters: { date: '2024-01-15' },
  },
];

const mockComplianceChecks: ComplianceCheck[] = [
  {
    checkId: 'CC-001',
    type: 'CareRatio',
    isCompliant: true,
    details: '目前護理比例 1:15，符合三管住民需求',
    checkedAt: new Date().toISOString(),
    relatedEntityIds: ['RES-001'],
  },
  {
    checkId: 'CC-002',
    type: 'NightShift',
    isCompliant: true,
    details: '夜班有本國籍員工 1 名在班',
    checkedAt: new Date().toISOString(),
    relatedEntityIds: [],
  },
];

const mockSyncConflicts: SyncConflict[] = [];

// Helper functions
function createApiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  };
}

function createPaginatedResponse<T>(items: T[], page = 1, pageSize = 20): PaginatedResponse<T> {
  return {
    items,
    total: items.length,
    page,
    pageSize,
    totalPages: Math.ceil(items.length / pageSize),
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// In-memory store for switchable users (simulates server-side storage)
let mockSwitchableUsers: SwitchableUser[] = [
  {
    userId: 'user-001',
    username: 'caregiver1',
    name: '陳照護',
    role: 'caregiver',
    encryptedRefreshToken: 'enc-mock-refresh-1',
    lastUsedAt: new Date().toISOString(),
  },
  {
    userId: 'user-002',
    username: 'supervisor1',
    name: '林主管',
    role: 'supervisor',
    encryptedRefreshToken: 'enc-mock-refresh-2',
    lastUsedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Mock handlers
export const handlers = [
  // Auth endpoints
  http.post('/api/v1/auth/login', async ({ request }) => {
    await delay(300);
    const body = await request.json() as { username: string; password: string };
    const user = mockUsers.find((u) => u.username === body.username);
    if (!user || body.password !== 'password123') {
      return HttpResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: '帳號或密碼錯誤' } },
        { status: 401 }
      );
    }

    const tokens: AuthTokens = {
      accessToken: `mock-access-${crypto.randomUUID()}`,
      refreshToken: `mock-refresh-${crypto.randomUUID()}`,
      expiresIn: 900,
    };

    // Add current user to switchable users (most recent first, max 5)
    const newSwitchableUser: SwitchableUser = {
      userId: user.userId,
      username: user.username,
      name: user.name,
      role: user.role,
      encryptedRefreshToken: `enc-${tokens.refreshToken}`,
      lastUsedAt: new Date().toISOString(),
    };

    // Remove existing entry for this user and add to front
    mockSwitchableUsers = mockSwitchableUsers.filter((u) => u.userId !== user.userId);
    mockSwitchableUsers = [newSwitchableUser, ...mockSwitchableUsers].slice(0, 5);

    return HttpResponse.json(createApiResponse({ tokens, user, switchableUsers: mockSwitchableUsers }));
  }),

  http.post('/api/v1/auth/refresh', async ({ request }) => {
    await delay(200);
    // Simulate HttpOnly cookie check - in real app this would be automatic
    const cookieHeader = request.headers.get('Cookie');
    // For mock, we just check if there's any auth context
    // In real HttpOnly cookie flow, the browser sends cookies automatically
    void cookieHeader; // silence unused warning
    return HttpResponse.json(createApiResponse({
      accessToken: `mock-access-${crypto.randomUUID()}`,
      expiresIn: 900,
    }));
  }),

  http.post('/api/v1/auth/logout', async () => {
    await delay(100);
    return HttpResponse.json(createApiResponse({ success: true }));
  }),

  http.get('/api/v1/users/me', async ({ request }) => {
    await delay(100);
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer mock-access-')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '未授權' } },
        { status: 401 }
      );
    }
    return HttpResponse.json(createApiResponse(mockUsers[0]));
  }),

  http.get('/api/v1/users/switchable', async () => {
    await delay(100);
    return HttpResponse.json(createApiResponse(mockSwitchableUsers));
  }),

  http.post('/api/v1/auth/switch', async ({ request }) => {
    await delay(200);
    const body = await request.json() as { targetUserId: string; refreshToken: string };
    const user = mockUsers.find((u) => u.userId === body.targetUserId);
    if (!user) {
      return HttpResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: '使用者不存在' } },
        { status: 404 }
      );
    }

    const tokens = {
      accessToken: `mock-access-${crypto.randomUUID()}`,
      expiresIn: 900,
    };

    // Add switched user to switchable users (most recent first, max 5)
    const newSwitchableUser: SwitchableUser = {
      userId: user.userId,
      username: user.username,
      name: user.name,
      role: user.role,
      encryptedRefreshToken: body.refreshToken,
      lastUsedAt: new Date().toISOString(),
    };

    // Remove existing entry for this user and add to front
    mockSwitchableUsers = mockSwitchableUsers.filter((u) => u.userId !== user.userId);
    mockSwitchableUsers = [newSwitchableUser, ...mockSwitchableUsers].slice(0, 5);

    return HttpResponse.json(createApiResponse({
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      user,
      switchableUsers: mockSwitchableUsers,
    }));
  }),

  // Residents endpoints
  http.get('/api/v1/residents', async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || url.searchParams.get('limit') || '20', 10);
    const search = (url.searchParams.get('search') || url.searchParams.get('q') || '').trim().toLowerCase();
    const status = url.searchParams.get('status');
    const hasThreePipeParam = url.searchParams.get('hasThreePipe');
    const identityType = url.searchParams.get('identityType');
    const dependencyLevel = url.searchParams.get('dependencyLevel');
    const sortField = url.searchParams.get('sort') || 'residentId';
    const sortOrder = url.searchParams.get('order') || 'asc';

    let filtered = [...mockResidents];

    if (search) {
      filtered = filtered.filter((r) => {
        const name = (r.name || '').toLowerCase();
        const id = (r.residentId || '').toLowerCase();
        const ins = (r.insuranceId || '').toLowerCase();
        const bed = (r.bedNumber || '').toLowerCase();
        return name.includes(search) || id.includes(search) || ins.includes(search) || bed.includes(search);
      });
    }

    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }

    if (hasThreePipeParam !== null && hasThreePipeParam !== undefined && hasThreePipeParam !== '') {
      const isTrue = hasThreePipeParam === 'true';
      filtered = filtered.filter((r) => Boolean(r.hasThreePipe) === isTrue);
    }

    if (identityType) {
      filtered = filtered.filter((r) => r.identityType === identityType);
    }

    if (dependencyLevel) {
      filtered = filtered.filter((r) => r.dependencyLevel === dependencyLevel);
    }

    // Sorting
    filtered.sort((a, b) => {
      let valA = (a as unknown as Record<string, unknown>)[sortField] ?? '';
      let valB = (b as unknown as Record<string, unknown>)[sortField] ?? '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'desc' ? valB.localeCompare(valA, 'zh-TW') : valA.localeCompare(b as unknown as string, 'zh-TW');
      }
      if (valA < valB) return sortOrder === 'desc' ? 1 : -1;
      if (valA > valB) return sortOrder === 'desc' ? -1 : 1;
      return 0;
    });

    const startIdx = (page - 1) * pageSize;
    const paginatedItems = filtered.slice(startIdx, startIdx + pageSize);

    return HttpResponse.json(createApiResponse({
      items: paginatedItems,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize) || 1,
    }));
  }),

  http.get('/api/v1/residents/:id', async ({ params }) => {
    await delay(100);
    const resident = mockResidents.find((r) => r.residentId === params.id);
    if (!resident) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '住民不存在' } },
        { status: 404 }
      );
    }
    return HttpResponse.json(createApiResponse(resident));
  }),

  http.post('/api/v1/residents', async ({ request }) => {
    await delay(200);
    const body = await request.json() as Partial<Resident>;

    const residentId = body.residentId?.trim() || `RES-${String(mockResidents.length + 1).padStart(3, '0')}`;

    // Check unique ID
    const exists = mockResidents.some((r) => r.residentId === residentId);
    if (exists) {
      return HttpResponse.json(
        { success: false, error: { code: 'DUPLICATE_RESIDENT_ID', message: `住民編號 ${residentId} 已存在` } },
        { status: 400 }
      );
    }

    // Check bed conflict for active residents
    if (body.bedNumber && body.status !== 'Inactive') {
      const occupied = mockResidents.find(
        (r) => r.bedNumber === body.bedNumber && r.status === 'Active'
      );
      if (occupied) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'BED_CONFLICT',
              message: `床位 ${body.bedNumber} 已由住民 ${occupied.name} (${occupied.residentId}) 佔用`,
            },
          },
          { status: 409 }
        );
      }
    }

    const pipes = body.pipes || parsePipesString(body.specialNeeds);
    const hasThreePipe = body.hasThreePipe !== undefined ? body.hasThreePipe : isThreePipe(pipes);

    const now = new Date().toISOString();
    const newResident: Resident = {
      residentId,
      name: body.name || '',
      gender: body.gender || 'Male',
      dateOfBirth: rocToIso(body.dateOfBirth || '') || '1950-01-01',
      address: body.address || '',
      householdAddress: body.householdAddress || '',
      phone: body.phone || '',
      mobile: body.mobile || '',
      insuranceId: body.insuranceId || '',
      diagnosis: body.diagnosis || '',
      admissionDate: rocToIso(body.admissionDate || '') || (now.split('T')[0] as string),
      specialNeeds: body.specialNeeds || '',
      status: body.status || 'Active',
      hasThreePipe,
      bedNumber: body.bedNumber || '',
      pipes,
      identityType: body.identityType || '一般戶',
      dependencyLevel: body.dependencyLevel || '部分依賴',
      emergencyContact: body.emergencyContact || { name: '', relationship: '' },
      education: body.education || '',
      religion: body.religion || '',
      workHistory: body.workHistory || '',
      disability: body.disability || { raw: '' },
      catastrophicIllness: body.catastrophicIllness || { raw: '' },
      createdAt: now,
      updatedAt: now,
    };

    mockResidents.unshift(newResident);
    return HttpResponse.json(createApiResponse(newResident), { status: 201 });
  }),

  http.patch('/api/v1/residents/:id', async ({ params, request }) => {
    await delay(150);
    const index = mockResidents.findIndex((r) => r.residentId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '住民不存在' } },
        { status: 404 }
      );
    }

    const body = await request.json() as Partial<Resident>;
    const current = mockResidents[index]!;

    // Check bed conflict if changing bed
    if (body.bedNumber && body.bedNumber !== current.bedNumber && body.status !== 'Inactive') {
      const occupied = mockResidents.find(
        (r) => r.bedNumber === body.bedNumber && r.status === 'Active' && r.residentId !== params.id
      );
      if (occupied) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'BED_CONFLICT',
              message: `床位 ${body.bedNumber} 已由住民 ${occupied.name} (${occupied.residentId}) 佔用`,
            },
          },
          { status: 409 }
        );
      }
    }

    const pipes = body.pipes !== undefined ? body.pipes : current.pipes;
    const hasThreePipe = body.hasThreePipe !== undefined ? body.hasThreePipe : (pipes ? isThreePipe(pipes) : current.hasThreePipe);

    const updated: Resident = {
      ...current,
      ...body,
      dateOfBirth: body.dateOfBirth ? rocToIso(body.dateOfBirth) : current.dateOfBirth,
      admissionDate: body.admissionDate ? rocToIso(body.admissionDate) : current.admissionDate,
      pipes,
      hasThreePipe,
      updatedAt: new Date().toISOString(),
    };

    mockResidents[index] = updated;
    return HttpResponse.json(createApiResponse(updated));
  }),

  http.put('/api/v1/residents/:id', async ({ params, request }) => {
    await delay(150);
    const index = mockResidents.findIndex((r) => r.residentId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '住民不存在' } },
        { status: 404 }
      );
    }
    const body = await request.json() as Partial<Resident>;
    const current = mockResidents[index]!;
    const pipes = body.pipes !== undefined ? body.pipes : current.pipes;
    const hasThreePipe = body.hasThreePipe !== undefined ? body.hasThreePipe : isThreePipe(pipes);

    const updated: Resident = {
      ...current,
      ...body,
      dateOfBirth: body.dateOfBirth ? rocToIso(body.dateOfBirth) : current.dateOfBirth,
      admissionDate: body.admissionDate ? rocToIso(body.admissionDate) : current.admissionDate,
      pipes,
      hasThreePipe,
      updatedAt: new Date().toISOString(),
    };
    mockResidents[index] = updated;
    return HttpResponse.json(createApiResponse(updated));
  }),

  http.delete('/api/v1/residents/:id', async ({ params, request }) => {
    await delay(150);
    const index = mockResidents.findIndex((r) => r.residentId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '住民不存在' } },
        { status: 404 }
      );
    }

    let reason = '已離院';
    try {
      const body = await request.json() as { reason?: string };
      if (body?.reason) reason = body.reason;
    } catch {
      // Body may be empty on DELETE
    }

    mockResidents[index] = {
      ...mockResidents[index]!,
      status: 'Inactive',
      inactiveReason: reason,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(createApiResponse({ success: true, resident: mockResidents[index] }));
  }),

  http.post('/api/v1/residents/import', async ({ request }) => {
    await delay(300);
    const body = await request.json() as { data: Array<RawResidentJson | Partial<Resident>>; dryRun?: boolean };
    const items = body.data || [];
    const dryRun = Boolean(body.dryRun);

    const previewResults: Array<{
      row: number;
      isValid: boolean;
      errors: string[];
      resident: Partial<Resident>;
    }> = [];

    const existingIds = new Set(mockResidents.map((r) => r.residentId));
    const existingActiveBeds = new Set(
      mockResidents.filter((r) => r.status === 'Active' && r.bedNumber).map((r) => r.bedNumber!)
    );
    const batchIds = new Set<string>();
    const batchBeds = new Set<string>();

    const validToImport: Resident[] = [];

    for (let i = 0; i < items.length; i++) {
      const raw = items[i] as unknown as Record<string, string>;
      const errors: string[] = [];

      // Check if it's raw Chinese JSON format or standard Resident DTO
      let resident: Resident;
      if (raw['姓名'] || raw['序號'] || raw['身分證號']) {
        resident = transformRawResident(raw as unknown as RawResidentJson, mockResidents.length + i);
      } else {
        const r = items[i] as Partial<Resident>;
        const pipes = r.pipes || parsePipesString(r.specialNeeds);
        resident = {
          residentId: r.residentId || `RES-${String(mockResidents.length + i + 1).padStart(3, '0')}`,
          name: r.name || '',
          gender: r.gender || 'Male',
          dateOfBirth: rocToIso(r.dateOfBirth || '') || '',
          address: r.address || '',
          householdAddress: r.householdAddress || '',
          phone: r.phone || '',
          mobile: r.mobile || '',
          insuranceId: r.insuranceId || '',
          diagnosis: r.diagnosis || '',
          admissionDate: rocToIso(r.admissionDate || '') || (new Date().toISOString().split('T')[0] as string),
          specialNeeds: r.specialNeeds || '',
          status: r.status || 'Active',
          hasThreePipe: r.hasThreePipe !== undefined ? r.hasThreePipe : isThreePipe(pipes),
          bedNumber: r.bedNumber || '',
          pipes,
          identityType: r.identityType || '一般戶',
          dependencyLevel: r.dependencyLevel || '部分依賴',
          emergencyContact: r.emergencyContact || { name: '', relationship: '' },
          education: r.education || '',
          religion: r.religion || '',
          workHistory: r.workHistory || '',
          disability: r.disability || { raw: '' },
          catastrophicIllness: r.catastrophicIllness || { raw: '' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      if (!resident.name) {
        errors.push('姓名為必填欄位');
      }

      if (resident.residentId) {
        if (existingIds.has(resident.residentId) || batchIds.has(resident.residentId)) {
          errors.push(`住民編號 ${resident.residentId} 重複`);
        } else {
          batchIds.add(resident.residentId);
        }
      }

      if (resident.bedNumber) {
        if (existingActiveBeds.has(resident.bedNumber) || batchBeds.has(resident.bedNumber)) {
          errors.push(`床位 ${resident.bedNumber} 已被佔用`);
        } else {
          batchBeds.add(resident.bedNumber);
        }
      }

      const isValid = errors.length === 0;
      previewResults.push({
        row: i + 1,
        isValid,
        errors,
        resident,
      });

      if (isValid) {
        validToImport.push(resident);
      }
    }

    if (!dryRun) {
      mockResidents = [...validToImport, ...mockResidents];
    }

    return HttpResponse.json(
      createApiResponse({
        dryRun,
        total: items.length,
        validCount: validToImport.length,
        errorCount: items.length - validToImport.length,
        items: previewResults,
      })
    );
  }),

  // Care Records endpoints
  http.get('/api/v1/care-records', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const residentId = url.searchParams.get('residentId');
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let filtered = [...mockCareRecords];
    if (residentId) {
      filtered = filtered.filter((r) => r.residentId === residentId);
    }
    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }
    if (startDate) {
      const start = new Date(startDate).getTime();
      filtered = filtered.filter((r) => new Date(r.timestamp).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime();
      filtered = filtered.filter((r) => new Date(r.timestamp).getTime() <= end);
    }

    const normalized = filtered.map((record) => {
      const submitted = new Date(record.submittedAt).getTime();
      const shouldLock = Date.now() - submitted > 24 * 60 * 60 * 1000;
      if (!shouldLock) return record;
      return {
        ...record,
        lockType: 'Locked' as const,
        lockedAt: record.lockedAt || new Date(submitted + 24 * 60 * 60 * 1000).toISOString(),
      };
    });

    return HttpResponse.json(createApiResponse(createPaginatedResponse(normalized, page, pageSize)));
  }),

  http.get('/api/v1/care-records/:id', async ({ params }) => {
    await delay(150);
    const record = mockCareRecords.find((r) => r.recordId === params.id);
    if (!record) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '照護記錄不存在' } },
        { status: 404 }
      );
    }

    const submitted = new Date(record.submittedAt).getTime();
    const shouldLock = Date.now() - submitted > 24 * 60 * 60 * 1000;
    const lockedRecord = shouldLock
      ? {
          ...record,
          lockType: 'Locked' as const,
          lockedAt: record.lockedAt || new Date(submitted + 24 * 60 * 60 * 1000).toISOString(),
        }
      : record;

    return HttpResponse.json(createApiResponse(lockedRecord));
  }),

  http.post('/api/v1/care-records', async ({ request }) => {
    await delay(300);
    const body = await request.json() as { residentId: string; timestamp: string; activities: unknown[]; staffId: string; staffName: string; notes: string; evidence?: CareRecord['evidence'] };

    const baseScore = 50;
    const activityScore = Math.min(40, (body.activities?.length || 0) * 20);
    const evidenceScore = body.evidence && body.evidence.length > 0 ? 10 : 0;

    const newRecord: CareRecord = {
      recordId: `CR-${String(mockCareRecords.length + 1).padStart(3, '0')}`,
      residentId: body.residentId,
      timestamp: body.timestamp,
      activities: body.activities as CareRecord['activities'],
      staffId: body.staffId,
      staffName: body.staffName,
      completenessScore: Math.min(100, baseScore + activityScore + evidenceScore),
      status: 'Normal',
      evidence: body.evidence || [],
      notes: body.notes || '',
      submittedAt: new Date().toISOString(),
      lockType: 'Editable',
      modificationHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockCareRecords.push(newRecord);
    return HttpResponse.json(createApiResponse(newRecord), { status: 201 });
  }),

  http.patch('/api/v1/care-records/:id', async ({ params, request }) => {
    await delay(200);
    const index = mockCareRecords.findIndex((r) => r.recordId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '照護記錄不存在' } },
        { status: 404 }
      );
    }

    const current = mockCareRecords[index];
    if (!current) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '照護記錄不存在' } },
        { status: 404 }
      );
    }
    const submitted = new Date(current.submittedAt).getTime();
    const isLocked = Date.now() - submitted > 24 * 60 * 60 * 1000 || current.lockType === 'Locked';
    if (isLocked) {
      return HttpResponse.json(
        { success: false, error: { code: 'RECORD_LOCKED', message: '紀錄已鎖定，僅能補充修正' } },
        { status: 409 }
      );
    }

    const body = await request.json() as Partial<CareRecord>;
    const updated = { ...current, ...body, updatedAt: new Date().toISOString() } as CareRecord;
    mockCareRecords[index] = updated;
    return HttpResponse.json(createApiResponse(updated));
  }),

  http.post('/api/v1/care-records/:id/status', async ({ params, request }) => {
    await delay(150);
    const index = mockCareRecords.findIndex((r) => r.recordId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '照護記錄不存在' } },
        { status: 404 }
      );
    }

    const body = await request.json() as { status: CareRecord['status'] };
    const updatedRecord: CareRecord = {
      ...mockCareRecords[index]!,
      status: body.status,
      updatedAt: new Date().toISOString(),
    };
    mockCareRecords[index] = updatedRecord;

    return HttpResponse.json(createApiResponse(updatedRecord));
  }),

  http.post('/api/v1/care-records/:id/supplement', async ({ params, request }) => {
    await delay(200);
    const original = mockCareRecords.find((r) => r.recordId === params.id);
    if (!original) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '照護記錄不存在' } },
        { status: 404 }
      );
    }

    const body = await request.json() as { supplementContent: string; reason: string; staffId: string; staffName: string };
    const nextIndex = mockCareRecords.length + 1;
    const supplemented: CareRecord = {
      ...original,
      recordId: `CR-${String(nextIndex).padStart(3, '0')}`,
      notes: `${original.notes}\n[補充] ${body.supplementContent}`,
      lockType: 'Editable',
      lockedAt: undefined,
      submittedAt: new Date().toISOString(),
      modificationHistory: [
        ...original.modificationHistory,
        {
          modificationId: `MOD-${crypto.randomUUID()}`,
          actionType: 'Supplement',
          changedBy: body.staffName,
          changedAt: new Date().toISOString(),
          fieldName: 'notes',
          oldValue: original.notes,
          newValue: `${original.notes}\n[補充] ${body.supplementContent}`,
          reason: body.reason,
        },
      ],
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    mockCareRecords.push(supplemented);
    return HttpResponse.json(createApiResponse(supplemented), { status: 201 });
  }),

  http.post('/api/v1/care-records/sync', async ({ request }) => {
    await delay(250);
    const body = await request.json() as { operations: Array<{ payload: Partial<CareRecord> }> };

    const accepted = (body.operations || []).map((operation, index) => ({
      localId: `care-record-local-${index + 1}`,
      entityType: 'CareRecords' as const,
      entityId: operation.payload.recordId || `CR-SYNC-${index + 1}`,
      serverVersion: 2,
    }));

    return HttpResponse.json(createApiResponse({ accepted, conflicts: [] }));
  }),

  // Medications endpoints
  http.get('/api/v1/medications/alerts/low-stock', async () => {
    await delay(100);
    const enriched = mockMedications.map((m) => {
      const res = mockResidents.find((r) => r.residentId === m.residentId);
      const stockStatus = getMedicationStockStatus(m.stockLevel, m.reorderThreshold);
      return {
        ...m,
        residentName: m.residentName || res?.name || '未知住民',
        bedNumber: m.bedNumber || res?.bedNumber || '未排床',
        stockStatus,
      };
    });

    const normalCount = enriched.filter((m) => m.stockStatus === 'Normal').length;
    const runningLowCount = enriched.filter((m) => m.stockStatus === 'RunningLow').length;
    const outOfStockCount = enriched.filter((m) => m.stockStatus === 'OutOfStock').length;
    const lowStockItems = enriched
      .filter((m) => m.stockStatus !== 'Normal')
      .sort((a, b) => a.stockLevel - b.stockLevel);

    return HttpResponse.json(
      createApiResponse({
        total: enriched.length,
        normalCount,
        runningLowCount,
        outOfStockCount,
        items: lowStockItems,
      })
    );
  }),

  http.get('/api/v1/medications', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const residentId = url.searchParams.get('residentId');
    const status = url.searchParams.get('status');
    const lowStock = url.searchParams.get('lowStock');
    const search = (url.searchParams.get('search') || url.searchParams.get('q') || '').trim().toLowerCase();
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    let filtered = mockMedications.map((m) => {
      const res = mockResidents.find((r) => r.residentId === m.residentId);
      const stockStatus = getMedicationStockStatus(m.stockLevel, m.reorderThreshold);
      return {
        ...m,
        residentName: m.residentName || res?.name || '未知住民',
        bedNumber: m.bedNumber || res?.bedNumber || '未排床',
        stockStatus,
      };
    });

    if (residentId) {
      filtered = filtered.filter((m) => m.residentId === residentId);
    }
    if (status) {
      filtered = filtered.filter((m) => m.status === status);
    }
    if (lowStock === 'true') {
      filtered = filtered.filter((m) => m.stockLevel <= m.reorderThreshold);
    }
    if (search) {
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(search) ||
          m.dosage.toLowerCase().includes(search) ||
          (m.residentName && m.residentName.toLowerCase().includes(search)) ||
          (m.bedNumber && m.bedNumber.toLowerCase().includes(search)) ||
          (m.notes && m.notes.toLowerCase().includes(search))
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === 'stockLevel') {
        return sortOrder === 'asc' ? a.stockLevel - b.stockLevel : b.stockLevel - a.stockLevel;
      }
      if (sortBy === 'nextScheduled') {
        const timeA = new Date(a.nextScheduled).getTime();
        const timeB = new Date(b.nextScheduled).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return HttpResponse.json(createApiResponse(createPaginatedResponse(filtered, page, pageSize)));
  }),

  http.get('/api/v1/medications/:id', async ({ params }) => {
    await delay(150);
    const med = mockMedications.find((m) => m.medicationId === params.id);
    if (!med) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '藥物不存在' } },
        { status: 404 }
      );
    }
    const res = mockResidents.find((r) => r.residentId === med.residentId);
    const enriched = {
      ...med,
      residentName: med.residentName || res?.name || '未知住民',
      bedNumber: med.bedNumber || res?.bedNumber || '未排床',
      stockStatus: getMedicationStockStatus(med.stockLevel, med.reorderThreshold),
      administrationHistory: med.administrationHistory || [],
    };
    return HttpResponse.json(createApiResponse(enriched));
  }),

  http.post('/api/v1/medications', async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as Partial<Medication>;
    const res = mockResidents.find((r) => r.residentId === body.residentId);
    const schedule = body.schedule || [];
    const nextScheduled = body.nextScheduled || calculateNextScheduled(schedule);
    const stockLevel = Number(body.stockLevel ?? 0);
    const reorderThreshold = Number(body.reorderThreshold ?? 15);

    const newMed: Medication = {
      medicationId: `MED-${String(mockMedications.length + 1).padStart(3, '0')}`,
      residentId: body.residentId || '',
      residentName: res?.name || body.residentName || '未知住民',
      bedNumber: res?.bedNumber || body.bedNumber || '未排床',
      name: body.name || '',
      dosage: body.dosage || '',
      frequency: body.frequency || 'OnceDaily',
      schedule,
      nextScheduled,
      stockLevel,
      reorderThreshold,
      stockStatus: getMedicationStockStatus(stockLevel, reorderThreshold),
      status: body.status || 'Active',
      notes: body.notes || '',
      administrationHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockMedications = [newMed, ...mockMedications];
    return HttpResponse.json(createApiResponse(newMed), { status: 201 });
  }),

  http.patch('/api/v1/medications/:id', async ({ params, request }) => {
    await delay(200);
    const index = mockMedications.findIndex((m) => m.medicationId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '藥物不存在' } },
        { status: 404 }
      );
    }
    const body = (await request.json()) as Partial<Medication>;
    const current = mockMedications[index]!;
    const schedule = body.schedule ?? current.schedule;
    const stockLevel = body.stockLevel !== undefined ? Number(body.stockLevel) : current.stockLevel;
    const reorderThreshold =
      body.reorderThreshold !== undefined ? Number(body.reorderThreshold) : current.reorderThreshold;

    const updated: Medication = {
      ...current,
      ...body,
      schedule,
      stockLevel,
      reorderThreshold,
      stockStatus: getMedicationStockStatus(stockLevel, reorderThreshold),
      updatedAt: new Date().toISOString(),
    };
    mockMedications[index] = updated;
    return HttpResponse.json(createApiResponse(updated));
  }),

  http.put('/api/v1/medications/:id', async ({ params, request }) => {
    await delay(200);
    const index = mockMedications.findIndex((m) => m.medicationId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '藥物不存在' } },
        { status: 404 }
      );
    }
    const body = (await request.json()) as Partial<Medication>;
    const current = mockMedications[index]!;
    const schedule = body.schedule ?? current.schedule;
    const stockLevel = body.stockLevel !== undefined ? Number(body.stockLevel) : current.stockLevel;
    const reorderThreshold =
      body.reorderThreshold !== undefined ? Number(body.reorderThreshold) : current.reorderThreshold;

    const updated: Medication = {
      ...current,
      ...body,
      schedule,
      stockLevel,
      reorderThreshold,
      stockStatus: getMedicationStockStatus(stockLevel, reorderThreshold),
      updatedAt: new Date().toISOString(),
    };
    mockMedications[index] = updated;
    return HttpResponse.json(createApiResponse(updated));
  }),

  http.delete('/api/v1/medications/:id', async ({ params }) => {
    await delay(200);
    const index = mockMedications.findIndex((m) => m.medicationId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '藥物不存在' } },
        { status: 404 }
      );
    }
    const current = mockMedications[index]!;
    const updated: Medication = {
      ...current,
      status: 'Discontinued',
      updatedAt: new Date().toISOString(),
    };
    mockMedications[index] = updated;
    return HttpResponse.json(createApiResponse(updated));
  }),

  http.post('/api/v1/medications/:id/administer', async ({ params, request }) => {
    await delay(250);
    const index = mockMedications.findIndex((m) => m.medicationId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '藥物不存在' } },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      administeredBy?: string;
      scheduledTime?: string;
      actualTime?: string;
      status?: 'Administered' | 'Missed' | 'Refused' | 'Held';
      notes?: string;
    };

    const current = mockMedications[index]!;
    const adminStatus = body.status || 'Administered';
    const actualTime = body.actualTime || new Date().toISOString();
    const scheduledTime = body.scheduledTime || current.nextScheduled;

    // 只有 Administered 狀態才扣減庫存
    const newStock =
      adminStatus === 'Administered' ? Math.max(0, current.stockLevel - 1) : current.stockLevel;
    const nextScheduled = calculateNextScheduled(current.schedule);

    const newAdmin: MedicationAdministration = {
      administrationId: `ADM-${crypto.randomUUID()}`,
      medicationId: current.medicationId,
      residentId: current.residentId,
      scheduledTime,
      actualTime,
      administeredBy: body.administeredBy || '護理人員',
      status: adminStatus,
      notes: body.notes || '',
      createdAt: new Date().toISOString(),
    };

    const history = current.administrationHistory ? [newAdmin, ...current.administrationHistory] : [newAdmin];

    const updatedMed: Medication = {
      ...current,
      stockLevel: newStock,
      stockStatus: getMedicationStockStatus(newStock, current.reorderThreshold),
      lastAdministered: adminStatus === 'Administered' ? actualTime : current.lastAdministered,
      nextScheduled,
      administrationHistory: history,
      updatedAt: new Date().toISOString(),
    };

    mockMedications[index] = updatedMed;

    return HttpResponse.json(
      createApiResponse({
        medication: updatedMed,
        administration: newAdmin,
      }),
      { status: 201 }
    );
  }),

  http.post('/api/v1/medications/sync', async ({ request }) => {
    await delay(250);
    const body = (await request.json()) as {
      operations: Array<{
        payload: {
          medicationId: string;
          residentId: string;
          actualTime?: string;
          scheduledTime?: string;
          administeredBy?: string;
          status?: 'Administered' | 'Missed' | 'Refused' | 'Held';
          notes?: string;
        };
      }>;
    };

    const accepted: Array<{ localId: string; entityType: string; entityId: string; serverVersion: number }> = [];

    (body.operations || []).forEach((op, idx) => {
      const payload = op.payload;
      const medIndex = mockMedications.findIndex((m) => m.medicationId === payload.medicationId);

      if (medIndex !== -1) {
        const med = mockMedications[medIndex]!;
        const existingHistory = med.administrationHistory || [];

        // 檢查 30 分鐘內去重
        const isDupe = existingHistory.some((existing) =>
          isDuplicateAdministration(existing, payload)
        );

        if (!isDupe) {
          const adminStatus = payload.status || 'Administered';
          const newStock =
            adminStatus === 'Administered' ? Math.max(0, med.stockLevel - 1) : med.stockLevel;
          const newAdmin: MedicationAdministration = {
            administrationId: `ADM-SYNC-${idx + 1}-${Date.now()}`,
            medicationId: med.medicationId,
            residentId: med.residentId,
            scheduledTime: payload.scheduledTime || med.nextScheduled,
            actualTime: payload.actualTime || new Date().toISOString(),
            administeredBy: payload.administeredBy || '離線照護員',
            status: adminStatus,
            notes: payload.notes || '',
            createdAt: new Date().toISOString(),
          };

          mockMedications[medIndex] = {
            ...med,
            stockLevel: newStock,
            stockStatus: getMedicationStockStatus(newStock, med.reorderThreshold),
            lastAdministered:
              adminStatus === 'Administered' ? newAdmin.actualTime : med.lastAdministered,
            administrationHistory: [newAdmin, ...existingHistory],
            updatedAt: new Date().toISOString(),
          };
        }
      }

      accepted.push({
        localId: `med-local-${idx + 1}`,
        entityType: 'Medications',
        entityId: payload.medicationId || `MED-SYNC-${idx + 1}`,
        serverVersion: 2,
      });
    });

    return HttpResponse.json(createApiResponse({ accepted, conflicts: [] }));
  }),

  // Care Plans endpoints
  http.get('/api/v1/care-plans', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const residentId = url.searchParams.get('residentId');
    const status = url.searchParams.get('status');

    let filtered = [...mockCarePlans];
    if (residentId) {
      filtered = filtered.filter((p) => p.residentId === residentId);
    }
    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    }

    return HttpResponse.json(createApiResponse(createPaginatedResponse(filtered, page, pageSize)));
  }),

  http.get('/api/v1/care-plans/:id', async ({ params }) => {
    await delay(150);
    const plan = mockCarePlans.find((p) => p.planId === params.id);
    if (!plan) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '照護計畫不存在' } },
        { status: 404 }
      );
    }
    return HttpResponse.json(createApiResponse(plan));
  }),

  http.post('/api/v1/care-plans', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Partial<CarePlan>;
    const newPlan: CarePlan = {
      planId: `CP-${String(mockCarePlans.length + 1).padStart(3, '0')}`,
      residentId: body.residentId || '',
      assessmentDate: body.assessmentDate || '',
      goals: body.goals || [],
      serviceItems: body.serviceItems || [],
      reviewDate: body.reviewDate || '',
      status: 'Draft',
      createdBy: body.createdBy || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockCarePlans.push(newPlan);
    return HttpResponse.json(createApiResponse(newPlan), { status: 201 });
  }),

  http.put('/api/v1/care-plans/:id', async ({ params, request }) => {
    await delay(200);
    const index = mockCarePlans.findIndex((p) => p.planId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '照護計畫不存在' } },
        { status: 404 }
      );
    }
    const body = await request.json() as Partial<CarePlan>;
    const updated = { ...mockCarePlans[index], ...body, updatedAt: new Date().toISOString() } as CarePlan;
    mockCarePlans[index] = updated;
    return HttpResponse.json(createApiResponse(updated));
  }),

  // Reports endpoints
  http.get('/api/v1/reports', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const type = url.searchParams.get('type');

    let filtered = [...mockReports];
    if (type) {
      filtered = filtered.filter((r) => r.type === type);
    }

    return HttpResponse.json(createApiResponse(createPaginatedResponse(filtered, page, pageSize)));
  }),

  http.post('/api/v1/reports/generate', async ({ request }) => {
    await delay(1000); // Simulate generation time
    const body = await request.json() as { type: string; parameters: Record<string, unknown> };
    const newReport: Report = {
      reportId: `RPT-${String(mockReports.length + 1).padStart(3, '0')}`,
      type: body.type as Report['type'],
      generatedAt: new Date().toISOString(),
      generatedBy: 'user-001',
      status: 'Completed',
      filePath: `/reports/${body.type}-${Date.now()}.pdf`,
      parameters: body.parameters,
    };
    mockReports.push(newReport);
    return HttpResponse.json(createApiResponse(newReport), { status: 201 });
  }),

  // Compliance endpoints
  http.get('/api/v1/compliance/checks', async () => {
    await delay(200);
    return HttpResponse.json(createApiResponse(mockComplianceChecks));
  }),

  http.post('/api/v1/compliance/check', async ({ request }) => {
    await delay(500);
    const body = await request.json() as { type: ComplianceCheck['type'] };
    const newCheck: ComplianceCheck = {
      checkId: `CC-${String(mockComplianceChecks.length + 1).padStart(3, '0')}`,
      type: body.type,
      isCompliant: Math.random() > 0.3,
      details: '模擬合規檢核結果',
      checkedAt: new Date().toISOString(),
      relatedEntityIds: [],
    };
    mockComplianceChecks.push(newCheck);
    return HttpResponse.json(createApiResponse(newCheck));
  }),

  // Sync endpoints
  http.post('/api/v1/sync', async ({ request }) => {
    await delay(300);

    const body = (await request.json()) as {
      operations: Array<{
        localId: string;
        entityType: 'Residents' | 'CareRecords' | 'CareActivities' | 'Medications' | 'TimeSlots' | 'CarePlans';
        entityId: string;
        operation: 'create' | 'update' | 'delete';
        payload: Record<string, unknown>;
        recordType?: 'Resident' | 'CareRecord' | 'Medication' | 'CarePlan';
      }>;
    };

    const accepted: Array<{
      localId: string;
      entityType: 'Residents' | 'CareRecords' | 'CareActivities' | 'Medications' | 'TimeSlots' | 'CarePlans';
      entityId: string;
      serverVersion: number;
    }> = [];

    const conflicts: Array<{
      localId: string;
      conflictId: string;
      recordType: 'Resident' | 'CareRecord' | 'Medication' | 'CarePlan';
      recordId: string;
      localData: Record<string, unknown>;
      serverData: Record<string, unknown>;
      conflictType: 'FieldLevel' | 'SectionLevel' | 'Duplicate';
      conflictingFields: string[];
      isCritical: boolean;
    }> = [];

    for (const operation of body.operations || []) {
      const recordType = operation.recordType || (
        operation.entityType === 'Residents'
          ? 'Resident'
          : operation.entityType === 'Medications'
            ? 'Medication'
            : operation.entityType === 'CarePlans'
              ? 'CarePlan'
              : 'CareRecord'
      );

      const shouldConflict =
        operation.payload.forceConflict === true ||
        operation.entityId.toLowerCase().includes('conflict') ||
        (recordType === 'Medication' && operation.operation === 'update') ||
        (recordType === 'CareRecord' && operation.operation === 'update');

      if (shouldConflict) {
        const conflictingFields = recordType === 'Medication'
          ? ['dosage', 'schedule']
          : recordType === 'CareRecord'
            ? ['activities', 'vitals']
            : ['updatedAt'];

        const conflict = {
          localId: operation.localId,
          conflictId: `SC-${String(mockSyncConflicts.length + conflicts.length + 1).padStart(3, '0')}`,
          recordType,
          recordId: operation.entityId,
          localData: operation.payload,
          serverData: {
            ...operation.payload,
            updatedBy: 'server',
            syncedAt: new Date().toISOString(),
          },
          conflictType: 'FieldLevel' as const,
          conflictingFields,
          isCritical: recordType === 'Medication' || recordType === 'CareRecord',
        };

        mockSyncConflicts.push({
          conflictId: conflict.conflictId,
          recordId: conflict.recordId,
          recordType: conflict.recordType,
          localData: conflict.localData,
          serverData: conflict.serverData,
          conflictType: conflict.conflictType,
          conflictingFields: conflict.conflictingFields,
          status: 'Pending',
          createdAt: new Date().toISOString(),
        });

        conflicts.push(conflict);
      } else {
        accepted.push({
          localId: operation.localId,
          entityType: operation.entityType,
          entityId: operation.entityId,
          serverVersion: 2,
        });
      }
    }

    return HttpResponse.json(createApiResponse({ accepted, conflicts }));
  }),

  http.get('/api/v1/sync/conflicts', async () => {
    await delay(200);
    return HttpResponse.json(createApiResponse(mockSyncConflicts));
  }),

  http.post('/api/v1/sync/conflicts/:id/resolve', async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as { resolution: 'Local' | 'Server' | 'Merged'; mergedData?: Record<string, unknown> };
    const index = mockSyncConflicts.findIndex((c) => c.conflictId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '衝突不存在' } },
        { status: 404 }
      );
    }
    const updated = {
      ...mockSyncConflicts[index],
      status: 'Resolved',
      resolution: body.resolution,
      resolvedBy: 'user-001',
      resolvedAt: new Date().toISOString(),
    } as SyncConflict;
    mockSyncConflicts[index] = updated;
    return HttpResponse.json(createApiResponse(updated));
  }),

  // Health check
  http.get('/api/v1/health', async () => {
    return HttpResponse.json(createApiResponse({ status: 'ok', timestamp: new Date().toISOString() }));
  }),
];