# 20: 全端自動化與離線容錯測試套件 (Fullstack Automated Testing)

**What to build:**
全端自動化測試套件：前端單元/整合/E2E、後端 Pages Functions 整合測試（使用 Cloudflare 官方 Vitest Pool）、前後端 API 契約一致性測試、離線同步與法規防呆測試。

**Blocked by:** 10-pwa-polish-frontend, 17-reports-backend, 18-compliance-backend, 19-sync-conflict-backend

**Status:** ready-for-agent

- [ ] 後端微服務測試：配置 `@cloudflare/vitest-pool-workers`，於近真實 Workers 環境中執行 Pages Functions 與本地 D1 交易整合測試
- [ ] 前後端契約測試：自動比對前端 `src/mocks/handlers/` MSW 回應結構與後端 Functions 實際回傳格式，確保型別與欄位名 100% 吻合
- [ ] 前端 E2E 測試 (Playwright)：模擬核心業務旅程（登入 ➜ 選取住民 ➜ 離線建立照護記錄 ➜ 網路恢復自動同步至 D1 ➜ 即時更新報表）
- [ ] 離線與衝突專項測試：驗證併發編輯衝突、Server-wins 處理、用藥與生命徵象強制確認彈窗阻斷流程
- [ ] 長照法規專項測試：BR001 24hr 鎖定、BR002 補充修正案、BR003 夜班檢核、BR004 動態護理比、BR006 審閱期、BR007 5年稽核軌跡
- [ ] 測試資料隔離：建立測試專用 D1 快照與種子資料，各測試案例獨立重置
- [ ] CI/CD 整合：於 GitHub Actions 中設定 `npm run test` 與 `npm run test:e2e` 門檻（關鍵商業邏輯測試覆蓋率 ≥80%）