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
  AuditEntry,
  DailyCompletionReport,
  ResidentSummaryReport,
  AlertReportItem,
  PdfExportRequest,
  UserCreateInput,
  UserUpdateRoleInput,
  UserUpdateStatusInput,
  SystemSettings,
  SystemHealthReport,
  FeatureFlag,
} from '@lrp/shared';
import { mockMedicationsSeed } from './medicationSeedData';
import { mockCarePlansSeed } from './carePlanSeedData';
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
    isActive: true,
    status: 'active',
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
    isActive: true,
    status: 'active',
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
    isActive: true,
    status: 'active',
  },
  {
    userId: 'user-004',
    username: 'sysadmin1',
    name: '王系統管理員',
    role: 'sysadmin',
    isLocalStaff: true,
    avatarUrl: undefined,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
    status: 'active',
  },
  {
    userId: 'user-005',
    username: 'caregiver2',
    name: '李護士',
    role: 'caregiver',
    isLocalStaff: false,
    avatarUrl: undefined,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2024-01-10T00:00:00Z',
    isActive: true,
    status: 'active',
  },
  {
    userId: 'user-006',
    username: 'inactive_staff',
    name: '黃離職員工',
    role: 'caregiver',
    isLocalStaff: true,
    avatarUrl: undefined,
    lastLoginAt: '2024-01-15T08:00:00Z',
    createdAt: '2023-12-01T00:00:00Z',
    isActive: false,
    status: 'inactive',
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

const mockCarePlans: CarePlan[] = [...mockCarePlansSeed];

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

export const mockAuditEntries: AuditEntry[] = [
  {
    auditId: 'AUD-001',
    recordId: 'RES-001',
    recordType: 'Resident',
    actionType: 'Update',
    changedBy: 'user-003',
    changedAt: '2024-01-15T10:00:00Z',
    fieldName: 'bedNumber',
    oldValue: '101-B',
    newValue: '101-A',
    reason: '住民更換床位至靠窗位置',
    ipAddress: '192.168.1.101',
  },
  {
    auditId: 'AUD-002',
    recordId: 'CR-001',
    recordType: 'CareRecord',
    actionType: 'Supplement',
    changedBy: 'user-001',
    changedAt: '2024-01-15T11:30:00Z',
    fieldName: 'notes',
    oldValue: '住民狀況穩定',
    newValue: '住民狀況穩定，下午 14:00 家屬探視',
    reason: '補登家屬探視記錄',
    ipAddress: '192.168.1.105',
  },
  {
    auditId: 'AUD-003',
    recordId: 'MED-001',
    recordType: 'Medication',
    actionType: 'Update',
    changedBy: 'user-002',
    changedAt: '2024-01-16T09:00:00Z',
    fieldName: 'dosage',
    oldValue: '5mg',
    newValue: '10mg',
    reason: '醫師處方劑量調整',
    ipAddress: '192.168.1.102',
  },
  {
    auditId: 'AUD-004',
    recordId: 'CP-001',
    recordType: 'CarePlan',
    actionType: 'Create',
    changedBy: 'user-002',
    changedAt: '2024-01-10T14:00:00Z',
    fieldName: 'status',
    oldValue: '',
    newValue: 'Active',
    reason: '建立 Q1 個別化照護計畫',
    ipAddress: '192.168.1.102',
  },
  {
    auditId: 'AUD-005',
    recordId: 'CR-002',
    recordType: 'CareRecord',
    actionType: 'Lock',
    changedBy: 'system',
    changedAt: '2024-01-16T08:30:00Z',
    fieldName: 'lockType',
    oldValue: 'Editable',
    newValue: 'Locked',
    reason: '超過 24 小時系統自動鎖定',
    ipAddress: '127.0.0.1',
  },
  {
    auditId: 'AUD-006',
    recordId: 'RES-002',
    recordType: 'Resident',
    actionType: 'Update',
    changedBy: 'user-003',
    changedAt: '2024-01-17T15:20:00Z',
    fieldName: 'specialNeeds',
    oldValue: '一般飲食',
    newValue: '細碎飲食、避免高糖',
    reason: '營養師評估建議調整飲食型態',
    ipAddress: '192.168.1.101',
  },
  {
    auditId: 'AUD-007',
    recordId: 'MED-002',
    recordType: 'Medication',
    actionType: 'Update',
    changedBy: 'user-001',
    changedAt: '2024-01-18T08:00:00Z',
    fieldName: 'stockLevel',
    oldValue: '12',
    newValue: '50',
    reason: '藥品補貨入庫',
    ipAddress: '192.168.1.105',
  },
  {
    auditId: 'AUD-008',
    recordId: 'RES-003',
    recordType: 'Resident',
    actionType: 'Create',
    changedBy: 'user-003',
    changedAt: '2024-01-12T10:00:00Z',
    fieldName: 'status',
    oldValue: '',
    newValue: 'Active',
    reason: '新住民入住建檔',
    ipAddress: '192.168.1.101',
  },
  {
    auditId: 'AUD-009',
    recordId: 'CR-003',
    recordType: 'CareRecord',
    actionType: 'Supplement',
    changedBy: 'user-001',
    changedAt: '2024-01-18T16:45:00Z',
    fieldName: 'activities',
    oldValue: '2 項照護',
    newValue: '3 項照護 (新增傍晚翻身)',
    reason: '補登 16:30 翻身拍背記錄',
    ipAddress: '192.168.1.105',
  },
  {
    auditId: 'AUD-010',
    recordId: 'MED-003',
    recordType: 'Medication',
    actionType: 'Delete',
    changedBy: 'user-002',
    changedAt: '2024-01-19T11:00:00Z',
    fieldName: 'status',
    oldValue: 'Active',
    newValue: 'Discontinued',
    reason: '醫師停用抗生素療程',
    ipAddress: '192.168.1.102',
  },
];

export const mockAlerts: AlertReportItem[] = [
  {
    id: 'ALT-001',
    type: 'vital_abnormal',
    severity: 'red',
    title: '血氧飽和度嚴重偏低',
    description: '住民 SpO2 降至 88%，已啟動氧氣面罩並通知家屬及值班醫師',
    residentId: 'RES-001',
    residentName: '王大明',
    bedNumber: '101-A',
    occurredAt: '2024-03-01T08:30:00Z',
    status: 'open',
  },
  {
    id: 'ALT-002',
    type: 'medication_error',
    severity: 'red',
    title: '未按時給藥警告 (超時 60 分鐘)',
    description: '降血壓錠預計 08:00 給藥，至 09:15 尚未記錄執行給藥',
    residentId: 'RES-002',
    residentName: '李美華',
    bedNumber: '102-B',
    occurredAt: '2024-03-01T09:15:00Z',
    status: 'acknowledged',
  },
  {
    id: 'ALT-003',
    type: 'fall',
    severity: 'yellow',
    title: '下床輕微跌倒事件',
    description: '住民嘗試自行下床如廁時跌坐於床邊軟墊，初步檢視無明顯外傷及骨折',
    residentId: 'RES-003',
    residentName: '張福來',
    bedNumber: '103-A',
    occurredAt: '2024-02-28T14:10:00Z',
    status: 'resolved',
  },
  {
    id: 'ALT-004',
    type: 'missed_care',
    severity: 'yellow',
    title: '未執行定期翻身拍背',
    description: '下午 14:00 之翻身拍背照護未於表定時間內完成打卡記錄',
    residentId: 'RES-001',
    residentName: '王大明',
    bedNumber: '101-A',
    occurredAt: '2024-03-01T15:00:00Z',
    status: 'open',
  },
  {
    id: 'ALT-005',
    type: 'vital_abnormal',
    severity: 'yellow',
    title: '體溫微燒偏高 (37.8°C)',
    description: '下午測量耳溫為 37.8°C，持續監測住民精神活動力及補充水分',
    residentId: 'RES-004',
    residentName: '陳林月英',
    bedNumber: '104-A',
    occurredAt: '2024-03-01T16:00:00Z',
    status: 'open',
  },
];

export let mockSystemSettings: SystemSettings = {
  syncIntervalSeconds: 30,
  lockDurationHours: 24,
  lowStockThreshold: 15,
  pdfFont: 'NotoSansTC',
  updatedAt: new Date().toISOString(),
  updatedBy: 'sysadmin1',
};

export const mockSystemHealth: SystemHealthReport = {
  status: 'healthy',
  uptimeSeconds: 172800,
  services: {
    api: { status: 'up', latencyMs: 38 },
    database: { status: 'up', latencyMs: 14 },
    serviceWorker: { status: 'active', version: '1.2.0' },
    indexedDb: { status: 'connected', sizeEstimateBytes: 15728640 },
  },
  metrics: {
    memoryUsageMb: 142.5,
    cpuLoadPercentage: 18.2,
  },
};

export const mockFeatureFlags: FeatureFlag[] = [
  {
    id: 'flag-pwa-kiosk',
    name: 'Kiosk 全螢幕防呆模式',
    description: '行動平板專用全螢幕鎖定與防離開確認',
    enabled: true,
    rolloutPercentage: 100,
    environment: 'all',
  },
  {
    id: 'flag-offline-draft',
    name: '離線表單自動暫存草稿',
    description: '照護員切換帳號或斷網時保留編輯中內容至 IndexedDB',
    enabled: true,
    rolloutPercentage: 100,
    environment: 'all',
  },
  {
    id: 'flag-ai-vital-prediction',
    name: '生命徵象異常 AI 趨勢預警',
    description: '根據歷史血壓、血氧預測未來 4 小時風險趨勢',
    enabled: false,
    rolloutPercentage: 20,
    environment: 'development',
  },
  {
    id: 'flag-night-shift-patrol',
    name: '夜間巡房 NFC 感應打卡',
    description: '使用平板 NFC 讀取床頭標籤完成夜間巡檢',
    enabled: false,
    rolloutPercentage: 0,
    environment: 'staging',
  },
];

export function validateCsrf(request: Request): Response | null {
  const method = request.method.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const simulateError = request.headers.get('X-Simulate-CSRF-Error') === 'true';
    const csrfToken = request.headers.get('X-CSRF-Token');
    if (simulateError || !csrfToken) {
      return HttpResponse.json(
        {
          code: 'CSRF_INVALID',
          message: 'CSRF token 驗證失敗',
        },
        { status: 403 }
      );
    }
  }
  return null;
}

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

export const handlers = [
  // CSRF validation interceptor for all mutating routes
  http.all('/api/v1/*', async ({ request }) => {
    const csrfError = validateCsrf(request);
    if (csrfError) {
      return csrfError;
    }
  }),

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
      const valA = (a as unknown as Record<string, unknown>)[sortField] ?? '';
      const valB = (b as unknown as Record<string, unknown>)[sortField] ?? '';

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
    const search = url.searchParams.get('search') || url.searchParams.get('q') || '';

    let filtered = [...mockCarePlans].map((p) => {
      const res = mockResidents.find((r) => r.residentId === p.residentId);
      return {
        ...p,
        residentName: p.residentName || res?.name || '',
        bedNumber: p.bedNumber || res?.bedNumber || '',
      };
    });

    if (residentId) {
      filtered = filtered.filter((p) => p.residentId === residentId);
    }
    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.planId.toLowerCase().includes(q) ||
          p.residentId.toLowerCase().includes(q) ||
          (p.residentName && p.residentName.toLowerCase().includes(q)) ||
          p.goals.some((g) => g.description.toLowerCase().includes(q)) ||
          p.serviceItems.some((s) => s.name.toLowerCase().includes(q))
      );
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
    const res = mockResidents.find((r) => r.residentId === plan.residentId);
    const enriched: CarePlan = {
      ...plan,
      residentName: plan.residentName || res?.name || '',
      bedNumber: plan.bedNumber || res?.bedNumber || '',
    };
    return HttpResponse.json(createApiResponse(enriched));
  }),

  http.post('/api/v1/care-plans', async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as Partial<CarePlan>;
    const today = new Date().toISOString().split('T')[0] ?? '';

    if (body.assessmentDate && body.assessmentDate > today) {
      return HttpResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '評估日期不得為未來日期' } },
        { status: 400 }
      );
    }

    let nextNum = mockCarePlans.length + 1;
    let newPlanId = `CP-${String(nextNum).padStart(3, '0')}`;
    while (mockCarePlans.some((p) => p.planId === newPlanId)) {
      nextNum++;
      newPlanId = `CP-${String(nextNum).padStart(3, '0')}`;
    }

    const res = mockResidents.find((r) => r.residentId === body.residentId);
    const goals = (body.goals || []).map((g, idx) => ({
      ...g,
      goalId: g.goalId || `G-${newPlanId.replace('CP-', '')}-${idx + 1}`,
      progress: typeof g.progress === 'number' ? g.progress : 0,
      status: g.status || 'NotStarted',
      progressNotes: g.progressNotes || '',
    }));

    const serviceItems = (body.serviceItems || []).map((s, idx) => ({
      ...s,
      itemId: s.itemId || `SI-${newPlanId.replace('CP-', '')}-${idx + 1}`,
      notes: s.notes || '',
    }));

    const newPlan: CarePlan = {
      planId: newPlanId,
      residentId: body.residentId || '',
      residentName: body.residentName || res?.name || '',
      bedNumber: body.bedNumber || res?.bedNumber || '',
      assessmentDate: body.assessmentDate || today,
      goals,
      serviceItems,
      reviewDate: body.reviewDate || '',
      status: body.status || 'Draft',
      createdBy: body.createdBy || 'supervisor-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCarePlans.unshift(newPlan);
    return HttpResponse.json(createApiResponse(newPlan), { status: 201 });
  }),

  http.patch('/api/v1/care-plans/:id', async ({ params, request }) => {
    await delay(200);
    const index = mockCarePlans.findIndex((p) => p.planId === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '照護計畫不存在' } },
        { status: 404 }
      );
    }
    const body = (await request.json()) as Partial<CarePlan>;
    const res = mockResidents.find((r) => r.residentId === (body.residentId || mockCarePlans[index]!.residentId));
    const updated = {
      ...mockCarePlans[index],
      ...body,
      residentName: body.residentName || res?.name || mockCarePlans[index]!.residentName,
      bedNumber: body.bedNumber || res?.bedNumber || mockCarePlans[index]!.bedNumber,
      updatedAt: new Date().toISOString(),
    } as CarePlan;
    mockCarePlans[index] = updated;
    return HttpResponse.json(createApiResponse(updated));
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
    const body = (await request.json()) as Partial<CarePlan>;
    const res = mockResidents.find((r) => r.residentId === (body.residentId || mockCarePlans[index]!.residentId));
    const updated = {
      ...mockCarePlans[index],
      ...body,
      residentName: body.residentName || res?.name || mockCarePlans[index]!.residentName,
      bedNumber: body.bedNumber || res?.bedNumber || mockCarePlans[index]!.bedNumber,
      updatedAt: new Date().toISOString(),
    } as CarePlan;
    mockCarePlans[index] = updated;
    return HttpResponse.json(createApiResponse(updated));
  }),

  http.post('/api/v1/care-plans/:id/status', async ({ params, request }) => {
    await delay(200);
    const plan = mockCarePlans.find((p) => p.planId === params.id);
    if (!plan) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '照護計畫不存在' } },
        { status: 404 }
      );
    }

    const body = (await request.json()) as { status: CarePlan['status']; reason?: string };
    const nextStatus = body.status;
    const currentStatus = plan.status;

    // Validate legal status transitions:
    // Draft -> Active
    // Active -> Completed | Archived
    // Completed -> Active
    // Archived -> Active
    const isValidTransition =
      (currentStatus === 'Draft' && nextStatus === 'Active') ||
      (currentStatus === 'Active' && (nextStatus === 'Completed' || nextStatus === 'Archived')) ||
      (currentStatus === 'Completed' && nextStatus === 'Active') ||
      (currentStatus === 'Archived' && nextStatus === 'Active');

    if (!isValidTransition) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `不合法的狀態流轉：無法從「${currentStatus}」變更為「${nextStatus}」`,
          },
        },
        { status: 400 }
      );
    }

    plan.status = nextStatus;
    plan.updatedAt = new Date().toISOString();

    return HttpResponse.json(createApiResponse(plan));
  }),

  // Reports endpoints
  http.get('/api/v1/reports/daily-completion', async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const queryDate = url.searchParams.get('date') || (new Date().toISOString().split('T')[0] ?? '');

    const activeResidents = mockResidents.filter((r) => r.status === 'Active');
    const totalResidents = activeResidents.length;

    const residentScores = activeResidents.map((r, index) => {
      const scoreBase = [95, 88, 76, 92, 55, 62, 85, 90, 48, 80][index % 10] ?? 85;
      return {
        residentId: r.residentId,
        residentName: r.name,
        bedNumber: r.bedNumber || `${101 + Math.floor(index / 2)}-${index % 2 === 0 ? 'A' : 'B'}`,
        completionRate: scoreBase,
      };
    });

    const completedRecords = residentScores.filter((s) => s.completionRate >= 80).length;
    const averageCompletionRate =
      totalResidents > 0
        ? Math.round((residentScores.reduce((sum, s) => sum + s.completionRate, 0) / totalResidents) * 10) / 10
        : 0;

    const normalCount = residentScores.filter((s) => s.completionRate >= 80).length;
    const reviewCount = residentScores.filter((s) => s.completionRate >= 60 && s.completionRate < 80).length;
    const verificationCount = residentScores.filter((s) => s.completionRate < 60).length;

    const statusDistribution = [
      {
        status: 'Normal',
        count: normalCount,
        percentage: totalResidents > 0 ? Math.round((normalCount / totalResidents) * 1000) / 10 : 0,
      },
      {
        status: 'NeedsReview',
        count: reviewCount,
        percentage: totalResidents > 0 ? Math.round((reviewCount / totalResidents) * 1000) / 10 : 0,
      },
      {
        status: 'VerificationRequired',
        count: verificationCount,
        percentage: totalResidents > 0 ? Math.round((verificationCount / totalResidents) * 1000) / 10 : 0,
      },
    ];

    const lowScoreResidents = residentScores
      .filter((s) => s.completionRate < 70)
      .map((s) => ({
        residentId: s.residentId,
        residentName: s.residentName,
        bedNumber: s.bedNumber,
        completionRate: s.completionRate,
        missingItems:
          s.completionRate < 50
            ? ['午後翻身拍背', '晚餐給藥', '生命徵象量測']
            : ['傍晚翻身拍背', '晚間水分攝取量測'],
      }));

    const report: DailyCompletionReport = {
      date: queryDate,
      totalResidents,
      completedRecords,
      averageCompletionRate,
      statusDistribution,
      residentScores,
      lowScoreResidents,
    };

    return HttpResponse.json(createApiResponse(report));
  }),

  http.get('/api/v1/reports/resident-summary', async () => {
    await delay(150);
    const activeResidents = mockResidents.filter((r) => r.status === 'Active');
    const totalResidents = activeResidents.length;

    let nasogastric = 0;
    let urinaryCatheter = 0;
    let tracheostomy = 0;
    let threePipeCount = 0;
    let totalWithTubes = 0;

    const dependencyMap: Record<string, number> = {
      輕度: 0,
      中度: 0,
      重度: 0,
      極重度: 0,
    };

    for (const r of activeResidents) {
      const pipes = r.pipes || [];
      const hasNG = pipes.some((p) => p.includes('胃') || p.toLowerCase().includes('ng'));
      const hasFoley = pipes.some((p) => p.includes('尿') || p.toLowerCase().includes('foley'));
      const hasTrach = pipes.some((p) => p.includes('氣') || p.toLowerCase().includes('trach'));

      if (hasNG) nasogastric++;
      if (hasFoley) urinaryCatheter++;
      if (hasTrach) tracheostomy++;
      if (r.hasThreePipe || (hasNG && hasFoley && hasTrach)) {
        threePipeCount++;
      }
      if (pipes.length > 0 || r.hasThreePipe) {
        totalWithTubes++;
      }

      const dep = r.dependencyLevel || '中度';
      dependencyMap[dep] = (dependencyMap[dep] || 0) + 1;
    }

    const bedOccupancy = [
      { floor: '1F', room: '101', bedNumber: '101-A', residentName: activeResidents[0]?.name, status: 'occupied' as const },
      { floor: '1F', room: '101', bedNumber: '101-B', residentName: activeResidents[1]?.name, status: 'occupied' as const },
      { floor: '1F', room: '102', bedNumber: '102-A', residentName: activeResidents[2]?.name, status: 'occupied' as const },
      { floor: '1F', room: '102', bedNumber: '102-B', status: 'vacant' as const },
      { floor: '2F', room: '201', bedNumber: '201-A', residentName: activeResidents[3]?.name, status: 'occupied' as const },
      { floor: '2F', room: '201', bedNumber: '201-B', status: 'maintenance' as const },
      { floor: '2F', room: '202', bedNumber: '202-A', residentName: activeResidents[4]?.name, status: 'occupied' as const },
      { floor: '2F', room: '202', bedNumber: '202-B', residentName: activeResidents[5]?.name, status: 'occupied' as const },
    ];

    const redAlerts = mockAlerts.filter((a) => a.severity === 'red' && a.status !== 'resolved').length;
    const yellowAlerts = mockAlerts.filter((a) => a.severity === 'yellow' && a.status !== 'resolved').length;

    const summary: ResidentSummaryReport = {
      totalResidents,
      tubeStats: {
        totalWithTubes: totalWithTubes > 0 ? totalWithTubes : 4,
        nasogastric: nasogastric > 0 ? nasogastric : 3,
        urinaryCatheter: urinaryCatheter > 0 ? urinaryCatheter : 2,
        tracheostomy: tracheostomy > 0 ? tracheostomy : 1,
        threePipeCount: threePipeCount > 0 ? threePipeCount : 1,
      },
      bedOccupancy,
      dependencyDistribution: dependencyMap,
      alertsSummary: {
        red: redAlerts,
        yellow: yellowAlerts,
      },
    };

    return HttpResponse.json(createApiResponse(summary));
  }),

  http.get('/api/v1/reports/alerts', async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const severityParam = url.searchParams.get('severity');
    const statusParam = url.searchParams.get('status');

    let filtered = [...mockAlerts];

    if (severityParam) {
      const severities = severityParam.split(',').map((s) => s.trim());
      filtered = filtered.filter((a) => severities.includes(a.severity));
    }

    if (statusParam) {
      const statuses = statusParam.split(',').map((s) => s.trim());
      filtered = filtered.filter((a) => statuses.includes(a.status));
    }

    return HttpResponse.json(createApiResponse(filtered));
  }),

  http.patch('/api/v1/reports/alerts/:id', async ({ params, request }) => {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    await delay(100);
    const { id } = params;
    const body = (await request.json()) as { status: 'open' | 'acknowledged' | 'resolved' };
    const alertIndex = mockAlerts.findIndex((a) => a.id === id);
    const alert = mockAlerts[alertIndex];
    if (alertIndex === -1 || !alert) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '找不到警示項目' } },
        { status: 404 }
      );
    }
    const updated: AlertReportItem = {
      ...alert,
      status: body.status,
    };
    mockAlerts[alertIndex] = updated;
    return HttpResponse.json(createApiResponse(updated));
  }),

  http.get('/api/v1/reports/audit-trail', async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const entityType = url.searchParams.get('entityType');
    const entityId = url.searchParams.get('entityId');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const changedBy = url.searchParams.get('changedBy');
    const actionType = url.searchParams.get('actionType');

    let filtered = [...mockAuditEntries];

    if (entityType) {
      filtered = filtered.filter((entry) => entry.recordType.toLowerCase() === entityType.toLowerCase());
    }
    if (entityId) {
      filtered = filtered.filter((entry) => entry.recordId.toLowerCase().includes(entityId.toLowerCase()));
    }
    if (changedBy) {
      filtered = filtered.filter((entry) => entry.changedBy.toLowerCase().includes(changedBy.toLowerCase()));
    }
    if (actionType) {
      filtered = filtered.filter((entry) => entry.actionType.toLowerCase() === actionType.toLowerCase());
    }
    if (dateFrom) {
      filtered = filtered.filter((entry) => entry.changedAt >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((entry) => entry.changedAt <= dateTo);
    }

    const startIndex = (page - 1) * pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

    const paginatedResponse: PaginatedResponse<AuditEntry> = {
      items: paginatedItems,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize) || 1,
    };

    return HttpResponse.json(createApiResponse(paginatedResponse));
  }),

  http.post('/api/v1/reports/pdf', async ({ request }) => {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    await delay(300);
    const body = (await request.json()) as PdfExportRequest;

    const mockPdfContent = `%PDF-1.4\n1 0 obj\n<< /Title (${body.reportType} Report) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;

    return new HttpResponse(mockPdfContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${body.reportType}-${Date.now()}.pdf"`,
      },
    });
  }),

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
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    await delay(1000); // Simulate generation time
    const body = (await request.json()) as { type: string; parameters: Record<string, unknown> };
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

  // User Management endpoints
  http.get('/api/v1/users', async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const role = url.searchParams.get('role');
    const status = url.searchParams.get('status');

    let filtered = [...mockUsers];

    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.username.toLowerCase().includes(search) ||
          u.userId.toLowerCase().includes(search)
      );
    }

    if (role) {
      filtered = filtered.filter((u) => u.role === role);
    }

    if (status) {
      const isAct = status === 'active';
      filtered = filtered.filter((u) => (u.status ? u.status === status : u.isActive === isAct));
    }

    const startIndex = (page - 1) * pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

    const paginatedResponse: PaginatedResponse<User> = {
      items: paginatedItems,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize) || 1,
    };

    return HttpResponse.json(createApiResponse(paginatedResponse));
  }),

  http.post('/api/v1/users', async ({ request }) => {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    await delay(200);
    const body = (await request.json()) as UserCreateInput;

    if (!body.username || !body.name || !body.role) {
      return HttpResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: '缺少必填欄位 (帳號、姓名或角色)' } },
        { status: 400 }
      );
    }

    const existing = mockUsers.find((u) => u.username.toLowerCase() === body.username.toLowerCase());
    if (existing) {
      return HttpResponse.json(
        { success: false, error: { code: 'DUPLICATE_USERNAME', message: '使用者帳號已存在' } },
        { status: 400 }
      );
    }

    const newUser: User = {
      userId: `user-${Date.now()}`,
      username: body.username,
      name: body.name,
      role: body.role,
      isLocalStaff: !!body.isLocalStaff,
      avatarUrl: undefined,
      lastLoginAt: undefined,
      createdAt: new Date().toISOString(),
      isActive: true,
      status: 'active',
    };

    mockUsers.push(newUser);
    return HttpResponse.json(createApiResponse(newUser), { status: 201 });
  }),

  http.patch('/api/v1/users/:id/role', async ({ params, request }) => {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    await delay(200);
    const user = mockUsers.find((u) => u.userId === params.id);
    if (!user) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '找不到該使用者' } },
        { status: 404 }
      );
    }

    const body = (await request.json()) as UserUpdateRoleInput;

    if (user.role === 'sysadmin' && body.role !== 'sysadmin') {
      const activeSysadmins = mockUsers.filter(
        (u) => u.role === 'sysadmin' && u.isActive !== false && u.status !== 'inactive'
      );
      if (activeSysadmins.length <= 1) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'CANNOT_DEMOTE_LAST_SYSADMIN',
              message: '系統必須保留至少一位啟用的系統管理員，無法調降最後一名管理員權限',
            },
          },
          { status: 400 }
        );
      }
    }

    user.role = body.role;
    return HttpResponse.json(createApiResponse(user));
  }),

  http.patch('/api/v1/users/:id/status', async ({ params, request }) => {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    await delay(200);
    const user = mockUsers.find((u) => u.userId === params.id);
    if (!user) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '找不到該使用者' } },
        { status: 404 }
      );
    }

    const body = (await request.json()) as UserUpdateStatusInput;
    const nextActive = body.status !== undefined ? body.status === 'active' : !!body.isActive;

    if (user.role === 'sysadmin' && !nextActive) {
      const activeSysadmins = mockUsers.filter(
        (u) => u.role === 'sysadmin' && u.isActive !== false && u.status !== 'inactive'
      );
      if (activeSysadmins.length <= 1) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'CANNOT_DEACTIVATE_LAST_SYSADMIN',
              message: '系統必須保留至少一位啟用的系統管理員，無法停用最後一名管理員帳號',
            },
          },
          { status: 400 }
        );
      }
    }

    user.isActive = nextActive;
    user.status = nextActive ? 'active' : 'inactive';
    return HttpResponse.json(createApiResponse(user));
  }),

  http.delete('/api/v1/users/:id', async ({ params, request }) => {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    await delay(200);
    const userIndex = mockUsers.findIndex((u) => u.userId === params.id);
    if (userIndex === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '找不到該使用者' } },
        { status: 404 }
      );
    }

    const user = mockUsers[userIndex]!;
    if (user.role === 'sysadmin') {
      const activeSysadmins = mockUsers.filter(
        (u) => u.role === 'sysadmin' && u.isActive !== false && u.status !== 'inactive'
      );
      if (activeSysadmins.length <= 1) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'CANNOT_REMOVE_LAST_SYSADMIN',
              message: '系統必須保留至少一位啟用的系統管理員，無法刪除最後一名管理員帳號',
            },
          },
          { status: 400 }
        );
      }
    }

    mockUsers.splice(userIndex, 1);
    return HttpResponse.json(createApiResponse({ success: true, message: '使用者已成功刪除' }));
  }),

  // System Settings endpoints
  http.get('/api/v1/system/settings', async () => {
    await delay(150);
    return HttpResponse.json(createApiResponse(mockSystemSettings));
  }),

  http.patch('/api/v1/system/settings', async ({ request }) => {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    await delay(200);
    const body = (await request.json()) as Partial<SystemSettings>;
    mockSystemSettings = {
      ...mockSystemSettings,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(createApiResponse(mockSystemSettings));
  }),

  // System Health endpoint
  http.get('/api/v1/system/health', async () => {
    await delay(150);
    return HttpResponse.json(createApiResponse(mockSystemHealth));
  }),

  // Feature Flags endpoints
  http.get('/api/v1/system/feature-flags', async () => {
    await delay(150);
    return HttpResponse.json(createApiResponse(mockFeatureFlags));
  }),

  http.patch('/api/v1/system/feature-flags/:id', async ({ params, request }) => {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    await delay(200);
    const flag = mockFeatureFlags.find((f) => f.id === params.id);
    if (!flag) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '功能旗標不存在' } },
        { status: 404 }
      );
    }

    const body = (await request.json()) as Partial<FeatureFlag>;
    if (body.enabled !== undefined) flag.enabled = body.enabled;
    if (body.rolloutPercentage !== undefined) flag.rolloutPercentage = body.rolloutPercentage;
    if (body.environment !== undefined) flag.environment = body.environment;

    return HttpResponse.json(createApiResponse(flag));
  }),

  // Health check
  http.get('/api/v1/health', async () => {
    return HttpResponse.json(createApiResponse({ status: 'ok', timestamp: new Date().toISOString() }));
  }),
];