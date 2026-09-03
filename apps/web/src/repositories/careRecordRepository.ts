import type {
  CareRecord,
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
  status?: string;
  staffId?: string;
}

export interface CareRecordRepository extends BaseOfflineRepository<CareRecord, CareRecordCreateInput, CareRecordUpdateInput> {
  list: (params?: CareRecordListParams) => ReturnType<BaseOfflineRepository<CareRecord, CareRecordCreateInput, CareRecordUpdateInput>['list']>;
  applySupplement: (payload: SupplementRecordInput, options?: { isOnline?: boolean }) => Promise<CareRecord>;
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
      extraQueryParams: {
        ...(params.extraQueryParams || {}),
        residentId: params.residentId,
        status: params.status,
        staffId: params.staffId,
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

    const updated = await baseRepo.update(
      payload.recordId,
      {
        recordId: payload.recordId,
        notes: updatedNotes,
      },
      options
    );

    return {
      ...updated,
      modificationHistory: updatedHistory,
    };
  },
};
