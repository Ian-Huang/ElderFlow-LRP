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
} from '@lrp/shared';

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

const mockResidents: Resident[] = [
  {
    residentId: 'RES-001',
    name: '王大明',
    gender: 'Male',
    dateOfBirth: '1945-03-15',
    address: '台北市大安區仁愛路四段 123 號',
    insuranceId: 'A123456789',
    diagnosis: '高血壓、糖尿病、失智症',
    admissionDate: '2023-06-01',
    specialNeeds: '需協助進食、行動不便',
    status: 'Active',
    hasThreePipe: true,
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    residentId: 'RES-002',
    name: '李美華',
    gender: 'Female',
    dateOfBirth: '1950-07-22',
    address: '新北市板橋區文化路 456 號',
    insuranceId: 'B987654321',
    diagnosis: '中風後遺症、骨質疏鬆',
    admissionDate: '2023-08-15',
    specialNeeds: '左側癱瘓、需輪椅',
    status: 'Active',
    hasThreePipe: false,
    createdAt: '2023-08-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    residentId: 'RES-003',
    name: '陳志明',
    gender: 'Male',
    dateOfBirth: '1938-11-05',
    address: '桃園市中壢區環中路 789 號',
    insuranceId: 'C456789123',
    diagnosis: '帕金森氏症、憂鬱症',
    admissionDate: '2023-10-01',
    specialNeeds: '震顫、需心理支持',
    status: 'Active',
    hasThreePipe: false,
    createdAt: '2023-10-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
];

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

const mockMedications: Medication[] = [
  {
    medicationId: 'MED-001',
    residentId: 'RES-001',
    name: '降壓錠',
    dosage: '10mg',
    frequency: 'OnceDaily',
    schedule: ['08:00'],
    lastAdministered: '2024-01-15T08:15:00+08:00',
    nextScheduled: '2024-01-16T08:00:00+08:00',
    stockLevel: 25,
    reorderThreshold: 15,
    status: 'Active',
    notes: '早餐前服用',
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    medicationId: 'MED-002',
    residentId: 'RES-001',
    name: '糖尿病藥物',
    dosage: '500mg',
    frequency: 'TwiceDaily',
    schedule: ['08:00', '20:00'],
    lastAdministered: '2024-01-15T08:15:00+08:00',
    nextScheduled: '2024-01-15T20:00:00+08:00',
    stockLevel: 12,
    reorderThreshold: 15,
    status: 'Active',
    notes: '飯前服用，庫存偏低',
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
];

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
    await delay(200);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status');

    let filtered = [...mockResidents];
    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.name.includes(search) ||
          r.residentId.includes(search) ||
          r.insuranceId.includes(search)
      );
    }
    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }

    return HttpResponse.json(createApiResponse(createPaginatedResponse(filtered, page, pageSize)));
  }),

  http.get('/api/v1/residents/:id', async ({ params }) => {
    await delay(150);
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
    await delay(300);
    const body = await request.json() as Partial<Resident>;
    const newResident: Resident = {
      residentId: `RES-${String(mockResidents.length + 1).padStart(3, '0')}`,
      name: body.name || '',
      gender: body.gender || 'Male',
      dateOfBirth: body.dateOfBirth || '',
      address: body.address || '',
      insuranceId: body.insuranceId || '',
      diagnosis: body.diagnosis || '',
      admissionDate: body.admissionDate || '',
      specialNeeds: body.specialNeeds || '',
      status: 'Active',
      hasThreePipe: body.hasThreePipe || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockResidents.push(newResident);
    return HttpResponse.json(createApiResponse(newResident), { status: 201 });
  }),

  http.put('/api/v1/residents/:id', async ({ params, request }) => {
    await delay(200);
    const index = mockResidents.findIndex((r) => r.residentId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '住民不存在' } },
        { status: 404 }
      );
    }
    const body = await request.json() as Partial<Resident>;
    const updated = { ...mockResidents[index], ...body, updatedAt: new Date().toISOString() } as Resident;
    mockResidents[index] = updated;
    return HttpResponse.json(createApiResponse(updated));
  }),

  http.delete('/api/v1/residents/:id', async ({ params }) => {
    await delay(200);
    const index = mockResidents.findIndex((r) => r.residentId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '住民不存在' } },
        { status: 404 }
      );
    }
    mockResidents.splice(index, 1);
    return HttpResponse.json(createApiResponse({ success: true }));
  }),

  // Care Records endpoints
  http.get('/api/v1/care-records', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const residentId = url.searchParams.get('residentId');
    const status = url.searchParams.get('status');

    let filtered = [...mockCareRecords];
    if (residentId) {
      filtered = filtered.filter((r) => r.residentId === residentId);
    }
    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }

    return HttpResponse.json(createApiResponse(createPaginatedResponse(filtered, page, pageSize)));
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
    return HttpResponse.json(createApiResponse(record));
  }),

  http.post('/api/v1/care-records', async ({ request }) => {
    await delay(300);
    const body = await request.json() as { residentId: string; timestamp: string; activities: unknown[]; staffId: string; staffName: string; notes: string };
    const newRecord: CareRecord = {
      recordId: `CR-${String(mockCareRecords.length + 1).padStart(3, '0')}`,
      residentId: body.residentId,
      timestamp: body.timestamp,
      activities: body.activities as CareRecord['activities'],
      staffId: body.staffId,
      staffName: body.staffName,
      completenessScore: 80,
      status: 'Normal',
      evidence: [],
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

  http.put('/api/v1/care-records/:id', async ({ params, request }) => {
    await delay(200);
    const index = mockCareRecords.findIndex((r) => r.recordId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '照護記錄不存在' } },
        { status: 404 }
      );
    }
    const body = await request.json() as Partial<CareRecord>;
    const updated = { ...mockCareRecords[index], ...body, updatedAt: new Date().toISOString() } as CareRecord;
    mockCareRecords[index] = updated;
    return HttpResponse.json(createApiResponse(updated));
  }),

  // Medications endpoints
  http.get('/api/v1/medications', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const residentId = url.searchParams.get('residentId');
    const status = url.searchParams.get('status');
    const lowStock = url.searchParams.get('lowStock');

    let filtered = [...mockMedications];
    if (residentId) {
      filtered = filtered.filter((m) => m.residentId === residentId);
    }
    if (status) {
      filtered = filtered.filter((m) => m.status === status);
    }
    if (lowStock === 'true') {
      filtered = filtered.filter((m) => m.stockLevel <= m.reorderThreshold);
    }

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
    return HttpResponse.json(createApiResponse(med));
  }),

  http.post('/api/v1/medications', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Partial<Medication>;
    const newMed: Medication = {
      medicationId: `MED-${String(mockMedications.length + 1).padStart(3, '0')}`,
      residentId: body.residentId || '',
      name: body.name || '',
      dosage: body.dosage || '',
      frequency: body.frequency || 'OnceDaily',
      schedule: body.schedule || [],
      nextScheduled: body.nextScheduled || new Date().toISOString(),
      stockLevel: body.stockLevel || 0,
      reorderThreshold: body.reorderThreshold || 15,
      status: 'Active',
      notes: body.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockMedications.push(newMed);
    return HttpResponse.json(createApiResponse(newMed), { status: 201 });
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
    const body = await request.json() as Partial<Medication>;
    const updated = { ...mockMedications[index], ...body, updatedAt: new Date().toISOString() } as Medication;
    mockMedications[index] = updated;
    return HttpResponse.json(createApiResponse(updated));
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