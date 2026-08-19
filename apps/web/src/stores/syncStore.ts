import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SyncConflict } from '@lrp/shared';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingChanges: number;
  conflicts: SyncConflict[];
  syncErrors: string[];

  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncedAt: (date: string) => void;
  incrementPendingChanges: () => void;
  decrementPendingChanges: () => void;
  setPendingChanges: (count: number) => void;
  addConflict: (conflict: SyncConflict) => void;
  updateConflict: (conflictId: string, updates: Partial<SyncConflict>) => void;
  removeConflict: (conflictId: string) => void;
  setConflicts: (conflicts: SyncConflict[]) => void;
  addSyncError: (error: string) => void;
  clearSyncErrors: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      isOnline: navigator.onLine,
      isSyncing: false,
      lastSyncedAt: null,
      pendingChanges: 0,
      conflicts: [],
      syncErrors: [],

      setOnlineStatus: (isOnline) => set({ isOnline }),
      setSyncing: (isSyncing) => set({ isSyncing }),
      setLastSyncedAt: (date) => set({ lastSyncedAt: date }),
      incrementPendingChanges: () => set((state) => ({ pendingChanges: state.pendingChanges + 1 })),
      decrementPendingChanges: () => set((state) => ({ pendingChanges: Math.max(0, state.pendingChanges - 1) })),
      setPendingChanges: (count) => set({ pendingChanges: count }),

      addConflict: (conflict) =>
        set((state) => ({
          conflicts: [...state.conflicts, conflict],
        })),

      updateConflict: (conflictId, updates) =>
        set((state) => ({
          conflicts: state.conflicts.map((c) =>
            c.conflictId === conflictId ? { ...c, ...updates } : c
          ),
        })),

      removeConflict: (conflictId) =>
        set((state) => ({
          conflicts: state.conflicts.filter((c) => c.conflictId !== conflictId),
        })),

      setConflicts: (conflicts) => set({ conflicts }),

      addSyncError: (error) =>
        set((state) => ({
          syncErrors: [...state.syncErrors, error].slice(-10), // Keep last 10
        })),

      clearSyncErrors: () => set({ syncErrors: [] }),
    }),
    {
      name: 'lrp-sync',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lastSyncedAt: state.lastSyncedAt,
        pendingChanges: state.pendingChanges,
        conflicts: state.conflicts,
      }),
    }
  )
);

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useSyncStore.getState().setOnlineStatus(true));
  window.addEventListener('offline', () => useSyncStore.getState().setOnlineStatus(false));
}