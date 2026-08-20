import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { useSyncStore } from '@/stores/syncStore';

describe('SyncStatusIndicator', () => {
  beforeEach(() => {
    useSyncStore.setState({
      isOnline: true,
      isSyncing: false,
      lastSyncedAt: '2026-08-20T08:00:00.000Z',
      pendingChanges: 0,
      conflicts: [],
      syncErrors: [],
    });
  });

  it('shows synced state when no pending changes and conflicts', () => {
    render(
      <MemoryRouter>
        <SyncStatusIndicator />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: '同步狀態' })).toHaveTextContent('已同步');
  });

  it('shows pending state when there are pending changes', () => {
    useSyncStore.setState({ pendingChanges: 3, isSyncing: false });

    render(
      <MemoryRouter>
        <SyncStatusIndicator />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: '同步狀態' })).toHaveTextContent('待同步');
  });

  it('shows conflict state when there are pending conflicts', () => {
    useSyncStore.setState({
      conflicts: [
        {
          conflictId: 'SC-001',
          recordId: 'CR-001',
          recordType: 'CareRecord',
          localData: {},
          serverData: {},
          conflictType: 'FieldLevel',
          conflictingFields: ['vitals'],
          status: 'Pending',
          createdAt: '2026-08-20T08:00:00.000Z',
          isCritical: true,
        },
      ],
    });

    render(
      <MemoryRouter>
        <SyncStatusIndicator />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: '同步狀態' })).toHaveTextContent('衝突中');
  });

  it('shows offline state when offline', () => {
    useSyncStore.setState({ isOnline: false });

    render(
      <MemoryRouter>
        <SyncStatusIndicator />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: '同步狀態' })).toHaveTextContent('離線');
  });
});
