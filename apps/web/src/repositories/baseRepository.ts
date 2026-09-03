import type { Table } from 'dexie';
import type { PaginatedResponse } from '@lrp/shared';
import apiClient from '@/api/apiClient';
import { offlineDb, type SyncEntityType, type OfflineSyncStatus } from '@/utils/offlineDb';
import { useSyncStore } from '@/stores/syncStore';
import { triggerSyncNow } from '@/utils/syncEngine';
import { evaluateInMemoryQuery, type QueryEvaluatorOptions } from './queryEvaluator';

export interface RepositoryListParams<T> extends QueryEvaluatorOptions<T> {
  isOnline?: boolean;
  extraQueryParams?: Record<string, string | number | boolean | undefined>;
}

export interface BaseOfflineRepositoryConfig<
  TEntity extends object,
  TCreateInput extends object,
  TUpdateInput extends object,
> {
  entityType: SyncEntityType;
  apiBasePath: string;
  idField: keyof TEntity;
  searchFields?: Array<keyof TEntity>;
  table: Table<any, any>;
  toOptimisticEntity: (payload: TCreateInput, localId: string, now: string) => TEntity;
  applyUpdateToOptimisticEntity?: (current: TEntity, payload: TUpdateInput, now: string) => TEntity;
}

export interface BaseOfflineRepository<
  TEntity extends object,
  TCreateInput extends object,
  TUpdateInput extends object,
> {
  list: (params?: RepositoryListParams<TEntity>) => Promise<PaginatedResponse<TEntity>>;
  getById: (id: string, options?: { isOnline?: boolean }) => Promise<TEntity | null>;
  create: (payload: TCreateInput, options?: { isOnline?: boolean }) => Promise<TEntity>;
  update: (id: string, payload: TUpdateInput, options?: { isOnline?: boolean }) => Promise<TEntity>;
  delete: (id: string, options?: { isOnline?: boolean }) => Promise<void>;
}

export function createOfflineRepository<
  TEntity extends object,
  TCreateInput extends object = Record<string, unknown>,
  TUpdateInput extends object = Record<string, unknown>,
>(
  config: BaseOfflineRepositoryConfig<TEntity, TCreateInput, TUpdateInput>
): BaseOfflineRepository<TEntity, TCreateInput, TUpdateInput> {
  const {
    entityType,
    apiBasePath,
    idField,
    searchFields = [],
    table,
    toOptimisticEntity,
    applyUpdateToOptimisticEntity,
  } = config;

  return {
    async list(params = {}) {
      const isOnline = params.isOnline ?? (typeof navigator !== 'undefined' ? navigator.onLine : true);

      if (isOnline) {
        try {
          const urlParams = new URLSearchParams();
          if (params.page) urlParams.set('page', String(params.page));
          if (params.pageSize) urlParams.set('pageSize', String(params.pageSize));
          if (params.search) urlParams.set('search', params.search);
          if (params.sortField) urlParams.set('sort', String(params.sortField));
          if (params.sortOrder) urlParams.set('order', params.sortOrder);

          if (params.filters) {
            for (const [key, val] of Object.entries(params.filters)) {
              if (val !== undefined && val !== null && val !== '') {
                urlParams.set(key, String(val));
              }
            }
          }

          if (params.extraQueryParams) {
            for (const [key, val] of Object.entries(params.extraQueryParams)) {
              if (val !== undefined && val !== null && val !== '') {
                urlParams.set(key, String(val));
              }
            }
          }

          const queryString = urlParams.toString();
          const endpoint = queryString ? `${apiBasePath}?${queryString}` : apiBasePath;
          const res = await apiClient.get<PaginatedResponse<TEntity>>(endpoint);

          if (res.success && res.data) {
            // Background cache items in Dexie
            for (const item of res.data.items) {
              const entityId = String((item as Record<string, unknown>)[idField as string] || '');
              if (entityId) {
                await table.put({
                  ...item,
                  localId: entityId,
                  syncStatus: 'synced',
                  version: 1,
                  createdAt: ((item as Record<string, unknown>).createdAt as string) || new Date().toISOString(),
                  updatedAt: ((item as Record<string, unknown>).updatedAt as string) || new Date().toISOString(),
                });
              }
            }
            return res.data;
          }
        } catch {
          // Fall through to offline Dexie query
        }
      }

      // Offline Fallback using Query Evaluator
      const rawOfflineItems = (await table.toArray()) as TEntity[];
      return evaluateInMemoryQuery(rawOfflineItems, {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        searchFields: searchFields.length > 0 ? searchFields : undefined,
        filters: params.filters,
        sortField: params.sortField,
        sortOrder: params.sortOrder,
        customFilter: params.customFilter,
      });
    },

    async getById(id, options = {}) {
      const isOnline = options.isOnline ?? (typeof navigator !== 'undefined' ? navigator.onLine : true);

      if (isOnline) {
        try {
          const res = await apiClient.get<TEntity>(`${apiBasePath}/${id}`);
          if (res.success && res.data) {
            await table.put({
              ...res.data,
              localId: id,
              syncStatus: 'synced',
              version: 1,
              updatedAt: new Date().toISOString(),
            });
            return res.data;
          }
        } catch {
          // Fallback to offline
        }
      }

      const item = (await table.get(id)) as TEntity | undefined;
      return item || null;
    },

    async create(payload, options = {}) {
      const isOnline = options.isOnline ?? (typeof navigator !== 'undefined' ? navigator.onLine : true);
      const localId = crypto.randomUUID();
      const now = new Date().toISOString();
      const syncStatus: OfflineSyncStatus = 'pending';

      const optimisticEntity = toOptimisticEntity(payload, localId, now);

      await table.put({
        ...optimisticEntity,
        localId,
        syncStatus,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      await offlineDb.SyncQueue.put({
        localId,
        entityType,
        entityId: String((optimisticEntity as Record<string, unknown>)[idField as string] || localId),
        operation: 'create',
        payload: payload as unknown as Record<string, unknown>,
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      useSyncStore.getState().incrementPendingChanges();

      if (isOnline) {
        void triggerSyncNow();
      }

      return optimisticEntity;
    },

    async update(id, payload, options = {}) {
      const isOnline = options.isOnline ?? (typeof navigator !== 'undefined' ? navigator.onLine : true);
      const now = new Date().toISOString();
      const existing = (await table.get(id)) as TEntity | undefined;

      let updatedEntity: TEntity;
      if (applyUpdateToOptimisticEntity && existing) {
        updatedEntity = applyUpdateToOptimisticEntity(existing, payload, now);
      } else {
        updatedEntity = {
          ...(existing || {}),
          ...payload,
          updatedAt: now,
        } as unknown as TEntity;
      }

      await table.put({
        ...updatedEntity,
        localId: id,
        syncStatus: 'pending',
        version: 1,
        updatedAt: now,
      });

      await offlineDb.SyncQueue.put({
        localId: crypto.randomUUID(),
        entityType,
        entityId: id,
        operation: 'update',
        payload: payload as unknown as Record<string, unknown>,
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      useSyncStore.getState().incrementPendingChanges();

      if (isOnline) {
        void triggerSyncNow();
      }

      return updatedEntity;
    },

    async delete(id, options = {}) {
      const isOnline = options.isOnline ?? (typeof navigator !== 'undefined' ? navigator.onLine : true);
      const now = new Date().toISOString();

      await table.delete(id);

      await offlineDb.SyncQueue.put({
        localId: crypto.randomUUID(),
        entityType,
        entityId: id,
        operation: 'delete',
        payload: { [String(idField)]: id },
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      useSyncStore.getState().incrementPendingChanges();

      if (isOnline) {
        void triggerSyncNow();
      }
    },
  };
}
