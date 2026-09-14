# ADR 0001: 系統架構定調為 Cloudflare Jamstack (Pages + Functions + D1)

- **狀態**：Accepted (已定案)
- **日期**：2026-09-14
- **決策者**：團隊與機構架構討論
- **諮詢對象**：第一線照護、評鑑準備小組

---

## 背景與問題陳述 (Context & Problem Statement)

本系統為台灣長照機構（安養院）內部管理與評鑑輔助系統（LRP），主要由內部員工（照服員、護理師、社工、行政主管）使用。
目前系統前端採用 React 18 + Vite + Dexie (IndexedDB) + PWA，面臨以下部署與資料儲存挑戰：

1. **短期評鑑急迫性**：需要一個快速上線、零維護成本、可方便多位人員/委員即時檢視或列印的臨時評鑑文件工具箱。
2. **本機儲存風險**：純依賴瀏覽器 IndexedDB 存在重大風險（若使用者不慎清除瀏覽器快取或使用無痕模式，未備份資料將遺失；且跨裝置/跨平板無法同步）。
3. **雲端成本與資安**：前期開發與短期評鑑階段不宜投入昂貴雲端資料庫（如傳統每月數千元台幣之 Azure SQL / AWS RDS），且避免複雜之 Linux 伺服器運維。
4. **廠商綁定 (Vendor Lock-in) 防範**：初期選擇之託管與資料庫方案，必須具備極高可移植性，若未來機構需要更換主機或自建後端，前端畫面與業務邏輯不得推翻重寫。

---

## 決策結果 (Decision Outcome)

決定全面定調專案架構為 **Cloudflare Jamstack 全端無伺服器模式**：

1. **前端託管 (Hosting & CDN)**：
   - 使用 **Cloudflare Pages** 託管 Vite 打包之 React SPA 靜態產物。
   - 享有全球 Anycast CDN 高速分發、零流量費用限制、自動 SSL、與 Git 整合之預覽分支。
2. **微後端與 API 層 (Serverless API)**：
   - 使用 **Cloudflare Pages Functions**（位於 `apps/web/functions/api/` 或由 Cloudflare Workers 派送）。
   - 處理使用者身分驗證 (JWT/Session)、RBAC 角色權限防呆、業務邏輯校驗。
3. **主資料庫 (Cloud Master Database)**：
   - 使用 **Cloudflare D1**（Serverless SQLite 關聯式資料庫）。
   - 免費額度極高（每日 500 萬次讀取、10 萬次寫入），完全足以支撐內部員工與評鑑測試。
   - 底層為正統 SQLite，可隨時透過 `wrangler d1 export` 匯出標準 SQL，資料遷移零門檻。
4. **離線與快取策略 (Offline-First Hybrid)**：
   - 保留前端 **Dexie (IndexedDB)** 與 Service Worker 作為本機離線快取與樂觀更新 (Optimistic UI) 緩衝區。
   - 連線時透過 API 同步至雲端 Cloudflare D1，達成「離線可填寫、連線自動同步、雲端不丟失」之雙重保障。

---

## 程式碼架構與可移植性準則 (Portability Guidelines)

為確保未來無痛轉移至其他主機或後端（如自建 PostgreSQL / NestJS / Go）：

* **前端嚴格實作服務隔離層 (API Service Layer)**：
  - 前端 UI 元件嚴禁直接呼叫平台特有 SDK。
  - 所有資料存取一律透過 `src/services/` 或 Repository 模組發送標準 HTTP REST API (`fetch` / `axios`)。
  - 未來若更換後端，僅需調整 API 端點與 Service 實作，前端數十個 React 畫面與表格 100% 保持不變。
* **資料庫結構標準化**：
  - D1 資料表結構遵照標準 ANSI SQL，不使用 Cloudflare 特有專有資料型別，以利未來隨時遷移至 PostgreSQL / MySQL。

---

## 資料庫效能與查詢準則 (Performance & Querying Rules)

考量歷史資料庫近 20 萬筆數據與 D1 限制，各後端 API 與遷移腳本必須嚴格遵守以下準則：

1. **外鍵與時間索引強制建立 (Mandatory Indexing)**：
   - 凡涉及查詢條件之欄位（特別是 `resident_id`、`recorded_at`、`created_at`、`date`），必須於遷移 DDL 中建立 `INDEX`。
   - 杜絕 20 萬筆大表全表掃描 (Full Table Scan)，確保單次查詢在 2~5ms 內完成並節省 D1 讀取額度。
2. **強制分頁與時間範圍查詢 (Pagination & Date-Range Only)**：
   - 所有列表 API 嚴禁無條件 `SELECT *` 大表，必須支援分頁（`limit`/`offset`，預設 20~50 筆）或日期區間過濾。
3. **容量監控 (Capacity Budget)**：
   - D1 免費上限為 500 MB（目前舊資料庫約 34 MB，佔 6.8%），每年自然成長約 10~15 MB，足以支援 20 年以上。

---

## 狀態影響 (Consequences)

### 正向影響 (Positive)
- **零主機運維成本**：無需管理 Linux、Nginx、修補 OS 漏洞。
- **零伺服器待機費用**：在免費方案額度內完成開發、評鑑與試營運。
- **跨裝置無縫同步**：解決多位評鑑人員或同仁換平板無法檢視資料的痛點。
- **一體化部署**：前端靜態資源、Functions 與 D1 整合於單一 Cloudflare 專案與流程中。

### 潛在限制與應對 (Negative & Mitigation)
- **原本規劃之 Azure 方案退場**：原先於 `.scratch/lrp-mvp/` 中規劃之 Azure Functions / Azure SQL 部署腳本，調整為 Cloudflare Pages + D1 架構。
