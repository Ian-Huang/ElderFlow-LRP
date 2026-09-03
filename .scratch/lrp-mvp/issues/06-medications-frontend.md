# 06 — 藥物管理前端頁面 (含 Mock)

**What to build:** 藥物管理完整前端介面：主檔列表/明細/新建/編輯、給藥記錄介面、庫存狀態視覺化 (綠/黃/紅)、低庫存警示、下一劑給藥時間、離線給藥記錄。所有資料來自 MSW mock。

**Blocked by:** 03-pwa-offline-frontend

**Status:** done

- [x] MSW Mock Handlers：`GET /api/v1/medications` (篩選/分頁)、`GET /api/v1/medications/:id`、`POST /api/v1/medications`、`PATCH /api/v1/medications/:id`、`POST /api/v1/medications/:id/administer`、`GET /api/v1/medications/alerts/low-stock`、`POST /api/v1/medications/sync` — 內建種子藥物、模擬庫存扣減、去重邏輯
- [x] 藥物主檔列表頁 (`/medications`)：住民篩選、狀態篩選、顯示藥名、劑量、頻率、庫存、下一劑時間、狀態標籤 (Normal/RunningLow/OutOfStock)
- [x] 藥物明細頁 (`/medications/:id`)：完整主檔、時間表 (schedule) 顯示、給藥歷程時間軸、庫存趨勢圖 (Recharts)
- [x] 新建/編輯藥物表單：藥名、劑量、頻率選單 (4 種)、時間表編輯器 (動態增減時段)、初始庫存、補貨閾值 (預設 15)、備註
- [x] 給藥記錄介面：住民藥物清單、每劑「給藥」按鈕 → 記錄時間/劑量/執行人 → 自動更新庫存與下一劑時間、離線可用
- [x] 庫存狀態視覺化：頂列警示條 (RunningLow/OutOfStock 計數)、卡片顏色編碼、低庫存 Toast 通知
- [x] 離線給藥：給藥按鈕離線可用、寫入 IndexedDB、同步時模擬去重合併 (同住民+同藥物+同時間)
- [x] 整合測試：主檔 CRUD、給藥流程、庫存扣減、低庫存警示、離線同步去重、下一劑時間計算