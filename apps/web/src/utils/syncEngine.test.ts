import { describe, expect, it, beforeEach, vi } from 'vitest';
import { offlineDb } from '@/utils/offlineDb';
import { triggerSyncNow } from '@/utils/syncEngine';
import { useSyncStore } from '@/stores/syncStore';
import apiClient from '@/api/apiClient';

vi.mock('@/api/apiClient', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockedPost = vi.mocked(apiClient.post);

describe('syncEngine', () => {
  beforeEach(async () => {
    await offlineDb.delete();
    await offlineDb.open();

    useSyncStore.setState({
      isOnline: true,
      isSyncing: false,
      lastSyncedAt: null,
      pendingChanges: 0,
      conflicts: [],
      syncErrors: [],
    });

    mockedPost.mockReset();
  });

  it('should mark accepted queue item as synced and remove from queue', async () => {
    const now = new Date().toISOString();
    const localId = 'local-accepted-1';

    await offlineDb.Residents.put({
      localId,
      residentId: 'RES-100',
      name: '測試住民',
      gender: 'Male',
      dateOfBirth: '1950-01-01',
      address: '台北市',
      insuranceId: 'A123456789',
      diagnosis: '測試診斷',
      admissionDate: '2024-01-01',
      specialNeeds: '',
      status: 'Active',
      hasThreePipe: false,
      syncStatus: 'pending',
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    await offlineDb.SyncQueue.put({
      localId,
      entityType: 'Residents',
      entityId: 'RES-100',
      operation: 'update',
      payload: { residentId: 'RES-100', name: '更新住民' },
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    mockedPost.mockResolvedValue({
      success: true,
      data: {
        accepted: [
          {
            localId,
            entityType: 'Residents',
            entityId: 'RES-100',
            serverVersion: 2,
          },
        ],
        conflicts: [],
      },
    });

    await triggerSyncNow();

    const queueCount = await offlineDb.SyncQueue.count();
    const resident = await offlineDb.Residents.get(localId);

    expect(queueCount).toBe(0);
    expect(resident?.syncStatus).toBe('synced');
    expect(useSyncStore.getState().pendingChanges).toBe(0);
  });

  it('should persist conflict and mark entity as conflict', async () => {
    const now = new Date().toISOString();
    const localId = 'local-conflict-1';

    await offlineDb.CareRecords.put({
      localId,
      recordId: 'CR-conflict-1',
      residentId: 'RES-001',
      timestamp: now,
      activities: [],
      staffId: 'user-001',
      staffName: '測試照護員',
      completenessScore: 100,
      status: 'Normal',
      evidence: [],
      notes: '',
      submittedAt: now,
      modificationHistory: [],
      syncStatus: 'pending',
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    await offlineDb.SyncQueue.put({
      localId,
      entityType: 'CareRecords',
      entityId: 'CR-conflict-1',
      operation: 'update',
      payload: { recordId: 'CR-conflict-1', forceConflict: true },
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    mockedPost.mockResolvedValue({
      success: true,
      data: {
        accepted: [],
        conflicts: [
          {
            localId,
            conflictId: 'SC-100',
            recordType: 'CareRecord',
            recordId: 'CR-conflict-1',
            localData: { recordId: 'CR-conflict-1', forceConflict: true },
            serverData: { recordId: 'CR-conflict-1', status: 'server' },
            conflictType: 'FieldLevel',
            conflictingFields: ['vitals', 'activities'],
            isCritical: true,
          },
        ],
      },
    });

    await triggerSyncNow();

    const queueCount = await offlineDb.SyncQueue.count();
    const conflict = await offlineDb.SyncConflicts.get('SC-100');
    const record = await offlineDb.CareRecords.get(localId);

    expect(queueCount).toBe(0);
    expect(conflict?.status).toBe('Pending');
    expect(conflict?.isCritical).toBe(true);
    expect(record?.syncStatus).toBe('conflict');
    expect(useSyncStore.getState().conflicts).toHaveLength(1);
  });
});
