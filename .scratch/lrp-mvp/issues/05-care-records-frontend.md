# 05 — 日常照護記錄前端頁面 (含 Mock)

**What to build:** 照護記錄完整前端介面：列表頁 (住民/日期/狀態篩選)、新建/編輯表單 (活動類型、協助等級、持續時間、生命徵象、備註)、完整性評分即時顯示、狀態標識 (綠/黃/紅)、24hr 編輯窗口倒數、補充修正案流程、離線建立/編輯、照片/影片上傳。所有資料來自 MSW mock。

**Blocked by:** 03-pwa-offline-frontend

**Status:** ready-for-agent

- [ ] MSW Mock Handlers：`GET /api/v1/care-records` (篩選/分頁)、`GET /api/v1/care-records/:id`、`POST /api/v1/care-records`、`PATCH /api/v1/care-records/:id`、`POST /api/v1/care-records/:id/status`、`POST /api/v1/care-records/:id/supplement`、`POST /api/v1/care-records/sync` — 內建種子記錄、模擬 24hr 鎖定邏輯
- [ ] 記錄列表頁 (`/care-records`)：住民下拉選單、日期範圍、狀態篩選 (彩色標籤)、分頁、每筆顯示完整性分數、時間戳、記錄人、狀態圓點
- [ ] 新建記錄頁 (`/care-records/new?residentId=`)：住民資訊標頭、動態活動表單 (增減項)、活動類型 7 種、協助等級 1-5、持續時間、生命徵象子表單 (VitalSigns 時顯示)、備註、照片/影片上傳區 (IndexedDB Blob 暫存)
- [ ] 編輯記錄頁 (`/care-records/:id/edit`)：同新建、24hr 倒數計時、鎖定狀態禁用編輯並顯示「已鎖定，僅能補充修正」
- [ ] 完整性評分即時計算：填寫過程中即時更新分數 (0-100)、缺項即時提示 (必填活動、生命徵象、證據)
- [ ] 狀態標識：列表/明細彩色圓點 (Normal=綠、NeedsReview=黃、VerificationRequired=紅)、狀態變更下拉選單
- [ ] 補充修正案頁面：鎖定記錄的「補充修正」按鈕 → 表單 → 送出建立關聯補充記錄 (Mock 回傳新版本)
- [ ] 離線建立/編輯：表單送出先寫入 IndexedDB (`useOfflineMutation`)、顯示「待同步」、同步後更新狀態
- [ ] 照片/影片上傳：檔案大小限制、預覽、離線暫存 IndexedDB、上線模擬上傳
- [ ] 整合測試：建立/編輯/鎖定/補充完整流程、離線→上線同步、驗證錯誤處理、評分計算正確性