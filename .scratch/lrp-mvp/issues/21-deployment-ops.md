# 21 — 部署與運維設定

**What to build:** 生產環境部署完整設定：Azure 資源佈建 (Bicep/Terraform)、前後端 CI/CD 管線整合、環境變數管理、監控告警、備份策略、域名 SSL、災難演練文件。

**Blocked by:** 11-backend-foundation, 20-automated-tests

**Status:** ready-for-agent

- [ ] Azure 資源佈建腳本 (Bicep/Terraform)：Resource Group、Static Web App (前端)、Functions App 耗用量方案 (後端)、SQL Database Basic/Standard 台北節點、Key Vault、Application Insights、Log Analytics Workspace、Blob Storage (PDF/證據檔案)
- [ ] GitHub Actions 統一部署工作流：`main` 推送觸發 → 並行建構前端/後端 → 執行測試 (Ticket 20) → 通過後部署前端至 SWA、後端至 Functions → 執行資料庫遷移 → 煙霧測試 → 部署狀態通知
- [ ] 環境變數管理：GitHub Secrets 存放敏感值、Azure Key Vault 參考、前端 `VITE_*` 建構時注入、後端 Functions Application Settings 同步 Key Vault
- [ ] 監控告警：Application Insights 失敗率/延遲/例外告警、SQL Database CPU/儲存/連線數告警、前端錯誤上報 (Sentry 免費額度)、Azure Cost Management 預算警示 (5,000 NTD/月)、同步失敗率告警
- [ ] 備份策略：SQL 自動備份 (7 天保留 + 點還原)、Key Vault 憑證/密鑰備份、前端建構產物保留 (GitHub Artifacts)、Blob Storage 生命週期規則
- [ ] 域名與 SSL：自訂域名綁定 Static Web App、Let's Encrypt 自動續約 (SWA 內建)、HSTS、CSP 標頭設定 (`Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...`)
- [ ] 災難演練文件：RTO/RPO 定義 (RTO: 4hr, RPO: 1hr)、資料庫還原步驟、前端回滾步驟 (SWA 部署槽位)、關鍵聯絡人、Azure 支援方案
- [ ] 整合驗證：部署管線端到端執行成功、生產環境煙霧測試通過 (健康檢查、登入、建立記錄、同步)、監控儀表板可見、成本預估符合預算