import { test, expect, Page } from '@playwright/test';

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

async function loginAsAdmin(page: Page) {
  await loginAsRole(page, '管理員');
  await page.getByRole('link', { name: '系統設定' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.getByRole('link', { name: /進入系統管理中心/ }).click();
  await expect(page).toHaveURL(/\/admin\/users/);
  await expect(page.getByRole('heading', { name: '系統管理中心' })).toBeVisible({ timeout: 15_000 });
}

test.describe('System Admin & RBAC Security E2E Suite (09-system-admin-frontend, AC4)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      console.log(`[Admin E2E Browser ${msg.type()}]:`, msg.text());
    });
    page.on('pageerror', (err) => {
      console.log(`[Admin E2E Browser PageError]:`, err);
    });
  });

  test('F6, F13: Admin Layout rendering and smooth navigation across 5 subviews', async ({ page }) => {
    await loginAsAdmin(page);

    // 1. Users Management View (Default)
    await expect(page.getByRole('heading', { name: '系統管理中心' })).toBeVisible();
    await expect(page.getByRole('link', { name: '使用者管理' })).toHaveClass(/border-primary-600/);
    await expect(page.getByRole('heading', { name: /使用者名冊/ })).toBeVisible();

    // 2. Navigate to System Health View
    await page.getByRole('link', { name: '系統健康監控' }).click();
    await expect(page).toHaveURL(/\/admin\/health/);
    await expect(page.getByRole('link', { name: '系統健康監控' })).toHaveClass(/border-primary-600/);
    await expect(page.getByText('核心服務與底層模組狀態')).toBeVisible();

    // 3. Navigate to Feature Flags View
    await page.getByRole('link', { name: '功能旗標管理' }).click();
    await expect(page).toHaveURL(/\/admin\/flags/);
    await expect(page.getByRole('link', { name: '功能旗標管理' })).toHaveClass(/border-primary-600/);
    await expect(page.getByRole('heading', { name: /功能旗標與灰度發布/ })).toBeVisible();

    // 4. Navigate to Core Settings View
    await page.getByRole('link', { name: '核心參數設定' }).click();
    await expect(page).toHaveURL(/\/admin\/settings/);
    await expect(page.getByRole('link', { name: '核心參數設定' })).toHaveClass(/border-primary-600/);
    await expect(page.getByRole('heading', { name: '核心參數設定' })).toBeVisible();

    // 5. Navigate to Role Matrix View
    await page.getByRole('link', { name: '角色權限矩陣' }).click();
    await expect(page).toHaveURL(/\/admin\/matrix/);
    await expect(page.getByRole('link', { name: '角色權限矩陣' })).toHaveClass(/border-primary-600/);
    await expect(page.getByRole('heading', { name: /角色與功能權限矩陣/ })).toBeVisible();

    // Direct breadcrumb link back to dashboard
    await page.getByRole('link', { name: '首頁' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('F6, F7, F8: User Management search, create modal, inline role edit, status toggle, and sysadmin protection', async ({ page }) => {
    await loginAsAdmin(page);

    // 1. Search & Filter
    const searchInput = page.getByLabel('搜尋帳號或姓名');
    await searchInput.fill('王系統管理員');
    await expect(page.getByText('sysadmin1').first()).toBeVisible();

    // Clear search
    await searchInput.fill('');

    // Filter by role
    const roleSelect = page.getByLabel('依角色篩選');
    await roleSelect.selectOption('caregiver');
    await expect(page.getByText('caregiver1').first()).toBeVisible();
    await roleSelect.selectOption('');

    // 2. Create User Modal (F7)
    await page.getByRole('button', { name: '新增使用者' }).click();
    const modal = page.locator('.fixed.inset-0').filter({ hasText: '新增系統使用者' });
    await expect(modal).toBeVisible();

    const uniqueId = Date.now().toString().slice(-4);
    const testUsername = `user_${uniqueId}`;
    const testFullName = `測試員工_${uniqueId}`;

    await modal.getByLabel('使用者帳號').fill(testUsername);
    await modal.getByLabel('使用者姓名').fill(testFullName);
    await modal.getByLabel('初始密碼').fill('testpass123');
    await modal.getByLabel('指派角色').selectOption('caregiver');

    await modal.getByRole('button', { name: '確認建立' }).click();
    await expect(modal).toBeHidden();

    // Verify success alert
    await expect(page.locator('[role="alert"]').filter({ hasText: `使用者「${testFullName}」建立成功！` })).toBeVisible();

    // 3. Inline Role Modification (F8)
    const roleDropdown = page.getByLabel(`調整 ${testFullName} 角色`);
    if (await roleDropdown.isVisible()) {
      await roleDropdown.selectOption('supervisor');
      await expect(page.locator('[role="alert"]').filter({ hasText: '已成功將使用者身分調整為' })).toBeVisible();
    }

    // 4. User Status Toggle (F8)
    const statusBtn = page.getByLabel(`切換 ${testFullName} 帳號狀態`);
    if (await statusBtn.isVisible()) {
      await statusBtn.click();
      await expect(page.locator('[role="alert"]').filter({ hasText: '使用者狀態已切換為「停用」' })).toBeVisible();

      // Toggle back to active
      await statusBtn.click();
      await expect(page.locator('[role="alert"]').filter({ hasText: '使用者狀態已切換為「啟用」' })).toBeVisible();
    }

    // 5. Last Sysadmin Lockout Protection (F8)
    // Attempt to demote sysadmin1
    const sysadminRoleDropdown = page.getByLabel('調整 王系統管理員 角色');
    await sysadminRoleDropdown.selectOption('caregiver');
    await expect(page.locator('[role="alert"]').filter({ hasText: '無法調降最後一名管理員權限' })).toBeVisible();

    // Attempt to deactivate sysadmin1
    const sysadminStatusBtn = page.getByLabel('切換 王系統管理員 帳號狀態');
    await sysadminStatusBtn.click();
    await expect(page.locator('[role="alert"]').filter({ hasText: '無法停用最後一名管理員帳號' })).toBeVisible();
  });

  test('F9: System Health dashboard metrics and service status check', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: '系統健康監控' }).click();
    await expect(page).toHaveURL(/\/admin\/health/);

    // Verify system overall badge
    await expect(page.getByText(/系統健康 \(Healthy\)|服務降級 \(Degraded\)/)).toBeVisible();

    // Verify 4 services
    await expect(page.getByText('後端 API 伺服器')).toBeVisible();
    await expect(page.getByText('主要資料庫 (PostgreSQL)')).toBeVisible();
    await expect(page.getByText('Service Worker (PWA)')).toBeVisible();
    await expect(page.getByText('本地 IndexedDB')).toBeVisible();

    // Verify metrics section
    await expect(page.getByText('CPU 負載使用率')).toBeVisible();
    await expect(page.getByText('記憶體使用量')).toBeVisible();
    await expect(page.getByText('系統連續運行時間 (Uptime)')).toBeVisible();

    // Test refresh button
    const refreshBtn = page.getByLabel('立即檢測');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(page.getByText(/最後更新：/)).toBeVisible();
  });

  test('F10: Feature Flags toggle switch and progressive rollout slider', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: '功能旗標管理' }).click();
    await expect(page).toHaveURL(/\/admin\/flags/);

    await expect(page.getByRole('heading', { name: /功能旗標與灰度發布/ })).toBeVisible();

    // Verify at least one flag card
    const firstFlagCard = page.locator('.card').filter({ hasText: '灰度發布涵蓋比例' }).first();
    await expect(firstFlagCard).toBeVisible();

    // Toggle switch
    const toggleInput = firstFlagCard.locator('input[type="checkbox"]').first();
    const wasChecked = await toggleInput.isChecked();
    await toggleInput.click({ force: true });
    await expect(page.locator('[role="alert"]').filter({ hasText: /功能旗標「.*」已(啟用|停用)/ })).toBeVisible();

    // Toggle back to original
    await toggleInput.click({ force: true });
    expect(await toggleInput.isChecked()).toBe(wasChecked);

    // Slider test
    const slider = firstFlagCard.locator('input[type="range"]').first();
    await slider.fill('50');
    await slider.dispatchEvent('change');
    await expect(page.locator('[role="alert"]').filter({ hasText: '50%' })).toBeVisible();
  });

  test('F11: System Settings form persistence and validation', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: '核心參數設定' }).click();
    await expect(page).toHaveURL(/\/admin\/settings/);

    const syncIntervalInput = page.getByLabel('背景同步間隔');
    const lockDurationInput = page.getByLabel('記錄鎖定時長');
    const lowStockInput = page.getByLabel('低庫存警示閾值');
    const fontSelect = page.getByLabel('PDF 字體設定');

    await expect(syncIntervalInput).toBeVisible();
    await expect(lockDurationInput).toBeVisible();
    await expect(lowStockInput).toBeVisible();
    await expect(fontSelect).toBeVisible();

    // Update settings
    await syncIntervalInput.fill('45');
    await lockDurationInput.fill('36');
    await lowStockInput.fill('20');
    await fontSelect.selectOption('Noto Sans TC');

    await page.getByRole('button', { name: '儲存設定' }).click();

    // Expect success alert
    await expect(page.locator('[role="alert"]').filter({ hasText: '系統核心參數已成功更新並儲存！' })).toBeVisible();

    // Test validation boundary (<10 for sync interval)
    await syncIntervalInput.fill('5');
    await page.getByRole('button', { name: '儲存設定' }).click();
    await expect(page.getByText('背景同步間隔必須介於 10 至 300 秒之間')).toBeVisible();

    // Reset valid value
    await syncIntervalInput.fill('30');
    await page.getByRole('button', { name: '儲存設定' }).click();
    await expect(page.locator('[role="alert"]').filter({ hasText: '系統核心參數已成功更新並儲存！' })).toBeVisible();
  });

  test('F12: Role Matrix table renders 4-role permission hierarchy accurately', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: '角色權限矩陣' }).click();
    await expect(page).toHaveURL(/\/admin\/matrix/);

    await expect(page.getByRole('heading', { name: /角色與功能權限矩陣/ })).toBeVisible();

    // Verify 4 role headers in table
    const table = page.locator('table');
    await expect(table.locator('thead')).toContainText('照護員');
    await expect(table.locator('thead')).toContainText('主管');
    await expect(table.locator('thead')).toContainText('管理員');
    await expect(table.locator('thead')).toContainText('系統管理員');

    // Verify module entries exist
    await expect(table).toContainText('住民管理 (Residents)');
    await expect(table).toContainText('照護記錄 (Care Records)');
    await expect(table).toContainText('用藥管理 (Medications)');
    await expect(table).toContainText('報表中心 (Reports)');
    await expect(table).toContainText('系統管理中心 (Admin)');
  });

  test('AC4 Security: Non-admin users are automatically redirected to 403 Forbidden with security warning', async ({ page }) => {
    // 1. Caregiver attempts to access /admin/users
    await loginAsRole(page, '照護員');
    await page.evaluate(() => {
      window.history.pushState(null, '', '/admin/users');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page).toHaveURL(/\/403$/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: '403 - 存取被拒絕' })).toBeVisible();
    await expect(page.getByText('嘗試存取的路徑：')).toContainText('/admin/users');

    // Click "返回儀表板" from 403
    await page.getByRole('link', { name: '返回儀表板' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // 2. Supervisor attempts to access /admin/settings
    await loginAsRole(page, '主管');
    await page.evaluate(() => {
      window.history.pushState(null, '', '/admin/settings');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page).toHaveURL(/\/403$/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: '403 - 存取被拒絕' })).toBeVisible();
    await expect(page.getByText('嘗試存取的路徑：')).toContainText('/admin/settings');

    // 3. Click "返回儀表板" button again
    await page.getByRole('link', { name: '返回儀表板' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('AC4 Security: CSRF simulation toggle blocks mutations with HTTP 403 CSRF_INVALID', async ({ page }) => {
    await loginAsAdmin(page);

    // Turn ON CSRF simulation toggle
    const csrfToggle = page.locator('#csrf-simulate-toggle');
    await csrfToggle.click({ force: true });

    // Danger banner must be displayed in AdminLayout
    await expect(page.locator('text=/CSRF 驗證失敗模擬已開啟/')).toBeVisible();

    // Attempt mutation: change a user's role
    const testDropdown = page.locator('table tbody select').first();
    const currentVal = await testDropdown.inputValue();
    const nextVal = currentVal === 'caregiver' ? 'supervisor' : 'caregiver';

    await testDropdown.selectOption(nextVal);

    // Verify CSRF error banner
    await expect(page.locator('[role="alert"]').filter({ hasText: 'CSRF 驗證失敗 (403 Forbidden)' })).toBeVisible();

    // Attempt mutation on System Settings
    await page.getByRole('link', { name: '核心參數設定' }).click();
    await expect(page).toHaveURL(/\/admin\/settings/);
    await page.getByRole('button', { name: '儲存設定' }).click();
    await expect(page.locator('[role="alert"]').filter({ hasText: 'CSRF 驗證失敗 (403 Forbidden)' })).toBeVisible();

    // Turn OFF CSRF simulation toggle
    await csrfToggle.click({ force: true });
    await expect(page.locator('text=/CSRF 驗證失敗模擬已開啟/')).toBeHidden();
  });
});
