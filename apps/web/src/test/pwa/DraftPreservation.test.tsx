import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  offlineDb,
  saveFormDraft,
  getFormDraft,
  clearFormDraft,
  getUserDrafts,
  cleanupOldSyncRecords,
} from '@/utils/offlineDb';
import {
  UserSwitcher,
  captureAndSaveActiveDraft,
  restoreActiveDraftToDom,
} from '@/components/UserSwitcher';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/api/apiClient';

describe('Draft Preservation & Fast User Switching', () => {
  const originalLocation = window.location;

  beforeEach(async () => {
    await offlineDb.open();
    await offlineDb.Drafts.clear();
    await offlineDb.SyncConflicts.clear();
    await offlineDb.SyncQueue.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  it('saves, retrieves, and clears form drafts in IndexedDB with draft:{userId}:{entity}:{id}', async () => {
    const draft = await saveFormDraft('residents', 'res-123', 'user-1', {
      name: '王大明',
      gender: 'male',
      roomNumber: '302',
    });

    expect(draft.draftKey).toBe('draft:user-1:residents:res-123');
    expect(draft.userId).toBe('user-1');

    // Retrieve
    const fetched = await getFormDraft('residents', 'res-123', 'user-1');
    expect(fetched).toBeDefined();
    expect(fetched?.formData).toEqual({
      name: '王大明',
      gender: 'male',
      roomNumber: '302',
    });

    // Attempt retrieve with wrong user
    const wrongUser = await getFormDraft('residents', 'res-123', 'user-2');
    expect(wrongUser).toBeUndefined();

    // Clear
    await clearFormDraft('residents', 'res-123');
    const cleared = await getFormDraft('residents', 'res-123');
    expect(cleared).toBeUndefined();
  });

  it('lists all drafts for a given user', async () => {
    await saveFormDraft('residents', 'res-1', 'user-caregiver', { note: 'A' });
    await saveFormDraft('care-plans', 'plan-2', 'user-caregiver', { goal: 'B' });
    await saveFormDraft('residents', 'res-3', 'user-other', { note: 'C' });

    const userDrafts = await getUserDrafts('user-caregiver');
    expect(userDrafts).toHaveLength(2);
    expect(userDrafts.map((d) => d.entityId).sort()).toEqual(['plan-2', 'res-1']);
  });

  it('cleans up old sync records older than 30 days', async () => {
    const now = Date.now();
    const fortyDaysAgo = new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString();
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();

    // Seed SyncConflicts
    await offlineDb.SyncConflicts.bulkAdd([
      {
        conflictId: 'conf-old',
        localId: 'loc-1',
        recordType: 'Resident',
        recordId: 'r-1',
        status: 'Pending',
        isCritical: false,
        conflictType: 'FieldLevel',
        localData: {},
        serverData: {},
        conflictingFields: [],
        resolvedAt: undefined,
        resolvedBy: undefined,
        createdAt: fortyDaysAgo,
      },
      {
        conflictId: 'conf-new',
        localId: 'loc-2',
        recordType: 'Resident',
        recordId: 'r-2',
        status: 'Pending',
        isCritical: false,
        conflictType: 'FieldLevel',
        localData: {},
        serverData: {},
        conflictingFields: [],
        resolvedAt: undefined,
        resolvedBy: undefined,
        createdAt: tenDaysAgo,
      },
    ]);

    // Seed SyncQueue
    await offlineDb.SyncQueue.bulkAdd([
      {
        localId: 'q-old',
        entityType: 'Residents',
        entityId: 'r-1',
        operation: 'update',
        payload: {},
        retryCount: 0,
        createdAt: fortyDaysAgo,
        updatedAt: fortyDaysAgo,
      },
      {
        localId: 'q-new',
        entityType: 'Residents',
        entityId: 'r-2',
        operation: 'update',
        payload: {},
        retryCount: 0,
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      },
    ]);

    const result = await cleanupOldSyncRecords(30);
    expect(result.deletedConflicts).toBe(1);
    expect(result.deletedQueue).toBe(1);

    const remainingConflicts = await offlineDb.SyncConflicts.toArray();
    expect(remainingConflicts).toHaveLength(1);
    expect(remainingConflicts[0]?.conflictId).toBe('conf-new');

    const remainingQueue = await offlineDb.SyncQueue.toArray();
    expect(remainingQueue).toHaveLength(1);
    expect(remainingQueue[0]?.localId).toBe('q-new');
  });

  it('captures active form draft from DOM and restores it', async () => {
    document.body.innerHTML = `
      <form data-entity="medications" data-entity-id="med-99">
        <input name="medicationName" value="阿斯匹靈" />
        <input name="dosage" value="100mg" />
        <textarea name="remarks">每日飯後服用</textarea>
        <input type="checkbox" name="urgent" checked />
      </form>
    `;

    const saved = await captureAndSaveActiveDraft('user-nurse');
    expect(saved).not.toBeNull();
    expect(saved?.draftKey).toBe('draft:user-nurse:medications:med-99');
    expect(saved?.formData).toEqual({
      medicationName: '阿斯匹靈',
      dosage: '100mg',
      remarks: '每日飯後服用',
      urgent: true,
    });

    // Reset DOM form values
    const form = document.querySelector('form')!;
    (form.querySelector('[name="medicationName"]') as HTMLInputElement).value = '';
    (form.querySelector('[name="dosage"]') as HTMLInputElement).value = '';

    // Mock window location
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { ...originalLocation, pathname: '/medications/med-99' },
    });

    const restored = await restoreActiveDraftToDom('user-nurse');
    expect(restored).toBe(true);

    expect(
      (form.querySelector('[name="medicationName"]') as HTMLInputElement).value
    ).toBe('阿斯匹靈');
    expect((form.querySelector('[name="dosage"]') as HTMLInputElement).value).toBe(
      '100mg'
    );
  });

  it('automatically preserves draft before user switch and shows up to 5 users in dropdown', async () => {
    // Setup 6 switchable users
    const mockUsers = [
      { userId: 'u1', username: 'user1', name: '王照服', role: 'caregiver' as const, isLocalStaff: true, encryptedRefreshToken: 'rt1', lastUsedAt: '2024-01-15T00:00:00Z' },
      { userId: 'u2', username: 'user2', name: '李護理', role: 'supervisor' as const, isLocalStaff: true, encryptedRefreshToken: 'rt2', lastUsedAt: '2024-01-15T00:00:00Z' },
      { userId: 'u3', username: 'user3', name: '張主管', role: 'supervisor' as const, isLocalStaff: true, encryptedRefreshToken: 'rt3', lastUsedAt: '2024-01-15T00:00:00Z' },
      { userId: 'u4', username: 'user4', name: '陳行政', role: 'admin' as const, isLocalStaff: true, encryptedRefreshToken: 'rt4', lastUsedAt: '2024-01-15T00:00:00Z' },
      { userId: 'u5', username: 'user5', name: '劉工程', role: 'sysadmin' as const, isLocalStaff: true, encryptedRefreshToken: 'rt5', lastUsedAt: '2024-01-15T00:00:00Z' },
      { userId: 'u6', username: 'user6', name: '林備用', role: 'caregiver' as const, isLocalStaff: true, encryptedRefreshToken: 'rt6', lastUsedAt: '2024-01-15T00:00:00Z' },
    ];

    useAuthStore.setState({
      user: {
        userId: 'u-current',
        username: 'curr',
        name: '當前使用者',
        role: 'caregiver',
        isLocalStaff: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      switchableUsers: mockUsers,
    });

    // Setup an active form on the page
    document.body.innerHTML = `
      <form data-entity="residents" data-entity-id="new">
        <input name="residentName" value="陳爺爺" />
      </form>
    `;

    vi.spyOn(apiClient, 'post').mockResolvedValue({
      success: true,
      data: {
        accessToken: 'token-new',
        expiresIn: 3600,
        user: { userId: 'u1', username: 'user1', name: '王照服', role: 'caregiver', isLocalStaff: true, createdAt: '2024-01-01T00:00:00Z' },
        switchableUsers: mockUsers,
      },
    });

    render(<UserSwitcher />);

    // Open dropdown
    const toggleButton = screen.getByRole('button', { name: /切換使用者/i });
    fireEvent.click(toggleButton);

    // Verify at most 5 users displayed in dropdown
    const userButtons = screen.getAllByRole('menuitem');
    // Last button is Logout, so switchable users are userButtons.length - 1
    expect(userButtons.length - 1).toBe(5);

    // Click the first user to switch
    const firstButton = userButtons[0];
    expect(firstButton).toBeDefined();
    if (firstButton) {
      fireEvent.click(firstButton);
    }

    await waitFor(async () => {
      // Current user's draft should have been auto-saved to IndexedDB
      const draft = await getFormDraft('residents', 'new', 'u-current');
      expect(draft).toBeDefined();
      expect(draft?.formData.residentName).toBe('陳爺爺');
    });
  });
});
