# 12: 認證系統與 RBAC 權限微後端 (Auth & Session Middleware)

**What to build:**
基於 Cloudflare Pages Functions 的真實 JWT 認證與權限中介軟體：登入、Token 刷新、登出、快速切換使用者、使用 Web Crypto API 進行安全密碼雜湊與比對、實作 RBAC 角色層級防護 (`caregiver` < `supervisor` < `admin` < `sysadmin`)，對接前端 `authStore`。

**Blocked by:** 11-backend-foundation

**Status:** ready-for-agent

- [ ] 實作 `POST /api/auth/login`：使用 Web Crypto API 驗證帳號密碼雜湊，簽發 JWT Access Token (15min) 與 Refresh Token (7d)，支援 HttpOnly Cookie 或 Bearer Header
- [ ] 實作 `POST /api/auth/refresh`：比對 D1 儲存之有效 Refresh Token 雜湊，旋轉簽發新 Access Token
- [ ] 實作 `POST /api/auth/logout`：自 D1 撤銷 Refresh Token 並清除憑證
- [ ] 實作 `GET /api/users/me`：解析 Token 回傳當前使用者資訊、機構編號、角色與功能權限清單
- [ ] 實作 Pages Functions 中介軟體 (`functions/api/_middleware.ts`)：統一攔截需要授權之端點，檢核 JWT 簽名與過期時間
- [ ] 實作 RBAC 角色校驗輔助函式：檢驗角色階層，非授權存取即時中斷並回傳 403 Forbidden
- [ ] 實作 `GET /api/users/switchable` 與 `POST /api/auth/switch`：支援共用平板快速切換使用者帳號
- [ ] 整合測試：登入/刷新/登出/快速切換/權限攔截測試，全數通過