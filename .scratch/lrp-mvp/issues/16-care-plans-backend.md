# 16 — 照護計畫後端 API

**What to build:** 照護計畫後端 API：計畫 CRUD、目標與服務項目管理、狀態流轉、與住民關聯查詢。

**Blocked by:** 11-backend-foundation, 12-auth-backend

**Status:** ready-for-agent

- [ ] 實作 `GET /api/v1/care-plans`：支援 `?residentId=&status=&page=&limit=&sort=`
- [ ] 實作 `GET /api/v1/care-plans/:id`：回傳完整計畫含 goals、serviceItems
- [ ] 實作 `POST /api/v1/care-plans`：建立計畫、驗證評估日期 ≤ 今天、目標需有描述與目標日期、寫入稽核軌跡
- [ ] 實作 `PATCH /api/v1/care-plans/:id`：編輯計畫、寫入稽核軌跡
- [ ] 實作 `POST /api/v1/care-plans/:id/status`：狀態流轉 (Draft→Active→Completed/Archived)、驗證流轉合法性、寫入稽核軌跡
- [ ] 實作目標管理：`goals` 陣列 CRUD (goalId、description、targetDate、progress、status)、驗證 targetDate 格式
- [ ] 實作服務項目管理：`serviceItems` 陣列 CRUD (serviceType enum、frequency、startDate、endDate、notes)
- [ ] 實作 `POST /api/v1/care-plans/sync`：區段級合併 — `goals`、`serviceItems` 獨立比較合併、版本號 +1、衝突記錄
- [ ] 整合測試：計畫 CRUD、目標/服務項目管理、狀態流轉、稽核軌跡、同步合併