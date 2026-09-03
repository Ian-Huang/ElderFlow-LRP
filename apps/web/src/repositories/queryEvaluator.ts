import type { PaginatedResponse } from '@lrp/shared';

export interface QueryEvaluatorOptions<T> {
  page?: number;
  pageSize?: number;
  search?: string;
  searchFields?: Array<keyof T>;
  filters?: Partial<Record<keyof T, unknown>>;
  sortField?: keyof T | string;
  sortOrder?: 'asc' | 'desc';
  customFilter?: (item: T) => boolean;
}

export function evaluateInMemoryQuery<T extends object>(
  items: T[],
  options: QueryEvaluatorOptions<T> = {}
): PaginatedResponse<T> {
  const {
    page = 1,
    pageSize = 10,
    search = '',
    searchFields = [],
    filters = {},
    sortField,
    sortOrder = 'asc',
    customFilter,
  } = options;

  let filtered = [...items];

  // 1. Custom filter predicate
  if (customFilter) {
    filtered = filtered.filter(customFilter);
  }

  // 2. Exact filters
  for (const [key, expectedValue] of Object.entries(filters)) {
    if (expectedValue !== undefined && expectedValue !== null && expectedValue !== '') {
      filtered = filtered.filter((item) => {
        const itemVal = (item as Record<string, unknown>)[key];
        if (typeof expectedValue === 'boolean') {
          return Boolean(itemVal) === expectedValue;
        }
        return itemVal === expectedValue;
      });
    }
  }

  // 3. Search query
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((item) => {
      const targetFields =
        searchFields.length > 0 ? searchFields : (Object.keys(item) as Array<keyof T>);
      return targetFields.some((field) => {
        const val = item[field];
        if (val === undefined || val === null) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }

  // 4. Sorting
  if (sortField) {
    filtered.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortField as string];
      const bVal = (b as Record<string, unknown>)[sortField as string];

      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return sortOrder === 'asc' ? 1 : -1;
      if (bVal === undefined || bVal === null) return sortOrder === 'asc' ? -1 : 1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal);
      const strB = String(bVal);
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }

  const total = filtered.length;
  const effectivePageSize = pageSize > 0 ? pageSize : 10;
  const totalPages = Math.ceil(total / effectivePageSize) || 1;
  const startIndex = (page - 1) * effectivePageSize;
  const paginatedItems = filtered.slice(startIndex, startIndex + effectivePageSize);

  return {
    items: paginatedItems,
    total,
    page,
    pageSize: effectivePageSize,
    totalPages,
  };
}
