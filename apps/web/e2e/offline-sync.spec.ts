import { test, expect } from '@playwright/test';

async function loginAsCaregiver(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: '照護員' }).click();
  await page.getByRole('button', { name: '登入' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('offline queue then online auto-sync', async ({ page, context }) => {
  await loginAsCaregiver(page);

  await context.setOffline(true);

  const localId = await page.evaluate(async () => {
    const [{ offlineDb }] = await Promise.all([
      import('/src/utils/offlineDb.ts'),
    ]);

    const now = new Date().toISOString();
    const localId = `pw-local-${Date.now()}`;

    await offlineDb.Residents.put({
      localId,
      residentId: `RES-${Date.now()}`,
      name: 'E2E 離線住民',
      gender: 'Male',
      dateOfBirth: '1950-01-01',
      address: '台北市',
      insuranceId: `A${Math.floor(Math.random() * 1_000_000_000)
        .toString()
        .padStart(9, '0')}`,
      diagnosis: '離線測試',
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
      entityId: localId,
      operation: 'create',
      payload: {
        residentId: localId,
        name: 'E2E 離線住民',
      },
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    window.dispatchEvent(new Event('offline'));
    return localId;
  });

  await expect.poll(async () => {
    return await page.evaluate(async () => {
      const [{ offlineDb }] = await Promise.all([import('/src/utils/offlineDb.ts')]);
      return offlineDb.SyncQueue.count();
    });
  }).toBe(1);

  await context.setOffline(false);

  await page.evaluate(() => {
    window.dispatchEvent(new Event('online'));
  });

  await expect.poll(async () => {
    return await page.evaluate(async () => {
      const [{ offlineDb }] = await Promise.all([import('/src/utils/offlineDb.ts')]);
      return offlineDb.SyncQueue.count();
    });
  }).toBe(0);

  const synced = await page.evaluate(async (id) => {
    const [{ offlineDb }] = await Promise.all([import('/src/utils/offlineDb.ts')]);
    const resident = await offlineDb.Residents.get(id);
    return resident?.syncStatus;
  }, localId);

  expect(synced).toBe('synced');
});


test('critical conflict modal and resolve flow', async ({ page }) => {
  await loginAsCaregiver(page);

  await page.evaluate(async () => {
    const [{ offlineDb }, { triggerSyncNow }] = await Promise.all([
      import('/src/utils/offlineDb.ts'),
      import('/src/utils/syncEngine.ts'),
    ]);

    const now = new Date().toISOString();
    const localId = `pw-conflict-${Date.now()}`;

    await offlineDb.CareRecords.put({
      localId,
      recordId: localId,
      residentId: 'RES-001',
      timestamp: now,
      activities: [],
      staffId: 'user-001',
      staffName: 'E2E 測試員',
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
      entityId: localId,
      operation: 'update',
      payload: {
        recordId: localId,
        forceConflict: true,
      },
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await triggerSyncNow();
  });

  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await expect(modal.getByText('關鍵衝突必須先處理')).toBeVisible();

  await modal.getByRole('button', { name: '接受雲端' }).click();
  await expect(modal).toBeHidden();

  const pending = await page.evaluate(async () => {
    const [{ offlineDb }] = await Promise.all([import('/src/utils/offlineDb.ts')]);
    return offlineDb.SyncConflicts.where('status').equals('Pending').count();
  });

  expect(pending).toBe(0);
});
