# 20 — 自動化測試套件 (全端)

**What to build:** 完整的自動化測試套件：前端單元/整合/E2E、後端單元/整合、契約測試 (前後端 API 契約一致性)、離線同步測試、合規規則測試。配置 CI/CD 階段自動執行。

**Blocked by:** 10-pwa-polish-frontend (前端完成), 17-reports-backend, 18-compliance-backend, 19-sync-conflict-backend (後端核心 API 完成)

**Status:** ready-for-agent

- [ ] 前端單元測試 (Vitest)：Zod 驗證 schema、completenessScore 計算、hasThreePipe 判斷、民國年轉換、日期驗證、下一劑時間計算、護理比例計算、Composable 邏輯 (`useOfflineMutation`、`useSyncQueue`)
- [ ] 前端整合測試 (Vitest + MSW)：各頁面完整流程 (登入→列表→新建→編輯→刪除)、離線寫入→同步、衝突解決、表單驗證
- [ ] 前端 E2E 測試 (Playwright)：關鍵使用者旅程 — 登入→選住民→建照護記錄→看報表、離線建記錄→上線同步→驗證、給藥流程、低庫存警示、鎖定/補充修正案、Kiosk 模式、PWA 安裝
- [ ] 後端單元測試 (Vitest/Jest)：業務邏輯函式 (分數計算、比例計算、日期轉換、去重邏輯)、驗證中介軟體、RBAC
- [ ] 後端整合測試：所有 API endpoint 合約測試 (Supertest + 測試資料庫)、資料庫 CRUD、稽核軌跡寫入、RBAC 權限、排程任務 (24hr 鎖定)
- [ ] 契約測試：前端 MSW handlers 與後端實際回應結構一致性驗證 (共用 Zod schema、OpenAPI spec 比對)
- [ ] 離線同步專項測試：併發編輯衝突、Server-wins 驗證、欄位級合併、去重邏輯、強制確認彈窗阻斷 (前後端整合)
- [ ] 合規測試：BR001 24hr 鎖定、BR002 補充修正案、BR003 夜班檢核、BR004 護理比例、BR005 工時累計、BR006 審閱期、BR007 稽核軌跡
- [ ] PWA 測試：SW 註冊、快取策略、離線安裝、IndexedDB 讀寫、背景同步觸發
- [ ] CI/CD 整合：GitHub Actions 階段 `test:frontend:unit`、`test:frontend:e2e`、`test:backend:unit`、`test:backend:integration`、`test:contract`、覆蓋率門檻 (關鍵模組 ≥80%)
- [ ] 測試資料管理：測試專用種子資料、測試間隔離 (資料庫事務回滾或獨立測試 DB)、MSW handlers 共用種子資料工廠