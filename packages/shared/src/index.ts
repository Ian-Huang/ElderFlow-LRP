// 共用型別定義 - 從規格與 CONTEXT.md 提取

// ========== 住民基本資料 ==========
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone?: string;
  mobile?: string;
  address?: string;
  notes?: string;
}

export interface DisabilityInfo {
  category?: string;
  level?: string;
  expiryDate?: string;
  raw?: string;
}

export interface CatastrophicIllnessInfo {
  name?: string;
  expiryDate?: string;
  raw?: string;
}

export interface Resident {
  residentId: string;
  name: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string; // ISO 8601 YYYY-MM-DD
  address: string;
  householdAddress?: string;
  phone?: string;
  mobile?: string;
  insuranceId: string; // 身分證號
  diagnosis?: string;
  admissionDate: string; // ISO 8601 YYYY-MM-DD
  specialNeeds?: string;
  status: 'Active' | 'Inactive';
  hasThreePipe: boolean; // 鼻胃管、導尿管、氣切管
  bedNumber?: string;
  pipes?: string[];
  identityType?: string;
  dependencyLevel?: string;
  emergencyContact?: EmergencyContact;
  education?: string;
  religion?: string;
  workHistory?: string;
  disability?: DisabilityInfo;
  catastrophicIllness?: CatastrophicIllnessInfo;
  inactiveReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResidentCreateInput {
  name: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  address: string;
  householdAddress?: string;
  phone?: string;
  mobile?: string;
  insuranceId: string;
  diagnosis?: string;
  admissionDate: string;
  specialNeeds?: string;
  hasThreePipe?: boolean;
  bedNumber?: string;
  pipes?: string[];
  identityType?: string;
  dependencyLevel?: string;
  emergencyContact?: EmergencyContact;
  education?: string;
  religion?: string;
  workHistory?: string;
  disability?: DisabilityInfo;
  catastrophicIllness?: CatastrophicIllnessInfo;
}

export interface ResidentUpdateInput extends Partial<ResidentCreateInput> {
  residentId: string;
  status?: 'Active' | 'Inactive';
  inactiveReason?: string;
}

// ========== 日常照護記錄 ==========
export type CareActivityType =
  | 'Meal'
  | 'Bathing'
  | 'Turning'
  | 'Repositioning'
  | 'Medication'
  | 'VitalSigns'
  | 'Other';

export interface CareActivity {
  activityId: string;
  type: CareActivityType;
  timestamp: string; // ISO 8601
  assistanceLevel: 'Independent' | 'Supervision' | 'PartialAssist' | 'TotalAssist';
  notes: string;
  evidence?: Evidence[];
}

export interface Evidence {
  evidenceId: string;
  type: 'Photo' | 'Video';
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export type CareRecordStatus = 'Normal' | 'NeedsReview' | 'VerificationRequired';

export interface CareRecord {
  recordId: string;
  residentId: string;
  timestamp: string; // ISO 8601
  activities: CareActivity[];
  staffId: string;
  staffName: string;
  completenessScore: number; // 0-100
  status: CareRecordStatus;
  evidence: Evidence[];
  notes: string;
  submittedAt: string;
  lockedAt?: string;
  lockType?: 'Editable' | 'Locked';
  modificationHistory: ModificationEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ModificationEntry {
  modificationId: string;
  actionType: 'Create' | 'Update' | 'Delete' | 'Supplement';
  changedBy: string;
  changedAt: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
}

export interface CareRecordCreateInput {
  residentId: string;
  timestamp: string;
  activities: Omit<CareActivity, 'activityId'>[];
  staffId: string;
  staffName: string;
  notes: string;
}

export interface CareRecordUpdateInput extends Partial<CareRecordCreateInput> {
  recordId: string;
  status?: CareRecordStatus;
}

export interface SupplementRecordInput {
  recordId: string;
  supplementContent: string;
  reason: string;
  staffId: string;
  staffName: string;
}

// ========== 藥物管理 ==========
export type MedicationFrequency =
  | 'OnceDaily'
  | 'TwiceDaily'
  | 'ThreeTimesDaily'
  | 'FourTimesDaily'
  | 'AsNeeded';

export type MedicationStockStatus = 'Normal' | 'RunningLow' | 'OutOfStock';

export interface Medication {
  medicationId: string;
  residentId: string;
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  schedule: string[]; // 時間點陣列，如 ["08:00", "20:00"]
  lastAdministered?: string;
  nextScheduled: string;
  stockLevel: number;
  reorderThreshold: number; // 預設 15
  stockStatus?: MedicationStockStatus;
  status: 'Active' | 'Discontinued' | 'OnHold';
  notes: string;
  residentName?: string;
  bedNumber?: string;
  administrationHistory?: MedicationAdministration[];
  createdAt: string;
  updatedAt: string;
}

export interface MedicationCreateInput {
  residentId: string;
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  schedule: string[];
  stockLevel: number;
  reorderThreshold?: number;
  status?: 'Active' | 'Discontinued' | 'OnHold';
  notes?: string;
}

export interface MedicationUpdateInput extends Partial<MedicationCreateInput> {
  medicationId: string;
}

export interface MedicationAdministration {
  administrationId: string;
  medicationId: string;
  residentId: string;
  scheduledTime: string;
  actualTime: string;
  administeredBy: string;
  status: 'Administered' | 'Missed' | 'Refused' | 'Held';
  notes?: string;
  createdAt: string;
}

export interface MedicationAdministrationCreateInput {
  medicationId: string;
  residentId: string;
  scheduledTime?: string;
  actualTime?: string;
  administeredBy: string;
  status?: 'Administered' | 'Missed' | 'Refused' | 'Held';
  notes?: string;
}

// ========== 照護計畫 ==========
export type CarePlanStatus = 'Draft' | 'Active' | 'Completed' | 'Archived';

export type ServiceType =
  | 'PhysicalTherapy'
  | 'SpeechTherapy'
  | 'NutritionCounseling'
  | 'Rehabilitation'
  | 'NursingCare'
  | 'DailyCare'
  | 'SocialWork'
  | 'Other';

export interface CareGoal {
  goalId: string;
  description: string;
  targetDate: string;
  progress?: number;
  status: 'NotStarted' | 'InProgress' | 'Achieved' | 'NotAchieved';
  progressNotes?: string;
}

export interface ServiceItem {
  itemId: string;
  name: string;
  serviceType?: ServiceType;
  frequency: string;
  responsibleRole: 'Nurse' | 'Caregiver' | 'Therapist' | 'SocialWorker' | 'Doctor';
  startDate?: string;
  endDate?: string | null;
  notes?: string;
}

export interface CarePlan {
  planId: string;
  residentId: string;
  assessmentDate: string;
  goals: CareGoal[];
  serviceItems: ServiceItem[];
  reviewDate: string;
  status: CarePlanStatus;
  createdBy: string;
  residentName?: string;
  bedNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarePlanCreateInput {
  residentId: string;
  assessmentDate: string;
  goals: Omit<CareGoal, 'goalId'>[];
  serviceItems: Omit<ServiceItem, 'itemId'>[];
  reviewDate: string;
  createdBy: string;
}

export interface CarePlanUpdateInput extends Partial<CarePlanCreateInput> {
  planId: string;
  status?: CarePlanStatus;
}

// ========== 稽核軌跡 ==========
export type AuditActionType = 'Create' | 'Update' | 'Delete' | 'Supplement' | 'Lock' | 'Unlock' | 'Sign';

export interface AuditEntry {
  auditId: string;
  recordId: string;
  recordType: 'Resident' | 'CareRecord' | 'Medication' | 'CarePlan' | 'Contract';
  actionType: AuditActionType;
  changedBy: string;
  changedAt: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}

// ========== 合約審閱 ==========
export type ContractStatus = 'Pending' | 'Approved' | 'Rejected' | 'Expired';

export interface Contract {
  contractId: string;
  residentId: string;
  intentDate: string;
  reviewPeriodEndDate: string;
  signatureDate?: string;
  status: ContractStatus;
  signedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ========== 同步衝突 ==========
export type ConflictType = 'FieldLevel' | 'SectionLevel' | 'Duplicate';

export interface SyncConflict {
  conflictId: string;
  recordId: string;
  recordType: 'Resident' | 'CareRecord' | 'Medication' | 'CarePlan';
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  conflictType: ConflictType;
  conflictingFields: string[];
  status: 'Pending' | 'Resolved' | 'ForceConfirmed';
  resolution?: 'Local' | 'Server' | 'Merged';
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

// ========== 使用者與認證 ==========
export type UserRole = 'caregiver' | 'supervisor' | 'admin' | 'sysadmin';

export interface User {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  isLocalStaff: boolean; // 本國籍員工
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
  isActive?: boolean;
  status?: 'active' | 'inactive';
}

export interface UserCreateInput {
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  isLocalStaff: boolean;
}

export interface UserUpdateRoleInput {
  role: UserRole;
}

export interface UserUpdateStatusInput {
  status: 'active' | 'inactive';
  isActive?: boolean;
}

export interface SystemSettings {
  syncIntervalSeconds: number;
  lockDurationHours: number;
  lowStockThreshold: number;
  pdfFont: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SystemHealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  services: {
    api: { status: 'up' | 'down'; latencyMs: number };
    database: { status: 'up' | 'down'; latencyMs: number };
    serviceWorker: { status: 'active' | 'inactive'; version: string };
    indexedDb: { status: 'connected' | 'error'; sizeEstimateBytes: number };
  };
  metrics: {
    memoryUsageMb: number;
    cpuLoadPercentage: number;
  };
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  environment: 'development' | 'staging' | 'production' | 'all';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SwitchableUser {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  encryptedRefreshToken: string;
  lastUsedAt: string;
}

// ========== 報表 ==========
export type ReportType = 'DailyCompletion' | 'ResidentOverview' | 'Alerts' | 'Audit' | 'Compliance' | 'KPI';

export interface Report {
  reportId: string;
  type: ReportType;
  generatedAt: string;
  generatedBy: string;
  status: 'Generating' | 'Completed' | 'Failed';
  filePath?: string;
  parameters: Record<string, unknown>;
  data?: unknown;
}

export interface DailyCompletionReport {
  date: string;
  totalResidents: number;
  completedRecords: number;
  averageCompletionRate: number;
  statusDistribution: { status: string; count: number; percentage: number }[];
  residentScores: { residentId: string; residentName: string; bedNumber: string; completionRate: number }[];
  lowScoreResidents: { residentId: string; residentName: string; bedNumber: string; completionRate: number; missingItems: string[] }[];
}

export interface ResidentSummaryReport {
  totalResidents: number;
  tubeStats: {
    totalWithTubes: number;
    nasogastric: number;
    urinaryCatheter: number;
    tracheostomy: number;
    threePipeCount: number;
  };
  bedOccupancy: { floor: string; room: string; bedNumber: string; residentName?: string; status: 'occupied' | 'vacant' | 'maintenance' }[];
  dependencyDistribution: Record<string, number>;
  alertsSummary: { red: number; yellow: number };
}

export interface AlertReportItem {
  id: string;
  type: 'medication_error' | 'vital_abnormal' | 'fall' | 'missed_care';
  severity: 'red' | 'yellow';
  title: string;
  description: string;
  residentId: string;
  residentName: string;
  bedNumber: string;
  occurredAt: string;
  status: 'open' | 'acknowledged' | 'resolved';
}

export interface PdfExportRequest {
  reportType: 'resident-list' | 'tube-statistics' | 'bed-map' | 'completion-report' | 'audit-trail';
  parameters?: Record<string, unknown>;
}

// ========== 合規檢核 ==========
export interface ComplianceCheck {
  checkId: string;
  type: 'CareRatio' | 'NightShift' | 'ContractHours' | 'ContractReview' | 'RecordLock';
  isCompliant: boolean;
  details: string;
  checkedAt: string;
  relatedEntityIds: string[];
}

export interface StaffSchedule {
  scheduleId: string;
  staffId: string;
  staffName: string;
  role: UserRole;
  isLocalStaff: boolean;
  shiftStart: string;
  shiftEnd: string;
  createdAt: string;
}

// ========== API 回應格式 ==========
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ========== 環境與設定 ==========
export interface AppConfig {
  apiBaseUrl: string;
  mockApi: boolean;
  pwaEnabled: boolean;
  kioskMode: boolean;
}

// ========== Zod 驗證 Schema ==========
import { z } from 'zod';

export const ResidentCreateSchema = z.object({
  name: z.string().min(1, '姓名為必填').max(50),
  gender: z.enum(['Male', 'Female']),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式錯誤 (YYYY-MM-DD)'),
  address: z.string().min(1, '地址為必填').max(200),
  householdAddress: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  mobile: z.string().max(30).optional(),
  insuranceId: z.string().min(1, '身分證號/保險 ID 為必填').max(20),
  diagnosis: z.string().max(500).optional(),
  admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式錯誤 (YYYY-MM-DD)'),
  specialNeeds: z.string().max(500).optional(),
  hasThreePipe: z.boolean().default(false),
  bedNumber: z.string().max(20).optional(),
  pipes: z.array(z.string()).optional(),
  identityType: z.string().max(50).optional(),
  dependencyLevel: z.string().max(50).optional(),
  emergencyContact: z
    .object({
      name: z.string().optional(),
      relationship: z.string().optional(),
      phone: z.string().optional(),
      mobile: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  education: z.string().optional(),
  religion: z.string().optional(),
  workHistory: z.string().optional(),
  disability: z
    .object({
      category: z.string().optional(),
      level: z.string().optional(),
      expiryDate: z.string().optional(),
      raw: z.string().optional(),
    })
    .optional(),
  catastrophicIllness: z
    .object({
      name: z.string().optional(),
      expiryDate: z.string().optional(),
      raw: z.string().optional(),
    })
    .optional(),
});

export const CareRecordCreateSchema = z.object({
  residentId: z.string().min(1, '住民 ID 為必填'),
  timestamp: z.string().datetime({ offset: true }),
  activities: z.array(z.object({
    type: z.enum(['Meal', 'Bathing', 'Turning', 'Repositioning', 'Medication', 'VitalSigns', 'Other']),
    timestamp: z.string().datetime({ offset: true }),
    assistanceLevel: z.enum(['Independent', 'Supervision', 'PartialAssist', 'TotalAssist']),
    notes: z.string().max(1000).optional(),
  })).min(1, '至少需要一項照護活動'),
  staffId: z.string().min(1, '員工 ID 為必填'),
  staffName: z.string().min(1, '員工姓名為必填'),
  notes: z.string().max(2000).optional(),
});

export const MedicationCreateSchema = z.object({
  residentId: z.string().min(1, '住民 ID 為必填'),
  name: z.string().min(1, '藥物名稱必填').max(100),
  dosage: z.string().min(1, '劑量必填').max(50),
  frequency: z.enum(['OnceDaily', 'TwiceDaily', 'ThreeTimesDaily', 'FourTimesDaily', 'AsNeeded']),
  schedule: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)).default([]),
  stockLevel: z.number().int().min(0),
  reorderThreshold: z.number().int().min(0).default(15),
  status: z.enum(['Active', 'Discontinued', 'OnHold']).default('Active'),
  notes: z.string().max(500).optional(),
});

export const MedicationAdministrationSchema = z.object({
  medicationId: z.string().min(1, '藥物 ID 為必填'),
  residentId: z.string().min(1, '住民 ID 為必填'),
  scheduledTime: z.string().optional(),
  actualTime: z.string().optional(),
  administeredBy: z.string().min(1, '執行人員為必填'),
  status: z.enum(['Administered', 'Missed', 'Refused', 'Held']).default('Administered'),
  notes: z.string().max(500).optional(),
});

export const CarePlanCreateSchema = z
  .object({
    residentId: z.string().min(1, '住民 ID 為必填'),
    assessmentDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '評估日期格式錯誤 (YYYY-MM-DD)')
      .refine((date) => {
        const today = new Date().toISOString().split('T')[0] ?? '';
        return date <= today;
      }, '評估日期不得為未來日期'),
    goals: z
      .array(
        z.object({
          description: z.string().min(1, '目標描述必填').max(500),
          targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '目標日期格式錯誤 (YYYY-MM-DD)'),
          progress: z.coerce.number().min(0, '進度最低為 0%').max(100, '進度最高為 100%').default(0),
          status: z.enum(['NotStarted', 'InProgress', 'Achieved', 'NotAchieved']).default('NotStarted'),
          progressNotes: z.string().max(1000).optional().default(''),
        })
      )
      .min(1, '至少需要一個照護目標'),
    serviceItems: z
      .array(
        z.object({
          name: z.string().min(1, '服務項目名稱必填').max(100),
          serviceType: z
            .enum([
              'PhysicalTherapy',
              'SpeechTherapy',
              'NutritionCounseling',
              'Rehabilitation',
              'NursingCare',
              'DailyCare',
              'SocialWork',
              'Other',
            ])
            .optional()
            .default('Other'),
          frequency: z.string().min(1, '頻率必填').max(50),
          responsibleRole: z
            .enum(['Nurse', 'Caregiver', 'Therapist', 'SocialWorker', 'Doctor'])
            .default('Caregiver'),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '起始日期格式錯誤').optional(),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '結束日期格式錯誤').nullable().optional(),
          notes: z.string().max(500).optional().default(''),
        })
      )
      .min(1, '至少需要一個服務項目'),
    reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '複審日期格式錯誤 (YYYY-MM-DD)'),
    createdBy: z.string().min(1, '建立者必填'),
  })
  .refine(
    (data) => {
      if (data.assessmentDate && data.reviewDate) {
        return data.reviewDate >= data.assessmentDate;
      }
      return true;
    },
    {
      message: '複審日期不得早於評估日期',
      path: ['reviewDate'],
    }
  );

// ========== 報表與系統管理 Zod 驗證 Schema ==========
export const DailyCompletionReportSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式錯誤 (YYYY-MM-DD)'),
  totalResidents: z.number().int().nonnegative(),
  completedRecords: z.number().int().nonnegative(),
  averageCompletionRate: z.number().min(0).max(100),
  statusDistribution: z.array(
    z.object({
      status: z.string(),
      count: z.number().int().nonnegative(),
      percentage: z.number().min(0).max(100),
    })
  ),
  residentScores: z.array(
    z.object({
      residentId: z.string(),
      residentName: z.string(),
      bedNumber: z.string(),
      completionRate: z.number().min(0).max(100),
    })
  ),
  lowScoreResidents: z.array(
    z.object({
      residentId: z.string(),
      residentName: z.string(),
      bedNumber: z.string(),
      completionRate: z.number().min(0).max(100),
      missingItems: z.array(z.string()),
    })
  ),
});

export const ResidentSummaryReportSchema = z.object({
  totalResidents: z.number().int().nonnegative(),
  tubeStats: z.object({
    totalWithTubes: z.number().int().nonnegative(),
    nasogastric: z.number().int().nonnegative(),
    urinaryCatheter: z.number().int().nonnegative(),
    tracheostomy: z.number().int().nonnegative(),
    threePipeCount: z.number().int().nonnegative(),
  }),
  bedOccupancy: z.array(
    z.object({
      floor: z.string(),
      room: z.string(),
      bedNumber: z.string(),
      residentName: z.string().optional(),
      status: z.enum(['occupied', 'vacant', 'maintenance']),
    })
  ),
  dependencyDistribution: z.record(z.string(), z.number().int().nonnegative()),
  alertsSummary: z.object({
    red: z.number().int().nonnegative(),
    yellow: z.number().int().nonnegative(),
  }),
});

export const AlertReportItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['medication_error', 'vital_abnormal', 'fall', 'missed_care']),
  severity: z.enum(['red', 'yellow']),
  title: z.string().min(1),
  description: z.string(),
  residentId: z.string().min(1),
  residentName: z.string().min(1),
  bedNumber: z.string().min(1),
  occurredAt: z.string(),
  status: z.enum(['open', 'acknowledged', 'resolved']),
});

export const PdfExportRequestSchema = z.object({
  reportType: z.enum(['resident-list', 'tube-statistics', 'bed-map', 'completion-report', 'audit-trail']),
  parameters: z.record(z.unknown()).optional(),
});

export const UserRoleSchema = z.enum(['caregiver', 'supervisor', 'admin', 'sysadmin']);

export const UserCreateSchema = z.object({
  username: z.string().min(3, '帳號至少需 3 個字元').max(50),
  password: z.string().min(6, '密碼至少需 6 個字元').optional(),
  name: z.string().min(1, '姓名為必填').max(50),
  role: UserRoleSchema,
  isLocalStaff: z.boolean(),
});

export const UserUpdateRoleSchema = z.object({
  role: UserRoleSchema,
});

export const UserUpdateStatusSchema = z
  .object({
    status: z.enum(['active', 'inactive']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.status !== undefined || data.isActive !== undefined, {
    message: 'status 或 isActive 至少需提供一項',
  });

export const SystemSettingsSchema = z.object({
  syncIntervalSeconds: z.number().int().min(5, '同步間隔至少需 5 秒').max(3600, '同步間隔不可超過 3600 秒'),
  lockDurationHours: z.number().int().min(1, '鎖定時長至少需 1 小時').max(72, '鎖定時長不可超過 72 小時'),
  lowStockThreshold: z.number().int().min(1, '低庫存閾值至少需為 1').max(500),
  pdfFont: z.string().min(1, 'PDF 字體為必填'),
  updatedAt: z.string(),
  updatedBy: z.string(),
});

export const SystemHealthReportSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  uptimeSeconds: z.number().nonnegative(),
  services: z.object({
    api: z.object({
      status: z.enum(['up', 'down']),
      latencyMs: z.number().nonnegative(),
    }),
    database: z.object({
      status: z.enum(['up', 'down']),
      latencyMs: z.number().nonnegative(),
    }),
    serviceWorker: z.object({
      status: z.enum(['active', 'inactive']),
      version: z.string(),
    }),
    indexedDb: z.object({
      status: z.enum(['connected', 'error']),
      sizeEstimateBytes: z.number().nonnegative(),
    }),
  }),
  metrics: z.object({
    memoryUsageMb: z.number().nonnegative(),
    cpuLoadPercentage: z.number().min(0).max(100),
  }),
});

export const FeatureFlagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  enabled: z.boolean(),
  rolloutPercentage: z.number().min(0).max(100),
  environment: z.enum(['development', 'staging', 'production', 'all']),
});