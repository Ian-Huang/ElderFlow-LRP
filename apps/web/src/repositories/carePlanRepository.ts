import type {
  CarePlan,
  CarePlanCreateInput,
  CarePlanUpdateInput,
  CarePlanStatus,
} from '@lrp/shared';
import { offlineDb } from '@/utils/offlineDb';
import apiClient from '@/api/apiClient';
import {
  createOfflineRepository,
  type BaseOfflineRepository,
  type RepositoryListParams,
} from './baseRepository';

export interface CarePlanListParams extends RepositoryListParams<CarePlan> {
  residentId?: string;
  status?: CarePlanStatus;
}

export interface CarePlanRepository
  extends BaseOfflineRepository<CarePlan, CarePlanCreateInput, CarePlanUpdateInput> {
  list: (
    params?: CarePlanListParams
  ) => ReturnType<
    BaseOfflineRepository<CarePlan, CarePlanCreateInput, CarePlanUpdateInput>['list']
  >;
  transitionStatus: (
    planId: string,
    nextStatus: CarePlanStatus,
    reason?: string,
    options?: { isOnline?: boolean }
  ) => Promise<CarePlan>;
}

const baseRepo = createOfflineRepository<CarePlan, CarePlanCreateInput, CarePlanUpdateInput>({
  entityType: 'CarePlans',
  apiBasePath: '/care-plans',
  idField: 'planId',
  searchFields: ['planId', 'residentId', 'residentName'],
  table: offlineDb.CarePlans,
  toOptimisticEntity: (payload, localId, now) => ({
    ...payload,
    planId: localId,
    status: 'Draft',
    goals: (payload.goals || []).map((g, idx) => ({
      ...g,
      goalId: `G-${localId.replace('local-', '')}-${idx + 1}`,
      progress: g.progress ?? 0,
      status: g.status || 'NotStarted',
      progressNotes: g.progressNotes || '',
    })),
    serviceItems: (payload.serviceItems || []).map((s, idx) => ({
      ...s,
      itemId: `SI-${localId.replace('local-', '')}-${idx + 1}`,
      notes: s.notes || '',
    })),
    createdAt: now,
    updatedAt: now,
  }),
  applyUpdateToOptimisticEntity: (current, payload, now) => ({
    ...current,
    ...payload,
    goals: payload.goals
      ? payload.goals.map((g, idx) => ({
          description: g.description,
          targetDate: g.targetDate,
          progress: g.progress ?? 0,
          status: g.status || 'NotStarted',
          progressNotes: g.progressNotes || '',
          goalId: ('goalId' in g && typeof g.goalId === 'string' ? g.goalId : `G-${current.planId}-${idx + 1}`),
        }))
      : current.goals,
    serviceItems: payload.serviceItems
      ? payload.serviceItems.map((s, idx) => ({
          name: s.name,
          serviceType: s.serviceType || 'Other',
          frequency: s.frequency,
          responsibleRole: s.responsibleRole || 'Caregiver',
          startDate: s.startDate,
          endDate: s.endDate ?? null,
          notes: s.notes || '',
          itemId: ('itemId' in s && typeof s.itemId === 'string' ? s.itemId : `SI-${current.planId}-${idx + 1}`),
        }))
      : current.serviceItems,
    updatedAt: now,
  }),
});

export const carePlanRepository: CarePlanRepository = {
  ...baseRepo,

  async list(params = {}) {
    const filters: Record<string, unknown> = {
      ...(params.filters || {}),
    };

    if (params.residentId) filters.residentId = params.residentId;
    if (params.status) filters.status = params.status;

    return baseRepo.list({
      ...params,
      filters,
    });
  },

  async create(payload, options = {}) {
    const isOnline = options.isOnline ?? navigator.onLine;
    const now = new Date().toISOString();

    if (isOnline) {
      const response = await apiClient.post<CarePlan>('/care-plans', payload);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || '建立照護計畫失敗');
      }
      const created = response.data;
      await offlineDb.CarePlans.put({
        ...created,
        localId: created.planId,
        syncStatus: 'synced',
        version: 1,
        updatedAt: now,
      });
      return created;
    }

    return baseRepo.create(payload, options);
  },

  async update(id, payload, options = {}) {
    const isOnline = options.isOnline ?? navigator.onLine;
    const now = new Date().toISOString();

    if (isOnline) {
      const response = await apiClient.patch<CarePlan>(`/care-plans/${id}`, payload);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || '更新照護計畫失敗');
      }
      const updated = response.data;
      await offlineDb.CarePlans.put({
        ...updated,
        localId: id,
        syncStatus: 'synced',
        version: 1,
        updatedAt: now,
      });
      return updated;
    }

    return baseRepo.update(id, payload, options);
  },

  async transitionStatus(planId, nextStatus, reason, options = {}) {
    const isOnline = options.isOnline ?? navigator.onLine;
    const now = new Date().toISOString();

    if (isOnline) {
      const response = await apiClient.post<CarePlan>(`/care-plans/${planId}/status`, {
        status: nextStatus,
        reason,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || '更新計畫狀態失敗');
      }

      const updated = response.data;
      const cached = await offlineDb.CarePlans.where('planId').equals(planId).first();
      if (cached) {
        await offlineDb.CarePlans.update(cached.localId, {
          ...cached,
          ...updated,
          syncStatus: 'synced',
          updatedAt: now,
        });
      }

      return updated;
    }

    // Offline optimistic transition
    const cached = await offlineDb.CarePlans.where('planId').equals(planId).first();
    if (!cached) {
      throw new Error('離線模式找不到此照護計畫');
    }

    const updated: CarePlan = {
      ...cached,
      status: nextStatus,
      updatedAt: now,
    };

    await offlineDb.CarePlans.update(cached.localId, {
      ...updated,
      syncStatus: 'pending',
      updatedAt: now,
    });

    await offlineDb.SyncQueue.add({
      localId: `sync-${crypto.randomUUID()}`,
      entityType: 'CarePlans',
      entityId: planId,
      operation: 'update',
      payload: { status: nextStatus, reason },
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return updated;
  },
};
