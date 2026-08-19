# 04 — 住民基本資料前端頁面 (含 Mock)

**What to build:** 住民基本資料管理的完整前端介面：列表頁 (搜尋/篩選/分頁/排序)、明細頁、新建/編輯表單 (React Hook Form + Zod)、停用確認、匯入功能。所有資料來自 MSW mock，支援離線瀏覽與樂觀更新。

**Blocked by:** 02-auth-frontend, 03-pwa-offline-frontend

**Status:** ready-for-agent

- [ ] MSW Mock Handlers：`GET /api/v1/residents` (篩選/分頁)、`GET /api/v1/residents/:id`、`POST /api/v1/residents`、`PATCH /api/v1/residents/:id`、`DELETE /api/v1/residents/:id`、`POST /api/v1/residents/import` — 內建 26 筆種子資料 (對齊 `docs/住民資料.json`)
- [ ] 住民列表頁 (`/residents`)：Table/Grid 切換、即時搜尋 (姓名/編號/身分證)、多重篩選器 (狀態、三管、身份別、依賴程度)、分頁、排序、離線模式標示
- [ ] 住民明細頁 (`/residents/:id`)：完整資訊、管路標籤 (三管高亮)、床位、緊急聯絡人卡片、身份別/依賴程度/身心障礙/重大傷病區塊、照護計畫/藥物/記錄連結
- [ ] 新建/編輯表單 (`/residents/new`、`/residents/:id/edit`)：RHF + Zod 共用 schema、日期選擇器 (民國年/西元雙顯示、儲存 ISO 8601)、管路多選 (自動計算三管)、床位選擇 (顯示可用)、緊急聯絡人完整欄位、離線送出 → 樂觀更新列表
- [ ] 停用確認對話框：警告說明、輸入原因、樂觀更新狀態為 Inactive
- [ ] 匯入頁面 (`/residents/import`)：檔案上傳 (拖曬/點選)、格式說明與範例下載、預覽模式 (dryRun) → 結果表格可編輯修正 → 確認匯入 → 進度條 → 結果報告下載
- [ ] Mock 匯入邏輯：民國年轉西元、管路 split、三管判斷、床位衝突檢查、住民編號唯一檢查
- [ ] 可近用性：語意化 HTML、鍵盤導航、ARIA、色彩對比
- [ ] 整合測試：列表篩選/搜尋/分頁、新建/編輯/停用流程、匯入預覽/確認、離線模式瀏覽