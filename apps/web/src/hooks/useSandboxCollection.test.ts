import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSandboxCollection } from './useSandboxCollection';
import { sandboxDb } from '@/utils/sandboxDb';

interface VisitorPayload {
  name: string;
  temperature: number;
  type: '住民家屬' | '志工服務' | '機構洽公';
  companionNames?: string[];
}

describe('useSandboxCollection Hook', () => {
  beforeEach(async () => {
    await sandboxDb.documents.clear();
  });

  it('應可正確新增、讀取動態集合中的資料', async () => {
    const { result } = renderHook(() => useSandboxCollection<VisitorPayload>('test_visitors'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);

    let insertedId = '';
    await act(async () => {
      insertedId = await result.current.insert({
        name: '王小明',
        temperature: 36.5,
        type: '志工服務',
        companionNames: ['張三', '李四'],
      });
    });

    expect(insertedId).toBeDefined();
    expect(insertedId.length).toBeGreaterThan(0);

    expect(result.current.data.length).toBe(1);
    expect(result.current.data[0]?.name).toBe('王小明');
    expect(result.current.data[0]?.temperature).toBe(36.5);
    expect(result.current.data[0]?.type).toBe('志工服務');
    expect(result.current.data[0]?.companionNames).toEqual(['張三', '李四']);
    expect(result.current.data[0]?.createdAt).toBeDefined();
  });

  it('應可更新指定資料的欄位，其餘欄位維持不變', async () => {
    const { result } = renderHook(() => useSandboxCollection<VisitorPayload>('test_visitors'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let id = '';
    await act(async () => {
      id = await result.current.insert({
        name: '李家屬',
        temperature: 36.4,
        type: '住民家屬',
      });
    });

    await act(async () => {
      await result.current.update(id, {
        temperature: 36.8,
      });
    });

    expect(result.current.data[0]?.name).toBe('李家屬');
    expect(result.current.data[0]?.temperature).toBe(36.8);
    expect(result.current.data[0]?.type).toBe('住民家屬');
  });

  it('應可刪除指定記錄', async () => {
    const { result } = renderHook(() => useSandboxCollection<VisitorPayload>('test_visitors'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let id = '';
    await act(async () => {
      id = await result.current.insert({
        name: '待刪除人員',
        temperature: 36.5,
        type: '機構洽公',
      });
    });

    expect(result.current.data.length).toBe(1);

    await act(async () => {
      await result.current.remove(id);
    });

    expect(result.current.data.length).toBe(0);
  });
});
