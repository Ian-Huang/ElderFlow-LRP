# 07 — 照護計畫前端頁面 (含 Mock)

**What to build:** 照護計畫完整前端介面：計畫列表、明細、新建/編輯表單 (目標與服務項目動態編輯)、狀態流轉按鈕、住民明細頁內嵌照護計畫摘要。所有資料來自 MSW mock。

**Blocked by:** 03-pwa-offline-frontend

**Status:** ready-for-agent

- [ ] MSW Mock Handlers：`GET /api/v1/care-plans` (篩選/分頁)、`GET /api/v1/care-plans/:id`、`POST /api/v1/care-plans`、`PATCH /api/v1/care-plans/:id`、`POST /api/v1/care-plans/:id/status` — 內建種子計畫
- [ ] 計畫列表頁 (`/care-plans`)：住民篩選、狀態篩選、顯示評估日期、複審日期、狀態、主要目標摘要
- [ ] 計畫明細頁 (`/care-plans/:id`)：完整計畫資訊、目標清單 (進度條顯示 0-100%)、服務項目時間表、狀態標籤 (Draft/Active/Completed/Archived)
- [ ] 新建/編輯計畫表單：評估日期、複審日期、目標動態增減 (描述、目標日期、進度、狀態)、服務項目動態增減 (類型 enum、頻率、起迄日期、備註)、Zod 驗證
- [ ] 狀態流轉 UI：Draft 顯示「啟用」、Active 顯示「完成/封存」、Completed/Archived 顯示「重新啟用」(需確認對話框)
- [ ] 住民明細頁嵌入照護計畫摘要卡片：顯示當前啟用計畫的目標與服務項目、連結至完整頁面
- [ ] 整合測試：計畫 CRUD、目標/服務項目編輯、狀態流轉、住民關聯顯示、驗證規則