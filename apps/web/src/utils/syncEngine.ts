import apiClient from '@/api/apiClient';
import { useSyncStore } from '@/stores/syncStore';
import {
  offlineDb,
  type OfflineSyncConflict,
  type SyncBatchResponse,
  type SyncEntityType,
  type SyncQueueItem,
} from '@/utils/offlineDb';

const RETRY_LIMIT = 5;
const SYNC_INTERVAL_MS = 30_000;

type ConflictResolutionAction = 'accept-server' | 'keep-local' | 'manual-merge';

function mapEntityTypeToRecordType(entityType: SyncEntityType): OfflineSyncConflict['recordType'] {
  if (entityType === 'Residents') return 'Resident';
  if (entityType === 'CareRecords' || entityType === 'CareActivities') return 'CareRecord';
  if (entityType === 'Medications') return 'Medication';
  return 'CarePlan';
}

function isCriticalConflict(conflict: { recordType: OfflineSyncConflict['recordType']; conflictingFields: string[] }) {
  if (conflict.recordType === 'Medication') {
    return true;
  }

  if (conflict.recordType === 'CareRecord') {
    const fields = conflict.conflictingFields.map((field) => field.toLowerCase());
    return fields.some((field) => field.includes('vitals') || field.includes('activities') || field.includes('medication'));
  }

  return false;
}

async function hydrateStoreFromDb() {
  const [queueCount, allConflicts] = await Promise.all([
    offlineDb.SyncQueue.count(),
    offlineDb.SyncConflicts.toArray(),
  ]);

  useSyncStore.getState().setPendingChanges(queueCount);
  useSyncStore.getState().setConflicts(allConflicts);
}

async function markEntitySynced(item: SyncQueueItem) {
  const table = offlineDb.table(item.entityType);
  const localEntity = await table.get(item.localId);
  if (!localEntity) return;

  await table.update(item.localId, {
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
  });
}

async function markEntityConflict(item: SyncQueueItem) {
  const table = offlineDb.table(item.entityType);
  const localEntity = await table.get(item.localId);
  if (!localEntity) return;

  await table.update(item.localId, {
    syncStatus: 'conflict',
  });
}

async function requeueWithRetry(item: SyncQueueItem) {
  if (item.retryCount + 1 >= RETRY_LIMIT) {
    useSyncStore.getState().addSyncError(`同步失敗超過上限：${item.entityType} ${item.entityId}`);
    await offlineDb.SyncQueue.delete(item.localId);
    return;
  }

  await offlineDb.SyncQueue.update(item.localId, {
    retryCount: item.retryCount + 1,
    updatedAt: new Date().toISOString(),
  });
}

async function processSyncResponse(items: SyncQueueItem[], response: SyncBatchResponse) {
  for (const accepted of response.accepted) {
    const item = items.find((candidate) => candidate.localId === accepted.localId);
    if (!item) continue;

    await markEntitySynced(item);
    await offlineDb.SyncQueue.delete(item.localId);
  }

  for (const conflict of response.conflicts) {
    const item = items.find((candidate) => candidate.localId === conflict.localId);
    if (!item) continue;

    const createdAt = new Date().toISOString();
    const localConflict: OfflineSyncConflict = {
      conflictId: conflict.conflictId,
      localId: conflict.localId,
      recordType: conflict.recordType,
      recordId: conflict.recordId,
      localData: conflict.localData,
      serverData: conflict.serverData,
      conflictType: conflict.conflictType,
      conflictingFields: conflict.conflictingFields,
      status: 'Pending',
      createdAt,
      isCritical: conflict.isCritical || isCriticalConflict(conflict),
    };

    await offlineDb.SyncConflicts.put(localConflict);
    await markEntityConflict(item);
    await offlineDb.SyncQueue.delete(item.localId);
  }
}

function groupQueueItemsByEntityType(queueItems: SyncQueueItem[]) {
  const groups = new Map<SyncEntityType, SyncQueueItem[]>();

  for (const item of queueItems) {
    const current = groups.get(item.entityType);
    if (current) {
      current.push(item);
      continue;
    }

    groups.set(item.entityType, [item]);
  }

  return [...groups.values()];
}

async function buildSyncOperations(queueItems: SyncQueueItem[]) {
  return queueItems.map((item) => ({
    localId: item.localId,
    entityType: item.entityType,
    entityId: item.entityId,
    operation: item.operation,
    payload: item.payload,
    recordType: mapEntityTypeToRecordType(item.entityType),
  }));
}

export async function triggerSyncNow() {
  if (!navigator.onLine) {
    useSyncStore.getState().setOnlineStatus(false);
    return;
  }

  useSyncStore.getState().setSyncing(true);
  useSyncStore.getState().setOnlineStatus(true);

  try {
    const queueItems = await offlineDb.SyncQueue.orderBy('createdAt').toArray();

    if (queueItems.length === 0) {
      useSyncStore.getState().setLastSyncedAt(new Date().toISOString());
      return;
    }

    const groupedBatches = groupQueueItemsByEntityType(queueItems);

    for (const batchItems of groupedBatches) {
      const operations = await buildSyncOperations(batchItems);
      const result = await apiClient.post<SyncBatchResponse>('/sync', {
        operations,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || '同步失敗');
      }

      await processSyncResponse(batchItems, result.data);
    }

    useSyncStore.getState().setLastSyncedAt(new Date().toISOString());
  } catch (error) {
    const queueItems = await offlineDb.SyncQueue.orderBy('createdAt').toArray();
    await Promise.all(queueItems.map((item) => requeueWithRetry(item)));
    useSyncStore
      .getState()
      .addSyncError(error instanceof Error ? error.message : '發生未知同步錯誤');
  } finally {
    await hydrateStoreFromDb();
    useSyncStore.getState().setSyncing(false);
  }
}

export async function resolveSyncConflict(
  conflictId: string,
  action: ConflictResolutionAction,
  mergedData?: Record<string, unknown>
) {
  const conflict = await offlineDb.SyncConflicts.get(conflictId);
  if (!conflict) {
    throw new Error('找不到指定的同步衝突');
  }

  const resolution =
    action === 'accept-server' ? 'Server' : action === 'keep-local' ? 'Local' : 'Merged';

  const result = await apiClient.post<OfflineSyncConflict>(`/sync/conflicts/${conflictId}/resolve`, {
    resolution,
    mergedData,
  });

  if (!result.success) {
    throw new Error(result.error?.message || '衝突解決失敗');
  }

  await offlineDb.SyncConflicts.update(conflictId, {
    status: 'Resolved',
    resolution,
    resolvedAt: new Date().toISOString(),
    resolvedBy: 'current-user',
    localData: action === 'accept-server' ? conflict.serverData : conflict.localData,
    serverData: action === 'manual-merge' && mergedData ? mergedData : conflict.serverData,
  });

  await hydrateStoreFromDb();
}

export async function initializeSyncEngine() {
  await hydrateStoreFromDb();

  const onOnline = () => {
    useSyncStore.getState().setOnlineStatus(true);
    void triggerSyncNow();
  };

  const onOffline = () => {
    useSyncStore.getState().setOnlineStatus(false);
  };

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  const timerId = window.setInterval(() => {
    if (!document.hidden && navigator.onLine) {
      void triggerSyncNow();
    }
  }, SYNC_INTERVAL_MS);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    window.clearInterval(timerId);
  };
}
