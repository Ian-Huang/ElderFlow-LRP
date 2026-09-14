import { useState, useEffect, useCallback } from 'react';
import { sandboxDb, type SandboxDocument } from '@/utils/sandboxDb';

export interface SandboxItemMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type SandboxItem<T> = T & SandboxItemMeta;

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function useSandboxCollection<T extends Record<string, any>>(collectionName: string) {
  const [data, setData] = useState<SandboxItem<T>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const docs = await sandboxDb.documents
        .where('collection')
        .equals(collectionName)
        .reverse()
        .sortBy('createdAt');

      const items: SandboxItem<T>[] = docs.map((doc) => ({
        id: doc.id,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        ...(doc.payload as T),
      }));

      setData(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [collectionName]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const insert = useCallback(
    async (payload: T): Promise<string> => {
      const id = generateId();
      const now = new Date().toISOString();
      const doc: SandboxDocument<T> = {
        id,
        collection: collectionName,
        payload,
        createdAt: now,
        updatedAt: now,
      };

      await sandboxDb.documents.put(doc);
      await refresh();
      return id;
    },
    [collectionName, refresh]
  );

  const update = useCallback(
    async (id: string, patch: Partial<T>): Promise<void> => {
      const existing = await sandboxDb.documents.get(id);
      if (!existing) {
        throw new Error(`找不到記錄 ID: ${id}`);
      }

      const now = new Date().toISOString();
      const updatedDoc: SandboxDocument<T> = {
        ...existing,
        payload: {
          ...existing.payload,
          ...patch,
        } as T,
        updatedAt: now,
      };

      await sandboxDb.documents.put(updatedDoc);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await sandboxDb.documents.delete(id);
      await refresh();
    },
    [refresh]
  );

  const exportCSV = useCallback(
    (customFilename?: string) => {
      if (data.length === 0) {
        alert('目前無資料可匯出！');
        return;
      }

      // Collect all keys across all records
      const keySet = new Set<string>(['id', 'createdAt', 'updatedAt']);
      data.forEach((item) => {
        Object.keys(item).forEach((k) => keySet.add(k));
      });
      const headers = Array.from(keySet);

      const rows = data.map((item) => {
        return headers.map((header) => {
          const val = (item as Record<string, any>)[header];
          if (val === undefined || val === null) return '""';
          if (Array.isArray(val)) {
            return `"${val.join('; ').replace(/"/g, '""')}"`;
          }
          if (typeof val === 'object') {
            return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          }
          return `"${String(val).replace(/"/g, '""')}"`;
        });
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        customFilename || `${collectionName}_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [collectionName, data]
  );

  return {
    data,
    isLoading,
    error,
    insert,
    update,
    remove,
    refresh,
    exportCSV,
  };
}
