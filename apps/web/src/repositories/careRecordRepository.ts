import type {
  CareRecord,
  CareRecordStatus,
  CareRecordCreateInput,
  CareRecordUpdateInput,
  SupplementRecordInput,
  ModificationEntry,
} from '@lrp/shared';
import { offlineDb } from '@/utils/offlineDb';
import { calculateCareRecordCompleteness } from '@/utils/careRecordScore';
import { createOfflineRepository, type BaseOfflineRepository, type RepositoryListParams } from './baseRepository';

export interface CareRecordListParams extends RepositoryListParams<CareRecord> {
  residentId?: string;
  status?: CareRecordStatus;
  staffId?: string;
  startDate?: string;
  endDate?: string;
}

export interface LockStatusResult {
  locked: boolean;
  text: string;
  remainingMs: number;
}

export function calculateCareRecordLockCountdown(submittedAt: string): LockStatusResult {
  const submitted = new Date(submittedAt).getTime();
  const lockAt = submitted + 24 * 60 * 60 * 1000;
  const remainingMs = lockAt - Date.now();
  if (remainingMs <= 0) {
    return { locked: true, text: '已鎖定', remainingMs: 0 };
  }

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  return {
    locked: false,
    text: `${hours} 小時 ${minutes} 分後鎖定`,
    remainingMs,
  };
}

export function isCareRecordLocked(record: CareRecord): boolean {
  if (record.lockType === 'Locked') return true;
  if (!record.submittedAt) return false;
  return calculateCareRecordLockCountdown(record.submittedAt).locked;
}

export interface CareRecordRepository extends BaseOfflineRepository<CareRecord, CareRecordCreateInput, CareRecordUpdateInput> {
  list: (params?: CareRecordListParams) => ReturnType<BaseOfflineRepository<CareRecord, CareRecordCreateInput, CareRecordUpdateInput>['list']>;
  applySupplement: (payload: SupplementRecordInput, options?: { isOnline?: boolean }) => Promise<CareRecord>;
  getLockStatus: (record: CareRecord) => LockStatusResult;
  isLocked: (record: CareRecord) => boolean;
}

const baseRepo = createOfflineRepository<CareRecord, CareRecordCreateInput, CareRecordUpdateInput>({
  entityType: 'CareRecords',
  apiBasePath: '/care-records',
  idField: 'recordId',
  searchFields: ['staffName', 'notes', 'residentId'],
  table: offlineDb.CareRecords,
  toOptimisticEntity: (payload, localId, now) => {
    const activitiesWithIds = (payload.activities || []).map((act) => ({
      ...act,
      activityId: crypto.randomUUID(),
    }));

    const scoreResult = calculateCareRecordCompleteness({
      residentId: payload.residentId,
      activities: activitiesWithIds.map((act) => ({
        type: act.type,
        assistanceLevel: act.assistanceLevel,
        notes: act.notes,
        durationMinutes: 15,
      })),
      evidenceCount: 0,
    });
    const score = scoreResult.score;

    return {
      recordId: localId,
      residentId: payload.residentId,
      timestamp: payload.timestamp,
      activities: activitiesWithIds,
      staffId: payload.staffId,
      staffName: payload.staffName,
      completenessScore: score,
      status: score >= 80 ? 'Normal' : 'NeedsReview',
      evidence: [],
      notes: payload.notes || '',
      submittedAt: now,
      lockType: 'Editable',
      modificationHistory: [],
      createdAt: now,
      updatedAt: now,
    };
  },
  applyUpdateToOptimisticEntity: (current, payload, now) => ({
    ...current,
    ...payload,
    activities: payload.activities
      ? payload.activities.map((act) => ({
          ...act,
          activityId: (act as any).activityId || crypto.randomUUID(),
        }))
      : current.activities,
    updatedAt: now,
  }),
});

export const careRecordRepository: CareRecordRepository = {
  ...baseRepo,

  getLockStatus(record) {
    return calculateCareRecordLockCountdown(record.submittedAt);
  },

  isLocked(record) {
    return isCareRecordLocked(record);
  },

  async list(params = {}) {
    const filters: Record<string, unknown> = {
      ...(params.filters || {}),
    };

    if (params.residentId) filters.residentId = params.residentId;
    if (params.status) filters.status = params.status;
    if (params.staffId) filters.staffId = params.staffId;

    return baseRepo.list({
      ...params,
      filters,
      customFilter: (record) => {
        if (params.startDate) {
          const start = new Date(params.startDate).getTime();
          const itemTime = new Date(record.timestamp).getTime();
          if (itemTime < start) return false;
        }
        if (params.endDate) {
          const end = new Date(params.endDate).getTime();
          const itemTime = new Date(record.timestamp).getTime();
          if (itemTime > end) return false;
        }
        if (params.customFilter) {
          return params.customFilter(record);
        }
        return true;
      },
    });
  },

  async applySupplement(payload, options = {}) {
    const record = await baseRepo.getById(payload.recordId, options);
    if (!record) {
      throw new Error('找不到指定的照護紀錄');
    }

    const now = new Date().toISOString();
    const supplementEntry: ModificationEntry = {
      modificationId: crypto.randomUUID(),
      actionType: 'Supplement',
      changedBy: `${payload.staffName} (${payload.staffId})`,
      changedAt: now,
      fieldName: 'supplementContent',
      oldValue: '',
      newValue: payload.supplementContent,
      reason: payload.reason,
    };

    const updatedHistory = [...(record.modificationHistory || []), supplementEntry];
    const updatedNotes = record.notes
      ? `${record.notes}\n[補充紀錄 ${now.split('T')[0]}]: ${payload.supplementContent}`
      : `[補充紀錄 ${now.split('T')[0]}]: ${payload.supplementContent}`;

    // Fix: pass modificationHistory into baseRepo.update so it is stored in Dexie and queued in SyncQueue!
    const updated = await baseRepo.update(
      payload.recordId,
      {
        recordId: payload.recordId,
        notes: updatedNotes,
        modificationHistory: updatedHistory,
      } as unknown as CareRecordUpdateInput,
      options
    );

    return {
      ...updated,
      modificationHistory: updatedHistory,
    };
  },
};
