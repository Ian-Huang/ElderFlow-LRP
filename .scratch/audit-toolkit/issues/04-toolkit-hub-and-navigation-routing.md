# 04: 系統導覽入口與工具箱總覽路由 (Toolkit Hub & Navigation)

**What to build:**
將評鑑報表工具箱深度整合進現有 LRP Web 應用架構中。在頂部/側邊導覽列加入專屬的「評鑑工具箱」選單入口，建立 `/audit-toolkit` 總覽頁（Gallery），以精美卡片列出當前所有已註冊的報表工具，點擊卡片可導向對應的報表頁面 `/audit-toolkit/:reportId`。架構上為未來的第 2 個工具（如訪客紀錄單）保留自動讀取註冊清單並擴充卡片的能力。

**Blocked by:** 03: 首發模組：機構修繕通報追蹤記錄 (Repair Report Config & 8-Column View)

**Status:** done

- [x] 在 LRP 主導覽元件中加入「評鑑工具箱」專區導覽連結。
- [x] 於 React Router 路由體系配置 `/audit-toolkit` 與 `/audit-toolkit/:reportId` 路由分支。
- [x] 實作 `AuditToolkitHub` 首頁：以卡片展示當前註冊之工具（包含修繕記錄表與預告之訪客記錄表），顯示紙張方向標籤、功能簡述與進入按鈕。
- [x] 點擊卡片無縫導向 `/audit-toolkit/repairs`，使用者能流暢操作並能一鍵返回工具箱總覽。
- [x] 執行全系統 Type Check 與 Lint，確保無任何編譯與類型錯誤。
- [x] 驗證未授權或離線狀態下該專區頁面之穩定運作與可訪問性。

## Deliverables

- `apps/web/src/pages/audit-toolkit/AuditToolkitHub.tsx` — 評鑑工具箱總覽首頁 (Gallery)
- `apps/web/src/pages/audit-toolkit/AuditToolkitHub.test.tsx` — 4 項首頁卡片與擴充性測試，全數通過
- `apps/web/src/pages/audit-toolkit/AuditReportDispatcher.tsx` — 報表動態路由器 (支援 404 與預告狀態)
- `apps/web/src/pages/audit-toolkit/AuditRouting.test.tsx` — 8 項路由、全角色與離線權限整合測試，全數通過
- `apps/web/src/pages/audit-toolkit/AuditReportShell.tsx` — 增強頂部工具列支援「返回工具箱」流暢導航
- `apps/web/src/pages/audit-toolkit/RepairReportPrintView.tsx` — 整合 SPA 返回導航
- `apps/web/src/pages/audit-toolkit/reportRegistry.ts` — 註冊修繕報表與預告之訪客登記表模組
- `apps/web/src/pages/audit-toolkit/icons.tsx` — 新增 ArrowLeftIcon 與 BriefcaseIcon
- `apps/web/src/components/Layout.tsx` — 整合「評鑑工具箱」主選單入口、未登入訪客模式與列印隱藏樣式
- `apps/web/src/App.tsx` — 配置 `/audit-toolkit` 與 `/audit-toolkit/:reportId` 路由分支
