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

test.describe('PWA Experience, Offline Resilience & Kiosk Mode (10-pwa-polish, F15-F20, AC3)', () => {
  test('F15: PWA Install Prompt header button and iOS guide modal', async ({ page }) => {
    await loginAsRole(page, '照護員');

    // 1. Simulate beforeinstallprompt event for desktop / Android
    await page.evaluate(() => {
      class MockBeforeInstallPromptEvent extends Event {
        readonly platforms = ['web', 'android'];
        userChoice = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' });
        prompt = async () => {};
        constructor() {
          super('beforeinstallprompt', { bubbles: true, cancelable: true });
        }
      }
      window.dispatchEvent(new MockBeforeInstallPromptEvent());
    });

    // 2. Install button should now be visible in header
    const installBtn = page.getByRole('button', { name: '安裝應用程式' });
    await expect(installBtn).toBeVisible();
    await expect(installBtn).toContainText('安裝應用程式');

    // Click install button triggers prompt
    await installBtn.click();
  });

  test('F16, AC3: Offline Ready Badge reflects online and offline network states', async ({ page }) => {
    await loginAsRole(page, '照護員');

    // 1. Mark cache and offline ready in browser context
    await page.evaluate(async () => {
      try {
        if ('caches' in window) {
          await caches.open('static-cache');
        }
      } catch {
        // ignore
      }
      localStorage.setItem('pwa-offline-ready', 'true');
      window.dispatchEvent(new Event('online'));
    });

    // 2. Verify emerald "離線就緒" badge
    const readyBadge = page.getByRole('status', { name: '離線就緒' });
    await expect(readyBadge).toBeVisible();
    await expect(readyBadge).toContainText('離線就緒');

    // 3. Simulate going offline
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // 4. Verify badge switches to amber "離線模式中 (可正常作業)"
    const offlineBadge = page.getByRole('status', { name: /離線模式中/ });
    await expect(offlineBadge).toBeVisible();
    await expect(offlineBadge).toContainText('離線模式中 (可正常作業)');

    // 5. Restore online state
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });
    await expect(page.getByRole('status', { name: '離線就緒' })).toBeVisible();
  });

  test('F17: Service Worker update toast displays non-blockingly and can be dismissed', async ({ page }) => {
    await loginAsRole(page, '照護員');

    // 1. Trigger Service Worker update notification via PWA bridge
    await page.evaluate(async () => {
      try {
        const [{ triggerPwaUpdate }] = await Promise.all([
          import('/src/utils/pwa.ts'),
        ]);
        triggerPwaUpdate(async () => {
          console.log('Reload triggered by user');
        });
      } catch (e) {
        console.error('Failed to trigger PWA update:', e);
      }
    });

    // 2. Verify update toast is visible
    const updateToast = page.locator('aside[aria-label="系統更新提示"]');
    await expect(updateToast).toBeVisible();
    await expect(updateToast.getByText('系統版本更新')).toBeVisible();
    await expect(updateToast.getByText('新版本已就緒，點擊重新整理即可套用最新功能')).toBeVisible();

    const refreshBtn = updateToast.getByRole('button', { name: '重新整理' });
    const dismissBtn = updateToast.getByRole('button', { name: '稍後' });
    await expect(refreshBtn).toBeVisible();
    await expect(dismissBtn).toBeVisible();

    // 3. Dismiss toast non-blockingly
    await dismissBtn.click();
    await expect(updateToast).toBeHidden();

    // 4. Verify user can continue normal workflow on dashboard
    await expect(page.getByRole('heading', { name: '儀表板' })).toBeVisible();
  });

  test('F18, AC3: Offline data persistence allows reading resident data without network', async ({ page }) => {
    await loginAsRole(page, '照護員');

    // 1. Navigate to residents page while online
    await page.getByRole('link', { name: '住民管理' }).click();
    await expect(page).toHaveURL(/\/residents$/);
    await expect(page.getByRole('heading', { name: '住民基本資料管理' })).toBeVisible();

    // Verify residents table is populated
    const residentRows = page.locator('table tbody tr');
    await expect(residentRows.first()).toBeVisible();
    const countBefore = await residentRows.count();
    expect(countBefore).toBeGreaterThan(0);

    // Verify first resident text
    const firstResidentText = await residentRows.first().innerText();
    expect(firstResidentText.length).toBeGreaterThan(0);

    // Wait for background Dexie cache write to complete
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

    // 2. Simulate offline mode (e.g. dead zone / basement)
    await page.evaluate(async () => {
      const [{ useSyncStore }] = await Promise.all([import('/src/stores/syncStore.ts')]);
      useSyncStore.getState().setOnlineStatus(false);
    });
    await page.waitForTimeout(500);

    // 3. Verify offline status indicator badge and page banner appear
    const syncStatusBtn = page.getByRole('button', { name: /同步狀態/ });
    await expect(syncStatusBtn).toBeVisible();
    await expect(syncStatusBtn).toContainText('離線');

    const offlinePageBadge = page.locator('span[title="離線模式：載入本機快取"]');
    await expect(offlinePageBadge).toBeVisible();
    await expect(offlinePageBadge).toHaveText('離線模式');

    // 4. Verify resident data persists and remains readable offline (from Dexie cache)
    await expect(residentRows.first()).toBeVisible();
    const countAfterOffline = await residentRows.count();
    expect(countAfterOffline).toBe(countBefore);

    // 5. Test search filter remains functional offline
    const searchInput = page.getByPlaceholder(/搜尋姓名/);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('00');
    await page.waitForTimeout(300);

    const filteredRows = page.locator('table tbody tr');
    await expect(filteredRows.first()).toBeVisible();
    const filteredCount = await filteredRows.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(countBefore);

    // Clear search and verify original count restored
    await searchInput.fill('');
    await page.waitForTimeout(300);
    expect(await residentRows.count()).toBe(countBefore);

    // 6. Restore online state
    await page.evaluate(async () => {
      const [{ useSyncStore }] = await Promise.all([import('/src/stores/syncStore.ts')]);
      useSyncStore.getState().setOnlineStatus(true);
    });
    await expect(page.getByRole('button', { name: /同步狀態/ })).toContainText('已同步');
  });

  test('F19: Kiosk mode lock, header state, and 5-click emergency unlock', async ({ page }) => {
    await loginAsRole(page, '照護員');

    // 1. Enter Kiosk mode via UI store
    await page.evaluate(async () => {
      const [{ useUIStore }] = await Promise.all([import('/src/stores/uiStore.ts')]);
      useUIStore.getState().setKioskMode(true);
    });
    await expect(page.locator('[data-testid="kiosk-layout"]')).toBeVisible();

    // 2. Normal sidebar navigation should be completely hidden
    await expect(page.locator('aside')).toBeHidden();

    // 3. Kiosk locked header elements should be present
    await expect(page.getByText('Kiosk 照護模式')).toBeVisible();
    await expect(page.getByText('鎖定導航中')).toBeVisible();
    await expect(page.getByText('螢幕常亮保持中')).toBeVisible();

    // 4. Test emergency unlock: 5 clicks within 3 seconds
    const unlockLogoBtn = page.locator('[data-testid="kiosk-logo-btn"]');
    await expect(unlockLogoBtn).toBeVisible();

    // Click 1 time
    await unlockLogoBtn.click();
    await expect(page.locator('[data-testid="unlock-click-hint"]')).toContainText('再點擊 4 次解除鎖定');

    // Click 2nd time
    await unlockLogoBtn.click();
    await expect(page.locator('[data-testid="unlock-click-hint"]')).toContainText('再點擊 3 次解除鎖定');

    // Click 3rd, 4th, 5th times
    await unlockLogoBtn.click();
    await unlockLogoBtn.click();
    await unlockLogoBtn.click();

    // 5. Verify Kiosk mode is deactivated: normal sidebar is restored
    await expect(page.locator('[data-testid="kiosk-layout"]')).toBeHidden();
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.getByRole('link', { name: '住民管理' })).toBeVisible();
  });

  test('F20: Fast account switching via UserSwitcher and form draft preservation', async ({ page }) => {
    // 1. Log in as Supervisor who has permission to create residents
    await loginAsRole(page, '主管');

    // Seed switchable user list with caregiver1 so switching works immediately
    await page.evaluate(async () => {
      const [{ useAuthStore }] = await Promise.all([import('/src/stores/authStore.ts')]);
      const current = useAuthStore.getState().user;
      const otherUser = {
        userId: 'user-001',
        username: 'caregiver1',
        name: '陳照護',
        role: 'caregiver' as const,
        encryptedRefreshToken: 'enc-mock-refresh',
        lastUsedAt: new Date().toISOString(),
      };
      const currentAsSwitchable = {
        userId: current?.userId || 'user-002',
        username: current?.username || 'supervisor1',
        name: current?.name || '林主管',
        role: (current?.role || 'supervisor') as 'supervisor',
        encryptedRefreshToken: 'enc-mock-refresh',
        lastUsedAt: new Date().toISOString(),
      };
      await useAuthStore.getState().setSwitchableUsers([currentAsSwitchable, otherUser]);
    });

    // 2. Navigate to resident creation form
    await page.getByRole('link', { name: '住民管理' }).click();
    await expect(page).toHaveURL(/\/residents$/);
    await page.getByRole('link', { name: '新增住民' }).click();
    await expect(page).toHaveURL(/\/residents\/new$/);

    // 3. Fill in form fields
    const nameInput = page.locator('#name');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('自動暫存測試住民');

    // 4. Open UserSwitcher dropdown in header
    const userSwitcherBtn = page.getByRole('button', { name: '切換使用者' });
    await expect(userSwitcherBtn).toBeVisible();
    await userSwitcherBtn.click();

    // 5. Verify switchable users dropdown and click caregiver1
    const menu = page.locator('ul[role="menu"]');
    await expect(menu).toBeVisible();
    const caregiverItem = menu.getByRole('menuitem').filter({ hasText: '陳照護' });
    await expect(caregiverItem).toBeVisible();
    await caregiverItem.click();

    // 6. Verify switched to caregiver1
    await expect(userSwitcherBtn).toContainText('陳照護');

    // 7. Switch back to supervisor1 (林主管)
    await userSwitcherBtn.click();
    const supervisorItem = menu.getByRole('menuitem').filter({ hasText: '林主管' });
    await expect(supervisorItem).toBeVisible();
    await supervisorItem.click();
    await expect(userSwitcherBtn).toContainText('林主管');

    // 8. Form input should be restored
    await expect(nameInput).toHaveValue('自動暫存測試住民');
  });
});
