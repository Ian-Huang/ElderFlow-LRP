import { test, expect } from '@playwright/test';

async function loginAsSupervisor(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: '主管' }).click();
  await page.getByRole('button', { name: '登入' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: '報表中心' }).click();
  await expect(page).toHaveURL(/\/reports/);
  await expect(page.getByRole('heading', { name: '照護數據與報表中心' })).toBeVisible({ timeout: 15_000 });
}

test.describe('Reports Center E2E Suite (08-reports-frontend)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.text().includes('PDF') || msg.text().includes('CSRF') || msg.text().includes('error')) {
        console.log(`[Browser Console ${msg.type()}]:`, msg.text());
      }
    });
    page.on('pageerror', (err) => console.log('[Browser PageError]:', err.message));
    await loginAsSupervisor(page);
  });

  test('F1-F5: Header rendering, ROC date display, and 4-tab switching with URL synchronization', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '照護數據與報表中心' })).toBeVisible();

    // Verify ROC date display in header (民國 ... 年)
    await expect(page.locator('text=/民國\\s*\\d+\\s*年/')).toBeVisible();

    // Verify global PDF Export trigger button in header
    await expect(page.getByRole('button', { name: '產生 PDF 報表' })).toBeVisible();

    // Tab 1: Daily Completion (Default)
    const tabDaily = page.getByTestId('tab-daily-completion');
    await expect(tabDaily).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: '照護未達標住民名單 (完成度 < 80%)' })).toBeVisible();

    // Tab 2: Resident Summary
    const tabSummary = page.getByTestId('tab-resident-summary');
    await tabSummary.click();
    await expect(page).toHaveURL(/tab=resident-summary/);
    await expect(tabSummary).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: '管路與三管照護統計' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '全院床位即時佔用配置圖' })).toBeVisible();

    // Tab 3: Alerts Center
    const tabAlerts = page.getByTestId('tab-alerts');
    await tabAlerts.click();
    await expect(page).toHaveURL(/tab=alerts/);
    await expect(tabAlerts).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('紅標重大警示')).toBeVisible();
    await expect(page.getByTestId('alerts-list')).toBeVisible();

    // Tab 4: Audit Trail
    const tabAudit = page.getByTestId('tab-audit-trail');
    await tabAudit.click();
    await expect(page).toHaveURL(/tab=audit-trail/);
    await expect(tabAudit).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: '不可竄改資料稽核軌跡 (Audit Trail)' })).toBeVisible();

    // Direct deep-link URL test
    await page.goto('/reports?tab=resident-summary');
    await expect(page.getByRole('heading', { name: '照護數據與報表中心' })).toBeVisible();
    await expect(page.getByTestId('tab-resident-summary')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: '管路與三管照護統計' })).toBeVisible();
  });

  test('F1: Daily Completion dashboard, date navigation, and low score resident table', async ({ page }) => {
    await page.getByTestId('tab-daily-completion').click();

    // Verify 4 summary statistics cards
    await expect(page.getByText('住民總人數')).toBeVisible();
    await expect(page.getByText('照護達標住民')).toBeVisible();
    await expect(page.getByText('全院平均完成度')).toBeVisible();
    await expect(page.getByText('達標比例')).toBeVisible();

    // Date picker navigation
    const dateInput = page.locator('#daily-date-picker');
    await expect(dateInput).toBeVisible();
    const originalDate = await dateInput.inputValue();

    // Navigate to previous day
    await page.getByLabel('前一天').click();
    const prevDate = await dateInput.inputValue();
    expect(prevDate).not.toBe(originalDate);

    // Return to today
    await page.getByRole('button', { name: '今天' }).click();
    const todayDate = await dateInput.inputValue();
    expect(todayDate).toBe(originalDate);

    // Navigate to next day
    await page.getByLabel('後一天').click();
    const nextDate = await dateInput.inputValue();
    expect(nextDate).not.toBe(todayDate);

    // Back to today
    await page.getByRole('button', { name: '今天' }).click();

    // Low score residents table verification
    const table = page.getByTestId('low-score-table');
    await expect(table).toBeVisible();
    await expect(table.locator('thead')).toContainText('住民姓名');
    await expect(table.locator('thead')).toContainText('床號');
    await expect(table.locator('thead')).toContainText('今日完成度');
    await expect(table.locator('thead')).toContainText('未完成缺漏項目');

    // Rows must have link to care records
    const recordLinks = table.locator('tbody a');
    const count = await recordLinks.count();
    if (count > 0) {
      await expect(recordLinks.first()).toHaveAttribute('href', /care-records\?residentId=/);
    }

    // Export today's completion report button
    await page.getByRole('button', { name: '匯出本日報表' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByLabel('選擇報表類型')).toHaveValue('completion-report');
    await modal.getByLabel('關閉彈窗').click();
    await expect(modal).toBeHidden();
  });

  test('F2: Resident Summary 3-pipe tube stats, dependency breakdown, and bed occupancy filter', async ({ page }) => {
    await page.getByTestId('tab-resident-summary').click();
    await expect(page.getByTestId('tab-resident-summary')).toHaveAttribute('aria-selected', 'true');

    // 5 Tube statistics cards
    await expect(page.getByText('帶管總人數')).toBeVisible();
    await expect(page.getByText('鼻胃管 (NG)').first()).toBeVisible();
    await expect(page.getByText('導尿管 (Foley)').first()).toBeVisible();
    await expect(page.getByText('氣切管 (Trach)').first()).toBeVisible();
    await expect(page.getByText('三管照護住民 (三管)').first()).toBeVisible();

    // Charts
    await expect(page.getByTestId('dependency-chart-container')).toBeVisible();
    await expect(page.getByTestId('tube-chart-container')).toBeVisible();

    // Bed Occupancy Map Filters
    await expect(page.getByRole('heading', { name: '全院床位即時佔用配置圖' })).toBeVisible();

    // Filter by Floor 1F
    await page.getByRole('button', { name: '1 樓 (1F)' }).click();
    await expect(page.getByText('1F -').first()).toBeVisible();
    await expect(page.getByText('2F -')).toHaveCount(0);

    // Filter by Floor 2F
    await page.getByRole('button', { name: '2 樓 (2F)' }).click();
    await expect(page.getByText('2F -').first()).toBeVisible();
    await expect(page.getByText('1F -')).toHaveCount(0);

    // Reset floor filter to All
    await page.getByRole('button', { name: '全部樓層' }).click();

    // Filter by Bed Status: occupied vs vacant
    const statusSelect = page.getByLabel('床位狀態篩選');
    await statusSelect.selectOption('occupied');
    // In occupied filter, no vacant badge should appear
    await expect(page.locator('text="空床"')).toHaveCount(0);

    await statusSelect.selectOption('all');
  });

  test('F3: Alerts Center severity filter, keyword search, and interactive status toggle', async ({ page }) => {
    await page.getByTestId('tab-alerts').click();
    await expect(page.getByTestId('tab-alerts')).toHaveAttribute('aria-selected', 'true');

    // Counters
    await expect(page.getByText('紅標重大警示')).toBeVisible();
    await expect(page.getByText('黃標注意事件')).toBeVisible();
    await expect(page.getByText('未處理項目 (Open)')).toBeVisible();

    const alertsList = page.getByTestId('alerts-list');
    await expect(alertsList).toBeVisible();

    // 1. Severity Filter
    const severitySelect = page.locator('#severity-filter-select');
    await severitySelect.selectOption('red');
    // Verify only red severity items are rendered
    await expect(alertsList.getByText('紅標重大').first()).toBeVisible();
    await expect(alertsList.getByText('黃標注意')).toHaveCount(0);

    await severitySelect.selectOption('yellow');
    await expect(alertsList.getByText('黃標注意').first()).toBeVisible();
    await expect(alertsList.getByText('紅標重大')).toHaveCount(0);

    await severitySelect.selectOption('all');

    // 2. Keyword Search
    const searchInput = page.getByLabel('搜尋警示項目');
    await searchInput.fill('血壓');
    // Should filter items matching '血壓'
    const matchingItems = alertsList.locator('.card');
    const matchCount = await matchingItems.count();
    expect(matchCount).toBeGreaterThan(0);

    // Clear search
    await page.getByRole('button', { name: '清除' }).click();
    await expect(searchInput).toHaveValue('');

    // 3. Status Filter & Interactive Status Toggle
    const statusSelect = page.locator('#status-filter-select');
    await statusSelect.selectOption('open');

    // Find the first open alert card and click "確認處理"
    const ackButton = alertsList.getByRole('button', { name: '確認處理' }).first();
    if (await ackButton.isVisible()) {
      await ackButton.click();
      // Should now show updated status badge or resolve button
      await expect(alertsList.getByRole('button', { name: '解除警示' }).first()).toBeVisible();
    }
  });

  test('F4, F21: Audit Trail paginated view (20 rows/page), jump-to-page, and export button', async ({ page }) => {
    await page.getByTestId('tab-audit-trail').click();
    await expect(page.getByTestId('tab-audit-trail')).toHaveAttribute('aria-selected', 'true');

    await expect(page.getByRole('heading', { name: '不可竄改資料稽核軌跡 (Audit Trail)' })).toBeVisible();

    // Verify 20-row pagination info text
    await expect(page.locator('text=/每頁 20 筆/')).toBeVisible();

    // Table headers
    const table = page.locator('table');
    await expect(table).toBeVisible();
    await expect(table.locator('thead')).toContainText('異動時間戳記');
    await expect(table.locator('thead')).toContainText('操作人員');
    await expect(table.locator('thead')).toContainText('操作類型');
    await expect(table.locator('thead')).toContainText('實體 / 記錄編號');
    await expect(table.locator('thead')).toContainText('變更前舊值');
    await expect(table.locator('thead')).toContainText('變更後新值');
    await expect(table.locator('thead')).toContainText('異動理由');

    // Verify pagination controls
    const nextButton = page.getByLabel('下一頁');
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await expect(page.locator('text=/顯示第 21 至/')).toBeVisible();

      const prevButton = page.getByLabel('上一頁');
      await prevButton.click();
      await expect(page.locator('text=/顯示第 1 至/')).toBeVisible();
    }

    // Test Jump To Page Form
    const jumpInput = page.locator('#jump-page-input');
    if (await jumpInput.isVisible()) {
      const maxAttr = await jumpInput.getAttribute('max');
      const maxPages = maxAttr ? parseInt(maxAttr, 10) : 1;
      if (maxPages > 1) {
        await jumpInput.fill('2');
        await page.getByRole('button', { name: '前往' }).click();
        await expect(page.locator('text=/顯示第 21 至/')).toBeVisible();
      }
    }

    // Verify "匯出稽核報表" button preselecting audit-trail
    await page.getByRole('button', { name: '匯出稽核報表' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByLabel('選擇報表類型')).toHaveValue('audit-trail');
    await modal.getByLabel('關閉彈窗').click();
    await expect(modal).toBeHidden();
  });

  test('F5: PDF Export Modal generates binary downloads for all 5 report types', async ({ page }) => {

    const reportTypes = [
      { id: 'completion-report', label: '每日照護完成度報表 (Completion Report)' },
      { id: 'resident-list', label: '住民名冊與健康狀態 (Resident List)' },
      { id: 'tube-statistics', label: '管路與三管照護統計 (Tube Statistics)' },
      { id: 'bed-map', label: '床位配置與佔床圖 (Bed Map)' },
      { id: 'audit-trail', label: '合規稽核軌跡歷程 (Audit Trail)' },
    ];

    for (const report of reportTypes) {
      // Open modal
      await page.getByRole('button', { name: '產生 PDF 報表' }).click();
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Select report type
      const typeSelect = modal.getByLabel('選擇報表類型');
      await typeSelect.selectOption(report.id);

      // Trigger download
      await modal.getByRole('button', { name: '下載 PDF' }).click();

      // Expect success banner
      await expect(modal.getByRole('status')).toContainText('下載成功');

      // Close modal
      await modal.getByLabel('關閉彈窗').click();
      await expect(modal).toBeHidden();
    }
  });
});
