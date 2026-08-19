# 09 — 系統管理與使用者管理前端 (含 Mock)

**What to build:** 系統管理前端介面：使用者帳號 CRUD 表格、角色指派下拉、系統設定表單 (同步間隔、24hr 鎖定時長、低庫存閾值、PDF 字體)、稽核軌跡查詢入口。所有資料來自 MSW mock。

**Blocked by:** 02-auth-frontend, 04-residents-frontend

**Status:** ready-for-agent

- [ ] MSW Mock Handlers：`GET /api/v1/users` (分頁/角色篩選)、`POST /api/v1/users`、`PATCH /api/v1/users/:id/role`、`PATCH /api/v1/users/:id/status`、`GET /api/v1/system/settings`、`PATCH /api/v1/system/settings`
- [ ] 系統管理頁面 (`/admin`)：側邊欄導航 (使用者管理 / 系統設定 / 稽核軌跡)
- [ ] 使用者管理表格：新增按鈕 (彈窗表單：帳號、密碼、角色)、編輯角色下拉 (caregiver/supervisor/admin/sysadmin)、啟用/停用切換、刪除確認、樂觀更新
- [ ] 系統設定表單：同步間隔 (秒)、24hr 鎖定時長 (小時)、低庫存閾值預設、PDF 字體選擇、儲存成功 Toast
- [ ] 稽核軌跡查詢入口：連結至 `/reports/audit-trail`、預設篩選系統管理相關操作
- [ ] 角色權限矩陣顯示：唯讀表格展示四角色權限對照
- [ ] 整合測試：使用者 CRUD、角色變更即時生效 (Mock 回傳新權限)、系統設定持久化