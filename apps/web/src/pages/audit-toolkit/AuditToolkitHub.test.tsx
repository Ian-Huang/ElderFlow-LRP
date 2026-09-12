import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuditToolkitHub } from './AuditToolkitHub';
import { reportRegistry } from './reportRegistry';
import type { AuditReportConfig } from './auditToolkitTypes';

describe('AuditToolkitHub 總覽卡片與功能展示', () => {
  beforeEach(() => {
    reportRegistry.reset();
  });

  it('正確渲染首頁引導標題、三大保證標籤與使用指南', () => {
    render(
      <MemoryRouter>
        <AuditToolkitHub />
      </MemoryRouter>,
    );

    // 頁面主標題與英文副標題
    expect(screen.getByRole('heading', { level: 1, name: /評鑑報表工具箱/ })).toBeInTheDocument();
    expect(screen.getByText(/Audit Toolkit/)).toBeInTheDocument();

    // 三大保證標籤
    expect(screen.getByText(/純前端本機解析・個資零外洩/)).toBeInTheDocument();
    expect(screen.getByText(/A4 粗黑實線防截斷・分頁表頭重現/)).toBeInTheDocument();
    expect(screen.getByText(/斷網離線即開即用・免登入即印/)).toBeInTheDocument();

    // 三步驟指南
    expect(screen.getByText('使用三步驟指南')).toBeInTheDocument();
    expect(screen.getByText(/1\. 下載 UTF-8 CSV 範本/)).toBeInTheDocument();
    expect(screen.getByText(/2\. 一鍵匯入與自訂抬頭/)).toBeInTheDocument();
    expect(screen.getByText(/3\. 原生列印輸出 A4 \/ PDF/)).toBeInTheDocument();
  });

  it('正確自 reportRegistry 讀取註冊清單並渲染修繕報表卡片', () => {
    render(
      <MemoryRouter>
        <AuditToolkitHub />
      </MemoryRouter>,
    );

    // 註冊工具總數（修繕報表、環境清潔消毒記錄表、訪客預告）
    expect(screen.getByTestId('registered-count')).toHaveTextContent('共 3 個工具');

    // 修繕報表卡片
    const repairCard = screen.getByTestId('toolkit-card-repairs');
    expect(repairCard).toBeInTheDocument();

    // 紙張方向與發布狀態標籤
    expect(screen.getByTestId('badge-orientation-repairs')).toHaveTextContent('直向 A4 (Portrait)');
    expect(screen.getByTestId('badge-status-repairs')).toHaveTextContent('現已可用 (Ready)');

    // 標題、功能描述與欄位規格
    expect(screen.getByText('2026年度 機構修繕通報追蹤記錄')).toBeInTheDocument();
    expect(screen.getByText(/8 欄位配置/)).toBeInTheDocument();
    expect(screen.getByText(/內建 6 筆範例/)).toBeInTheDocument();

    // 進入按鈕
    const enterBtn = screen.getByTestId('btn-enter-repairs');
    expect(enterBtn).toHaveAttribute('href', '/audit-toolkit/repairs');
    expect(enterBtn).not.toBeDisabled();

    // 環境清潔消毒記錄表卡片
    const sanitationCard = screen.getByTestId('toolkit-card-sanitation');
    expect(sanitationCard).toBeInTheDocument();
    expect(screen.getByTestId('badge-orientation-sanitation')).toHaveTextContent('直向 A4 (Portrait)');
    expect(screen.getByTestId('badge-status-sanitation')).toHaveTextContent('現已可用 (Ready)');
    expect(screen.getByText(/環境清潔消毒紀[錄錄]表/)).toBeInTheDocument();
    expect(screen.getByTestId('btn-enter-sanitation')).toHaveAttribute('href', '/audit-toolkit/sanitation');
  });

  it('正確渲染預告之訪客與志工記錄表卡片（橫向 A4、即將推出狀態）', () => {
    render(
      <MemoryRouter>
        <AuditToolkitHub />
      </MemoryRouter>,
    );

    // 訪客報表卡片
    const visitorCard = screen.getByTestId('toolkit-card-visitors');
    expect(visitorCard).toBeInTheDocument();

    // 橫向 A4 與即將推出標籤
    expect(screen.getByTestId('badge-orientation-visitors')).toHaveTextContent('橫向 A4 (Landscape)');
    expect(screen.getByTestId('badge-status-visitors')).toHaveTextContent('即將推出 (Coming Soon)');

    // 標題與規格
    expect(screen.getByText('2026年度 機構訪客與志工實名登記追蹤表')).toBeInTheDocument();
    expect(screen.getByText(/9 欄位配置/)).toBeInTheDocument();

    // 按鈕處於 disabled 狀態
    const enterBtn = screen.getByTestId('btn-enter-visitors');
    expect(enterBtn).toBeDisabled();
    expect(enterBtn).toHaveTextContent('模組籌備中（敬請期待）');
  });

  it('架構具備擴充性：動態新增第 3 個註冊報表時，Hub 自動擴充卡片無須修改元件程式碼', () => {
    // 動態註冊突發需求之報表模組
    const mockThirdReport: AuditReportConfig = {
      id: 'safety-inspection',
      title: '2026年度 無障礙與公共安全設備每季自主檢查表記錄',
      orientation: 'landscape',
      status: 'available',
      columns: [
        { key: 'item', label: '檢查項目', required: true, widthPercent: 40 },
        { key: 'status', label: '狀態', required: true, widthPercent: 30 },
        { key: 'date', label: '查核日期', required: true, widthPercent: 30 },
      ],
      sampleData: [{ item: '無障礙斜坡扶手', status: '合格', date: '2026/09/01' }],
      description: '全院無障礙走道、輪椅坡道與緊急照明季度查驗記錄表',
    };

    reportRegistry.register(mockThirdReport);

    render(
      <MemoryRouter>
        <AuditToolkitHub />
      </MemoryRouter>,
    );

    // 總數自動更新為 4
    expect(screen.getByTestId('registered-count')).toHaveTextContent('共 4 個工具');

    // 自動生成第四張卡片
    const thirdCard = screen.getByTestId('toolkit-card-safety-inspection');
    expect(thirdCard).toBeInTheDocument();
    expect(screen.getByText('2026年度 無障礙與公共安全設備每季自主檢查表記錄')).toBeInTheDocument();
    expect(screen.getByTestId('badge-orientation-safety-inspection')).toHaveTextContent('橫向 A4 (Landscape)');
    expect(screen.getByTestId('badge-status-safety-inspection')).toHaveTextContent('現已可用 (Ready)');

    const thirdBtn = screen.getByTestId('btn-enter-safety-inspection');
    expect(thirdBtn).toHaveAttribute('href', '/audit-toolkit/safety-inspection');
  });
});
