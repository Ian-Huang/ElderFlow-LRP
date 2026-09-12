import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '@/App';
import { Layout } from '@/components/Layout';
import { useAuthStore } from '@/stores/authStore';
import { reportRegistry } from './reportRegistry';
import { AuditReportDispatcher } from './AuditReportDispatcher';

describe('評鑑工具箱系統導覽、路由與權限整合測試 (Audit Routing & Permissions)', () => {
  beforeEach(() => {
    reportRegistry.reset();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      userRole: null,
      isInitialized: true,
      accessToken: null,
      refreshToken: null,
    });
  });

  it('主導覽元件 Layout 包含「評鑑工具箱」專區導覽連結，並配置 BriefcaseIcon', () => {
    // 設定已登入之照護員角色
    useAuthStore.setState({
      user: {
        userId: 'cg-1',
        username: 'cg1',
        name: '照護員小陳',
        role: 'caregiver',
        isLocalStaff: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
      isAuthenticated: true,
      userRole: 'caregiver',
      isInitialized: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Layout />
      </MemoryRouter>,
    );

    // 驗證主要導覽列包含「評鑑工具箱」
    const navLinks = screen.getAllByRole('link', { name: /評鑑工具箱/ });
    expect(navLinks.length).toBeGreaterThan(0);
    expect(navLinks[0]).toHaveAttribute('href', '/audit-toolkit');
  });

  it('全角色存取無礙：照護員 (Caregiver) 無需督導/管理員權限即可無縫造訪 /audit-toolkit', () => {
    useAuthStore.setState({
      user: {
        userId: 'cg-2',
        username: 'cg2',
        name: '基層照護員',
        role: 'caregiver',
        isLocalStaff: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
      isAuthenticated: true,
      userRole: 'caregiver',
      isInitialized: true,
    });

    render(
      <MemoryRouter initialEntries={['/audit-toolkit']}>
        <App />
      </MemoryRouter>,
    );

    // 正常進入工具箱首頁，無 403 阻擋或跳轉
    expect(screen.getByRole('heading', { level: 1, name: /評鑑報表工具箱/ })).toBeInTheDocument();
    expect(screen.getByTestId('toolkit-card-repairs')).toBeInTheDocument();
  });

  it('免登入訪客模式 (Guest)：未登入狀態下造訪 /audit-toolkit 不被重導向至 /login，可即開即用', () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      userRole: null,
      isInitialized: true,
    });

    render(
      <MemoryRouter initialEntries={['/audit-toolkit']}>
        <App />
      </MemoryRouter>,
    );

    // 驗證未授權/未登入下仍能完整看到工具箱總覽
    expect(screen.getByRole('heading', { level: 1, name: /評鑑報表工具箱/ })).toBeInTheDocument();
    expect(screen.getByTestId('toolkit-card-repairs')).toBeInTheDocument();
  });

  it('免登入狀態下可直接造訪 /audit-toolkit/repairs，執行 A4 報表檢視與列印', () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      userRole: null,
      isInitialized: true,
    });

    render(
      <MemoryRouter initialEntries={['/audit-toolkit/repairs']}>
        <App />
      </MemoryRouter>,
    );

    // 驗證直接載入修繕報表，具備 A4 紙張與操作工具列
    expect(screen.getByTestId('repair-report-print-view')).toBeInTheDocument();
    expect(screen.getByTestId('a4-sheet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /立即列印/ })).toBeInTheDocument();
  });

  it('免登入狀態下可直接造訪 /audit-toolkit/sanitation，執行環境清潔消毒記錄表檢視與列印', () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      userRole: null,
      isInitialized: true,
    });

    render(
      <MemoryRouter initialEntries={['/audit-toolkit/sanitation']}>
        <App />
      </MemoryRouter>,
    );

    // 驗證直接載入環境清潔消毒記錄表
    expect(screen.getByTestId('sanitation-report-print-view')).toBeInTheDocument();
    expect(screen.getByTestId('a4-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('btn-click-to-print')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /立即列印/ })).toBeInTheDocument();
  });

  it('點擊「返回工具箱」按鈕能順暢導航回 /audit-toolkit 總覽頁面', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/audit-toolkit/repairs']}>
        <Routes>
          <Route path="/audit-toolkit" element={<div data-testid="hub-mock-target">工具箱總覽首頁</div>} />
          <Route path="/audit-toolkit/:reportId" element={<AuditReportDispatcher />} />
        </Routes>
      </MemoryRouter>,
    );

    // 驗證返回工具箱按鈕存在
    const backBtn = screen.getByTestId('btn-back-to-hub');
    expect(backBtn).toBeInTheDocument();
    expect(backBtn).toHaveAttribute('href', '/audit-toolkit');

    // 點擊返回
    await user.click(backBtn);

    // 順暢回到總覽
    expect(screen.getByTestId('hub-mock-target')).toBeInTheDocument();
  });

  it('造訪即將推出之報表 /audit-toolkit/visitors 呈現籌備中預告與返回總覽按鈕', () => {
    render(
      <MemoryRouter initialEntries={['/audit-toolkit/visitors']}>
        <Routes>
          <Route path="/audit-toolkit/:reportId" element={<AuditReportDispatcher />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('report-coming-soon')).toBeInTheDocument();
    expect(screen.getByText('2026年度 機構訪客與志工實名登記追蹤表')).toBeInTheDocument();
    expect(screen.getByTestId('btn-back-from-coming-soon')).toBeInTheDocument();
  });

  it('造訪無效之報表代碼 /audit-toolkit/invalid-id 正確展示 404 狀態與返回按鈕', () => {
    render(
      <MemoryRouter initialEntries={['/audit-toolkit/non-existent-report']}>
        <Routes>
          <Route path="/audit-toolkit/:reportId" element={<AuditReportDispatcher />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('report-not-found')).toBeInTheDocument();
    expect(screen.getByText('找不到指定的評鑑報表')).toBeInTheDocument();
    expect(screen.getByText('non-existent-report')).toBeInTheDocument();
    expect(screen.getByTestId('btn-back-from-404')).toBeInTheDocument();
  });

  it('離線狀態穩定性：在 navigator.onLine = false 離線環境下，專區完整運作無拋錯', () => {
    // 模擬離線環境
    const prevOnLine = navigator.onLine;
    (navigator as { onLine: boolean }).onLine = false;

    try {
      render(
        <MemoryRouter initialEntries={['/audit-toolkit/repairs']}>
          <App />
        </MemoryRouter>,
      );

      // 離線下依然完整呈現 A4 表格、6 筆範例資料與工具列按鈕
      expect(screen.getByTestId('a4-sheet')).toBeInTheDocument();
      expect(screen.getByTestId('row-count')).toHaveTextContent('6');
      expect(screen.getByRole('button', { name: /模擬新增一筆資料/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /下載 CSV 範本/ })).toBeInTheDocument();
    } finally {
      (navigator as { onLine: boolean }).onLine = prevOnLine;
    }
  });
});
