import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { offlineDb, type OfflineSyncStatus, type SyncEntityType, type SyncOperation } from '@/utils/offlineDb';
import { useSyncStore } from '@/stores/syncStore';
import { triggerSyncNow } from '@/utils/syncEngine';

interface UseOfflineMutationOptions<TPayload extends Record<string, unknown>, TResult> {
  entityType: SyncEntityType;
  table: SyncEntityType;
  operation: SyncOperation;
  queryKey?: QueryKey;
  toOptimisticEntity: (args: {
    payload: TPayload;
    localId: string;
    now: string;
    syncStatus: OfflineSyncStatus;
  }) => Record<string, unknown>;
  mergeQueryData?: (current: unknown, optimisticEntity: Record<string, unknown>) => unknown;
  mutationFn?: (payload: TPayload) => Promise<TResult>;
}

interface OfflineMutationResult<TResult> {
  localId: string;
  syncStatus: OfflineSyncStatus;
  version: number;
  optimisticResult: TResult | null;
}

export function useOfflineMutation<TPayload extends Record<string, unknown>, TResult = unknown>(
  options: UseOfflineMutationOptions<TPayload, TResult>
) {
  const queryClient = useQueryClient();

  return useMutation<OfflineMutationResult<TResult>, Error, TPayload>({
    mutationFn: async (payload) => {
      const localId = crypto.randomUUID();
      const now = new Date().toISOString();
      const syncStatus: OfflineSyncStatus = 'pending';

      const optimisticEntity = options.toOptimisticEntity({
        payload,
        localId,
        now,
        syncStatus,
      });

      await offlineDb.table(options.table).put({
        ...optimisticEntity,
        localId,
        syncStatus,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      await offlineDb.SyncQueue.put({
        localId,
        entityType: options.entityType,
        entityId: String(optimisticEntity.id ?? optimisticEntity.recordId ?? optimisticEntity.residentId ?? localId),
        operation: options.operation,
        payload,
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      useSyncStore.getState().incrementPendingChanges();

      if (options.queryKey && options.mergeQueryData) {
        queryClient.setQueryData(options.queryKey, (current) => options.mergeQueryData?.(current, optimisticEntity));
      }

      if (navigator.onLine) {
        void triggerSyncNow();
      }

      let optimisticResult: TResult | null = null;
      if (options.mutationFn) {
        optimisticResult = await options.mutationFn(payload);
      }

      return {
        localId,
        syncStatus,
        version: 1,
        optimisticResult,
      };
    },
  });
}
