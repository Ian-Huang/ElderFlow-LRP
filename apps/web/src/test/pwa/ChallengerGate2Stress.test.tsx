import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import {
  offlineDb,
  getFormDraft,
} from '@/utils/offlineDb';
import {
  captureAndSaveActiveDraft,
  restoreActiveDraftToDom,
} from '@/components/UserSwitcher';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { useUIStore } from '@/stores/uiStore';
import { triggerSyncNow, resolveSyncConflict } from '@/utils/syncEngine';
import { Layout } from '@/components/Layout';
import apiClient from '@/api/apiClient';

describe('Challenger Gate 2: Adversarial PWA Offline, Concurrency & Kiosk Stress Harness', () => {
  const originalLocation = window.location;

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

    useUIStore.setState({
      kioskMode: false,
      wakeLockActive: false,
    });

    useAuthStore.setState({
      user: {
        userId: 'u1',
        username: 'caregiver1',
        name: '照護員 A',
        role: 'caregiver',
        isLocalStaff: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      switchableUsers: [
        { userId: 'u1', username: 'caregiver1', name: '照護員 A', role: 'caregiver', encryptedRefreshToken: 'rt1', lastUsedAt: '2024-01-01T00:00:00Z' },
        { userId: 'u2', username: 'supervisor1', name: '督導 B', role: 'supervisor', encryptedRefreshToken: 'rt2', lastUsedAt: '2024-01-01T00:00:00Z' },
        { userId: 'u3', username: 'admin1', name: '主管 C', role: 'admin', encryptedRefreshToken: 'rt3', lastUsedAt: '2024-01-01T00:00:00Z' },
      ],
    });

    document.body.innerHTML = '';
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Challenge 1: Offline Form Filling & Sync Queue Accumulation Stress Tests
  // =========================================================================
  describe('Challenge 1: Offline Sync Queue Accumulation & Integrity', () => {
    it('1A: Accumulates high volume (50 operations) across multi-entities and drains cleanly upon sync', async () => {
      const now = new Date().toISOString();

      // Seed 25 Residents and 25 CareRecords into IndexedDB and SyncQueue
      const queueItems = [];
      for (let i = 0; i < 25; i++) {
        const resId = `res-stress-${i}`;
        await offlineDb.Residents.put({
          localId: resId,
          residentId: resId,
          name: `住民 ${i}`,
          gender: i % 2 === 0 ? 'Male' : 'Female',
          dateOfBirth: '1940-01-01',
          address: '台北市',
          insuranceId: `ID-${i}`,
          diagnosis: '高血壓',
          admissionDate: '2024-01-01',
          specialNeeds: '',
          status: 'Active',
          hasThreePipe: false,
          syncStatus: 'pending',
          version: 1,
          createdAt: now,
          updatedAt: now,
        });

        queueItems.push({
          localId: resId,
          entityType: 'Residents' as const,
          entityId: resId,
          operation: 'create' as const,
          payload: { residentId: resId, name: `住民 ${i}` },
          retryCount: 0,
          createdAt: new Date(Date.now() + i * 10).toISOString(),
          updatedAt: now,
        });

        const recordId = `record-stress-${i}`;
        await offlineDb.CareRecords.put({
          localId: recordId,
          recordId: recordId,
          residentId: resId,
          timestamp: now,
          activities: [],
          staffId: 'u1',
          staffName: '照護員 A',
          completenessScore: 100,
          status: 'Normal',
          evidence: [],
          notes: `照護記錄 ${i}`,
          submittedAt: now,
          modificationHistory: [],
          syncStatus: 'pending',
          version: 1,
          createdAt: now,
          updatedAt: now,
        });

        queueItems.push({
          localId: recordId,
          entityType: 'CareRecords' as const,
          entityId: recordId,
          operation: 'create' as const,
          payload: { recordId, residentId: resId, notes: `照護記錄 ${i}` },
          retryCount: 0,
          createdAt: new Date(Date.now() + (i + 30) * 10).toISOString(),
          updatedAt: now,
        });
      }

      await offlineDb.SyncQueue.bulkPut(queueItems);
      expect(await offlineDb.SyncQueue.count()).toBe(50);

      // Mock apiClient.post for /sync to accept all items in each batch
      const postSpy = vi.spyOn(apiClient, 'post').mockImplementation(async (_url, body: any) => {
        const ops = body.operations || [];
        return {
          success: true,
          data: {
            accepted: ops.map((op: any) => ({
              localId: op.localId,
              entityType: op.entityType,
              entityId: op.entityId,
              serverVersion: 2,
            })),
            conflicts: [],
          },
        };
      });

      await triggerSyncNow();

      // Verify grouped batching dispatched separate calls per entity type
      expect(postSpy).toHaveBeenCalledTimes(2);
      expect(await offlineDb.SyncQueue.count()).toBe(0);
      expect(useSyncStore.getState().pendingChanges).toBe(0);

      // Check that all 50 entities now marked as 'synced'
      const syncedResidents = await offlineDb.Residents.where('syncStatus').equals('synced').count();
      const syncedRecords = await offlineDb.CareRecords.where('syncStatus').equals('synced').count();
      expect(syncedResidents).toBe(25);
      expect(syncedRecords).toBe(25);
    });

    it('1B: Handles repetitive network failures and purges after retry limit (RETRY_LIMIT = 5)', async () => {
      const now = new Date().toISOString();
      const localId = 'fail-item-001';

      await offlineDb.SyncQueue.put({
        localId,
        entityType: 'Residents',
        entityId: 'RES-FAIL',
        operation: 'create',
        payload: { residentId: 'RES-FAIL' },
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('500 Internal Server Error'));

      // Fail 1: retryCount becomes 1
      await triggerSyncNow();
      let item = await offlineDb.SyncQueue.get(localId);
      expect(item?.retryCount).toBe(1);

      // Fail 2: retryCount becomes 2
      await triggerSyncNow();
      item = await offlineDb.SyncQueue.get(localId);
      expect(item?.retryCount).toBe(2);

      // Fail 3, 4
      await triggerSyncNow();
      await triggerSyncNow();
      item = await offlineDb.SyncQueue.get(localId);
      expect(item?.retryCount).toBe(4);

      // Fail 5: retryCount + 1 >= 5 -> Reaches RETRY_LIMIT! Should be purged and error logged
      await triggerSyncNow();
      item = await offlineDb.SyncQueue.get(localId);
      expect(item).toBeUndefined(); // Dropped from queue!
      expect(await offlineDb.SyncQueue.count()).toBe(0);
      expect(useSyncStore.getState().syncErrors.length).toBeGreaterThan(0);
      expect(useSyncStore.getState().syncErrors.some((e) => e.includes('同步失敗超過上限'))).toBe(true);
    });

    it('1D: Offline create followed by offline update overwrites create into partial update in SyncQueue (Vulnerability Check)', async () => {
      // Simulate baseRepository create then update behavior
      const localId = 'offline-res-123';
      const now = new Date().toISOString();

      // Step 1: User creates resident offline
      const createPayload = {
        name: '離線新住民',
        gender: 'Male',
        dateOfBirth: '1945-05-05',
        insuranceId: 'A199999999',
        address: '新北市板橋區',
      };

      await offlineDb.SyncQueue.put({
        localId,
        entityType: 'Residents',
        entityId: localId,
        operation: 'create',
        payload: createPayload,
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      // Verify create queued
      let queued = await offlineDb.SyncQueue.get(localId);
      expect(queued?.operation).toBe('create');
      expect((queued?.payload as any).name).toBe('離線新住民');

      // Step 2: User edits resident offline before syncing
      const updatePayload = {
        notes: '家屬要求特別看護',
      };

      await offlineDb.SyncQueue.put({
        localId,
        entityType: 'Residents',
        entityId: localId,
        operation: 'update',
        payload: updatePayload,
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      // Step 3: Inspect SyncQueue state
      queued = await offlineDb.SyncQueue.get(localId);
      // NOTE: Because SyncQueue primary key is localId, the create operation is overwritten!
      expect(queued?.operation).toBe('update');
      expect((queued?.payload as any).name).toBeUndefined(); // Name is LOST from SyncQueue!
      expect((queued?.payload as any).notes).toBe('家屬要求特別看護');
    });

    it('1C: Critical vs Non-critical Conflict detection and resolution actions', async () => {
      const now = new Date().toISOString();
      const localId = 'conf-item-001';

      await offlineDb.SyncQueue.put({
        localId,
        entityType: 'Medications',
        entityId: 'MED-123',
        operation: 'update',
        payload: { medicationId: 'MED-123', dosage: '50mg' },
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      await offlineDb.Medications.put({
        localId,
        medicationId: 'MED-123',
        residentId: 'RES-1',
        name: '阿斯匹靈',
        dosage: '50mg',
        frequency: 'OnceDaily',
        schedule: ['08:00'],
        nextScheduled: now,
        stockLevel: 10,
        reorderThreshold: 5,
        notes: '',
        status: 'Active',
        syncStatus: 'pending',
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      vi.spyOn(apiClient, 'post').mockResolvedValue({
        success: true,
        data: {
          accepted: [],
          conflicts: [
            {
              localId,
              conflictId: 'SC-CRITICAL-1',
              recordType: 'Medication',
              recordId: 'MED-123',
              localData: { dosage: '50mg' },
              serverData: { dosage: '100mg' },
              conflictType: 'FieldLevel',
              conflictingFields: ['dosage'],
              isCritical: true,
            },
          ],
        },
      });

      await triggerSyncNow();

      // Verify conflict stored as Critical
      const conflict = await offlineDb.SyncConflicts.get('SC-CRITICAL-1');
      expect(conflict).toBeDefined();
      expect(conflict?.isCritical).toBe(true);
      expect(conflict?.status).toBe('Pending');

      // Now test resolving conflict via resolveSyncConflict
      const resolveSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
        success: true,
        data: {
          ...conflict,
          status: 'Resolved',
          resolution: 'Server',
        },
      });

      await resolveSyncConflict('SC-CRITICAL-1', 'accept-server');

      expect(resolveSpy).toHaveBeenCalledWith(
        '/sync/conflicts/SC-CRITICAL-1/resolve',
        expect.objectContaining({ resolution: 'Server' })
      );

      const resolved = await offlineDb.SyncConflicts.get('SC-CRITICAL-1');
      expect(resolved?.status).toBe('Resolved');
      expect(resolved?.resolution).toBe('Server');
    });
  });

  // =========================================================================
  // Challenge 2: Rapid Multi-User Switching & Draft Isolation Stress Tests
  // =========================================================================
  describe('Challenge 2: Rapid Multi-User Switching & Draft Isolation', () => {
    it('2A: Multi-user draft isolation: draftKey includes userId and preserves drafts when multiple users edit same entity form', async () => {
      // Mock window location
      Object.defineProperty(window, 'location', {
        writable: true,
        configurable: true,
        value: { ...originalLocation, pathname: '/residents/new' },
      });

      // User 1 (u1: 照護員 A) drafts content
      document.body.innerHTML = `
        <form data-entity="residents" data-entity-id="new">
          <input name="residentName" value="住民A草稿（由照護員A填寫）" />
          <textarea name="careNotes">早班交接紀錄：體溫36.5</textarea>
          <input type="checkbox" name="hasAllergy" checked />
        </form>
      `;

      const draftU1 = await captureAndSaveActiveDraft('u1');
      expect(draftU1?.draftKey).toBe('draft:u1:residents:new');
      expect(draftU1?.userId).toBe('u1');

      // Switch to User 2 (u2: 督導 B) and enter different draft for same form
      const formEl = document.querySelector('form')!;
      (formEl.querySelector('[name="residentName"]') as HTMLInputElement).value = '住民B草稿（由督導B填寫）';
      (formEl.querySelector('[name="careNotes"]') as HTMLTextAreaElement).value = '督導查房：注意飲食控管';
      (formEl.querySelector('[name="hasAllergy"]') as HTMLInputElement).checked = false;

      const draftU2 = await captureAndSaveActiveDraft('u2');
      expect(draftU2?.draftKey).toBe('draft:u2:residents:new');
      expect(draftU2?.userId).toBe('u2');

      // Verify that in IndexedDB, both drafts exist because draftKey is scoped to userId!
      const allDrafts = await offlineDb.Drafts.toArray();
      expect(allDrafts.length).toBe(2);
      expect(allDrafts.some((d) => d.userId === 'u1')).toBe(true);
      expect(allDrafts.some((d) => d.userId === 'u2')).toBe(true);

      // Switch back to User 1: Attempt to restore User 1's draft
      const restoredU1 = await restoreActiveDraftToDom('u1');
      expect(restoredU1).toBe(true);

      // Verify getFormDraft for u1 returns u1's draft
      const fetchedU1 = await getFormDraft('residents', 'new', 'u1');
      expect(fetchedU1).toBeDefined();
      expect(fetchedU1?.userId).toBe('u1');
      expect(fetchedU1?.formData.residentName).toBe('住民A草稿（由照護員A填寫）');
    });

    it('2B: Password and sensitive security fields are NEVER captured into IndexedDB drafts', async () => {
      document.body.innerHTML = `
        <form data-entity="users" data-entity-id="new">
          <input name="username" value="new_caregiver_01" />
          <input type="password" name="password" value="SuperSecretPassword123!" />
          <input type="password" id="confirmPassword" value="SuperSecretPassword123!" />
        </form>
      `;

      const draft = await captureAndSaveActiveDraft('u1');
      expect(draft).toBeDefined();
      expect(draft?.formData.username).toBe('new_caregiver_01');
      expect(draft?.formData.password).toBeUndefined();
      expect(draft?.formData.confirmPassword).toBeUndefined();
    });

    it('2C: Multi-form disambiguation prefers activeElement focused form over dormant forms', async () => {
      document.body.innerHTML = `
        <!-- Search bar form at top of page -->
        <form data-entity="search" data-entity-id="top">
          <input name="keyword" value="搜尋舊住民" />
        </form>
        <!-- Actual editing form below -->
        <form data-entity="residents" data-entity-id="target-01">
          <input name="notes" value="重要照護目標" />
        </form>
      `;

      const editingInput = document.querySelector('form[data-entity="residents"] input') as HTMLInputElement;
      editingInput.focus();

      const draft = await captureAndSaveActiveDraft('u1');
      expect(draft?.draftKey).toBe('draft:u1:residents:target-01');
      expect(draft?.formData.notes).toBe('重要照護目標');
      expect(draft?.formData.keyword).toBeUndefined();
    });
  });

  // =========================================================================
  // Challenge 3: Kiosk Mode Activation, Navigation Locking, and Emergency Unlock
  // =========================================================================
  describe('Challenge 3: Kiosk Mode & Emergency Unlock Hardening', () => {
    it('3A: 5-click emergency unlock strictly resets if interval between clicks exceeds 3000ms', () => {
      vi.useFakeTimers();
      useUIStore.setState({ kioskMode: true });

      render(
        <MemoryRouter>
          <Layout />
        </MemoryRouter>
      );

      const logoBtn = screen.getByTestId('kiosk-logo-btn');

      // Click 1, 2, 3, 4
      fireEvent.click(logoBtn);
      fireEvent.click(logoBtn);
      fireEvent.click(logoBtn);
      fireEvent.click(logoBtn);
      expect(screen.getByTestId('unlock-click-hint')).toHaveTextContent('再點擊 1 次解除鎖定');
      expect(useUIStore.getState().kioskMode).toBe(true);

      // Now user hesitates or gets distracted: advance time past 3000ms timeout
      act(() => {
        vi.advanceTimersByTime(3100);
      });

      // Hint should disappear because unlockClicks was reset to 0
      expect(screen.queryByTestId('unlock-click-hint')).toBeNull();

      // Click 5th time now: Should NOT unlock, but should count as click 1
      fireEvent.click(logoBtn);
      expect(useUIStore.getState().kioskMode).toBe(true);
      expect(screen.getByTestId('unlock-click-hint')).toHaveTextContent('再點擊 4 次解除鎖定');

      // Click remaining 4 times to unlock
      fireEvent.click(logoBtn);
      fireEvent.click(logoBtn);
      fireEvent.click(logoBtn);
      fireEvent.click(logoBtn);
      expect(useUIStore.getState().kioskMode).toBe(false);

      vi.useRealTimers();
    });

    it('3B: Handles rapid spam clicks (10 clicks) gracefully and deactivates at 5th click', () => {
      useUIStore.setState({ kioskMode: true });

      render(
        <MemoryRouter>
          <Layout />
        </MemoryRouter>
      );

      const logoBtn = screen.getByTestId('kiosk-logo-btn');

      // Rapidly fire 10 clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(logoBtn);
      }

      // Kiosk mode must be false and not crash
      expect(useUIStore.getState().kioskMode).toBe(false);
    });

    it('3C: Cancels beforeunload event only when in kiosk mode', () => {
      // Test 1: In Kiosk mode -> beforeunload is intercepted
      useUIStore.setState({ kioskMode: true });
      const { unmount } = render(
        <MemoryRouter>
          <Layout />
        </MemoryRouter>
      );

      const eventInKiosk = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
      Object.defineProperty(eventInKiosk, 'returnValue', { writable: true, value: false });
      window.dispatchEvent(eventInKiosk);

      expect(eventInKiosk.defaultPrevented).toBe(true);
      expect(eventInKiosk.returnValue).toContain('Kiosk');

      unmount();

      // Test 2: Normal mode -> beforeunload is NOT intercepted
      useUIStore.setState({ kioskMode: false });
      render(
        <MemoryRouter>
          <Layout />
        </MemoryRouter>
      );

      const eventNormal = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
      Object.defineProperty(eventNormal, 'returnValue', { writable: true, value: false });
      window.dispatchEvent(eventNormal);

      expect(eventNormal.defaultPrevented).toBe(false);
    });
  });
});
