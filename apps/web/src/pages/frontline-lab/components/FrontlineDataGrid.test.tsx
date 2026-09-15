import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FrontlineDataGrid, type DataGridColumn } from './FrontlineDataGrid';
import type { SandboxItem } from '@/hooks/useSandboxCollection';

interface MockItem {
  id?: string;
  name: string;
  role: string;
  score: number;
}

const mockData: SandboxItem<MockItem>[] = [
  {
    id: 'row-1',
    name: '王大衛',
    role: '護理師',
    score: 95,
    createdAt: '2026-09-14T08:00:00Z',
    updatedAt: '2026-09-14T08:00:00Z',
  },
  {
    id: 'row-2',
    name: '李美華',
    role: '照服員',
    score: 88,
    createdAt: '2026-09-14T08:30:00Z',
    updatedAt: '2026-09-14T08:30:00Z',
  },
];

const mockColumns: DataGridColumn<MockItem>[] = [
  { key: 'name', label: '姓名', editable: true, type: 'text' },
  { key: 'role', label: '職稱', editable: true, type: 'select', selectOptions: ['護理師', '照服員', '社工師'] },
  { key: 'score', label: '評分', editable: true, type: 'number' },
];

describe('FrontlineDataGrid (現場低代碼通用試算表元件)', () => {
  it('正確渲染資料列、欄位標題與標題', () => {
    render(
      <FrontlineDataGrid<MockItem>
        title="測試人員列表"
        data={mockData}
        columns={mockColumns}
      />
    );

    expect(screen.getByText('測試人員列表')).toBeInTheDocument();
    expect(screen.getByText('姓名')).toBeInTheDocument();
    expect(screen.getByText('職稱')).toBeInTheDocument();
    expect(screen.getByText('評分')).toBeInTheDocument();
    expect(screen.getByText('王大衛')).toBeInTheDocument();
    expect(screen.getByText('李美華')).toBeInTheDocument();
  });

  it('支援關鍵字搜尋過濾', async () => {
    render(
      <FrontlineDataGrid<MockItem>
        data={mockData}
        columns={mockColumns}
        searchPlaceholder="搜尋人員..."
      />
    );

    const input = screen.getByPlaceholderText('搜尋人員...');
    await userEvent.type(input, '李美華');

    expect(screen.getByText('李美華')).toBeInTheDocument();
    expect(screen.queryByText('王大衛')).not.toBeInTheDocument();
  });

  it('支援勾選多選與批次刪除', async () => {
    const handleBatchDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <FrontlineDataGrid<MockItem>
        data={mockData}
        columns={mockColumns}
        onBatchDelete={handleBatchDelete}
      />
    );

    // 勾選全選
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox!);

    expect(screen.getByText(/已選取 2 筆/)).toBeInTheDocument();

    // 模擬點擊批次刪除
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteBtn = screen.getByText(/刪除已選/);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(handleBatchDelete).toHaveBeenCalledWith(['row-1', 'row-2']);
    });
  });

  it('支援雙擊進入行內編輯並按 Enter 儲存', async () => {
    const handleUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <FrontlineDataGrid<MockItem>
        data={mockData}
        columns={mockColumns}
        onUpdate={handleUpdate}
      />
    );

    // 雙擊王大衛單元格
    const cell = screen.getByText('王大衛');
    fireEvent.doubleClick(cell);

    // 輸入框出現
    const input = screen.getByDisplayValue('王大衛');
    fireEvent.change(input, { target: { value: '王小衛' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(handleUpdate).toHaveBeenCalledWith('row-1', { name: '王小衛' });
    });
  });

  it('支援貼上試算表剪貼簿解析並預覽匯入', async () => {
    const handlePasteImport = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <FrontlineDataGrid<MockItem>
        data={mockData}
        columns={mockColumns}
        onPasteImport={handlePasteImport}
      />
    );

    // 點擊打開匯入彈窗
    fireEvent.click(screen.getByText(/貼上匯入/));
    expect(screen.getByText(/從 Excel \/ Google Sheet 貼上匯入/)).toBeInTheDocument();

    // 貼上 TSV 內容
    const textarea = screen.getByPlaceholderText(/請在此按 Ctrl\+V/);
    const tsvData = `姓名\t職稱\t評分\n張三\t護理師\t90\n李四\t照服員\t85`;
    fireEvent.change(textarea, { target: { value: tsvData } });

    // 預覽前 3 筆資料
    expect(await screen.findByText(/已辨識出 2 筆資料/)).toBeInTheDocument();
    expect(screen.getByText('張三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();

    // 點擊確認匯入
    const confirmBtn = screen.getByText(/確認匯入 2 筆/);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handlePasteImport).toHaveBeenCalledWith([
        { name: '張三', role: '護理師', score: 90 },
        { name: '李四', role: '照服員', score: 85 },
      ]);
    });
  });
});
