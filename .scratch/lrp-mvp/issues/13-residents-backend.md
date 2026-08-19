# 13 — 住民基本資料後端 API

**What to build:** 住民基本資料完整後端 REST API：列表查詢 (多維度篩選)、單筆明細、新建、編輯、軟刪除/停用、匯入功能。嚴格執行業務規則：住民編號唯一永不重用、入住日期不可為未來、床位唯一性檢查、三管狀態自動衍生、稽核軌跡寫入。

**Blocked by:** 11-backend-foundation, 12-auth-backend

**Status:** ready-for-agent

- [ ] 實作 `GET /api/v1/residents`：支援 `?status=&hasThreePipe=&identityType=&dependencyLevel=&q=&page=&limit=&sort=`、分頁回傳、總筆數
- [ ] 實作 `GET /api/v1/residents/:id`：回傳完整住民資料含三管狀態、管路清單、床位、緊急聯絡人、身份別、依賴程度、身心障礙、重大傷病、照護計畫/藥物/記錄摘要計數
- [ ] 實作 `POST /api/v1/residents`：建立住民、驗證住民編號唯一 (唯一索引)、驗證入住日期 ≤ 今天、床位衝突檢查 (同時間 Active 住民不可重複床位)、自動計算 `hasThreePipe`、寫入稽核軌跡 (Create)
- [ ] 實作 `PATCH /api/v1/residents/:id`：編輯住民、管路異動觸發 `hasThreePipe` 重算、床位變更檢查衝突、寫入稽核軌跡 (Update、逐欄位舊值/新值/原因)
- [ ] 實作 `DELETE /api/v1/residents/:id`：軟刪除 (status → Inactive)、釋放床位、住民編號保留永不重用、寫入稽核軌跡 (Delete)
- [ ] 實作 `POST /api/v1/residents/import`：接受 multipart/form-data、解析 JSON/CSV/Excel (SheetJS)、轉換管線 (民國年→西元、管路 split、三管判斷、床位衝突檢查)、`dryRun` 預覽模式、事務性寫入、逐筆稽核軌跡
- [ ] 資料庫約束：住民編號唯一索引、床位部分唯一索引 (WHERE status='Active')、`hasThreePipe` 計算欄位/觸發器
- [ ] 整合測試：CRUD 完整流程、驗證規則邊界、匯入預覽/確認、稽核軌跡正確性、併發編輯樂觀鎖