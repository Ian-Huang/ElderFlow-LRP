# 02 — 認證系統與快速切換使用者 (前端 + Mock)

**What to build:** 完整的前端認證流程：登入頁面、JWT Token 管理 (Access/Refresh、HttpOnly Cookie 模擬)、RBAC 權限導向、快速切換使用者下拉選單 (記住最近 5 組、IndexedDB 持久化、離線可切換)。所有 API 呼叫透過 MSW mock 回傳預設帳號資料。

**Blocked by:** 01-project-foundation

**Status:** ready-for-agent

- [x] 登入頁面 (`/login`)：帳號/密碼表單、React Hook Form + Zod 驗證、錯誤顯示、載入狀態
- [x] MSW Mock Handlers：`POST /api/v1/auth/login` (回傳 access/refresh token、角色)、`POST /api/v1/auth/refresh`、`POST /api/v1/auth/logout`、`GET /api/v1/users/me`、`GET /api/v1/users/switchable`
- [x] Token 管理：Axios 攔截器自動附加 Authorization header、401 時自動呼叫 refresh、refresh 失敗導向登入頁
- [x] RBAC 導向：`requireRole` HOC/hook、路由守衛 (caregiver/supervisor/admin/sysadmin)
- [x] 快速切換下拉選單 (頂列固定)：顯示最近 5 組帳號 (名稱、角色、頭像)、點擊切換 → 呼叫 `/auth/switch` (mock) → 更新 Zustand auth store、保留當前頁面狀態
- [x] IndexedDB 持久化：Dexie.js 儲存 `recentUsers` (含加密 mock refresh token)、`currentUser`、離線啟動時還原
- [x] 登出功能：清除 Token、清除 IndexedDB 當前帳號、導向登入頁
- [x] 單元測試：Token 存取/刷新/過期邏輯、RBAC 權限檢查、切換帳號狀態保留
- [x] 整合測試：登入 → 切換帳號 → 重新整理頁面保持登入 → 登出完整流程