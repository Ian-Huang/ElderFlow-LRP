# 01 — 專案骨架與建置基礎建設

**What to build:** 建立前端專案骨架：React 18/19 + TypeScript + Vite + Tailwind CSS、共用型別套件、ESLint/Prettier/Husky、GitHub Actions CI、Vite PWA Plugin 設定、MSW (Mock Service Worker) 手寫 mock handlers 架構。此階段**不包含後端專案**，專注前端可獨立開發、建構、部署至 Azure Static Web Apps。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 建立 `apps/web` 前端專案：Vite + React + TypeScript + Tailwind CSS
- [ ] 建立 `packages/shared` 型別套件：Resident、CareRecord、Medication、CarePlan、AuditEntry、SyncConflict 等介面（從規格提取）
- [ ] 設定 ESLint (Airbnb/標準)、Prettier、Husky pre-commit hooks
- [ ] 設定 GitHub Actions：前端建構、型別檢查、單元測試、部署至 Azure Static Web Apps
- [ ] 設定 Vite PWA Plugin (Workbox) ：`registerType: 'autoUpdate'`、manifest.json (`display: "fullscreen"`、`orientation: "landscape"`)
- [ ] 設定 MSW (Mock Service Worker)：`handlers/` 目錄結構、環境變數切換 `MOCK_API=true/false`、預設開啟 mock 模式
- [ ] 設定共用 API 呼叫層：TanStack Query + `apiClient` 統一錯誤處理、攔截器（支援 MSW 與真實後端無縫切換）
- [ ] 設定 Zustand 全域狀態：auth、sync、UI theme
- [ ] 驗證：`npm run dev` 啟動、MSW 攔截所有 `/api/*` 回傳 mock 資料、建構產物可部署