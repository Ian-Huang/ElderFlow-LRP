import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '@/App';
import { Layout } from '@/components/Layout';
import { useAuthStore } from '@/stores/authStore';
import { reportRegistry } from './reportRegistry';
import { AuditReportDispatcher } from './AuditReportDispatcher';

describe('現場實驗室與工具箱系統導覽、路由與權限整合測試 (Frontline Lab & Routing)', () => {
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

  it('主導覽元件 Layout 僅保留單一「現場實驗室」專區導覽連結（移除重複之評鑑工具箱），並配置 BeakerIcon', () => {
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

    // 驗證主要導覽列包含「現場實驗室」，且路徑為 /frontline-lab
    const navLinks = screen.getAllByRole('link', { name: /現場實驗室/ });
    expect(navLinks.length).toBeGreaterThan(0);
    expect(navLinks[0]).toHaveAttribute('href', '/frontline-lab');

    // 驗證重複之「評鑑工具箱」已自側邊導覽列移除，避免現場人員困惑
    expect(screen.queryByRole('link', { name: /^評鑑工具箱$/ })).not.toBeInTheDocument();
  });

  it('全角色存取無礙：照護員 (Caregiver) 無需督導/管理員權限即可無縫造訪 /frontline-lab', () => {
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
      <MemoryRouter initialEntries={['/frontline-lab']}>
        <App />
      </MemoryRouter>,
    );

    // 正常進入現場實驗室首頁，無 403 阻擋或跳轉
    expect(screen.getByRole('heading', { level: 1, name: /現場工具箱與實驗室/ })).toBeInTheDocument();
    expect(screen.getByTestId('toolkit-card-repairs')).toBeInTheDocument();
  });

  it('免登入訪客模式 (Guest)：未登入狀態下造訪 /frontline-lab 不被重導向至 /login，可即開即用', () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      userRole: null,
      isInitialized: true,
    });

    render(
      <MemoryRouter initialEntries={['/frontline-lab']}>
        <App />
      </MemoryRouter>,
    );

    // 驗證未授權/未登入下仍能完整看到現場工具箱與實驗室總覽
    expect(screen.getByRole('heading', { level: 1, name: /現場工具箱與實驗室/ })).toBeInTheDocument();
    expect(screen.getByTestId('toolkit-card-repairs')).toBeInTheDocument();
  });


  it('免登入狀態下可直接造訪 /frontline-lab/repairs，執行 A4 報表檢視與列印', () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      userRole: null,
      isInitialized: true,
    });

    render(
      <MemoryRouter initialEntries={['/frontline-lab/repairs']}>
        <App />
      </MemoryRouter>,
    );

    // 驗證直接載入修繕報表，具備 A4 紙張與操作工具列
    expect(screen.getByTestId('repair-report-print-view')).toBeInTheDocument();
    expect(screen.getByTestId('a4-sheet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /立即列印/ })).toBeInTheDocument();
  });

  it('免登入狀態下可直接造訪 /frontline-lab/sanitation，執行環境清潔消毒記錄表檢視與列印', () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      userRole: null,
      isInitialized: true,
    });

    render(
      <MemoryRouter initialEntries={['/frontline-lab/sanitation']}>
        <App />
      </MemoryRouter>,
    );

    // 驗證直接載入環境清潔消毒記錄表
    expect(screen.getByTestId('sanitation-report-print-view')).toBeInTheDocument();
    expect(screen.getByTestId('a4-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('btn-click-to-print')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /立即列印/ })).toBeInTheDocument();
  });

  it('點擊「返回現場實驗室」按鈕能順暢導航回 /frontline-lab 總覽頁面', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/frontline-lab/repairs']}>
        <Routes>
          <Route path="/frontline-lab" element={<div data-testid="hub-mock-target">現場實驗室總覽首頁</div>} />
          <Route path="/frontline-lab/:reportId" element={<AuditReportDispatcher />} />
        </Routes>
      </MemoryRouter>,
    );

    // 驗證返回按鈕存在且指向 /frontline-lab
    const backBtn = screen.getByTestId('btn-back-to-hub');
    expect(backBtn).toBeInTheDocument();
    expect(backBtn).toHaveAttribute('href', '/frontline-lab');

    // 點擊返回
    await user.click(backBtn);

    // 順暢回到總覽
    expect(screen.getByTestId('hub-mock-target')).toBeInTheDocument();
  });

  it('造訪即將推出之報表 /frontline-lab/visitors 呈現籌備中預告與返回總覽按鈕', () => {
    render(
      <MemoryRouter initialEntries={['/frontline-lab/visitors']}>
        <Routes>
          <Route path="/frontline-lab/:reportId" element={<AuditReportDispatcher />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('report-coming-soon')).toBeInTheDocument();
    expect(screen.getByText('2026年度 機構訪客與志工實名登記追蹤表')).toBeInTheDocument();
    expect(screen.getByTestId('btn-back-from-coming-soon')).toBeInTheDocument();
  });

  it('造訪無效之報表代碼 /frontline-lab/invalid-id 正確展示 404 狀態與返回按鈕', () => {
    render(
      <MemoryRouter initialEntries={['/frontline-lab/non-existent-report']}>
        <Routes>
          <Route path="/frontline-lab/:reportId" element={<AuditReportDispatcher />} />
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
        <MemoryRouter initialEntries={['/frontline-lab/repairs']}>
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
