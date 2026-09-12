# Original User Request

## 2026-09-04T04:01:46Z

# Teamwork Project Prompt — Draft

> Status: Step 1 — Eliciting project idea
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

完成 LRP MVP 中的三個前端子系統：報表前端、系統管理前端與 PWA 優化，確保功能完整、測試覆蓋、PWA 合規與安全驗證。

Working directory: ~/teamwork_projects/lrp_mvp

## Requirements

### R1. 完成報表前端 (08‑reports‑frontend)
- 實作報表頁面，支援資料視覺化、匯出與過濾功能。
- 使用現有的 UI 框架（如 Ant Design）與資料抓取層（RTK Query）。

### R2. 完成系統管理前端 (09‑system‑admin‑frontend)
- 實作使用者管理、系統健康、功能旗標、日誌與稽核等頁面。
- 遵循安全與 RBAC 規範，確保僅 admin 可存取。

### R3. 完成 PWA 優化 (10‑pwa‑polish‑frontend)
- 添加離線快取、Web App Manifest、服務工作者，使前端可作為 PWA 使用。
- 確保在行動裝置上有良好使用體驗，並支援「安裝」功能。

## Acceptance Criteria

### AC1. 功能完整性
- 各頁面在本地開發伺服器上無錯誤載入，所有互動（搜尋、過濾、匯出、設定切換）均能正常執行。

### AC2. 測試覆蓋
- 為每個頁面提供單元測試（Jest + React Testing Library）與端對端測試（Cypress），測試必須通過。

### AC3. PWA 合規
- 能在 Chrome/Edge/Safari 中以「Add to Home Screen」安裝，離線時仍能顯示主要 UI。

### AC4. 安全驗證
- 非 admin 用戶訪問 `/admin/*` 會被導向 403/登入頁。
- 所有 API 請求皆帶有 CSRF token，且在開發環境中模擬驗證失敗情形。

### AC5. 效能指標
- 首次載入時間 < 2 秒（Chrome Lighthouse 評分 ≥ 90）。
- 報表與日誌頁面使用分頁或虛擬化，避免一次渲染過多資料。

---
*Next: when approved → delegate via invoke_subagent (see Delegation Protocol)*
