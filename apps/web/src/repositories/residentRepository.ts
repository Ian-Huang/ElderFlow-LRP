import type { Resident, ResidentCreateInput, ResidentUpdateInput } from '@lrp/shared';
import { offlineDb } from '@/utils/offlineDb';
import { createOfflineRepository, type BaseOfflineRepository, type RepositoryListParams } from './baseRepository';

export interface ResidentListParams extends RepositoryListParams<Resident> {
  status?: 'Active' | 'Inactive';
  hasThreePipe?: boolean | string;
  identityType?: string;
  dependencyLevel?: string;
}

export interface ResidentRepository extends BaseOfflineRepository<Resident, ResidentCreateInput, ResidentUpdateInput> {
  list: (params?: ResidentListParams) => ReturnType<BaseOfflineRepository<Resident, ResidentCreateInput, ResidentUpdateInput>['list']>;
  toggleStatus: (
    id: string,
    status: 'Active' | 'Inactive',
    reason?: string,
    options?: { isOnline?: boolean }
  ) => Promise<Resident>;
  setInactive: (id: string, reason: string, options?: { isOnline?: boolean }) => Promise<Resident>;
}

const baseRepo = createOfflineRepository<Resident, ResidentCreateInput, ResidentUpdateInput>({
  entityType: 'Residents',
  apiBasePath: '/residents',
  idField: 'residentId',
  searchFields: ['name', 'residentId', 'insuranceId', 'bedNumber', 'diagnosis'],
  table: offlineDb.Residents,
  toOptimisticEntity: (payload, localId, now) => ({
    ...payload,
    residentId: localId,
    status: 'Active',
    hasThreePipe: payload.hasThreePipe ?? false,
    createdAt: now,
    updatedAt: now,
  }),
  applyUpdateToOptimisticEntity: (current, payload, now) => ({
    ...current,
    ...payload,
    updatedAt: now,
  }),
});

export const residentRepository: ResidentRepository = {
  ...baseRepo,

  async list(params = {}) {
    const filters: Record<string, unknown> = {
      ...(params.filters || {}),
    };

    if (params.status) filters.status = params.status;
    if (params.hasThreePipe !== undefined && params.hasThreePipe !== '') {
      filters.hasThreePipe = String(params.hasThreePipe) === 'true';
    }
    if (params.identityType) filters.identityType = params.identityType;
    if (params.dependencyLevel) filters.dependencyLevel = params.dependencyLevel;

    return baseRepo.list({
      ...params,
      filters,
    });
  },

  async toggleStatus(id, status, reason = '', options = {}) {
    return baseRepo.update(
      id,
      {
        residentId: id,
        status,
        inactiveReason: reason,
      },
      options
    );
  },

  async setInactive(id, reason, options = {}) {
    return this.toggleStatus(id, 'Inactive', reason, options);
  },
};
