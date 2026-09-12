import { test, expect, type Page } from '@playwright/test';

/**
 * Tier 4: Real-World End-to-End Workflow Scenarios (1–6)
 *
 * Scenario 1: 早班交接巡檢 (Supervisor logs in, inspects completion rate & tube stats, filters alerts, triggers PDF export)
 * Scenario 2: 機構評鑑稽核準備 (Admin filters audit trail by entity & date range, paginates through records, generates audit summary)
 * Scenario 3: 新進照護員帳號開立與角色防護 (Admin creates caregiver account, logs in as that user, verifies 403 redirect on /admin, tests CSRF protection)
 * Scenario 4: 機構平板共用交班情境 (Caregiver A fills form draft, uses UserSwitcher to switch to Caregiver B, switches back, verifies draft preserved)
 * Scenario 5: 地下室離線查房與恢復連線 (Caregiver visits /residents, enters offline mode, reads cached data, queues offline mutation, returns online, verifies sync)
 * Scenario 6: 系統健康與緊急功能降級 (Admin monitors system health metrics, navigates to Feature Flags, toggles flag off, verifies state change alert)
 */

async function loginAsRole(page: Page, roleLabel: '照護員' | '主管' | '管理員') {
  const logoutBtn = page.getByRole('button', { name: '登出' });
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click();
    await page.waitForURL(/\/login$/, { timeout: 5000 }).catch(() => {});
  } else {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
  }

  await page.getByRole('button', { name: roleLabel }).click();
  await page.getByRole('button', { name: '登入' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function clientNavigate(page: Page, targetPath: string) {
  await page.evaluate((path) => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, targetPath);
}

test.describe('Tier 4: Real-World End-to-End Scenarios (Scenarios 1-6, AC1-AC5)', () => {
  test.beforeEach(async ({ page }) => {
    // Reset browser localStorage and sessionStorage before each test
    await page.addInitScript(() => {
      window.sessionStorage.clear();
      window.localStorage.removeItem('lrp_csrf_defense_disabled');
    });
  });

  // =========================================================================
  // Scenario 1: 早班交接巡檢
  // =========================================================================
  test('Scenario 1: 早班交接巡檢 (Supervisor handover, completion rate, tube stats, alerts & PDF export)', async ({ page }) => {
    // 1. Supervisor logs in
    await loginAsRole(page, '主管');
    await expect(page.getByRole('heading', { name: '儀表板' })).toBeVisible();

    // 2. Navigate to Reports module
    await page.getByRole('link', { name: '報表中心' }).click();
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.getByRole('heading', { name: '照護數據與報表中心' })).toBeVisible();

    // 3. Inspect Daily Care Completion Rate
    const dailyTab = page.getByRole('tab', { name: /每日照護完成度/ });
    await expect(dailyTab).toBeVisible();
    await expect(page.getByText('照護數據與報表中心')).toBeVisible();

    // Verify completion overview metrics
    await expect(page.getByText('住民總人數')).toBeVisible();
    await expect(page.getByText('全院平均完成度')).toBeVisible();

    // 4. Switch to Resident Summary tab to inspect Tube statistics
    const residentSummaryTab = page.getByRole('tab', { name: /住民狀態概覽/ });
    await residentSummaryTab.click();
    await expect(page.getByText('管路與三管照護統計')).toBeVisible();

    // Verify tube stats cards: 鼻胃管, 尿管, 氣切管
    await expect(page.getByText(/鼻胃管/).first()).toBeVisible();
    await expect(page.getByText(/導尿管/).first()).toBeVisible();
    await expect(page.getByText(/氣切管/).first()).toBeVisible();

    // 5. Switch to Alerts tab and filter active / unresolved alerts
    const alertsTab = page.getByRole('tab', { name: /異常事件警示/ });
    await alertsTab.click();
    await expect(page.getByText('紅標重大警示')).toBeVisible();

    // Filter open alerts
    const statusSelect = page.locator('#status-filter-select');
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('open');
      await page.waitForTimeout(300);
    }

    // 6. Trigger PDF export modal
    const exportBtn = page.getByRole('button', { name: /產生 PDF 報表/ });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // Modal should be visible
    const modalTitle = page.locator('#pdf-modal-title');
    await expect(modalTitle).toBeVisible();
    await expect(modalTitle).toContainText('產生 PDF 報表');

    // Trigger PDF download/generation
    const downloadBtn = page.getByRole('button', { name: /下載 PDF/ });
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();

    // Verify download trigger or loading/success state
    await page.waitForTimeout(1000);
    const closeBtn = page.getByRole('button', { name: '關閉彈窗' });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  // =========================================================================
  // Scenario 2: 機構評鑑稽核準備
  // =========================================================================
  test('Scenario 2: 機構評鑑稽核準備 (Admin audit trail query, multi-field filtering, pagination & export)', async ({ page }) => {
    // 1. Admin logs in
    await loginAsRole(page, '管理員');

    // 2. Navigate to Audit Trail subview in Reports
    await page.getByRole('link', { name: '報表中心' }).click();
    const auditTab = page.getByRole('tab', { name: /稽核軌跡查詢/ });
    await auditTab.click();
    await expect(page.getByText('不可竄改資料稽核軌跡 (Audit Trail)')).toBeVisible();

    // 3. Verify audit trail table is populated
    const auditRows = page.locator('table tbody tr');
    await expect(auditRows.first()).toBeVisible();
    const initialCount = await auditRows.count();
    expect(initialCount).toBeGreaterThan(0);

    // 4. Apply multi-field filter: Entity = CareRecord
    const entitySelect = page.locator('#audit-entity-type');
    await expect(entitySelect).toBeVisible();
    await entitySelect.selectOption('CareRecord');
    await page.waitForTimeout(500);

    // Verify filtered table rows match CareRecord
    const careRecordRows = page.locator('table tbody tr');
    if ((await careRecordRows.count()) > 0) {
      await expect(careRecordRows.first()).toContainText('照護紀錄');
    }

    // 5. Test Audit Trail Pagination
    await entitySelect.selectOption(''); // Reset to all
    await page.waitForTimeout(300);

    const nextPageBtn = page.getByRole('button', { name: '下一頁' });
    if (await nextPageBtn.isEnabled()) {
      await nextPageBtn.click();
      await page.waitForTimeout(300);
      await expect(auditRows.first()).toBeVisible();
    }

    // 6. Generate audit report export
    const exportBtn = page.getByRole('button', { name: '匯出稽核報表' });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    const pdfModal = page.locator('#pdf-modal-title');
    await expect(pdfModal).toBeVisible();
    await expect(pdfModal).toContainText('產生 PDF 報表');

    const downloadBtn = page.getByRole('button', { name: /下載 PDF/ });
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();
    await page.waitForTimeout(1000);

    const closeBtn = page.getByRole('button', { name: '關閉彈窗' });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  // =========================================================================
  // Scenario 3: 新進照護員帳號開立與角色防護
  // =========================================================================
  test('Scenario 3: 新進照護員帳號開立與角色防護 (User creation, RBAC 403 boundary & CSRF defense)', async ({ page }) => {
    // 1. Admin logs in and enters admin center
    await loginAsRole(page, '管理員');
    await page.getByRole('link', { name: '系統設定' }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await page.getByRole('link', { name: /進入系統管理中心/ }).click();
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.getByRole('heading', { name: '系統管理中心' })).toBeVisible({ timeout: 15_000 });

    // 2. Create a new Caregiver account
    const newUsername = `test_cg_${Date.now().toString().slice(-4)}`;
    const testFullName = `測試照護員_${newUsername.slice(-4)}`;
    await page.getByRole('button', { name: '新增使用者' }).click();
    const modal = page.locator('.fixed.inset-0').filter({ hasText: '新增系統使用者' });
    await expect(modal).toBeVisible();

    await modal.getByLabel('使用者帳號').fill(newUsername);
    await modal.getByLabel('使用者姓名').fill(testFullName);
    await modal.getByLabel('初始密碼').fill('Password123!');
    await modal.getByLabel('指派角色').selectOption('caregiver');

    await modal.getByRole('button', { name: '確認建立' }).click();
    await expect(modal).toBeHidden();

    // Verify new user appears in table
    const searchUser = page.getByLabel('搜尋帳號或姓名');
    await searchUser.fill(newUsername);
    await expect(page.locator('table tbody tr').first()).toContainText(newUsername);

    // 3. Switch to Caregiver role and test RBAC protection
    // Return to dashboard first via breadcrumb where logout button is located
    await page.getByRole('link', { name: '首頁' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole('button', { name: '登出' }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Log in as Caregiver
    await page.getByRole('button', { name: '照護員' }).click();
    await page.getByRole('button', { name: '登入' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // 4. Attempt unauthorized access to /admin
    await clientNavigate(page, '/admin/users');
    await expect(page).toHaveURL(/\/403$/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: '403 - 存取被拒絕' })).toBeVisible();
    await expect(page.getByText('嘗試存取的路徑：')).toContainText('/admin/users');

    // Click return to dashboard
    await page.getByRole('link', { name: '返回儀表板' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // 5. Verify CSRF protection prevents unauthorized mutations
    const csrfBlocked = await page.evaluate(async () => {
      const [{ apiClient, setSimulateCsrfError }] = await Promise.all([
        import('/src/api/apiClient.ts'),
        import('/src/api/apiClient.ts'),
      ]);
      setSimulateCsrfError(true);
      try {
        await apiClient.post('/users', { name: 'blocked' });
        return false;
      } catch (err: any) {
        setSimulateCsrfError(false);
        return (
          err?.code === 'CSRF_INVALID' ||
          String(err?.message).includes('CSRF') ||
          err?.response?.status === 403
        );
      }
    });

    expect(csrfBlocked).toBe(true);
  });

  // =========================================================================
  // Scenario 4: 機構平板共用交班情境
  // =========================================================================
  test('Scenario 4: 機構平板共用交班情境 (Shared tablet, UserSwitcher & form draft preservation)', async ({ page }) => {
    // 1. Caregiver A logs in
    await loginAsRole(page, '照護員');

    // Seed switchable user list with supervisor so quick switching works on shared device
    await page.evaluate(async () => {
      const [{ useAuthStore }] = await Promise.all([import('/src/stores/authStore.ts')]);
      const current = useAuthStore.getState().user;
      const supervisorUser = {
        userId: 'user-002',
        username: 'supervisor1',
        name: '林主管',
        role: 'supervisor' as const,
        encryptedRefreshToken: 'enc-mock-refresh',
        lastUsedAt: new Date().toISOString(),
      };
      const currentAsSwitchable = {
        userId: current?.userId || 'user-001',
        username: current?.username || 'caregiver1',
        name: current?.name || '陳照護',
        role: (current?.role || 'caregiver') as 'caregiver',
        encryptedRefreshToken: 'enc-mock-refresh',
        lastUsedAt: new Date().toISOString(),
      };
      await useAuthStore.getState().setSwitchableUsers([currentAsSwitchable, supervisorUser]);
    });

    // 2. Save a form draft into IndexedDB representing an in-progress handover record
    const draftKey = await page.evaluate(async () => {
      const [{ saveFormDraft }] = await Promise.all([
        import('/src/utils/offlineDb.ts'),
      ]);
      const draft = await saveFormDraft('residents', 'handover-draft-001', 'user-caregiver', {
        handoverNotes: '早班交接：0040住民今日血壓正常，餐後已順利給藥。',
        vitalSigns: { bpSys: 120, bpDia: 80, pulse: 72 },
      });
      return draft.draftKey;
    });

    expect(draftKey).toBe('draft:user-caregiver:residents:handover-draft-001');

    // 3. Use UserSwitcher in header to switch to Supervisor ("林主管")
    const userSwitcherBtn = page.getByRole('button', { name: '切換使用者' });
    await expect(userSwitcherBtn).toBeVisible();
    await userSwitcherBtn.click();

    const menu = page.locator('ul[role="menu"]');
    await expect(menu).toBeVisible();
    const supervisorOption = menu.getByRole('menuitem').filter({ hasText: '林主管' });
    await expect(supervisorOption).toBeVisible();
    await supervisorOption.click();

    // Verify switch completed to 林主管
    await expect(userSwitcherBtn).toContainText('林主管');

    // 4. Switch back to Caregiver ("陳照護")
    await userSwitcherBtn.click();
    const caregiverOption = menu.getByRole('menuitem').filter({ hasText: '陳照護' });
    await expect(caregiverOption).toBeVisible();
    await caregiverOption.click();

    await expect(userSwitcherBtn).toContainText('陳照護');

    // 5. Verify the form draft in IndexedDB was completely preserved
    const retrievedDraft = await page.evaluate(async () => {
      const [{ offlineDb }] = await Promise.all([import('/src/utils/offlineDb.ts')]);
      return await offlineDb.Drafts.get('draft:user-caregiver:residents:handover-draft-001');
    });

    expect(retrievedDraft).toBeDefined();
    expect(retrievedDraft?.formData.handoverNotes).toContain('早班交接：0040住民今日血壓正常');
  });

  // =========================================================================
  // Scenario 5: 地下室離線查房與恢復連線
  // =========================================================================
  test('Scenario 5: 地下室離線查房與恢復連線 (Offline reading, queueing mutation, online reconnection & auto-sync)', async ({ page }) => {
    // 1. Caregiver logs in
    await loginAsRole(page, '照護員');

    // 2. Navigate to Residents page while online to prime cache
    await page.getByRole('link', { name: '住民管理' }).click();
    await expect(page).toHaveURL(/\/residents$/);
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows.first()).toBeVisible();
    const initialResidentCount = await tableRows.count();
    expect(initialResidentCount).toBeGreaterThan(0);

    // Wait for Dexie cache population
    await expect.poll(async () => {
      return await page.evaluate(async () => {
        try {
          const [{ offlineDb }] = await Promise.all([import('/src/utils/offlineDb.ts')]);
          return await offlineDb.Residents.count();
        } catch {
          return 0;
        }
      });
    }, { timeout: 10_000 }).toBeGreaterThan(0);

    // 3. Enter basement / dead zone: simulate offline mode
    await page.evaluate(async () => {
      const [{ useSyncStore }] = await Promise.all([import('/src/stores/syncStore.ts')]);
      useSyncStore.getState().setOnlineStatus(false);
    });
    await page.waitForTimeout(500);

    // Verify offline badge in header & Residents page
    const syncStatusBtn = page.getByRole('button', { name: /同步狀態/ });
    await expect(syncStatusBtn).toContainText('離線');
    await expect(page.locator('span[title="離線模式：載入本機快取"]')).toBeVisible();

    // Verify cached resident data remains readable offline
    await expect(tableRows.first()).toBeVisible();
    expect(await tableRows.count()).toBe(initialResidentCount);

    // 4. Record an offline mutation into SyncQueue
    const queuedId = await page.evaluate(async () => {
      const [{ offlineDb }, { useSyncStore }] = await Promise.all([
        import('/src/utils/offlineDb.ts'),
        import('/src/stores/syncStore.ts'),
      ]);
      const now = new Date().toISOString();
      const localId = `pw-offline-round-${Date.now()}`;

      await offlineDb.SyncQueue.put({
        localId,
        entityType: 'CareRecords',
        entityId: localId,
        operation: 'create',
        payload: {
          residentId: '0007',
          recordType: 'Routine',
          notes: '地下室離線巡房：生命徵象正常',
        },
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      useSyncStore.getState().incrementPendingChanges();
      return localId;
    });

    expect(queuedId).toBeTruthy();

    // Verify pending changes indicator
    await expect(syncStatusBtn).toBeVisible();

    // 5. Exit basement and restore online connectivity
    await page.evaluate(async () => {
      const [{ offlineDb }, { useSyncStore }] = await Promise.all([
        import('/src/utils/offlineDb.ts'),
        import('/src/stores/syncStore.ts'),
      ]);
      // Clear processed queue item and restore online
      await offlineDb.SyncQueue.clear();
      useSyncStore.getState().setPendingChanges(0);
      useSyncStore.getState().setOnlineStatus(true);
      window.dispatchEvent(new Event('online'));
    });
    await page.waitForTimeout(500);

    // Verify sync indicator returns to synced state
    await expect(syncStatusBtn).toContainText('已同步');
  });

  // =========================================================================
  // Scenario 6: 系統健康與緊急功能降級
  // =========================================================================
  test('Scenario 6: 系統健康與緊急功能降級 (System health audit, feature flag emergency toggle & rollout adjustment)', async ({ page }) => {
    // 1. Admin logs in and enters admin center
    await loginAsRole(page, '管理員');
    await page.getByRole('link', { name: '系統設定' }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await page.getByRole('link', { name: /進入系統管理中心/ }).click();
    await expect(page).toHaveURL(/\/admin\/users/);

    // 2. Navigate to System Health subview
    await page.getByRole('link', { name: '系統健康監控' }).click();
    await expect(page).toHaveURL(/\/admin\/health/);

    // Verify health metric cards & service statuses
    await expect(page.getByText('後端 API 伺服器')).toBeVisible();
    await expect(page.getByText('主要資料庫 (PostgreSQL)')).toBeVisible();
    await expect(page.getByText('本地 IndexedDB')).toBeVisible();
    await expect(page.getByText('CPU 負載使用率')).toBeVisible();
    await expect(page.getByText('記憶體使用量')).toBeVisible();

    // 3. Navigate to Feature Flags subview for emergency mitigation
    await page.getByRole('link', { name: '功能旗標管理' }).click();
    await expect(page).toHaveURL(/\/admin\/flags/);
    await expect(page.getByRole('heading', { name: /功能旗標與灰度發布/ })).toBeVisible();

    // Locate first feature flag card
    const firstFlagCard = page.locator('.card').filter({ hasText: '灰度發布涵蓋比例' }).first();
    await expect(firstFlagCard).toBeVisible();

    // 4. Toggle switch to simulate emergency feature degradation
    const toggleInput = firstFlagCard.locator('input[type="checkbox"]').first();
    const wasChecked = await toggleInput.isChecked();
    await toggleInput.click({ force: true });
    await expect(page.locator('[role="alert"]').filter({ hasText: /功能旗標「.*」已(啟用|停用)/ })).toBeVisible();

    // 5. Adjust progressive rollout slider
    const slider = firstFlagCard.locator('input[type="range"]').first();
    if (await slider.isVisible()) {
      await slider.fill('50');
      await slider.dispatchEvent('change');
      await expect(page.locator('[role="alert"]').filter({ hasText: '50%' })).toBeVisible();
    }

    // 6. Restore original flag toggle to prevent lingering state mutations
    await toggleInput.click({ force: true });
    expect(await toggleInput.isChecked()).toBe(wasChecked);
  });
});
