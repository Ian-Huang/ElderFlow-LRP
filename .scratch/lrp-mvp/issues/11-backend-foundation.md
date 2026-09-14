# 11: 後端骨架、D1 資料庫遷移與索引設計 (Cloudflare Pages Functions + D1 Foundation)

> **架構定調 (ADR-0001)**：採用 Cloudflare Pages Functions + Cloudflare D1 (Serverless SQLite)，代碼位於 `apps/web/functions/`，與前端共構於同一專案中。

**What to build:**
建立 Cloudflare Pages Functions 基礎微後端架構 (TypeScript)、配置 `wrangler.toml` 綁定本地與雲端 D1 資料庫。建立 D1 SQL 遷移腳本與資料表結構（落實外鍵與時間欄位索引），提供 `npm run db:studio` 視覺化改表腳本、匯入 26 筆歷史住民種子資料，並實作 `/api/health` 驗證前後端與資料庫連線。

**Blocked by:** 10-pwa-polish-frontend (前端 API 契約定型後)

**Status:** ready-for-agent

- [ ] 建立 `apps/web/functions/` 結構與 TypeScript 設定，支援 Cloudflare Pages Functions 全域型別 (`@cloudflare/workers-types`)
- [ ] 配置 `wrangler.toml`，設定本地開發環境與 D1 資料庫綁定 (`[[d1_databases]] binding = "DB"`)
- [ ] 建立資料庫遷移系統：`migrations/0001_initial_schema.sql`，定義符合 ANSI SQL 之核心資料表（住民、照護紀錄、用藥、照護計畫、審計軌跡）
- [ ] **落實效能索引**：於遷移腳本中為關鍵查詢欄位建立強制索引 (`CREATE INDEX idx_records_resident_date ON care_records(resident_id, recorded_at)`)，防範大表全表掃描
- [ ] 在 `package.json` 加入 `"db:studio": "wrangler d1 studio"` 指令，提供本地開箱即用之視覺化資料庫編輯器
- [ ] 提供種子資料腳本 (`seeds/0001_initial_residents.sql`)，自 `downloaded-system/` 匯入 26 筆歷史測試住民與機構初始設定
- [ ] 實作健康檢查端點 `GET /api/health`，回傳 `{ status: 'ok', timestamp, version, d1: 'connected' }`
- [ ] 驗證：本地執行 `npx wrangler pages dev`，端點正常回傳且成功讀取 D1 本地測試資料