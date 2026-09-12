# 評鑑報表工具箱 (Audit Toolkit) 架構與開發規範手冊

本文件為長照機構評鑑報表工具箱（Audit Toolkit）的**核心架構設計契約**與**工程開發準則**。未來的工程師或 AI Agent 接到「新增/修改評鑑報表」需求時，**必須嚴格遵循本文件規範**。

---

## 一、模組定位與設計目標

長照機構面臨評鑑查核的高度急迫性，但完整後端系統與工作流推進需要時間。**評鑑報表工具箱**作為實用主義的過渡橋樑（Pragmatic Bridge）：
1. **純前端、高可用、無伺服器依賴**：可在離線或瀏覽器端直接運作，支援下載標準 UTF-8 CSV 範本、匯入本機歷史資料。
2. **評鑑實體輸出優先（Print-First）**：排版完全針對真實實體 A4 列印與 PDF 輸出調校，確保格式美觀、嚴謹、無第二頁溢出或底部尷尬空白。
3. **可擴充註冊中心架構**：新增任何報表無需重寫外殼與路由，一律透過 Registry 註冊。

---

## 二、四大不可妥協之評鑑與設計原則 (Non-Negotiable Standards)

所有納入工具箱的報表，均必須落實以下四大標準：

### 1. 評鑑合規防呆：未來的時間絕對不能預勾（Future Date Protection）
- **長照評鑑痛點**：評鑑委員實地抽查時，若發現報表上有「未來尚未發生的日期」預先打勾或簽名，將被認定為造假或重大稽核缺失。
- **實作規範**：
  - 必須呼叫防呆函式 `isFutureDate(year, month, day, [refDate])`。
  - **當月大於今天的日期、以及未來的月份**：預設布林值**一律維持 `false` 空白**。
  - **互動防呆**：未來單元格禁止點擊打勾（滑鼠懸停顯示禁止游標 `cursor-not-allowed`）。
  - **一鍵打勾/清除**：僅作用於今天與過去的日期，絕對不得污染未來日期。

### 2. 擬真人手打勾效果（Humanized Handwritten Checkmarks）
- **長照評鑑痛點**：全篇一律使用死板電腦打字「✔」或固定 SVG 會給人僵化死板的印象；實體表單需要呈現第一線人員日常親自巡檢劃記的「自然手寫溫度」。
- **實作規範**：
  - 統一使用 `HandwrittenCheck` 元件，內建 **14 種擬真人手寫路徑**（俐落勾、甩尾勾、長勾、急勾、短勾等）。
  - 搭配動態樣式微隨機演算法：旋轉角度（-8° ~ +8°）、縮放尺寸（0.85 ~ 1.15 倍，呈現大中小）、微位移（-1.5px ~ +1.5px，呈現微歪斜手感）。
  - **跨月隨機種子演算法 `getHandwrittenSeed`**：
    必須以 FNV-1a 雜湊將 `(year, month, day, itemIndex, shift)` 全部混入計算。
    **嚴格禁止「每個月同一天（例如 8/1、9/1、10/1）長得一模一樣」**，確保跨月呈現真實手寫多樣性。

### 3. A4 直向滿版零空白（Full Bleed Print Styling）
- **列印排版痛點**：一般 CSS 列印時，表格常僅佔紙張上半部，下方留下大截尷尬空白，或者高度過長意外擠壓出空白第 2 頁。
- **實作規範**：
  - **A4 直向單頁制式規格**：
    - 外層容器：`min-h-[1123px] max-h-[1123px] flex flex-col justify-between`。
    - 列印樣式：`@page { size: A4 portrait; margin: 4mm 6mm; }`。
    - 列印媒體查詢：`@media print { .no-print { display: none !important; } }`。
  - **三旬制式分期排版**：針對整月份檢查表，採用 **上旬 (1~10)、中旬 (11~20)、下旬 (21~31)** 三個獨立表格區塊垂直均勻拉伸佈局，完美貼合單張 A4 直向。

### 4. 簽名欄位與表頭編輯（Signatures & Editable Headers）
- **簽名欄**：
  - 班別（如日班/夜班）之簽名格**必須合併跨越（`colspan="2"`）**，提供兩倍寬度給現場人員以原子筆手寫簽署。
  - 預設一律留白，嚴禁預先塞入管理員假章或印刷體名字。
- **可點擊即時編輯（`contenteditable="true"`）**：
  - 表頭之「機構名稱」、「表單編號（如 F-環安-004）」、「主標題」、「修訂日期（如 111.01.01 一修）」均支援在畫面上點擊直接自訂打字修改，滿足不同機構或不同年度評鑑之彈性。

---

## 三、系統架構與程式碼組織

整個評鑑工具箱位於 `apps/web/src/pages/audit-toolkit/`：

```
apps/web/src/pages/audit-toolkit/
├── index.ts                     # 模組統一對外導出進入點
├── auditToolkitTypes.ts         # 核心介面 (AuditReportConfig, AuditReportColumn 等)
├── reportRegistry.ts            # 報表註冊中心 (單例 Registry Pattern)
├── AuditReportShell.tsx         # 報表通用外殼 (A4 紙張外框、工具列、列印觸發器)
├── AuditToolkitHub.tsx          # 工具箱總覽入口首頁 (/audit-toolkit)
├── AuditReportDispatcher.tsx    # 動態分發路由 (/audit-toolkit/:reportId)
│
├── repairsReportConfig.ts       # 模組 1：機構修繕通報紀錄表 設定檔
├── RepairReportPrintView.tsx    # 模組 1：橫向 A4 歷史資料報表視圖
│
├── sanitationReportConfig.ts    # 模組 2：環境清潔消毒紀錄表 設定檔
└── SanitationReportPrintView.tsx# 模組 2：直向 A4 一頁三旬制式打勾視圖
```

---

## 四、新增一張評鑑報表的標準開發 3 步驟（Playbook）

當開發者或 AI 需要新增第三張、第四張評鑑報表（例如「訪客與志工記錄單」、「體溫量測登記表」）時，請依照下列三步驟進行：

### 步驟 1：建立報表設定檔 `[name]ReportConfig.ts`
實作 `AuditReportConfig` 介面，定義：
- `id`：唯一定義代碼（URL slug，如 `visitor` 或 `temperature`）。
- `title`：報表名稱。
- `orientation`：`'portrait'`（直向）或 `'landscape'`（橫向）。
- `columns`：表格欄位設定清單（供 CSV 範本與驗證使用）。
- `sampleData`：預設展示示範資料。

### 步驟 2：實作報表列印視圖 `[name]ReportPrintView.tsx`
根據報表特性選擇適合的版型架構：
- **類型 A：單頁月曆/打勾型（如消毒表、體溫表）**：
  - 引入 `HandwrittenCheck` 與 `getHandwrittenSeed` 渲染擬真人手打勾。
  - 引入 `isFutureDate` 嚴格限制未來日期不可勾。
  - 採用三旬直向滿版排版，簽名欄合併留白。
- **類型 B：多頁歷程清單型（如修繕通報、訪客清單）**：
  - 使用 `AuditReportShell` 包裹，支援 CSV 匯入與 `thead` 每頁重複自動換頁。

### 步驟 3：在註冊中心註冊並導出
1. 在 `reportRegistry.ts` 中調用 `reportRegistry.register(yourNewReportConfig)`。
2. 在 `AuditReportDispatcher.tsx` 中將該 `id` 對應到新 View。
3. 在 `index.ts` 導出對應元件與設定。
4. 撰寫對應單元測試（驗證 Registry、未來防呆、手寫打勾與列印按鈕）。

---

## 五、現有報表清單與參考基準

| 報表代碼 | 報表名稱 | 表單編號 | 紙張方向 | 版型特色 |
| :--- | :--- | :--- | :--- | :--- |
| `repairs` | 機構修繕通報追蹤記錄 | - | 橫向 A4 (Landscape) | 8 欄制式清單、CSV 歷史資料匯入、多頁自動換頁。 |
| `sanitation` | 環境清潔消毒紀錄表 | F-環安-004 | 直向 A4 (Portrait) | 三旬分期（31天一頁滿版）、8 大清潔項目、擬真手寫打勾、跨月隨機種子、未來防呆、日夜簽名合併。 |
