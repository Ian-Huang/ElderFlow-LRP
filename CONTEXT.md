# LRP 系統 - 台灣長期照護機構管理

## 詞彙表

### 住民基本資料
- **定義**：包含姓名、性別、生日、地址、保險 ID、診斷、入住日期、特殊需求等核心資訊
- **關鍵欄位**：residentId, name, gender, dateOfBirth, address, insuranceId, diagnosis, admissionDate, specialNeeds, status
- **業務規則**：單一機構最多 26 位住民；入住日期必須是過去或今日；狀態為 Active/Inactive

### 日常照護記錄
- **定義**：每日由照護人員填寫的照護活動紀錄，包括生命徵象、飲食、排便、身體清潔、翻身等，需有時間戳、員工 ID、完成度評分
- **關鍵欄位**：recordId, residentId, timestamp, activities, staffId, staffName, completenessScore, status, evidence, notes
- **業務規則**：時間戳不得為未來（+30 分鐘以上）；完成度評分 0-100；狀態為 Normal/NeedsReview/VerificationRequired

### 照護計畫
- **定義**：由護理、社工、治療師共同制定的個人化照護目標與服務項目
- **關鍵欄位**：planId, residentId, assessmentDate, goals, serviceItems, reviewDate, status, createdBy, createdAt, updatedAt
- **業務規則**：評估日期必須是過去或今日；目標必須有具體描述和目標日期；狀態為 Draft/Active/Completed/Archived

### 藥物管理
- **定義**：藥物資訊、劑量、給藥時間表、庫存追蹤、給藥記錄
- **關鍵欄位**：medicationId, residentId, name, dosage, frequency, schedule, lastAdministered, nextScheduled, stockLevel, reorderThreshold, status, notes
- **業務規則**：藥物庫存觸發補貨警示閾值為 15；最後給藥時間不得為未來；給藥頻率必須是 OnceDaily/TwiceDaily/ThreeTimesDaily/AsNeeded

### 合約審閱追蹤鐘
- **定義**：依《消保法》，新住民簽約前必須給家屬至少 3 天審閱期，系統自動鎖定簽署功能直至期限屆滿
- **關鍵欄位**：contractId, residentId, intentDate, reviewPeriodEndDate, signatureDate, status
- **業務規則**：審閱期不得少於 3 天；簽署日期必須在審閱期結束之後或當天；狀態為 Pending/Approved/Rejected/Expired

### 動態照護比防呆
- **定義**：系統根據住民是否具「三管」（鼻胃管、導尿管、氣切管）動態調整護理人力比例：一般 1:20 → 有三管時為 1:15
- **關鍵欄位**：guardId, residentId, hasThreePipe, requiredRatio, currentRatio, isCompliant
- **業務規則**：基礎護理人力比例為 1:20（至少需 2 名護理人員且隨時至少 1 人在班）；具有三管住民時比例緊縮為 1:15；夜間（22:00-08:00）必須至少有一名本國籍員工在班

### 本國籍人員留守強制檢核
- **定義**：夜間（22:00-08:00）排班中必須至少有一名具本國籍身分的護理師或照服員在班
- **關鍵欄位**：guardId, shiftStart, shiftEnd, hasLocalStaff, isCompliant
- **業務規則**：夜間時段定義為 22:00 至隔日 08:00；本國籍身分證明需透過身分證字號或其他合法證件驗證

### 特約工時累積計時器
- **定義**：系統自動累計特約社工每週總排班時數，法律要求每人每週 ≥16 小時
- **關鍵欄位**：accumulatorId, staffId, weekStartDate, weekEndDate, totalHours, isCompliant
- **業務規則**：統計週期為週一至週日；總小時數不得少於 16 小時；超時數不作累積（僅作合規檢核）

### 24 小時病歷鎖定機制
- **定義**：照護紀錄提交後 24 小時內可修改（留存增刪留痕），逾時自動以加密時戳技術硬性鎖定，不得直接修改；鎖定後修正必須透過「補充修正案」，原始與補充案版本並存
- **關鍵欄位**：recordId, submittedAt, lockedAt, lockType, isLocked, modificationHistory
- **業務規則**：鎖定類型為 Editable/Locked；修改歷程必須記錄操作人、時間、原始值與變更後值；鎖定後僅允許透過補充修正案進行更正；所有修改必須留存至少 5 年

### 增刪留痕
- **定義**：所有修改必須以新增紀錄方式保存原始狀態，不得直接覆蓋，確保可追溯誰在何時做了什麼變更
- **關鍵欄位**：auditId, recordId, actionType, changedBy, changedAt, fieldName, oldValue, newValue, reason
- **業務規則**：動作類型為 Create/Update/Delete；變更欄位必須有明確定義；原因欄位必須填寫；所有紀錄必須留存至少 5 年

### 電子簽章
- **定義**：使用醫事人員憑證（IC 卡）或符合《電子簽章法》的數位簽名技術，註明病歷作者並加密，確保不可否認性
- **關鍵欄位**：signatureId, recordId, signedBy, signedAt, certificateId, signatureData
- **業務規則**：必須使用有效的醫事人員憑證或認可的數位簽名技術；簽名資料必須包含時間戳和作者身份；簽名一旦生成即不可撤銷

### 品質指標監測看板
- **定義**：即時顯示跌倒發生率、壓傷盛行率、非計畫性住院率等關鍵指標，作為 PDCA 品質改善依據
- **關鍵欄位**：metricId, metricName, currentValue, targetValue, unit, trend, lastUpdated
- **業務規則**：跌倒發生率計算方式為：(跌倒次數 / 總住民日數) × 1000；壓傷盛行率為：(當月壓傷病例數 / 當月總住民數) × 100；非計畫性住院率為：(非計畫性住院次數 / 總住民日數) × 1000

### 評鑑佐證報表一鍵生成
- **定義**：系統自動彙整 63 項評鑑項目之電子化佐證資料（含稽核軌跡），生成政府格式報表，減少整備時間
- **關鍵欄位**：reportId, generatedAt, generatedBy, reportType, status, filePath
- **業務規則**：必須包含 A、B、C、D 四大維度共 63 項指標；報表格式必須符合衛福部規定；所有資料必須留存至少 5 年

### 影子雙軌運行法
- **定義**：試用初期先由系統分析現有紙本班表產出「合規落差報告」，待第四週正式撤除紙本後才啟動硬性阻斷功能
- **關鍵欄位**：rolloutId, startDate, endDate, phase, complianceReportGenerated, hardEnforcementEnabled
- **業務規則**：第 1-3 週僅產出合規落差報告（不阻斷）；第 4 週起啟動硬性阻斷功能；所有試用資料必須留存至少 1 年

### 數位轉型的法律保護殼
- **定義**：第一期的核心定位：不僅是取代紙本，更透過服務對象管理、人事管理、緊急事件處理、資安維護四大模組，提供系統級自動法律保護
- **關鍵模組**：
  - 服務對象管理模組（床位動態管理、入出機構紀錄、零用金/財務管理、自動金流與收據開立）
  - 人事管理與訓練紀錄模組（執業執照與健檢追蹤、教育訓練時數累計）
  - 緊急事件處理與監測模組（異常事件登錄、EOP 演練紀錄存檔）
  - 資安維護與稽核軌跡補充（專責人員權限分離、設備安全管理紀錄）
- **業務規則**：四大模組必須在第一期同時實施；所有相關紀錄必須留存至少 5 年；系統必須提供完整的稽核軌跡以備查核

## 實體關係

```
RESIDENT ||..| DAILY-CARE-RECORD : "has"
RESIDENT ||..| MEDICATION-RECORD : "has"
RESIDENT ||..| CARE-PLAN : "has"
RESIDENT ||..| CONTRACT : "has"
STAFF ||..| DAILY-CARE-RECORD : "records"
STAFF |||..| SCHEDULE : "works"
STAFF ||..| AUDIT-TRAIL : "generates"
```

## 業務規則

- BR001: 所有專業照護紀錄必須在 24 小時內完成電子簽章鎖定。
- BR002: 鎖定後不允許直接修改紀錄，僅能透過「補充修正案」進行更正。
- BR003: 夜間（22:00-08:00）排班中必須至少有一名具本國籍身分的員工在班。
- BR004: 若住民具「三管」（鼻胃管、留置尿管、氣切管），則護理人力配置比例必須為 1:15，否則為 1:20。
- BR005: 特約社工每週總排班時數不得少於 16 小時。
- BR006: 新住民簽約功能在簽約前必須被系統鎖定，直至法定審閱期（≥3 天）屆滿。
- BR007: 所有修改必須留存完整增刪留痕（Audit Logs），包含操作人、時間、原始值與新增值，並至少保存 5 年。
- BR008: 系統必須支援離線操作，並具備背景同步與衝突解決機制。
- BR009: 資料必須儲存在中華民國境內區域（如 AWS/GCP/Azure 的台北節點）。
- BR010: 全時強制實施 HTTPS (TLS 1.3) 加密傳輸，並建立獨立的租戶隔離架構。
- BR011: 行動裝置必須透過 MDM 系統管理，設定為 Kiosk Mode（單一 App 模式），並具備遠端一鍵抹除功能。