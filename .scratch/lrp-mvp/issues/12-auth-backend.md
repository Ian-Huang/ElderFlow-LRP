# 12 — 認證系統後端 API

**What to build:** 真實的 JWT 認證後端：登入/刷新/登出、RBAC 中介軟體、使用者查詢/切換、密碼雜湊 (bcrypt/argon2)、Refresh Token 儲存與撤銷、HttpOnly Secure Cookie 設定。

**Blocked by:** 11-backend-foundation

**Status:** ready-for-agent

- [ ] 實作 `POST /api/v1/auth/login`：驗證帳密 (bcrypt)、簽發 access token (15min, RS256) + refresh token (7d, 隨機字串)、設定 HttpOnly Secure SameSite=Strict Cookie、寫入 refresh token 雜湊至資料庫
- [ ] 實作 `POST /api/v1/auth/refresh`：驗證 refresh token (資料庫比對雜湊)、簽發新 access token、旋轉 refresh token (舊失效、新存入)
- [ ] 實作 `POST /api/v1/auth/logout`：撤銷 refresh token (資料庫標記 revoked)、清除 Cookie
- [ ] 實作 `GET /api/v1/users/me`：從 access token 解析 userId、查詢資料庫回傳使用者資訊、角色、權限
- [ ] 實作 RBAC 中介軟體：`requireRole('caregiver' | 'supervisor' | 'admin' | 'sysadmin')`、支援多角色
- [ ] 實作 `GET /api/v1/users/switchable`：查詢目前使用者可切換帳號 (同機構、最近登入 5 組)、回傳含加密 refresh token
- [ ] 實作 `POST /api/v1/auth/switch`：驗證目標帳號 refresh token、簽發新 access token
- [ ] 實作 `GET /api/v1/users`、`POST /api/v1/users`、`PATCH /api/v1/users/:id/role`、`PATCH /api/v1/users/:id/status` (admin/sysadmin)
- [ ] 整合測試：登入/刷新/登出/切換/權限檢查、Token 過期處理、Cookie 安全屬性