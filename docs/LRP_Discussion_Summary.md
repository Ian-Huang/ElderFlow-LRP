# 台灣長照安養機構 LRP 系統 - 完整討論輸出

## 專案概述

**目標**：為台灣長照安養機構打造一套 LRP（長期照護記錄管理）系統，優先製作第一期 MVP，聚焦日常照護記錄完整性。

**規模**：26 住民小型機構試用

**約束條件**：
- 唯一開發者（有程式背景），使用 AI 輔助開發
- 預算 < 5,000 NTD/月
- 需支援離線功能
- 從零開始，無現有系統
- 時間限制：1 個月完成第一期

---

## 需求探索結果

### 使用者角色與需求

| 角色 | 主要需求 | 痛點 | Phase 1 優先級 |
|------|---------|------|----------------|
| 照護員/護理員 | 日常照護記錄、異常事件回報 | 紙本記錄耗時、容易遺漏 | ✅ 高 |
| 主任護理師/社工師 | 照護計畫制定、品質監控 | 資料分散、審核困難 | ✅ 高 |
| 機構行政/院長 | 管理報表、稽核合規 | 報表生成耗時、合規壓力 | ⚠️ 中 |
| 家屬/監護人 | 狀態查詢、溝通記錄 | 資訊不透明、溝通低效 | ❌ 第二期 |

### 核心資料域（Phase 1 範圍）

1. **住民基本資料** (✅ 優先)
   - 個人檔案、健康狀況、特殊需求
   - 限 26 人規模

2. **日常照護記錄** (✅ 最優先)
   - 時間戳、活動類型、協助等級、備註
   - 員工憑證驗證、證據（照片/影片）
   - 完成度評分與警示

3. **藥物管理** (✅ 優先)
   - 藥物資訊、用藥時間表、給藥記錄
   - 庫存監控、低庫存警示

4. **照護計畫** (✅ 優先)
   - 評估工具、目標設定、服務項目排程
   - 與住民資料和日常照護記錄關聯

---

## 技術決策分析

### 架構選擇

| 選項 | 優點 | 缺點 | 適用性 |
|------|------|------|--------|
| **PWA + 雲端** | 離線支援、低成本、跨平台 | 離線功能受限、需網路同步 | ✅ 推薦 |
| 原生 APP | 完整離線、效能佳 | 開發成本高、維護複雜 | ❌ 不適用 |
| 單體網頁應用 | 開發快速 | 無離線功能 | ❌ 不適用 |

**結論**：採用 Progressive Web App (PWA) 架構，支援離線操作，並在有網路時同步資料。

### 後端技術

| 選項 | 月成本（26 人） | 優缺點 |
|------|--------------|--------|
| **Azure Functions** | ~1,000-2,000 NTD | Serverless、自動擴展、成本可控 |
| Google Cloud Functions | ~1,000-1,800 NTD | 類似 Azure，但台灣節點較少 |
| AWS Lambda | ~1,500-2,500 NTD | 功能強大，但較複雜 |
| 本地伺服器 | 一次性硬體成本 | 需維護、無自動擴展 |

**結論**：Azure Functions 或 Google Cloud Functions，根據預算和開發熟悉度選擇。

### 資料庫選擇

| 選項 | 特性 | 適用性 |
|------|------|--------|
| **Azure SQL Database** | 關聯式、強一致性 | ✅ 推薦 |
| Firebase Realtime Database | 即時同步、文件型 | ⚠️ 備選 |
| MongoDB Atlas | 文件型、靈活 | ⚠️ 備選 |
| 本地 SQLite | 簡單、離線 | ❌ 無法多人存取 |

**結論**：Azure SQL Database 確保資料一致性和合規性，搭配 IndexedDB 作為離線快取。

---

## 核心領域術語定義 — 2026-08-19 更新

| 術語 | 定義 | 關鍵屬性/業務規則 |
|------|------|------------------|
| **住民基本資料** | 包含姓名、性別、生日、通訊地址、戶籍地址、身分證字號、診斷、入住日期、床位、管路/三管狀態、身份別、依賴程度、身心障礙、重大傷病、教育程度、宗教信仰、工作史、緊急聯絡人完整資訊等核心資訊 | 26 位上限；住民編號唯一且永不重用；入住日期必須是過去或今日；狀態為 Active/Inactive；管路解析自「管路」欄位，三管判斷自動衍生 (鼻胃管/尿管/氣切管)；床位為營運單位自訂編號 |
| **日常照護記錄** | 每日由照護人員填寫的照護活動紀錄，包括生命徵象、飲食、排便、身體清潔、翻身等 | 時間戳不得為未來；完成度評分 0-100；狀態 Normal/NeedsReview/VerificationRequired |
| **照護計畫** | 由護理、社工、治療師共同制定的個人化照護目標與服務項目 | 評估日期為過去/今日；目標需具體描述與日期；狀態 Draft/Active/Completed/Archived |
| **藥物管理** | 藥物資訊、劑量、給藥時間表、庫存追蹤、給藥記錄 | 庫存警示閾值 ≤15；給藥頻率限定四種；最後給藥時間不得為未來 |
| **合約審閱追蹤鐘** | 依《消保法》給家屬 ≥3 天審閱期，系統鎖定簽署功能直至期限屆滿 | 審閱期不得少於 3 天；簽署日需在審閱期結束後 |
| **動態照護比防呆** | 依住民「三管」狀態動態調整護理人力比例：一般 1:20 → 三管時 1:15 | 基礎 1:20（≥2 護理、隨時 ≥1 人在班）；夜間 22:00-08:00 必有本國籍員工 |
| **本國籍人員留守強制檢核** | 夜間排班必須至少一名具本國籍身分的護理師或照服員在班 | 夜間定義 22:00-隔日 08:00；身分透過身分證字號驗證 |
| **特約工時累積計時器** | 自動累計特約社工每週總排班時數，法律要求 ≥16 小時 | 統計週期週一至週日；不足 16 小時發出紅色警示 |
| **24 小時病歷鎖定機制** | 提交後 24 小時內可修改（留存增刪留痕），逾時以加密時戳硬性鎖定，修正須走「補充修正案」 | 鎖定類型 Editable/Locked；修改歷程記錄操作人、時間、舊/新值；至少保存 5 年 |
| **增刪留痕** | 所有修改以新增紀錄保存原始狀態，不得直接覆蓋 | 動作類型 Create/Update/Delete；必填原因欄位；留存 ≥5 年 |
| **電子簽章** | 使用醫事人員憑證（IC 卡）或符合《電子簽章法》的數位簽名技術 | 必用有效憑證；含時間戳與作者身份；不可撤銷 |
| **品質指標監測看板** | 即時顯示跌倒率、壓傷率、非計畫性住院率等關鍵指標，供 PDCA 改善 | 跌倒率 = (次數/總住民日數)×1000；壓傷率 = (病例/住民數)×100 |
| **評鑑佐證報表一鍵生成** | 自動彙整 63 項評鑑項目電子化佐證（含稽核軌跡），產政府格式報表 | 涵蓋 A/B/C/D 四大維度；格式符合衛福部規定；留存 ≥5 年 |
| **影子雙軌運行法** | 試用前 3 週產出「合規落差報告」，第 4 週撤除紙本啟動硬性阻斷 | 1-3 週僅報告；4 週起硬性阻斷；試用資料留存 ≥1 年 |
| **數位轉型的法律保護殼** | 第一期定位：透過服務對象管理、人事管理、緊急事件處理、資安維護四大模組提供系統級自動法律保護 | 四大模組第一期同步實施；留存 ≥5 年；完整稽核軌跡 |

---

## 實體關係圖

```mermaid
erDiagram
    RESIDENT ||..| DAILY-CARE-RECORD : "has"
    RESIDENT ||..| MEDICATION-RECORD : "has"
    RESIDENT ||..| CARE-PLAN : "has"
    RESIDENT ||..| CONTRACT : "has"
    STAFF ||..| DAILY-CARE-RECORD : "records"
    STAFF |||..| SCHEDULE : "works"
    STAFF ||..| AUDIT-TRAIL : "generates"
```

---

## 關鍵業務規則

- **BR001**：所有專業照護紀錄必須在 24 小時內完成電子簽章鎖定。
- **BR002**：鎖定後不允許直接修改紀錄，僅能透過「補充修正案」進行更正。
- **BR003**：夜間（22:00-08:00）排班中必須至少有一名具本國籍身分的員工在班。
- **BR004**：若住民具「三管」（鼻胃管、留置尿管、氣切管），則護理人力配置比例必須為 1:15，否則為 1:20。
- **BR005**：特約社工每週總排班時數不得少於 16 小時。
- **BR006**：新住民簽約功能在簽約前必須被系統鎖定，直至法定審閱期（≥3 天）屆滿。
- **BR007**：所有修改必須留存完整增刪留痕，包含操作人、時間、原始值與新增值，並至少保存 5 年。
- **BR008**：系統必須支援離線操作，並具備背景同步與衝突解決機制。
- **BR009**：資料必須儲存在中華民國境內區域（如 AWS/GCP/Azure 的台北節點）。
- **BR010**：全時強制實施 HTTPS (TLS 1.3) 加密傳輸，並建立獨立的租戶隔離架構。
- **BR011**：行動裝置必須透過 MDM 系統管理，設定為 Kiosk Mode（單一 App 模式），並具備遠端一鍵抹除功能。

---

## Phase 1 MVP 規格

### 核心功能清單

#### 1. 住民基本資料管理 (CRUD)
- 姓名、性別、生日 (民國年轉西元)、身分證字號
- 通訊地址、戶籍地址、住民編號 (唯一永不重用)、床位 (營運自訂)
- 入住日期 (民國年轉西元)、管路清單與三管判斷 (鼻胃管/尿管/氣切管)
- 身份別 (一般戶/中低收入戶/低收入戶/榮民/眷/原住民/緊急安置)
- 依賴程度 (完全依賴/部分依賴/可自行活動)
- 身心障礙類別/等級/到期日、重大傷病/到期日
- 教育程度、宗教信仰、工作史、主要診斷
- 緊急聯絡人完整資訊 (姓名、關係、電話、手機、地址、備註)
- 狀態 (活躍/停用 - 軟刪除)

#### 2. 日常照護記錄 (核心)
- 時間戳記錄 (ISO 8601，不得為未來)
- 活動類型選擇 (進食、沐浴、翻身、移位、給藥、生命徵象、其他)
- 協助等級 (1-5 級)、持續時間 (分鐘)
- 生命徵象 (體溫、脈搏、收縮壓/舒張壓、呼吸、SpO2、血糖)
- 員工姓名/ID 自動記錄、完整性評分 (0-100)
- 狀態流轉 (正常/需審查/需驗證)、24hr 編輯窗與鎖定機制 (BR001, BR002)
- 補充修正案 (超過 24hr 後)
- 備註欄位、照片/影片上傳 (可選)
- 離線建立/編輯、上線自動同步去重

#### 3. 藥物管理
- 藥物主檔 (名稱、劑量、頻率、時間表、庫存、補貨閾值 15)
- 給藥記錄 (時間、劑量、執行人、自動扣庫存)
- 下一劑給藥時間顯示、低庫存警示 (≤15)
- 給藥記錄離線可寫、上線自動同步去重 (同住民+同藥物+同時間視為重複)

#### 4. 照護計畫
- 個人化照護計畫 (評估日期、目標、服務項目、複審日期、狀態)
- 與住民記錄關聯、照護員查看計畫目標與服務項目

#### 5. 報表功能
- 每日照護完成度報告
- 住民狀態概覽 (管路/三管、床位分佈、異常事件、用藥提醒、身份別統計、依賴程度分佈)
- 異常事件即時警示 (藥物錯誤、生命徵象異常、跌倒等)
- PDF 匯出 (住民名冊、管路統計、床位圖、完成度報表)
- 完整稽核軌跡 (操作人、時間、舊值、新值、原因) - 5年保存 (BR007)

#### 6. 資料匯入 (一次性/定期)
- 住民資料匯入 (JSON/CSV/Excel)，自動轉換民國年、管路解析、三管判斷、床位衝突檢查

#### 7. 系統管理與合規
- 使用者帳號與角色指派 (caregiver/supervisor/admin/sysadmin)
- 24hr 記錄鎖定與電子簽章欄位 (BR001, BR002)
- 新住民合約簽署 3 天審閱期鎖定 (BR006)
- 動態護理比例計算 (一般 1:20、三管 1:15) (BR004)
- 夜班本國籍留守檢核 (22:00-08:00) (BR003)
- 特約社工週工時累計 (最低 16hr/週) (BR005)
- PWA 離線安裝、Kiosk 模式相容、HTTPS/TLS 1.3 強制 (BR010, BR011)
- 共用平板快速切換使用者 (最近 5 組)
- 同步狀態顯示與衝突中心頁面
- 關鍵衝突 (藥物給藥、生命徵象) 強制彈窗確認

### 技術實施方案

```
前端 (PWA)          後端 (Serverless)      資料庫
├─ React/Vue.js     ├─ Azure Functions    ├─ Azure SQL
├─ IndexedDB        ├─ API endpoints      ├─ IndexedDB (離線)
├─ Service Worker    ├─ Authentication     └─ 本地快取
└─ 離線同步         └─ File storage
```

### 預算分配（5,000 NTD/月）

| 項目 | 預估成本 |
|------|---------|
| 雲端運算 (Functions) | 1,000-1,500 NTD |
| 資料庫 (SQL Database) | 1,500-2,000 NTD |
| 優質網域名稱 | ~300 NTD |
| SSL 憑證 | 免費 (Let's Encrypt) |
| **總計** | **~3,300-3,800 NTD** ✅ |

---

## 開發路線圖 - Phase 1 (1 個月)

### 第 1 週：基礎建設
- [ ] 設定 Azure/GCP 帳戶
- [ ] 建立資料庫 Schema
- [ ] 實作使用者認證系統（基本版）
- [ ] 設定離線同步機制
- [ ] 建立 PWA 框架

### 第 2 週：核心功能
- [ ] 住民基本資料 CRUD
- [ ] 日常照護記錄表單
- [ ] 基本驗證規則
- [ ] 離線資料儲存
- [ ] 背景同步功能

### 第 3 週：藥物管理與報告
- [ ] 藥物管理介面
- [ ] 庫存追蹤與警示
- [ ] 每日完成度報告
- [ ] 基本統計圖表
- [ ] PDF 報告匯出

### 第 4 週：測試與部署
- [ ] 跨裝置測試
- [ ] 離線情境驗證
- [ ] 26 住民資料匯入
- [ ] 壓力測試
- [ ] 正式部署
- [ ] 使用者訓練文件

---

## 資料模型詳細設計

### 住民基本資料 (對齊實際匯入資料格式 docs/住民資料.json)
```typescript
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
```

### 日常照護記錄
```typescript
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
```

### 藥物管理
```typescript
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
```

### 照護計畫
```typescript
interface CarePlan {
  planId: string;
  residentId: string;
  assessmentDate: string;       // ISO 8601
  goals: CareGoal[];
  serviceItems: ServiceItem[];
  reviewDate: string;           // ISO 8601
  status: 'Draft' | 'Active' | 'Completed' | 'Archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface CareGoal {
  goalId: string;
  description: string;
  targetDate: string;           // ISO 8601
  progress: number;             // 0-100
  status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
}

interface ServiceItem {
  serviceType: 'PhysicalTherapy' | 'SpeechTherapy' | 'NutritionCounseling' | 'Rehabilitation' | 'Other';
  frequency: string;
  startDate: string;            // ISO 8601
  endDate: string | null;       // ISO 8601
  notes: string;
}
```

---

## 風險評估與緩解策略

| 風險 | 機率 | 影響 | 緩解策略 |
|------|------|------|----------|
| 1 個月時間不足 | 中 | 高 | 嚴格 MVP 範圍，延後非核心功能 |
| 離線同步衝突 | 高 | 中 | Server-side winning 策略 |
| 預算超支 | 低 | 高 | 監控雲端使用量，設定預算警示 |
| 使用者採用率低 | 中 | 高 | 簡單介面，充分訓練 |
| 資料安全風險 | 低 | 極高 | 加密、存取控制、稽核 |

---

## 下一步行動

1. **需求確認**：與合作機構訪談，確認細節
2. **環境準備**：設定雲端帳戶、開發環境
3. **原型設計**：建立 UI/UX 線框圖
4. **開發啟動**：進入 Sprint 1
5. **測試驗證**：每週展示進度，收集回饋

---

## 文件更新記錄

| 日期 | 版本 | 更新內容 | 更新人 |
|------|------|----------|--------|
| 2026-08-19 | v1.0 | 初始版本：需求探索、技術決策、Phase 1 MVP 規格、開發路線圖 | Ian Huang |
| 2026-08-19 | v1.1 | 新增：核心領域術語定義、實體關係圖、完整業務規則（BR001-011） | AI 助理 |
| 2026-08-19 | v1.2 | 對齊住民資料模型與實際匯入格式 (docs/住民資料.json)：住民編號唯一永不重用、床位自訂編號、身分證字號非健保ID、雙地址結構、管路/三管判斷、完整緊急聯絡人、身份別/依賴程度/身心障礙/重大傷病/教育程度/宗教/工作史，以及所有日期改為 ISO 8601 字串與離線同步欄位 | Ian Huang |

---

*討論日期: 2026-08-19*
*文件狀態: Phase 1 規劃完成 + 領域模型更新*