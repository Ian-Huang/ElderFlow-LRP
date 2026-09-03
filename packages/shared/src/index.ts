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
export type MedicationFrequency = 'OnceDaily' | 'TwiceDaily' | 'ThreeTimesDaily' | 'AsNeeded';

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
  status: 'Active' | 'Discontinued' | 'OnHold';
  notes: string;
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
  reorderThreshold: number;
  notes: string;
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
  notes: string;
  createdAt: string;
}

// ========== 照護計畫 ==========
export type CarePlanStatus = 'Draft' | 'Active' | 'Completed' | 'Archived';

export interface CareGoal {
  goalId: string;
  description: string;
  targetDate: string;
  status: 'NotStarted' | 'InProgress' | 'Achieved' | 'NotAchieved';
  progressNotes: string;
}

export interface ServiceItem {
  itemId: string;
  name: string;
  frequency: string;
  responsibleRole: 'Nurse' | 'Caregiver' | 'Therapist' | 'SocialWorker' | 'Doctor';
  notes: string;
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
  frequency: z.enum(['OnceDaily', 'TwiceDaily', 'ThreeTimesDaily', 'AsNeeded']),
  schedule: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)).min(1),
  stockLevel: z.number().int().min(0),
  reorderThreshold: z.number().int().min(0).default(15),
  notes: z.string().max(500).optional(),
});

export const CarePlanCreateSchema = z.object({
  residentId: z.string().min(1, '住民 ID 為必填'),
  assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  goals: z.array(z.object({
    description: z.string().min(1, '目標描述必填').max(500),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['NotStarted', 'InProgress', 'Achieved', 'NotAchieved']).default('NotStarted'),
    progressNotes: z.string().max(1000).optional(),
  })).min(1, '至少需要一個照護目標'),
  serviceItems: z.array(z.object({
    name: z.string().min(1, '服務項目名稱必填').max(100),
    frequency: z.string().min(1, '頻率必填').max(50),
    responsibleRole: z.enum(['Nurse', 'Caregiver', 'Therapist', 'SocialWorker', 'Doctor']),
    notes: z.string().max(500).optional(),
  })).min(1, '至少需要一個服務項目'),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdBy: z.string().min(1, '建立者必填'),
});