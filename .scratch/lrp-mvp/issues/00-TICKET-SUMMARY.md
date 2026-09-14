# LRP Phase 1 MVP — Ticket Breakdown Summary (Frontend-First & Cloudflare Jamstack)

總共 **21 張票**，採 **前端先行、Mock 先行、Cloudflare Jamstack 後端** 策略：前 10 張票完整建構前端 (含 MSW Mock)，前端驗收通過後再建後端 11 張票（基於 Cloudflare Pages Functions + D1），最後測試與部署。

---

## 依賴關係圖 (Frontend-First & Jamstack)

```
Phase 1: 前端開發 (Mock 模式，不受後端影響)
────────────────────────────────────────────────────
01-project-foundation        (專案骨架與 Monorepo)
├─ 02-auth-frontend          (認證前端、RBAC、5組快速切換)
│  ├─ 04-residents-frontend  (住民資料頁面，對接 residentRepository)
│  │  └─ 09-system-admin     (系統管理中心、使用者管理)
│  └─ 10-pwa-polish          (PWA 安裝、Kiosk 模式)
├─ 03-pwa-offline-frontend   (PWA 離線引擎、IndexedDB Dexie、SyncQueue)
│  ├─ 04-residents-frontend
│  ├─ 05-care-records        (照護記錄核心頁面，對接 careRecordRepository)
│  ├─ 06-medications         (藥物管理頁面，對接 medicationRepository)
│  ├─ 07-care-plans          (照護計畫頁面，對接 carePlanRepository)
│  ├─ 08-reports             (報表中心、PDF 匯出)
│  └─ 10-pwa-polish

Phase 2: 後端微後端與 D1 資料庫 (對接前端中介層與落地索引)
────────────────────────────────────────────────────
11-backend-foundation (Cloudflare Pages Functions 骨架、D1 遷移、索引結構、db:studio)
├─ 12-auth-backend    (Web Crypto、JWT 簽發、RBAC Middleware 攔截)
│  ├─ 13-residents-backend    (對接 residentRepository，分頁與三管判斷)
│  │  └─ 18-compliance-backend
│  ├─ 14-care-records-backend (對接 careRecordRepository，時間索引、24hr 鎖定)
│  │  └─ 19-sync-conflict-backend
│  ├─ 15-medications-backend  (對接 medicationRepository，扣庫存、防呆去重)
│  │  └─ 19-sync-conflict-backend
│  ├─ 16-care-plans-backend   (對接 carePlanRepository，計畫目標 CRUD)
│  │  └─ 19-sync-conflict-backend
│  └─ 18-compliance-backend   (動態護理比 1:20 vs 1:15、夜班本國籍檢核)
├─ 17-reports-backend         (SQL 高效聚合查詢，供應儀表板與評鑑工具箱)
└─ 19-sync-conflict-backend   (接收前端 SyncQueue，批次事務與衝突標記)

Phase 3: 測試與統一部署
────────────────────────────────────────────────────
20-automated-tests (Vitest Worker Pool 後端測試 + Playwright E2E 離線同步驗證)
21-deployment-ops  (Cloudflare Pages 一體化部署、D1 定時備份排程、自訂網域 SSL)
```

---

## 票清單

### Phase 1: 前端 (10 票)

| # | 票名稱 | 封鎖者 | 交付價值 |
|---|--------|--------|----------|
| 01 | 專案骨架與建置基礎建設 | — | Monorepo、Vite+React+TS、MSW 架構、CI/CD 基礎 |
| 02 | 認證系統前端 | 01 | 登入、Token 管理、RBAC、快速切換 5 組帳號、IndexedDB 持久化 |
| 03 | PWA 離線基礎建設 | 01 | SW、IndexedDB、離線寫入、同步引擎、衝突中心、狀態指示器 |
| 04 | 住民基本資料前端 | 02, 03 | 列表/明細/表單/匯入、離線瀏覽、Mock 26 筆種子資料 |
| 05 | 日常照護記錄前端 | 03 | **核心** — 記錄表單、生命徵象、評分、24hr 鎖定、補充修正、離線 |
| 06 | 藥物管理前端 | 03 | 主檔/給藥/庫存視覺化/低庫存警示/離線給藥去重 |
| 07 | 照護計畫前端 | 03 | 計畫/目標/服務項目 CRUD、狀態流轉、住民頁嵌入 |
| 08 | 報表前端 | 03 | 完成度/概覽/警示/稽核儀表板、圖表、PDF 匯出 |
| 09 | 系統管理前端 | 02, 04 | 使用者 CRUD、角色指派、系統設定 |
| 10 | PWA 完善與 Kiosk | 03, 02 | 安裝提示、離線就緒、Kiosk 鎖定、SW 更新、快取清理 |

### Phase 2: 後端微後端與 D1 資料庫 (9 票)

| # | 票名稱 | 封鎖者 | 交付價值 |
|---|--------|--------|----------|
| 11 | 後端骨架、D1 遷移與效能索引 | 10 | Pages Functions、D1 遷移與索引、`npm run db:studio`、26 筆歷史資料、`/api/health` |
| 12 | 認證系統與 RBAC 權限微後端 | 11 | Web Crypto 密碼雜湊、JWT 簽發與旋轉、中介軟體角色階層檢核 |
| 13 | 住民基本資料 API | 11, 12 | **對接 residentRepository**、強制分頁、三管管路判斷、唯一約束、Audit Logs |
| 14 | 日常照護記錄與 24hr 鎖定 API | 11, 12 | **對接 careRecordRepository**、時間索引、24hr 硬性防呆鎖定、補充修正案、評分計算 |
| 15 | 藥物管理與去重 API | 11, 12 | **對接 medicationRepository**、給藥 D1 事務扣庫存、低庫存 (≤15) 警示、防呆去重 |
| 16 | 照護計畫 API | 11, 12 | **對接 carePlanRepository**、計畫/目標/服務項目關聯 CRUD、狀態流轉與區段合併 |
| 17 | 報表資料彙整與統計 API | 13, 14, 15, 16 | D1 SQL 高效聚合查詢、照護完成度/住民概覽/異常警示、供應儀表板與評鑑工具箱 |
| 18 | 長照法規動態防呆檢核 API | 13, 14 | 動態護理比 (1:20 vs 1:15)、夜班本國籍人員留守、特約社工 16hr 累計檢核 |
| 19 | 雙軌離線同步與衝突仲裁 API | 13, 14, 15, 16 | 接收前端 SyncQueue、D1 事務批次寫入、Server-wins、關鍵資料強制確認標記 |

### Phase 3: 測試與部署 (2 票)

| # | 票名稱 | 封鎖者 | 交付價值 |
|---|--------|--------|----------|
| 20 | 全端自動化與離線容錯測試套件 | 10, 17-19 | `@cloudflare/vitest-pool-workers` 後端測試、Playwright E2E 離線同步、契約測試 |
| 21 | Cloudflare 統一部署與維運自動化 | 11, 20 | GitHub Actions 部署 Pages + Functions + D1 遷移、D1 定時自動備份 (`wrangler d1 export`)、自訂網域 SSL |

---

## 執行策略 (Frontier)

### Week 1: 專案骨架 + 認證 + 離線核心
- **Day 1-2:** 01 (並行建置前端專案、MSW、CI/CD)
- **Day 3-4:** 02, 03 (並行：認證前端 + PWA 離線核心)
- **Day 5:** 01-03 整合驗證、Mock 種子資料準備

### Week 2: 業務功能前端 (4 票並行)
- 04 (住民)、05 (照護記錄)、06 (藥物)、07 (照護計畫)、08 (報表) — **可 5 票並行**，共享 03 的離線基礎
- 09 (系統管理) 依賴 02+04
- 10 (PWA 完善) 依賴 03+02

### Week 3: 後端微後端對接 (前端凍結、僅修 Bug)
- 11 (Pages Functions 骨架 + D1 遷移 + 索引建立 + `db:studio`)
- 12 (認證微後端) → 解鎖 13, 14, 15, 16, 18
- 13, 14, 15, 16 (4 大業務領域 API 並行，對接現有 `src/repositories/`)
- 17 (報表聚合) 依賴 13-16
- 18 (合規檢核) 依賴 13, 14
- 19 (離線同步與衝突解決) 依賴 13-16

### Week 4: 整合測試 + Cloudflare 統一部署
- 20 (全端自動化測試：契約測試確保前後端一致、Playwright E2E)
- 21 (Cloudflare Pages 生產部署、D1 定時自動備份管線、網域綁定)

---

## 關鍵決策：中介層 (Repository Pattern) 與 Mock 契約

| 契約定義位置 | 用途 |
|-------------|------|
| `packages/shared` | TypeScript 介面 (Request/Response DTO) |
| `apps/web/src/repositories/` | **前端中介層**：隔離 UI 與 API/DB，處理離線/連線切換與樂觀更新 |
| `apps/web/src/mocks/handlers/` | MSW handlers — 前端開發期的單一真實來源 |
| `apps/web/functions/api/` | Cloudflare Pages Functions 後端微服務（精準對接中介層契約） |

**前後端同步機制：**
1. 前端頁面統一透過 `apps/web/src/repositories/` 存取資料。
2. 後端 Functions 實作時**嚴格對齊** MSW 與 Repository 契約（路徑、欄位名、型別）。
3. Ticket 20 契約測試自動比對：`MSW handler 回應` vs `Pages Functions 實際回應`。

---

## 驗收標準

### 前端驗收 (Phase 1 完成)
- [ ] 所有頁面在 `MOCK_API=true` 下功能完整可操作
- [ ] 離線模式下可建立/編輯所有實體，上線自動同步
- [ ] 衝突中心能解決所有類型衝突，關鍵資料強制彈窗阻斷
- [ ] PWA 可安裝、Kiosk 模式鎖定導航、SW 更新通知
- [ ] 26 筆測試資料完整呈現、匯入預覽/確認流程通順

### 後端驗收 (Phase 2 完成)
- [ ] 所有 API 端點回應結構與前端中介層/MSW handlers 完全一致 (契約測試通過)
- [ ] 20 萬筆舊資料查詢建立索引（`resident_id`, `recorded_at`），查詢耗時 <50ms，支援強制分頁
- [ ] 24hr 自動鎖定排程與防呆執行正確、補充修正案流程通順
- [ ] 同步端點正確處理衝突、合併、去重
- [ ] 合規 API 計算邏輯正確、邊界條件處理
- [ ] `npm run db:studio` 本地視覺化編輯器可正常開啟並編輯資料

### 整體驗收 (Phase 3 完成)
- [ ] CI/CD 管線端到端綠燈、覆蓋率達標
- [ ] Cloudflare Pages 生產環境部署成功、煙霧測試通過
- [ ] 零主機待機維運成本、資料庫容量符合預算
- [ ] D1 定時備份排程正常運作、備份檔可還原