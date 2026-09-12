import Dexie, { Table } from 'dexie';
import type { CarePlan, CareRecord, Medication, Resident, SyncConflict, User } from '@lrp/shared';

export type OfflineSyncStatus = 'synced' | 'pending' | 'syncing' | 'conflict';

interface OfflineMeta {
  localId: string;
  syncStatus: OfflineSyncStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
}

export interface OfflineResident extends Resident, OfflineMeta {}

export interface OfflineCareRecord extends CareRecord, OfflineMeta {}

export interface OfflineCareActivity extends OfflineMeta {
  activityId: string;
  recordId: string;
  residentId: string;
  type: CareRecord['activities'][number]['type'];
  timestamp: string;
  assistanceLevel: CareRecord['activities'][number]['assistanceLevel'];
  notes: string;
}

export interface OfflineMedication extends Medication, OfflineMeta {}

export interface OfflineTimeSlot extends OfflineMeta {
  slotId: string;
  residentId: string;
  category: 'Medication' | 'CareRecord' | 'CarePlan';
  startsAt: string;
  endsAt: string;
  title: string;
}

export interface OfflineCarePlan extends CarePlan, OfflineMeta {}

export type SyncEntityType =
  | 'Residents'
  | 'CareRecords'
  | 'CareActivities'
  | 'Medications'
  | 'TimeSlots'
  | 'CarePlans';

export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
  localId: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineSyncConflict extends SyncConflict {
  localId: string;
  isCritical: boolean;
}

export interface OfflineUserCache extends User {
  updatedAt: string;
}

export interface SyncAcceptedResult {
  localId: string;
  entityType: SyncEntityType;
  entityId: string;
  serverId?: string;
  serverVersion?: number;
}

export interface SyncConflictResult {
  localId: string;
  conflictId: string;
  recordType: SyncConflict['recordType'];
  recordId: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  conflictType: SyncConflict['conflictType'];
  conflictingFields: string[];
  isCritical: boolean;
}

export interface SyncBatchRequest {
  operations: Array<{
    localId: string;
    entityType: SyncEntityType;
    entityId: string;
    operation: SyncOperation;
    payload: Record<string, unknown>;
  }>;
}

export interface SyncBatchResponse {
  accepted: SyncAcceptedResult[];
  conflicts: SyncConflictResult[];
}

export interface OfflineDraft {
  draftKey: string; // Format: draft:{userId}:{entity}:{id}
  entity: string;
  entityId: string;
  userId: string;
  formData: Record<string, unknown>;
  updatedAt: string;
}

class OfflineDatabase extends Dexie {
  Residents!: Table<OfflineResident, string>;
  CareRecords!: Table<OfflineCareRecord, string>;
  CareActivities!: Table<OfflineCareActivity, string>;
  Medications!: Table<OfflineMedication, string>;
  TimeSlots!: Table<OfflineTimeSlot, string>;
  CarePlans!: Table<OfflineCarePlan, string>;
  SyncQueue!: Table<SyncQueueItem, string>;
  SyncConflicts!: Table<OfflineSyncConflict, string>;
  Users!: Table<OfflineUserCache, string>;
  Drafts!: Table<OfflineDraft, string>;

  constructor() {
    super('LRPOfflineDB');

    this.version(1).stores({
      Residents: 'localId, residentId, syncStatus, updatedAt',
      CareRecords: 'localId, recordId, residentId, syncStatus, updatedAt',
      CareActivities: 'localId, activityId, recordId, residentId, syncStatus, updatedAt',
      Medications: 'localId, medicationId, residentId, syncStatus, updatedAt',
      TimeSlots: 'localId, slotId, residentId, category, syncStatus, updatedAt',
      CarePlans: 'localId, planId, residentId, syncStatus, updatedAt',
      SyncQueue: 'localId, entityType, entityId, operation, retryCount, createdAt',
      SyncConflicts: 'conflictId, localId, recordType, recordId, status, isCritical, createdAt',
      Users: 'userId, username, role, updatedAt',
      Drafts: 'draftKey, entity, entityId, userId, updatedAt',
    });
  }
}

export const offlineDb = new OfflineDatabase();

/**
 * Save form draft into IndexedDB with key draft:{userId}:{entity}:{id}
 */
export async function saveFormDraft(
  entity: string,
  entityId: string,
  userId: string,
  formData: Record<string, unknown>
): Promise<OfflineDraft> {
  const draftKey = `draft:${userId || 'default'}:${entity}:${entityId}`;
  const draft: OfflineDraft = {
    draftKey,
    entity,
    entityId,
    userId,
    formData,
    updatedAt: new Date().toISOString(),
  };
  await offlineDb.Drafts.put(draft);
  return draft;
}

/**
 * Retrieve form draft by entity and id, optionally verifying userId
 */
export async function getFormDraft(
  entity: string,
  entityId: string,
  userId?: string
): Promise<OfflineDraft | undefined> {
  const draftKey = `draft:${userId || 'default'}:${entity}:${entityId}`;
  const draft = await offlineDb.Drafts.get(draftKey);
  if (draft) {
    if (userId && draft.userId !== userId) return undefined;
    return draft;
  }
  if (!userId) {
    // If userId not specified, check if any draft matches entity and entityId
    return await offlineDb.Drafts.where('entity').equals(entity).filter((d) => d.entityId === entityId).first();
  }
  return undefined;
}

/**
 * Delete a draft when form is submitted or discarded
 */
export async function clearFormDraft(entity: string, entityId: string, userId?: string): Promise<void> {
  const draftKey = `draft:${userId || 'default'}:${entity}:${entityId}`;
  await offlineDb.Drafts.delete(draftKey);
  if (!userId) {
    const matching = await offlineDb.Drafts.where('entity').equals(entity).filter((d) => d.entityId === entityId).toArray();
    if (matching.length > 0) {
      await offlineDb.Drafts.bulkDelete(matching.map((d) => d.draftKey));
    }
  }
}

/**
 * List all saved drafts for a user
 */
export async function getUserDrafts(userId: string): Promise<OfflineDraft[]> {
  return await offlineDb.Drafts.where('userId').equals(userId).toArray();
}

/**
 * Cleanup expired sync records (retention 30 days) in IndexedDB
 */
export async function cleanupOldSyncRecords(retentionDays = 30): Promise<{ deletedQueue: number; deletedConflicts: number }> {
  const cutoffTime = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  // Find conflicts older than cutoff
  const oldConflicts = await offlineDb.SyncConflicts.where('createdAt').below(cutoffTime).toArray();
  const conflictIds = oldConflicts.map((c) => c.conflictId);
  if (conflictIds.length > 0) {
    await offlineDb.SyncConflicts.bulkDelete(conflictIds);
  }

  // Find queue items older than cutoff
  const oldQueue = await offlineDb.SyncQueue.where('createdAt').below(cutoffTime).toArray();
  const queueIds = oldQueue.map((q) => q.localId);
  if (queueIds.length > 0) {
    await offlineDb.SyncQueue.bulkDelete(queueIds);
  }

  return {
    deletedQueue: queueIds.length,
    deletedConflicts: conflictIds.length,
  };
}

/**
 * Verify IndexedDB is initialized, open, and responsive
 */
export async function checkOfflineDbReady(): Promise<boolean> {
  try {
    if (!offlineDb.isOpen()) {
      await offlineDb.open();
    }
    await offlineDb.Residents.count();
    return true;
  } catch (error) {
    console.warn('OfflineDB check failed:', error);
    return false;
  }
}
