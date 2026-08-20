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
    });
  }
}

export const offlineDb = new OfflineDatabase();
