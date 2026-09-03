import { describe, it, expect } from 'vitest';
import { evaluateInMemoryQuery } from './queryEvaluator';

interface TestItem {
  id: string;
  name: string;
  age: number;
  status: 'Active' | 'Inactive';
  hasFlag: boolean;
  tags?: string[];
  createdAt: string;
}

const sampleItems: TestItem[] = [
  { id: '1', name: '王小明', age: 75, status: 'Active', hasFlag: true, tags: ['A', 'B'], createdAt: '2026-01-01T08:00:00Z' },
  { id: '2', name: '李大同', age: 82, status: 'Active', hasFlag: false, tags: ['B'], createdAt: '2026-01-02T08:00:00Z' },
  { id: '3', name: '張美麗', age: 68, status: 'Inactive', hasFlag: true, tags: ['C'], createdAt: '2026-01-03T08:00:00Z' },
  { id: '4', name: '陳志豪', age: 90, status: 'Active', hasFlag: false, createdAt: '2026-01-04T08:00:00Z' },
  { id: '5', name: '林玉蘭', age: 88, status: 'Inactive', hasFlag: false, createdAt: '2026-01-05T08:00:00Z' },
];

describe('evaluateInMemoryQuery', () => {
  it('should paginate items with default page and pageSize', () => {
    const result = evaluateInMemoryQuery<TestItem>(sampleItems, { page: 1, pageSize: 2 });
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(5);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(result.items[0]?.id).toBe('1');
    expect(result.items[1]?.id).toBe('2');
  });

  it('should filter items by exact match criteria', () => {
    const result = evaluateInMemoryQuery<TestItem>(sampleItems, {
      filters: { status: 'Inactive' },
    });
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.items.every((item) => item.status === 'Inactive')).toBe(true);
  });

  it('should filter items by boolean criteria', () => {
    const result = evaluateInMemoryQuery<TestItem>(sampleItems, {
      filters: { hasFlag: true },
    });
    expect(result.items).toHaveLength(2);
    expect(result.items.map((i) => i.id)).toEqual(['1', '3']);
  });

  it('should search across specified fields (case-insensitive substring)', () => {
    const result = evaluateInMemoryQuery<TestItem>(sampleItems, {
      search: '美麗',
      searchFields: ['name', 'id'],
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe('張美麗');
  });

  it('should sort items by specified field in asc and desc order', () => {
    const ascResult = evaluateInMemoryQuery<TestItem>(sampleItems, {
      sortField: 'age',
      sortOrder: 'asc',
    });
    expect(ascResult.items[0]?.age).toBe(68);
    expect(ascResult.items[ascResult.items.length - 1]?.age).toBe(90);

    const descResult = evaluateInMemoryQuery<TestItem>(sampleItems, {
      sortField: 'age',
      sortOrder: 'desc',
    });
    expect(descResult.items[0]?.age).toBe(90);
    expect(descResult.items[descResult.items.length - 1]?.age).toBe(68);
  });

  it('should combine search, filters, sorting and pagination simultaneously', () => {
    const result = evaluateInMemoryQuery<TestItem>(sampleItems, {
      search: '',
      filters: { status: 'Active' },
      sortField: 'age',
      sortOrder: 'desc',
      page: 1,
      pageSize: 2,
    });
    expect(result.total).toBe(3); // items 1, 2, 4 are Active
    expect(result.totalPages).toBe(2);
    expect(result.items[0]?.age).toBe(90); // item 4
    expect(result.items[1]?.age).toBe(82); // item 2
  });
});
