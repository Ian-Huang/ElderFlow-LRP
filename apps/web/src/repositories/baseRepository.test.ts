import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOfflineRepository, type BaseOfflineRepositoryConfig } from './baseRepository';
import { offlineDb } from '@/utils/offlineDb';
import apiClient from '@/api/apiClient';
import type { PaginatedResponse } from '@lrp/shared';

interface TestResource {
  residentId: string;
  name: string;
  status: 'Active' | 'Inactive';
  hasThreePipe: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TestCreateInput {
  name: string;
  status?: 'Active' | 'Inactive';
  hasThreePipe?: boolean;
}

interface TestUpdateInput extends Partial<TestCreateInput> {
  residentId: string;
}

const mockConfig: BaseOfflineRepositoryConfig<TestResource, TestCreateInput, TestUpdateInput> = {
  entityType: 'Residents',
  apiBasePath: '/residents',
  idField: 'residentId',
  searchFields: ['name', 'residentId'],
  table: offlineDb.Residents,
  toOptimisticEntity: (payload, localId, now) => ({
    residentId: localId,
    name: payload.name,
    status: payload.status || 'Active',
    hasThreePipe: payload.hasThreePipe || false,
    createdAt: now,
    updatedAt: now,
  }),
};

describe('BaseOfflineRepository', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await offlineDb.Residents.clear();
    await offlineDb.SyncQueue.clear();
  });

  it('list() should fetch from API and cache to Dexie when online', async () => {
    const mockApiResponse: PaginatedResponse<TestResource> = {
      items: [
        {
          residentId: 'res-101',
          name: '陳奶奶',
          status: 'Active',
          hasThreePipe: false,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: mockApiResponse,
    });

    const repo = createOfflineRepository<TestResource, TestCreateInput, TestUpdateInput>(mockConfig);
    const result = await repo.list({ isOnline: true });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe('陳奶奶');

    // Verify Dexie cache
    const cached = await offlineDb.Residents.get('res-101');
    expect(cached).toBeDefined();
    expect(cached?.name).toBe('陳奶奶');
    expect(cached?.syncStatus).toBe('synced');
  });

  it('list() should fall back to Dexie when offline and evaluate filters correctly', async () => {
    // Seed Dexie directly
    await offlineDb.Residents.bulkPut([
      {
        residentId: 'res-1',
        localId: 'res-1',
        name: '王伯伯',
        gender: 'Male',
        dateOfBirth: '1940-01-01',
        address: '台北市',
        insuranceId: 'A123',
        admissionDate: '2025-01-01',
        status: 'Active',
        hasThreePipe: true,
        syncStatus: 'synced',
        version: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        residentId: 'res-2',
        localId: 'res-2',
        name: '李媽媽',
        gender: 'Female',
        dateOfBirth: '1945-01-01',
        address: '新北市',
        insuranceId: 'F223',
        admissionDate: '2025-01-01',
        status: 'Inactive',
        hasThreePipe: false,
        syncStatus: 'synced',
        version: 1,
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      },
    ]);

    const repo = createOfflineRepository<TestResource, TestCreateInput, TestUpdateInput>(mockConfig);
    const result = await repo.list({
      isOnline: false,
      search: '王',
      filters: { status: 'Active' },
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe('王伯伯');
    expect(result.total).toBe(1);
  });

  it('getById() should fetch from API and cache to Dexie when online', async () => {
    const mockItem: TestResource = {
      residentId: 'res-202',
      name: '張爺爺',
      status: 'Active',
      hasThreePipe: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: mockItem,
    });

    const repo = createOfflineRepository<TestResource, TestCreateInput, TestUpdateInput>(mockConfig);
    const result = await repo.getById('res-202', { isOnline: true });

    expect(result).toBeDefined();
    expect(result?.name).toBe('張爺爺');

    const inDb = await offlineDb.Residents.get('res-202');
    expect(inDb).toBeDefined();
    expect(inDb?.name).toBe('張爺爺');
  });

  it('create() should perform optimistic write to Dexie and insert into SyncQueue', async () => {
    const repo = createOfflineRepository<TestResource, TestCreateInput, TestUpdateInput>(mockConfig);
    const created = await repo.create(
      {
        name: '趙伯伯',
        status: 'Active',
        hasThreePipe: true,
      },
      { isOnline: false }
    );

    expect(created.residentId).toBeDefined();
    expect(created.name).toBe('趙伯伯');

    // Verify Dexie entry
    const inDb = await offlineDb.Residents.get(String(created.residentId));
    expect(inDb).toBeDefined();
    expect(inDb?.syncStatus).toBe('pending');

    // Verify SyncQueue entry
    const queue = await offlineDb.SyncQueue.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.entityType).toBe('Residents');
    expect(queue[0]?.operation).toBe('create');
  });
});
