# 11 — 後端專案骨架與資料庫遷移

**What to build:** Azure Functions 後端專案骨架 (Node.js 20, TypeScript)、資料庫遷移系統、共用型別套件同步 (從 `packages/shared`)、本地開發環境 (Azurite/本地 SQL)、環境變數管理、GitHub Actions 後端 CI。

**Blocked by:** 10-pwa-polish-frontend (前端驗收完成後再建後端，確保 API 契約已定型)

**Status:** ready-for-agent

- [ ] 建立 `apps/api` Azure Functions 專案：TypeScript、ESM、函數結構 (`src/functions/`) 、共用中介軟體
- [ ] 設定資料庫遷移工具：`db-migrate` 或 `knex` 遷移檔案、`migrations/` 目錄、種子資料腳本
- [ ] 同步 `packages/shared` 型別至後端：`npm link` 或工作區相依、確保前後端型別一致
- [ ] 本地開發設定：`local.settings.json` 範本、Azurite 儲存體模擬器、本地 SQL Express/容器連線
- [ ] 環境變數：`DB_CONNECTION_STRING`、`JWT_SECRET`、`JWT_REFRESH_SECRET`、`AZURE_BLOB_CONNECTION`、`FRONTEND_URL`
- [ ] GitHub Actions 後端 CI：TypeScript 編譯、單元測試、遷移腳本驗證、建構成品上傳
- [ ] 健康檢查端點：`GET /api/health` 回傳 `{status: 'ok', timestamp, version}`
- [ ] 驗證：`func start` 本地啟動、遷移腳本建立所有資料表、種子資料匯入 26 筆測試住民