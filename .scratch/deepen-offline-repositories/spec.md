# 規格：離線優先資源庫模組深化 (Deepen Offline-First Resource Repositories)

Status: done

## Problem Statement

目前長照系統（LRP）的 Web 前端應用在處理離線優先需求時，資料存取邏輯直接散落在各 UI 頁面元件中（如住民清單、用藥管理、日常照護紀錄等）。每個頁面必須自行檢查網路連線狀態（`navigator.onLine`）、手動呼叫 API 與 Dexie IndexedDB 本機資料庫進行快取迴圈、並在離線時重複實作記憶體端的多條件篩選、排序與分頁邏輯。

這導致：
1. **快取與資料存取邏輯發散（缺乏 Locality）**：離線修復或快取策略變更需要修改多個 React 頁面元件。
2. **測試成本高昂**：必須掛載完整的 React 元件樹並模擬 Dexie 及 React Query 才能驗證離線降級邏輯。
3. **介面過淺（Shallow Module）**：UI 必須感知底層儲存媒介與同步隊列細節。

## Solution

建立統一的**離線優先資源庫（Offline-First Resource Repository）**深模組層，作為 UI 與資料存取（API、IndexedDB 快取、同步隊列）之間的單一接縫（Seam）。

Repository 對外暴露精簡的領域資料存取介面（如 `list`, `getById`, `create`, `update` 及專屬領域操作），內部封閉：
- **Network-First 讀取策略**：連線時優先請求後端 API 並在背景自動更新 IndexedDB 本機快取；斷線或網路錯誤時無縫降級至本機 IndexedDB。
- **內建通用記憶體查詢評估器（Generic Query Evaluator）**：離線時在 Repository 內部執行關鍵字模糊搜尋、多欄位篩選、排序與分頁，回傳與後端一致的標準分頁結構。
- **集中式樂觀寫入與同步隊列排程**：建立與修改時自動產生樂觀 ID、寫入 IndexedDB、加入 `SyncQueue` 待同步隊列，並在連線時自動觸發背景同步引擎。
- 上層提供薄型 React Query Hooks，僅作狀態綁定與 UI 轉接。

## User Stories

1. As a 照護人員 (Caregiver), I want to 能夠在機構無網路或訊號微弱區域順暢瀏覽住民清單與床位號, so that 我能即時確認住民基本資料而不受網路中斷影響。
2. As a 照護人員 (Caregiver), I want to 在離線狀態下使用姓名、身分證號、病床號或管路狀態進行篩選搜尋, so that 搜尋結果能即時並正確地依條件過濾展示。
3. As a 護理人員 (Nurse), I want to 能夠在連線正常時自動獲取伺服器端最新的用藥排程與庫存, so that 我執行的給藥依據始終保持最新驗證狀態。
4. As a 護理人員 (Nurse), I want to 在連線時查詢的所有藥物資料自動在背景快取至本機, so that 萬一隨後網路斷線時仍可直接讀取先前的藥物資訊。
5. As a 照護人員 (Caregiver), I want to 在離線狀態下新增日常照護紀錄與執行紀錄, so that 系統能立即於本機完成儲存並顯示於畫面上（樂觀更新），無須等待網路恢復。
6. As a 護理人員 (Nurse), I want to 離線新增或修改的資料在網路恢復時自動由背景同步隊列發送至伺服器, so that 我不需要手動重新輸入或手動點擊同步按鈕。
7. As a 督導人員 (Supervisor), I want to 在切換分頁與檢視住民詳細資料時獲得一致的載入與快取體驗, so that 系統各功能模組的離線行為高度一致且穩定。
8. As a 前端開發工程師, I want to 撰寫 UI 頁面時只需呼叫乾淨的 Repository 查詢與變更方法, so that 我不必在每個 React 元件內重複撰寫 Dexie 查詢、快取寫入與 JS 篩選邏輯。
9. As a 測試工程師, I want to 能針對 Repository 的離線降級與快取更新進行純 TypeScript 單元測試, so that 測試執行快速且不依賴 DOM/React 元件渲染。

## Implementation Decisions

### 1. 模組架構與雙層接縫（Two-tier Seam Architecture）
- **領域 Repository 核心層**：純 TypeScript 模組，不依賴 React 渲染生命週期。
  - 對外介面提供：`list(query)`、`getById(id)`、`create(data)`、`update(id, data)`、`delete(id)` 以及領域專屬方法（如藥物之 `administer()`、照護紀錄之 `applySupplement()`）。
  - 核心模組接受 API Client、IndexedDB Table、SyncQueue 與連線狀態作為內部依賴。
- **薄型 Hook 轉接層**：建立在 TanStack Query 之上的輕量 React Hooks（如 `useResidents`、`useMedications`、`useCareRecords`），僅負責將 Repository 回傳的 Promise 轉接至 React Query 的 `data` / `isLoading` 狀態。

### 2. 深模組基底工廠（Offline Repository Base Engine）
- 實作通用工廠函式 `createOfflineRepository<TEntity, TCreateInput, TUpdateInput>(config)`：
  - 統一封裝 Network-First 請求 ➔ 成功寫入快取 ➔ 失敗降級 Dexie 的核心狀態機。
  - 統一封裝樂觀寫入 ➔ 寫入 Dexie ➔ 插入 `SyncQueue` ➔ 觸發 `triggerSyncNow()` 的標準寫入流程。
  - 各領域實體在此基底上構建，並宣告各自的資料表與自訂搜尋評估欄位。

### 3. 通用記憶體查詢評估器（Generic In-Memory Query Evaluator）
- 實作無副作用的純函式查詢引擎：
  - 支援多欄位模糊匹配（支援中文與大小寫不敏感搜尋）。
  - 支援精確比對（如 `status`、`gender`、`hasThreePipe`）。
  - 支援通用排序（升冪/降冪、指定排序欄位）與分頁（`page`, `pageSize` 切片）。
  - 確保離線查詢回傳格式符合標準 `PaginatedResponse<T>`。

### 4. 領域實體 Repository
- **`residentRepository`**：處理住民基本資料、身分證號搜尋、三管過濾、狀態切換。
- **`medicationRepository`**：處理藥物資訊、庫存水位預警計算、給藥歷程登記（`administer`）。
- **`careRecordRepository`**：處理照護活動登記、24 小時鎖定狀態查詢、補正案提交。

## Testing Decisions

- **測試原則**：遵循「Interface is the test surface」，針對 Repository 對外暴露的介面進行行為驗證，不測試內部私有變數或過度 Mock 細節。
- **測試涵蓋範圍**：
  1. **連線正常（Online）**：驗證 Repository 呼叫 API 成功後，資料確實寫入 Dexie 快取，並回傳 API 資料。
  2. **離線降級（Offline Fallback）**：驗證當 API 斷線或拋出錯誤時，Repository 能自動自 Dexie 取出快取資料，並透過查詢評估器正確執行多條件篩選、排序與分頁。
  3. **樂觀寫入與同步排程**：驗證 `create` / `update` 呼叫後，Dexie 立即呈現更新後的實體，且 `SyncQueue` 存在對應的待同步操作。
  4. **領域擴充行為**：驗證各領域專屬方法（如給藥記錄更新與庫存變更）在離線與連線下的正確性。
- **Prior Art（現有測試參考）**：參考 `apps/web/src/utils/syncEngine.test.ts` 與 `apps/web/src/stores/authStore.test.ts` 的測試結構與假資料配置。

## Out of Scope

- 修改後端 API 規格或替換 MSW Mock Handlers 的資料庫結構。
- 變更 Dexie IndexedDB 既有的資料表 Schema 欄位定義。
- 重構非資料存取相關的純 UI 樣式（如 Tailwind 版面佈局）。

## Further Notes

- 此架構決策對應 CONTEXT.md 之業務規則 **BR008（系統必須支援離線操作，並具備背景同步與衝突解決機制）**。
- 完成此深化後，各 UI 頁面（`ResidentsPage`, `MedicationsPage`, `CareRecordsPage`）將大幅移除約 40-50% 的重複資料管理與篩選程式碼。
