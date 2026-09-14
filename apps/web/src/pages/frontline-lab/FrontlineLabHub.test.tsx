import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { FrontlineLabHub } from './FrontlineLabHub';

describe('FrontlineLabHub 現場工具箱與實驗室總覽首頁', () => {
  it('正確渲染首頁主標題、全院現場協作引導橫幅與雙專區板塊', () => {
    render(
      <MemoryRouter>
        <FrontlineLabHub />
      </MemoryRouter>,
    );

    // 頁面主標題與橫幅
    expect(screen.getByRole('heading', { level: 1, name: /現場工具箱與實驗室/ })).toBeInTheDocument();
    expect(screen.getByText(/全院現場協作 · 實用主義工作台/)).toBeInTheDocument();

    // 專區 A：評鑑稽核專用報表
    expect(screen.getByText(/專區 A：評鑑稽核專用報表/)).toBeInTheDocument();
    // 專區 B：現場自製登記工具
    expect(screen.getByText(/專區 B：現場自製登記工具/)).toBeInTheDocument();
  });

  it('專區 A 正確渲染修繕表與環境清潔消毒表卡片，且連結指向 /frontline-lab', () => {
    render(
      <MemoryRouter>
        <FrontlineLabHub />
      </MemoryRouter>,
    );

    // 修繕記錄表卡片
    const repairCard = screen.getByTestId('toolkit-card-repairs');
    expect(repairCard).toBeInTheDocument();
    expect(screen.getByText('機構修繕通報追蹤記錄表')).toBeInTheDocument();
    const repairBtn = screen.getByTestId('btn-enter-repairs');
    expect(repairBtn).toHaveAttribute('href', '/frontline-lab/repairs');

    // 清潔消毒檢查表卡片
    const sanitationCard = screen.getByTestId('toolkit-card-sanitation');
    expect(sanitationCard).toBeInTheDocument();
    expect(screen.getByText('環境清潔消毒自主檢查表')).toBeInTheDocument();
    const sanitationBtn = screen.getByTestId('btn-enter-sanitation');
    expect(sanitationBtn).toHaveAttribute('href', '/frontline-lab/sanitation');
  });

  it('專區 B 正確渲染訪客登記三合一模組與公開填寫連結', () => {
    render(
      <MemoryRouter>
        <FrontlineLabHub />
      </MemoryRouter>,
    );

    expect(screen.getByText('訪客與志工線上登記系統')).toBeInTheDocument();
    expect(screen.getByText('三合一完整運作')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /進入三合一工作台/ })).toHaveAttribute('href', '/frontline-lab/visitor');
    expect(screen.getByRole('link', { name: /訪客手機填寫端/ })).toHaveAttribute('href', '/public/visitor');
  });
});
