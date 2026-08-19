# LRP 系統 Phase 1 MVP 規格文件

> 來源：`lrp-spec.md`、`CONTEXT.md`、`LRP_Discussion_Summary.md` 及 grill 階段共識決策
> 狀態：凍結版，可直接切票

---

## Problem Statement

台灣長期照護安養機構（26 住民規模）的工作人員需要一個可靠、離線可用的系統，用於數位化管理住民的照護記錄，取代耗時且易出錯的紙本流程。該系統必須支援日常照護記錄、藥物管理以及符合台灣醫療法規的合規需求（BR001-BR011），同時保持預算在 5,000 NTD/月以內。

核心痛點：
- 紙本記錄耗時、容易遺漏、難以稽核
- 離線環境（床邊、走廊、轉診途中）無法記錄
- 合規壓力：24小時鎖定、增刪留痕、3天審閱期、護理比例動態調整、夜班本國籍留守、特約工時 16hr/週
- 預算極限：單一開發者、AI 輔助、1 個月交付

---

## Solution

開發一個 **漸進式網頁應用（PWA）**，採 **Offline-first** 架構：
- **前端**：React 18/19 + TypeScript + Vite + Tailwind CSS，部署為 SPA
- **狀態/資料層**：Zustand + TanStack Query + Dexie.js (IndexedDB wrapper)
- **離線能力**：Service Worker (Workbox) + IndexedDB 本地寫入，聯網時背景同步
- **後端**：Azure Functions (Node.js, 耗用量方案) + Azure SQL Database (台北節點)
- **認證/授權**：JWT + RBAC，支援「快速切換使用者」適用共用平板情境
- **同步衝突策略**：離線優先、Server-wins + 本地備份、關鍵資料(藥物/生命徵象)強制人工確認
- **合規內建**：24hr 鎖定、增刪留痕、電子簽章欄位、審閱期鎖定、動態護理比例、夜班檢核、工時累計

---

## User Stories

### 住民基本資料管理 (CRUD)

1. As a **機構行政/主任**, I want to **建立住民基本資料 (姓名、性別、生日、身分證字號、通訊地址、戶籍地址、住民編號、床位、管路、入住日期、緊急聯絡人完整資訊、身份別、依賴程度、身心障礙、重大傷病、教育程度、宗教信仰、工作史、主要診斷)**, so that **建立完整住民檔案供後續照護參考，符合評鑑與法規需求**.
2. As a **主任護理師/社工師**, I want to **編輯住民基本資料 (含管路異動、床位調整、依賴程度變更、身份別更新)**, so that **即時反映住民狀態變化，自動觸發護理比例重算 (BR004)**.
3. As a **照護員/護理員**, I want to **查詢住民基本資料 (含管路清單、三管狀態、床位、緊急聯絡人、身份別、依賴程度、身心障礙、重大傷病)**, so that **正確執行照護活動、藥物給藥與緊急聯絡**.
4. As a **機構行政/主任**, I want to **停用住民資料 (軟刪除，保留住民編號與所有歷史記錄，床位釋放)**, so that **處理出院/轉院/離世情況且不遺失歷史記錄，住民編號永不重用**.
5. As a **系統使用者**, I want to **依關鍵屬性 (入住日期、狀態、管路/三管、床位、身份別、依賴程度) 搜尋與篩選住民**, so that **快速定位特定住民記錄**.

### 日常照護記錄 (核心)

6. As a **照護員/護理員**, I want to **記錄日常照護活動 (時間戳、活動類型、協助等級 1-5、持續時間、備註)**, so that **準確、高效地記錄住民的照護情況**.
7. As a **照護員/護理員**, I want to **系統自動擷取人員工號與時間戳**, so that **確保問責與稽核追溯 (BR007)**.
8. As a **照護員/護理員**, I want to **上傳照片或影片作為證據 (可選)**, so that **提供照護交付的可視化驗證**.
9. As a **照護員/護理員**, I want to **系統自動計算並顯示每筆照護記錄的完整性評分 (0-100)**, so that **監控文件品質**.
10. As a **照護員/護理員**, I want to **記錄生命徵象 (體溫、脈搏、血壓、呼吸、SpO2、血糖等)**, so that **追蹤住民的健康趨勢**.
11. As a **照護員/護理員**, I want to **為照護記錄設定狀態標識 (正常/需審查/需驗證)**, so that **標記需要進一步關注的記錄**.
12. As a **主任護理師/社工師**, I want to **審核照護記錄並標記為「需驗證」**, so that **追蹤需要進一步審查的記錄**.
13. As a **照護員/護理員**, I want to **在提交後 24 小時內編輯自己的記錄 (留存增刪留痕)**, so that **修正錯誤並符合 BR001**.
14. As a **照護員/護理員**, I want to **超過 24 小時後僅能透過「補充修正案」更正**, so that **符合 BR002 法規要求**.
15. As a **系統使用者**, I want to **透過住民 ID、姓名搜尋記錄**, so that **快速定位特定記錄**.
16. As a **系統使用者**, I want to **記錄狀態顯示可視化指示 (顏色編碼：綠/黃/紅)**, so that **快速評估狀態**.
17. As a **系統使用者**, I want to **離線環境下仍可建立/編輯照護記錄**, so that **床邊、走廊、轉診途中無網路仍能工作 (BR008)**.

### 藥物管理

18. As a **藥物管理員/護理員**, I want to **建立藥物主檔 (名稱、劑量、頻率、時間表、庫存、補貨閾值 15)**, so that **確保藥物管理正確性**.
19. As a **護理員**, I want to **記錄給藥動作 (時間、劑量、執行人)**, so that **留存給藥軌跡**.
20. As a **護理員**, I want to **系統自動顯示下一劑給藥時間與庫存狀態**, so that **避免漏給藥與缺藥**.
21. As a **主任護理師/社工師**, I want to **收到庫存低於閾值 (≤15) 的警示通知**, so that **及時補貨防止缺藥**.
22. As a **系統使用者**, I want to **給藥記錄離線可寫、上線自動同步去重 (同住民+同藥物+同時間視為重複)**, so that **離線給藥不重複、不遺漏**.

### 照護計畫

23. As a **主任護理師/社工師**, I want to **建立個人化照護計畫 (評估日期、目標、服務項目、複審日期、狀態)**, so that **協調多專業照護**.
24. As a **主任護理師/社工師**, I want to **將照護計畫與住民記錄關聯**, so that **交付照護與既定目標保持一致**.
25. As a **照護員/護理員**, I want to **查看住民的照護計畫目標與服務項目**, so that **依計畫執行照護活動'.

### 報表功能

26. As a **主任護理師/社工師**, I want to **生成每日照護完成度報告**, so that **監控員工產能與照護品質**.
27. As a **機構行政/主任**, I want to **查看住民狀態概覽 (含管路/三管狀態、床位分佈、異常事件、用藥提醒、身份別統計、依賴程度分佈)**, so that **掌握整體健康與照護需求，支援評鑑準備**.
28. As a **系統使用者**, I want to **接收異常事件即時警示 (藥物錯誤、生命徵象異常、跌倒等)**, so that **及時回應住民安全風險**.
29. As a **機構行政/主任**, I want to **匯出報表為 PDF 格式 (含住民名冊、管路統計、床位圖、完成度報表)**, so that **向不使用該系統的相關方分享資訊、配合評鑑佐證**.
30. As a **系統管理員**, I want to **查看完整稽核軌跡 (操作人、時間、舊值、新值、原因)**, so that **滿足 5 年保存要求 (BR007)**.

### 資料匯入 (一次性/定期)

31. As a **機構行政/主任**, I want to **匯入住民資料 (JSON/CSV/Excel)，自動轉換民國年、管路解析、三管判斷、床位衝突檢查**, so that **首次上線與定期同步外部名冊無須手工逐筆建檔**.

### 系統管理與合規

32. As a **系統管理員**, I want to **管理使用者帳號與角色指派**, so that **確保基於角色的存取控制 (US30, US44, BR010)**.
33. As a **系統管理員**, I want to **系統強制 24 小時記錄鎖定與電子簽章欄位**, so that **保持資料完整性並符合法律要求 (BR001, BR002)**.
34. As a **系統管理員**, I want to **新住民合約簽署功能在 3 天審閱期結束前自動鎖定**, so that **符合消保法規定 (BR006)**.
35. As a **系統管理員**, I want to **系統根據住民「三管」狀態動態計算護理人力比例 (一般 1:20、三管 1:15)**, so that **優化人力配置 (BR004)**.
36. As a **系統管理員**, I want to **系統強制夜班 (22:00-08:00) 至少有一名本國籍員工在崗**, so that **滿足監管要求 (BR003)**.
37. As a **系統管理員**, I want to **系統自動統計並報告特約社工每週工作時數 (最低 16 小時/週)**, so that **驗證合規 (BR005)**.
38. As a **系統使用者**, I want to **應用支援 PWA 離線安裝、Kiosk 模式相容、HTTPS/TLS 1.3 強制**, so that **裝置安全合規 (BR010, BR011)**.
39. As a **照護員/護理員**, I want to **共用平板上快速切換使用者帳號 (下拉選單記住最近 5 組)**, so that **多位護理員輪流使用同一裝置仍有完整審計軌跡**.
40. As a **系統使用者**, I want to **同步狀態顯示 (同步中/待同步 N 筆/衝突 N 筆) 與衝突中心頁面**, so that **掌握離線資料同步進度與處理衝突**.
41. As a **系統使用者**, I want to **關鍵衝突 (藥物給藥、生命徵象) 強制彈窗確認，不可忽略**, so that **確保醫療安全資料正確性**.

---

## Implementation Decisions

### 架構與技術棧

| 層面 | 決策 | 理由 |
|------|------|------|
| **前端框架** | React 18/19 + TypeScript + Vite | 單一開發者、生態成熟、HMR 快 |
| **建構工具** | Vite + Vite PWA Plugin (Workbox) | PWA 離線支援內建、設定簡單 |
| **UI/樣式** | Tailwind CSS + Headless UI / Radix UI | 無設計系統依賴、可近用性好、體積小 |
| **路由** | React Router v6/v7 | SPA 標準、支援程式化導航 |
| **狀態管理** | Zustand (全域) + TanStack Query (伺服器狀態) | 輕量、TypeScript 優先、離線快取整合好 |
| **表單/驗證** | React Hook Form + Zod | 效能好、schema 共用前後端 |
| **離線資料庫** | Dexie.js (IndexedDB wrapper) | TypeScript 原生、查詢語法直覺、同步邏輯易寫 |
| **日期處理** | date-fns (ESM、tree-shakable) | 輕量、無時區坑 |
| **圖表** | Recharts | React 原生、聲明式、SSR 友善 |
| **PDF 生成** | @react-pdf/renderer | React 元件式生成 PDF、支援中文字體 |
| **測試** | Vitest + React Testing Library + Playwright (E2E) | Vite 原生、快照測試、E2E 真實瀏覽器 |
| **後端** | Azure Functions (Node.js 20, HTTP 觸發) | Serverless、耗用量計費、自動擴展 |
| **資料庫** | Azure SQL Database (Basic/Standard, 台北節點) | 關聯式、強一致性、台灣資料駐留 (BR009) |
| **認證** | JWT (access + refresh token) + HttpOnly Cookie | 無狀態、跨裝置、安全 |
| **授權** | RBAC middleware (角色：caregiver, supervisor, admin, sysadmin) | 符合權限矩陣、可擴充 |

### 核心模組與 Seams（介面）

**單一最高層 Seam：`/api/v1/*` REST API** — 所有前後端溝通經由此層，前端透過 TanStack Query 封裝。

#### 1. 認證與使用者模組 (`/api/v1/auth`, `/api/v1/users`)
- `POST /auth/login` — 回傳 access/refresh token，設定 HttpOnly Cookie
- `POST /auth/refresh` — 換發 access token
- `POST /auth/logout` — 撤銷 refresh token
- `GET /users/me` — 目前使用者資訊與權限
- `GET /users` — 列表 (admin/sysadmin)
- `POST /users` — 建立帳號 (sysadmin)
- `PATCH /users/:id/role` — 變更角色 (sysadmin)
- **快速切換**：`GET /users/switchable` — 回傳可切換帳號清單 (最近 5 組)，前端下拉選單用

#### 2. 住民模組 (`/api/v1/residents`)
- `GET /residents` — 列表（支援 `?status=&hasThreePipe=&identityType=&dependencyLevel=&q=` 篩選）
- `GET /residents/:id` — 明細（含三管狀態、管路清單、床位、緊急聯絡人、身份別、依賴程度、身心障礙、重大傷病、照護計畫摘要）
- `POST /residents` — 建立 (supervisor/admin/sysadmin)
- `PATCH /residents/:id` — 編輯 (supervisor/admin/sysadmin)
- `DELETE /residents/:id` — 軟刪除/停用 (admin/sysadmin)，**住民編號永不重用**
- **業務規則**：入住日期 ≤ 今天；狀態 enum；住民編號唯一索引；hasThreePipe 由 tubes 自動衍生；床位唯一性檢查 (同時間不重複)

#### 3. 日常照護記錄模組 (`/api/v1/care-records`)
- `GET /care-records` — 列表（支援 `?residentId=&dateFrom=&dateTo=&status=&staffId=`）
- `GET /care-records/:id` — 明細（含 activities、evidence、modificationHistory）
- `POST /care-records` — 建立（自動帶入 `staffId`、`staffName`、`timestamp`、`completenessScore`）
- `PATCH /care-records/:id` — 編輯（24hr 內、本人或 supervisor+，**僅限 Editable 狀態**，寫入 modificationHistory）
- `POST /care-records/:id/supplement` — 補充修正案（Locked 狀態專用，BR002）
- `POST /care-records/:id/status` — 變更狀態 (Normal/NeedsReview/VerificationRequired)
- **離線同步**：`POST /care-records/sync` — 批次上傳本地變更，回傳衝突資訊

#### 4. 藥物管理模組 (`/api/v1/medications`)
- `GET /medications` — 列表（支援 `?residentId=&status=`）
- `GET /medications/:id` — 明細（含 schedule、stockLevel、administrationHistory）
- `POST /medications` — 建立藥物主檔
- `PATCH /medications/:id` — 編輯主檔
- `POST /medications/:id/administer` — 記錄給藥（自動扣庫存、更新 lastAdministered/nextScheduled）
- `GET /medications/alerts/low-stock` — 低庫存警示清單
- **離線同步**：`POST /medications/sync` — 給藥記錄去重合併

#### 5. 照護計畫模組 (`/api/v1/care-plans`)
- `GET /care-plans` — 列表（支援 `?residentId=&status=`）
- `GET /care-plans/:id` — 明細
- `POST /care-plans` — 建立
- `PATCH /care-plans/:id` — 編輯
- `POST /care-plans/:id/status` — 狀態流轉

#### 6. 報表模組 (`/api/v1/reports`)
- `GET /reports/daily-completion` — 每日完成度 (日期、住民、分數、狀態)
- `GET /reports/resident-summary` — 住民狀態概覽
- `GET /reports/alerts` — 異常事件警示
- `GET /reports/audit-trail` — 稽核軌跡 (支援分頁、篩選)
- `POST /reports/pdf` — 產生 PDF (傳入報表類型與參數，回傳 blob URL)

#### 7. 合規與系統模組 (`/api/v1/compliance`, `/api/v1/system`)
- `GET /compliance/staffing-ratio` — 即時護理比例 (依三管動態計算)
- `GET /compliance/night-shift` — 夜班本國籍留守檢核
- `GET /compliance/contract-hours` — 特約社工週工時累計
- `GET /compliance/contract-review/:residentId` — 合約審閱期狀態
- `GET /system/sync/status` — 同步狀態 (待同步筆數、衝突筆數、最後同步時間)
- `POST /system/sync/conflicts/resolve` — 衝突解決 (接受 server / 保留 local / 手動合併)

### 資料模型關鍵決策 (來自 CONTEXT.md、LRP_Discussion_Summary.md、grill 共識與實際資料對齊)

```typescript
// 住民 - 對齊實際匯入資料格式 (docs/住民資料.json)
interface Resident {
  // 系統識別
  residentId: string;           // UUID，系統主鍵
  residentNumber: string;       // 住民編號 (如 "0040", "0066")，業務主鍵，**唯一且永不重用**，移出住民資料仍保留
  
  // 基本資料
  name: string;                 // 姓名
  gender: 'Male' | 'Female';    // 性別：實際資料為 "男"/"女"，轉換對應
  dateOfBirth: string;          // ISO 8601 (YYYY-MM-DD)；實際資料為民國年 "035/01/13" 需轉換 (民國年+1911)
  idNumber: string;             // 身分證字號 (台灣身分證，如 "A201529776")，**非健保 ID**
  
  // 地址結構 (實際資料有通訊地與戶籍地址分離)
  mailingAddress: string;       // 通訊地
  registeredAddress: string;    // 戶籍地址
  
  // 入住與床位
  admissionDate: string;        // ISO 8601；實際資料為民國年 "111/01/21" 需轉換
  bedNumber: string;            // 床位編號 (如 "1-1", "1-2", "2-3")，營運單位自訂
  
  // 管路與三管判斷 (關鍵：BR004 動態護理比例)
  tubes: string[];              // 管路清單，解析自 "管路" 欄位：["尿管", "鼻胃管", "氣切管"] 等
  hasThreePipe: boolean;        // 衍生欄位：tubes 包含任一「三管」(鼻胃管/尿管/氣切管) 為 true
  
  // 緊急聯絡人 (實際資料欄位豐富)
  emergencyContact: {
    name: string;               // 第一聯絡姓名
    relationship: string;       // 第一聯絡關係
    phone: string;              // 第一聯絡電話
    mobile: string;             // 第一聯絡手機
    address: string;            // 第一聯絡地址
    notes: string;              // 第一聯絡備註
  };
  
  // 評鑑/法規相關欄位 (實際資料完整保留)
  identityType: string;         // 身份別：一般戶/中低收入戶/低收入戶/榮民/眷/原住民/緊急安置/空值
  dependencyLevel: string;      // 依賴程度：完全依賴/部分依賴/可自行活動
  disabilityInfo: string;       // 身心障礙類別/等級/到期日：如 "第1類，重度，2030/09/30"
  majorIllness: string;         // 重大傷病/到期日
  
  // 其它實際資料欄位
  educationLevel: string;       // 教育程度
  religion: string;             // 宗教信仰
  workHistory: string;          // 工作史
  
  // 狀態與稽核
  status: 'Active' | 'Inactive'; // 狀態：在住/已移出 (軟刪除)
  diagnosis: string;            // 主要診斷 (從實際資料推導或手動填寫)
  createdAt: string;            // ISO 8601
  updatedAt: string;            // ISO 8601
  version: number;              // 樂觀鎖/同步用
}

// 住民匯入轉換規則 (供遷移腳本參考)
/*
  來源欄位 → 目標欄位：
  - 序號 → 忽略 (匯入順序)
  - 姓名 → name
  - 性別 → "男"→"Male", "女"→"Female"
  - 生日 → dateOfBirth: 民國年轉西元 (年+1911)，格式 YYYY-MM-DD
  - 通訊地 → mailingAddress
  - 身分證號 → idNumber
  - 戶籍地址 → registeredAddress
  - 住民編號 → residentNumber (唯一索引)
  - 床位 → bedNumber
  - 第一聯絡姓名/關係/電話/手機/地址/備註 → emergencyContact 物件
  - 入住日期 → admissionDate: 民國年轉西元
  - 管路 → tubes: 以 "、"、"、"、"、" 等分隔符 split，trim 空白；空字串 → []
  - 身份別 → identityType
  - 依賴程度 → dependencyLevel
  - 身心障礙類別/等級/到期日 → disabilityInfo
  - 重大傷病/到期日 → majorIllness
  - 工作史 → workHistory
  - 教育程度 → educationLevel
  - 宗教信仰 → religion
  - hasThreePipe = tubes.some(t => ["鼻胃管", "尿管", "氣切管", "留置尿管", "NG管", "Foley導尿管"].includes(t))
*/

// 日常照護記錄
interface CareRecord {
  recordId: string;
  residentId: string;
  timestamp: string;            // ISO 8601, 不得為未來 (+30min 容忍)
  activities: CareActivity[];
  staffId: string;
  staffName: string;
  completenessScore: number;    // 0-100, 依必填項+證據計算
  status: 'Normal' | 'NeedsReview' | 'VerificationRequired';
  evidence: EvidenceItem[];
  notes: string;
  lockType: 'Editable' | 'Locked';
  lockedAt: string | null;
  modificationHistory: AuditEntry[];  // BR007
  createdAt: string;
  updatedAt: string;
  version: number;
  // 離線同步欄位
  localId?: string;             // 本地暫時 ID
  syncStatus: 'synced' | 'pending' | 'conflict';
  lastSyncedAt?: string;
}

interface CareActivity {
  activityType: 'Feeding' | 'Bathing' | 'Repositioning' | 'Transfer' | 'Medication' | 'VitalSigns' | 'Other';
  assistanceLevel: 1 | 2 | 3 | 4 | 5;
  duration: number;             // 分鐘
  vitalSigns?: VitalSigns;      // 當 type=VitalSigns 時必填
  notes: string;
}

interface VitalSigns {
  temperature?: number;         // °C
  pulse?: number;               // bpm
  systolicBP?: number;          // mmHg
  diastolicBP?: number;         // mmHg
  respiration?: number;         // breaths/min
  spo2?: number;                // %
  bloodGlucose?: number;        // mg/dL
}

// 藥物
interface Medication {
  medicationId: string;
  residentId: string;
  name: string;
  dosage: string;
  frequency: 'OnceDaily' | 'TwiceDaily' | 'ThreeTimesDaily' | 'AsNeeded';
  schedule: TimeSlot[];
  lastAdministered: string | null;
  nextScheduled: string;
  stockLevel: number;
  reorderThreshold: number;     // 預設 15
  status: 'Normal' | 'RunningLow' | 'OutOfStock';
  notes: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface TimeSlot {
  time: string;                 // "08:00"
  administered: boolean;
  administeredBy: string;
  administeredAt: string | null;
}

// 稽核軌跡 (BR007)
interface AuditEntry {
  auditId: string;
  recordId: string;
  actionType: 'Create' | 'Update' | 'Delete' | 'Supplement';
  changedBy: string;            // staffId
  changedAt: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;               // 必填
}

// 同步衝突記錄
interface SyncConflict {
  conflictId: string;
  entityType: 'CareRecord' | 'Medication' | 'Resident' | 'CarePlan';
  entityId: string;
  serverVersion: any;
  localVersion: any;
  conflictFields: string[];
  status: 'pending' | 'resolved-server' | 'resolved-local' | 'resolved-manual';
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}
```

### 離線同步與衝突解決 (核心決策)

| 階段 | 行為 |
|------|------|
| **寫入** | 所有寫入先進 IndexedDB (Dexie)，標記 `syncStatus: 'pending'`，立即更新 UI |
| **同步觸發** | Service Worker 定期 (30s) + 連線恢復事件 + 手動按鈕觸發 |
| **上傳** | 批次 `POST /api/v1/{entity}/sync`，攜帶 `localId`、`version`、`updatedAt` |
| **衝突偵測** | Server 比對 `version`/`updatedAt`：<br>• `server.version > client.version` → 衝突<br>• `server.updatedAt > client.lastSyncedAt` → 衝突 |
| **解決策略** | 見下表 |
| **回應** | 回傳 `{ accepted: [], conflicts: SyncConflict[] }`，前端更新本地狀態 |
| **UI** | 頂列同步指示器 + 衝突中心頁面 (`/sync/conflicts`) |

**衝突解決策略表**：

| 實體 | 策略 | 細節 |
|------|------|------|
| **CareRecord** (編輯既有) | Server-wins + 本地備份 | Server 版本寫入主表；Local 版本存入 `SyncConflict.localVersion`，UI 顯示「衝突備份」供手動合併 |
| **CareRecord** (新增) | 無衝突 | `localId` 對應新建 `recordId`，直接接受 |
| **Resident** | 欄位級合併 | 非同欄位自動合併；同欄位 → Server-wins + 記錄衝突 |
| **Medication** (給藥記錄) | 時間戳去重 | 同 `residentId + medicationId + administeredAt` → 保留最早 `administeredAt`，標記衝突供護理師確認 |
| **CarePlan** | 區段級合併 | `goals`、`serviceItems` 獨立合併，版本號 +1 |
| **關鍵資料** (藥物給藥、生命徵象) | **強制人工確認** | 衝突中心彈窗，三選項：接受雲端 / 保留本地 / 手動合併，**不可關閉、不可忽略** |

### RBAC 與認證細節

| 角色 | 代碼 | 權限摘要 |
|------|------|----------|
| 照護員/護理員 | `caregiver` | 讀住民、寫自己照護記錄(24hr)、給藥記錄、看自己報表 |
| 主任護理師/社工師 | `supervisor` | 讀寫住民、全員照護記錄審核、藥物主檔、照護計畫、報表、稽核軌跡 |
| 機構行政/主任 | `admin` | 全部 supervisor 權限 + 住民刪除/停用、使用者管理、PDF 匯出 |
| 系統管理員 | `sysadmin` | 全部權限 + 角色指派、系統設定、資料庫維護 |

**快速切換實作**：
- 登入後將 `refreshToken` 加密儲存於 IndexedDB (Dexie)，key 為 `user:{staffId}`
- 切換時：讀取目標帳號的 refresh token → 呼叫 `/auth/refresh` → 取得新 access token → 更新 Zustand auth store
- 最近 5 組記住於 localStorage `recentUsers`，同步至 IndexedDB 供離線切換

### 合規自動化 (BR001-BR011 對應表)

| BR | 實作位置 |
|----|----------|
| BR001 | CareRecord 建立/編輯時檢查 `lockedAt`；排程任務每小時掃描 `submittedAt + 24hr < now` 且 `lockType=Editable` → 自動鎖定、產生電子簽章欄位 |
| BR002 | `PATCH /care-records/:id` 檢查 `lockType`；Locked 僅允許 `POST /supplement` |
| BR003 | 排班模組 (Phase 2) 或手動檢核 API `GET /compliance/night-shift` |
| BR004 | `GET /compliance/staffing-ratio` 依 `resident.hasThreePipe` 即時計算 |
| BR005 | 排班模組累計或手動檢核 API `GET /compliance/contract-hours` |
| BR006 | 合約模組：`intentDate + 3 days <= now` 才允許簽署 |
| BR007 | 所有 `PATCH/POST/DELETE` 經統一 middleware 寫入 `AuditEntry` 至 Azure SQL，保存 5 年 |
| BR008 | PWA + Dexie + Service Worker + `/sync` API 已涵蓋 |
| BR009 | Azure 區域鎖定 `East Asia` (台北)；Terraform/ARM 強制 |
| BR010 | Azure Front Door / App Gateway 強制 TLS 1.3、HSTS、CSP；租戶隔離由 Azure AD B2C 或自建 JWT 實現 |
| BR011 | MDM/Kiosk 為部署層面，前端提供 `manifest.json` `display: "fullscreen"`、`orientation: "landscape"` |

---

## Testing Decisions

### 測試原則
- **只測外部行為**：API 合約、UI 流程、業務規則驗證；不測內部實作細節 (hooks、store 結構)
- **測試金字塔**：單元 (邏輯/驗證) > 整合 (API) > E2E (關鍵使用者旅程)
- **離線優先測試**：每個寫入流程必須有「離線寫入 → 上線同步」的測試案例
- **合規測試**：每個 BR 對應至少一個自動化測試

### 待測試模組與重點

| 模組 | 測試類型 | 關鍵測試案例 |
|------|----------|--------------|
| **認證/快速切換** | 整合 + E2E | 登入/刷新/登出、切換帳號保留狀態、離線切換 |
| **住民 CRUD** | 整合 | 建立/編輯/停用、驗證規則 (入住日期、三管衍生) |
| **照護記錄** | 單元 + 整合 + E2E | 建記錄、計算完整性分、24hr 編輯窗、鎖定後補充修正案、狀態流轉、**離線建記錄→同步**、衝突解決 |
| **藥物管理** | 整合 + E2E | 主檔 CRUD、給藥扣庫存、低庫存警示、**離線給藥去重**、排程顯示 |
| **照護計畫** | 整合 | 建立/編輯/狀態流轉、與住民關聯 |
| **報表** | 整合 | 每日完成度、住民摘要、PDF 生成內容正確性 |
| **合規 API** | 單元 + 整合 | 護理比例計算、夜班檢核、工時累計、審閱期鎖定 |
| **同步/衝突** | 整合 + E2E | **核心**：併發編輯、離線衝突、Server-wins、欄位合併、去重、強制確認流程 |
| **PWA** | E2E (Playwright) | 離線安裝、Service Worker 註冊、IndexedDB 讀寫、背景同步 |

### 參考先例
- 既有專案中 `Vitest` + `React Testing Library` 模式
- IndexedDB 同步測試參考 `dexie-cloud` / `rxdb` 測試策略
- Playwright 離線測試使用 `page.context().setOffline(true)`

---

## Out of Scope

以下**明確不在 Phase 1 MVP 範圍**：

1. 完整 63 項評鑑指標報表（僅基礎報表）
2. 進階分析/BI 儀表板（僅 KPI 看板）
3. 外部醫療資訊系統整合 (HL7/FHIR、中醫系統等)
4. 家屬入口網站或對外查詢介面
5. 超出核心角色 (caregiver, supervisor, admin, sysadmin) 的角色實作
6. 超出 5 年稽核軌跡保存的長期合規功能
7. 核心定義外的活動類型 (僅支援：Feeding, Bathing, Repositioning, Transfer, Medication, VitalSigns, Other)
8. 繁體中文/英文以外的多語言
9. AI 協助記錄、預測分析、智慧推薦
10. 排班/人力排程系統 (BR003、BR005 僅提供檢核 API，不含排班 UI)
11. 合約簽署電子簽章完整流程 (僅審閱期鎖定邏輯)
12. 硬體整合 (醫療儀器自動讀值、條碼掃描槍等)

---

## Further Notes

### 開發里程碑 (對應 LRP_Discussion_Summary.md 4 週規劃)

| 週次 | 重點交付 | 對應 User Stories |
|------|----------|-------------------|
| **Week 1** | 專案骨架、認證、資料庫遷移、PWA 基礎、CI/CD | 31, 38 (認證/切換) |
| **Week 2** | 住民 CRUD、照護記錄核心 (建/讀/編/鎖/補充)、離線同步骨架 | 1-5, 6-17, 39-40 |
| **Week 3** | 藥物管理、照護計畫、報表 (每日/摘要/警示/PDF)、合規 API | 18-25, 26-30, 32-36 |
| **Week 4** | 跨裝置測試、離線情境驗證、26 筆測試資料、壓力測試、部署、文件 | 全數驗收 |

### 風險與緩解

| 風險 | 緩解策略 |
|------|----------|
| 1 月時間極緊 | 嚴格切分 ticket、每日立會、先做核心流程 (照護記錄) |
| IndexedDB 同步衝突複雜 | 先實作 CareRecord 單一實體同步，驗證後再擴展到 Medication/Resident |
| Azure 成本超支 | 設定 Azure Cost Management 預算警示 (5,000 NTD)；Functions 耗用量方案 + SQL Basic |
| 使用者採用阻力 | Week 2 即可試用核心記錄功能、早期收集回饋調整 UI |
| 法規解讀錯誤 | 每個 BR 對應測試案例、找機構主任/護理師驗收 |

### 部署與運維

- **CI/CD**：GitHub Actions → `main` 推送觸發建構 → Azure Static Web Apps (前端) + Azure Functions (後端)
- **環境變數**：`VITE_API_BASE_URL`、資料庫連線字串、JWT Secret 存於 GitHub Secrets / Azure Key Vault
- **監控**：Application Insights (Functions) + Log Analytics (SQL) + 前端錯誤上報 (Sentry 免費額度)
- **備份**：Azure SQL 自動備份 (7 天) + 點還原；IndexedDB 為快取不備份

### 給 `/to-tickets` 的切票建議

1. **依區塊切分**：auth → residents → care-records → medications → care-plans → reports → compliance → sync/conflicts → PWA/polish
2. **每票單一職責**：一個 API endpoint 或一個 UI 頁面/元件
3. **宣告 Blocking edges**：如 `care-records-sync` blocked by `care-records-crud` + `sync-engine`
4. **Tracer-bullet 優先**：先打通「登入 → 選住民 → 離線建記錄 → 上線同步 → 看報表」最短路徑
5. **測試同步寫**：每張實作 ticket 附帶對應測試 ticket (或同票包含)

---

*規格凍結版 — 2026-08-19*
*下一步：執行 `/to-tickets` 產出 `.scratch/lrp-mvp/issues/` 逐票檔案*