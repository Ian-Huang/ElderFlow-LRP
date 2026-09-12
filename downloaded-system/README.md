# 舊系統歷史資料資產與整合指引 (Legacy Data Asset)

> 💡 **給 AI 助理的重要指引 (Prompt for AI)**：
> 1. **非新系統源碼**：本目錄不是新系統的執行時代碼，新系統業務邏輯嚴禁直接耦合此目錄。
> 2. **用途定位**：本目錄包含舊版 LRP 系統 (chungshan.rdd.com.tw) 擷取並已完成深度清洗的歷史真實資料，專供新系統：
>    - 查詢真實機構日常運作的實際欄位、醫囑寫法與評估量表結構（業務領域參考）。
>    - 提取真實案例作為新系統開發與測試時的真實假資料 (Test Fixtures / Seed Data)。
>    - 若未來需要銜接舊資料，此處的 SQLite 與正規化 JSON 即為最標準的資料遷移來源 (Migration Source)。
> 3. **完整工具鏈**：本目錄已內建全自動一鍵清洗與嚴格格式驗證腳本。

---

## 快速上手（無腦更新 SOP）

日後若舊系統有資料更新，只需執行以下三步：

1. **取得全量備份**：登入舊系統首頁，開啟瀏覽器 Console (F12)，貼上 [`DATA_EXTRACTION_GUIDE.md`](DATA_EXTRACTION_GUIDE.md) 第 2 節之腳本，下載檔案並存為 `downloaded-system/full_online_backup_complete.json`。
2. **取得護理紀錄**：於 Console 貼上 [`DATA_EXTRACTION_GUIDE.md`](DATA_EXTRACTION_GUIDE.md) 第 3 節之腳本，下載檔案並存為 `downloaded-system/nursing_records_supplement.json`。
3. **一鍵無腦清洗與驗證**：
   ```bash
   python3 downloaded-system/run_pipeline.py
   ```
   腳本會全自動完成：全量 ETL 清洗 -> 寫入 SQLite -> 產出 21 個模組化 JSON -> 18 個日期欄位格式嚴格校驗。

---

## 目錄檔案架構

| 檔案/目錄 | 角色說明 | 是否進 Git 版控 |
|---|---|---|
| `run_pipeline.py` | 🌟 一鍵無腦執行清洗 + 驗證串接腳本 | ✅ 是 |
| `full_etl_all_reports.py` | 全量 63 類表單 ETL 清洗主程式（已排除非時間值與空表頭） | ✅ 是 |
| `verify_database.py` | 獨立驗證程式（嚴格檢驗資料表筆數與 18 個日期欄位格式規範） | ✅ 是 |
| `DATA_EXTRACTION_GUIDE.md` | 詳細資料擷取 SOP、踩坑處理細節與表單結構分析 | ✅ 是 |
| `README.md` | 本指引文件（供開發者與新視窗 AI 快速理解邊界） | ✅ 是 |
| `lrp_database.sqlite` | 已清洗完成的 SQLite 資料庫（34.2 MB，20 個標準資料表，19.2 萬筆） | ❌ 忽略（本機產物） |
| `normalized/` | 已清洗完成的 21 個模組化 JSON 檔（116 MB） | ❌ 忽略（本機產物） |
| `full_online_backup_complete.json` | 舊系統原始備份大檔（51 MB，內含長輩真實個資） | ❌ 忽略（個資與容量保護） |
| `nursing_records_supplement.json` | 舊系統護理紀錄補齊包（2.7 MB） | ❌ 忽略（個資保護） |

---

## 核心資料表一覽（供新系統設計與測試資料調用）

- `residents`：26 位住民基本個資、床號、身分證、用藥明細等。
- `nursing_records`：7,170 筆護理紀錄 (INR20，含事件時間、焦點代碼、SOAP 紀錄、簽核人員)。
- `vital_signs`：26,101 筆生命徵象 (體溫、脈搏、呼吸、血壓、血氧、血糖、疼痛)。
- `doctor_visits`：490 筆醫師巡診紀錄 (含巡診日期與完整 SOAP 巡診紀錄)。
- `assessments_periodic`：64,663 筆定期評估量表 (ADL、跌倒、壓傷、MMSE、IADL 等矩陣評估)。
- `daily_care_shifts`：4,524 筆照服員交班服務紀錄 (時間格式均規範為 `HH:00` 或 `當班總評`)。
- `social_work_records`：7,459 筆社工個案與定期關懷紀錄。
- `nutrition_therapy_records`：147 筆營養師治療紀錄 (空表頭已完全剔除)。
- `pharmacist_evaluations`：162 筆藥師服藥與交互作用評估紀錄。
- `rehab_evaluations`：8,142 筆復健評估歷程。
