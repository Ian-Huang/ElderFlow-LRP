# Issue 01: 建立沙盒動態集合存儲層 (useSandboxCollection)

Status: resolved
Type: task

## 描述
建立前端通用資料存取 Hook `useSandboxCollection(collectionName)`。
底層在瀏覽器 IndexedDB (Dexie) 中建立動態集合表，支援：
- `insert(record: Record<string, any>): Promise<string>`
- `find(query?: Record<string, any>): Promise<any[]>`
- `update(id: string, patch: Record<string, any>): Promise<void>`
- `remove(id: string): Promise<void>`
- `exportCSV(): void`

此 Hook 必須在完全沒有後端、沒有 Cloudflare 帳號的狀況下，在 `npm run dev` 本機環境中即可獨立進行持久化儲存與讀取。
未來當 Cloudflare D1 端點就緒時，只需在底層掛載同步器即可無縫對接。
