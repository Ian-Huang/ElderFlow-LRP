import type {
  Medication,
  MedicationCreateInput,
  MedicationUpdateInput,
  MedicationAdministrationCreateInput,
  MedicationAdministration,
} from '@lrp/shared';
import { offlineDb } from '@/utils/offlineDb';
import apiClient from '@/api/apiClient';
import { createOfflineRepository, type BaseOfflineRepository, type RepositoryListParams } from './baseRepository';

export interface LowStockAlertsSummary {
  total: number;
  normalCount: number;
  runningLowCount: number;
  outOfStockCount: number;
  items: Medication[];
}

export interface MedicationListParams extends RepositoryListParams<Medication> {
  residentId?: string;
  status?: 'Active' | 'Discontinued' | 'OnHold';
  lowStockOnly?: boolean;
}

export interface MedicationRepository extends BaseOfflineRepository<Medication, MedicationCreateInput, MedicationUpdateInput> {
  list: (params?: MedicationListParams) => ReturnType<BaseOfflineRepository<Medication, MedicationCreateInput, MedicationUpdateInput>['list']>;
  administer: (
    payload: MedicationAdministrationCreateInput,
    options?: { isOnline?: boolean }
  ) => Promise<Medication>;
  getAlertSummary: (options?: { isOnline?: boolean }) => Promise<LowStockAlertsSummary>;
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
    });
  },

  async administer(payload, options = {}) {
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

    // Re-use baseRepo.update to guarantee localId consistency and avoid code duplication
    const updatedMed = await baseRepo.update(
      payload.medicationId,
      {
        medicationId: payload.medicationId,
        stockLevel: newStockLevel,
        lastAdministered: now,
        administrationHistory: [administrationEntry, ...(med.administrationHistory || [])],
        newAdministration: administrationEntry,
      } as unknown as MedicationUpdateInput,
      options
    );

    return updatedMed;
  },

  async getAlertSummary(options = {}) {
    const isOnline = options.isOnline ?? (typeof navigator !== 'undefined' ? navigator.onLine : true);

    if (isOnline) {
      try {
        const res = await apiClient.get<LowStockAlertsSummary>('/medications/alerts/low-stock');
        if (res.success && res.data) {
          return res.data;
        }
      } catch {
        // Fallback to offline evaluation
      }
    }

    const allMeds = ((await offlineDb.Medications.toArray()) as Medication[]) || [];
    const outOfStockItems = allMeds.filter((m) => m.stockLevel === 0);
    const runningLowItems = allMeds.filter((m) => m.stockLevel > 0 && m.stockLevel <= (m.reorderThreshold ?? 15));
    const normalItems = allMeds.filter((m) => m.stockLevel > (m.reorderThreshold ?? 15));
    const lowStockItems = [...outOfStockItems, ...runningLowItems];

    return {
      total: lowStockItems.length,
      normalCount: normalItems.length,
      runningLowCount: runningLowItems.length,
      outOfStockCount: outOfStockItems.length,
      items: lowStockItems,
    };
  },
};
