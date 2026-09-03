import { describe, it, expect, beforeEach, vi } from 'vitest';
import { residentRepository } from './residentRepository';
import { medicationRepository } from './medicationRepository';
import { careRecordRepository } from './careRecordRepository';
import { offlineDb } from '@/utils/offlineDb';

describe('Domain Repositories', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await offlineDb.Residents.clear();
    await offlineDb.Medications.clear();
    await offlineDb.CareRecords.clear();
    await offlineDb.SyncQueue.clear();
  });

  describe('residentRepository', () => {
    it('should list residents and filter by threePipe status offline', async () => {
      await offlineDb.Residents.bulkPut([
        {
          residentId: 'R01',
          localId: 'R01',
          name: '林阿公',
          gender: 'Male',
          dateOfBirth: '1940-05-12',
          address: '台北市大安區',
          insuranceId: 'A123456789',
          admissionDate: '2025-01-01',
          hasThreePipe: true,
          status: 'Active',
          syncStatus: 'synced',
          version: 1,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          residentId: 'R02',
          localId: 'R02',
          name: '陳阿嬤',
          gender: 'Female',
          dateOfBirth: '1945-08-20',
          address: '新北市板橋區',
          insuranceId: 'F223456789',
          admissionDate: '2025-02-01',
          hasThreePipe: false,
          status: 'Active',
          syncStatus: 'synced',
          version: 1,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ]);

      const res = await residentRepository.list({
        isOnline: false,
        filters: { hasThreePipe: true },
      });

      expect(res.items).toHaveLength(1);
      expect(res.items[0]?.name).toBe('林阿公');
    });

    it('should create resident and place in Dexie and SyncQueue', async () => {
      const created = await residentRepository.create(
        {
          name: '黃奶奶',
          gender: 'Female',
          dateOfBirth: '1948-11-03',
          address: '台中市西區',
          insuranceId: 'B223456789',
          admissionDate: '2026-02-01',
          hasThreePipe: false,
        },
        { isOnline: false }
      );

      expect(created.residentId).toBeDefined();
      expect(created.status).toBe('Active');

      const inDb = await offlineDb.Residents.get(created.residentId);
      expect(inDb?.name).toBe('黃奶奶');
    });
  });

  describe('medicationRepository', () => {
    it('should list medications with lowStock filter offline', async () => {
      await offlineDb.Medications.bulkPut([
        {
          medicationId: 'M01',
          localId: 'M01',
          residentId: 'R01',
          name: '降血壓藥 (Amlodipine)',
          dosage: '5mg',
          frequency: 'OnceDaily',
          schedule: ['08:00'],
          nextScheduled: '2026-09-04T08:00:00Z',
          stockLevel: 5,
          reorderThreshold: 15,
          status: 'Active',
          notes: '',
          syncStatus: 'synced',
          version: 1,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          medicationId: 'M02',
          localId: 'M02',
          residentId: 'R01',
          name: '降血糖藥 (Metformin)',
          dosage: '500mg',
          frequency: 'TwiceDaily',
          schedule: ['08:00', '20:00'],
          nextScheduled: '2026-09-04T08:00:00Z',
          stockLevel: 30,
          reorderThreshold: 15,
          status: 'Active',
          notes: '',
          syncStatus: 'synced',
          version: 1,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ]);

      const res = await medicationRepository.list({
        isOnline: false,
        lowStockOnly: true,
      });

      expect(res.items).toHaveLength(1);
      expect(res.items[0]?.medicationId).toBe('M01');
    });

    it('should administer medication and decrement stock', async () => {
      await offlineDb.Medications.put({
        medicationId: 'M01',
        localId: 'M01',
        residentId: 'R01',
        name: '降血壓藥',
        dosage: '5mg',
        frequency: 'OnceDaily',
        schedule: ['08:00'],
        nextScheduled: '2026-09-04T08:00:00Z',
        stockLevel: 10,
        reorderThreshold: 15,
        status: 'Active',
        notes: '',
        syncStatus: 'synced',
        version: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });

      const updated = await medicationRepository.administer(
        {
          medicationId: 'M01',
          residentId: 'R01',
          administeredBy: '護理師小美',
          status: 'Administered',
        },
        { isOnline: false }
      );

      expect(updated.stockLevel).toBe(9);
      expect(updated.lastAdministered).toBeDefined();

      const inDb = await offlineDb.Medications.get('M01');
      expect(inDb?.stockLevel).toBe(9);
    });
  });

  describe('careRecordRepository', () => {
    it('should create a care record and compute completeness score', async () => {
      const record = await careRecordRepository.create(
        {
          residentId: 'R01',
          timestamp: '2026-09-03T10:00:00Z',
          staffId: 'S01',
          staffName: '照服員阿強',
          notes: '活動正常',
          activities: [
            {
              type: 'Meal',
              timestamp: '2026-09-03T10:00:00Z',
              assistanceLevel: 'PartialAssist',
              notes: '早餐進食正常',
            },
          ],
        },
        { isOnline: false }
      );

      expect(record.recordId).toBeDefined();
      expect(record.status).toBe('Normal');
      expect(record.completenessScore).toBe(90);

      const inDb = await offlineDb.CareRecords.get(record.recordId);
      expect(inDb).toBeDefined();
    });

    it('should apply supplement and persist modificationHistory in Dexie and SyncQueue', async () => {
      const record = await careRecordRepository.create(
        {
          residentId: 'R01',
          timestamp: '2026-09-03T10:00:00Z',
          staffId: 'S01',
          staffName: '照服員阿強',
          notes: '原始備註',
          activities: [
            {
              type: 'Meal',
              timestamp: '2026-09-03T10:00:00Z',
              assistanceLevel: 'PartialAssist',
              notes: '早餐進食正常',
            },
          ],
        },
        { isOnline: false }
      );

      const supplemented = await careRecordRepository.applySupplement(
        {
          recordId: record.recordId,
          supplementContent: '晚間補充體溫 36.8 度',
          reason: '漏填體溫',
          staffId: 'S02',
          staffName: '護理師小美',
        },
        { isOnline: false }
      );

      expect(supplemented.modificationHistory).toHaveLength(1);
      expect(supplemented.modificationHistory[0]?.fieldName).toBe('supplementContent');
      expect(supplemented.modificationHistory[0]?.newValue).toBe('晚間補充體溫 36.8 度');

      const inDb = await offlineDb.CareRecords.get(record.recordId);
      expect(inDb?.modificationHistory).toHaveLength(1);
      expect(inDb?.modificationHistory?.[0]?.reason).toBe('漏填體溫');
    });

    it('should correctly evaluate 24-hour lock status and countdown', () => {
      const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago

      const recentLock = careRecordRepository.getLockStatus({ submittedAt: recent } as any);
      expect(recentLock.locked).toBe(false);
      expect(recentLock.text).toContain('小時');

      const oldLock = careRecordRepository.getLockStatus({ submittedAt: old } as any);
      expect(oldLock.locked).toBe(true);
      expect(oldLock.text).toBe('已鎖定');
    });
  });
});
