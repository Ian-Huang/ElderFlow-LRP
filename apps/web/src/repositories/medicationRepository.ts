import type {
  Medication,
  MedicationCreateInput,
  MedicationUpdateInput,
  MedicationAdministrationCreateInput,
  MedicationAdministration,
} from '@lrp/shared';
import { offlineDb } from '@/utils/offlineDb';
import { useSyncStore } from '@/stores/syncStore';
import { triggerSyncNow } from '@/utils/syncEngine';
import { createOfflineRepository, type BaseOfflineRepository, type RepositoryListParams } from './baseRepository';

export interface MedicationListParams extends RepositoryListParams<Medication> {
  residentId?: string;
  status?: string;
  lowStockOnly?: boolean;
}

export interface MedicationRepository extends BaseOfflineRepository<Medication, MedicationCreateInput, MedicationUpdateInput> {
  list: (params?: MedicationListParams) => ReturnType<BaseOfflineRepository<Medication, MedicationCreateInput, MedicationUpdateInput>['list']>;
  administer: (
    payload: MedicationAdministrationCreateInput,
    options?: { isOnline?: boolean }
  ) => Promise<Medication>;
}

const baseRepo = createOfflineRepository<Medication, MedicationCreateInput, MedicationUpdateInput>({
  entityType: 'Medications',
  apiBasePath: '/medications',
  idField: 'medicationId',
  searchFields: ['name', 'dosage', 'notes', 'residentName'],
  table: offlineDb.Medications,
  toOptimisticEntity: (payload, localId, now) => ({
    ...payload,
    medicationId: localId,
    reorderThreshold: payload.reorderThreshold ?? 15,
    status: payload.status || 'Active',
    nextScheduled: payload.schedule?.[0] ? `${now.split('T')[0]}T${payload.schedule[0]}:00Z` : now,
    notes: payload.notes || '',
    administrationHistory: [],
    createdAt: now,
    updatedAt: now,
  }),
  applyUpdateToOptimisticEntity: (current, payload, now) => ({
    ...current,
    ...payload,
    updatedAt: now,
  }),
});

export const medicationRepository: MedicationRepository = {
  ...baseRepo,

  async list(params = {}) {
    const filters: Record<string, unknown> = {
      ...(params.filters || {}),
    };

    if (params.residentId) filters.residentId = params.residentId;
    if (params.status) filters.status = params.status;

    return baseRepo.list({
      ...params,
      filters,
      customFilter: (item) => {
        if (params.lowStockOnly && item.stockLevel > item.reorderThreshold) {
          return false;
        }
        if (params.customFilter) {
          return params.customFilter(item);
        }
        return true;
      },
      extraQueryParams: {
        ...(params.extraQueryParams || {}),
        residentId: params.residentId,
        status: params.status,
        lowStock: params.lowStockOnly ? 'true' : undefined,
      },
    });
  },

  async administer(payload, options = {}) {
    const isOnline = options.isOnline ?? (typeof navigator !== 'undefined' ? navigator.onLine : true);
    const now = new Date().toISOString();
    const med = (await offlineDb.Medications.get(payload.medicationId)) as Medication | undefined;

    if (!med) {
      throw new Error('找不到指定的藥物紀錄');
    }

    const newStockLevel =
      payload.status === 'Administered' || !payload.status
        ? Math.max(0, med.stockLevel - 1)
        : med.stockLevel;

    const administrationEntry: MedicationAdministration = {
      administrationId: crypto.randomUUID(),
      medicationId: payload.medicationId,
      residentId: payload.residentId,
      scheduledTime: payload.scheduledTime || med.nextScheduled || now,
      actualTime: payload.actualTime || now,
      administeredBy: payload.administeredBy,
      status: payload.status || 'Administered',
      notes: payload.notes,
      createdAt: now,
    };

    const updatedMed: Medication = {
      ...med,
      stockLevel: newStockLevel,
      lastAdministered: now,
      administrationHistory: [administrationEntry, ...(med.administrationHistory || [])],
      updatedAt: now,
    };

    await offlineDb.Medications.put({
      ...updatedMed,
      localId: payload.medicationId,
      syncStatus: 'pending',
      version: 1,
    });

    await offlineDb.SyncQueue.put({
      localId: crypto.randomUUID(),
      entityType: 'Medications',
      entityId: payload.medicationId,
      operation: 'update',
      payload: {
        ...updatedMed,
        newAdministration: administrationEntry,
      },
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    useSyncStore.getState().incrementPendingChanges();

    if (isOnline) {
      void triggerSyncNow();
    }

    return updatedMed;
  },
};
