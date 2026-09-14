# 21: Cloudflare 統一部署與維運自動化 (Cloudflare Pages & D1 Unified Ops)

**What to build:**
生產環境統一部署與維運設定：Cloudflare Pages 專案設定、前後端一體化 CI/CD 管線 (GitHub Actions)、環境變數與 D1 Database Binding 管理、D1 定時自動備份排程 (`wrangler d1 export`)、自訂網域與 SSL 憑證。

**Blocked by:** 11-backend-foundation, 20-automated-tests

**Status:** ready-for-agent

- [ ] Cloudflare Pages 專案佈建：配置專案名稱、Root 目錄為 `apps/web`、Build Command 為 `npm run build:web`、產出目錄為 `dist`、Functions 自動識別 `functions/`
- [ ] GitHub Actions 統一部署工作流：`main` 分支推送 ➜ 執行測試 (Ticket 20) ➜ 自動發布前端與 Pages Functions ➜ 執行 D1 遠端資料庫遷移 (`wrangler d1 migrations apply`)
- [ ] 環境變數管理：於 Cloudflare Pages Dashboard 與 GitHub Secrets 設定 `JWT_SECRET`、`VITE_API_BASE_URL` 等安全變數
- [ ] D1 定時自動備份策略：設定 GitHub Actions Cron（每日凌晨）自動執行 `npx wrangler d1 export <db-name> --output=backup.sql` 並加密封存，落實 RTO/RPO 災備需求
- [ ] 域名與安全防護：綁定機構自訂網域、自動啟用 Cloudflare 邊緣 SSL/TLS 1.3、啟用 HSTS、配置嚴格 CSP 安全標頭
- [ ] 整合驗證：生產環境煙霧測試通過（全站 HTTPS、健康檢查、登入、各模組讀寫、離線同步、零主機費用）