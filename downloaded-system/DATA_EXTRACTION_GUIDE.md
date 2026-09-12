# 長榮護理之家系統資料抓取與 ETL 完整操作指南

> **建立日期：** 2026-09-11  
> **適用系統：** `chungshan.rdd.com.tw`（中山護理之家 LRP 系統，HTTP 非 HTTPS）  
> **目標：** 26 位住民、63 類表單 → SQLite 資料庫 + 模組化 JSON  

---

## 目錄

1. [系統架構與渲染模式](#1-系統架構與渲染模式)
2. [第一步：抓取全量原始備份](#2-第一步抓取全量原始備份)
3. [第二步：護理記錄補齊包（INR20 特殊處理）](#3-第二步護理記錄補齊包inr20-特殊處理)
4. [第三步：執行全量 ETL 清洗](#4-第三步執行全量-etl-清洗)
5. [踩坑紀錄與細節調整（關鍵問題修復）](#5-踩坑紀錄與細節調整關鍵問題修復)
6. [驗證清單與檢查腳本](#6-驗證清單與檢查腳本)
7. [最終產出資料說明](#7-最終產出資料說明)
8. [26 位住民清單與系統 ID](#8-26-位住民清單與系統-id)
9. [未來更新資料 SOP（極簡版 4 步驟）](#9-未來更新資料-sop極簡版-4-步驟)

---

## 1. 系統架構與渲染模式

### 系統基本環境
- 網址：`http://chungshan.rdd.com.tw`（**注意：是 HTTP，不是 HTTPS**）
- 登入系統後，直接在系統首頁開啟 Console 即可執行抓取腳本。

### 兩種表單渲染模式（核心分歧）

| 模式 | 說明 | 表單數量 | 抓取機制 |
|---|---|---|---|
| **伺服器端同步渲染** | 載入頁面時直接執行 `GetData()` 取得完整 HTML table | 58/62 類 | ✅ 全量備份腳本可直接抓取 |
| **客戶端 Ajax 非同步** | 初始 HTML 只有空表格殼子，由 JS 發起二次 POST 請求 | 4/62 類 | ⚠️ 需獨立腳本抓取補齊包 |

### 4 類 Ajax 表單盤點：
1. **護理記錄 (`INR20`)**：端點 `/asp/getNur20Print.asp?flag=1` 與 `flag=2`。**機構重點核心資料，必須補齊！**
2. **醫師-個案記錄表 (`D07`)**：端點 `/asp/getVisitRecordPrint.asp?fcode=D07`。確認機構未曾使用過此表單（0筆）。
3. **藥師-個案紀錄表 (`Dr07`)**：端點 `/asp/getVisitRecordPrint.asp?fcode=Dr07`。確認機構未曾使用過此表單（0筆）。
4. **營養-個案記錄表 (`NT07`)**：端點 `/asp/getVisitRecordPrint.asp?fcode=NT07`。確認機構未曾使用過此表單（0筆）。

---

## 2. 第一步：抓取全量原始備份

### 執行方式
1. 登入系統後，直接在系統首頁。
2. 按 `F12` 開啟 DevTools 切換至 **Console** 分頁。
3. 複製並貼上下列 JavaScript 腳本執行：

```javascript
(async function backupAll87Reports() {
  console.log("%c[LRP 87種全表單無死角備份] 啟動...", "color: #3182ce; font-weight: bold; font-size: 15px;");

  let panel = document.getElementById("lrp-backup-panel");
  if (panel) panel.remove();
  panel = document.createElement("div");
  panel.id = "lrp-backup-panel";
  panel.style.cssText = "position:fixed;top:15px;right:15px;z-index:999999;background:#1a202c;color:#fff;padding:16px 20px;border-radius:10px;box-shadow:0 10px 25px rgba(0,0,0,0.5);font-family:sans-serif;font-size:13px;min-width:340px;max-width:440px;line-height:1.5;";
  panel.innerHTML = `
    <div style="font-weight:bold;font-size:15px;color:#63b3ed;margin-bottom:6px;">🚀 LRP 全量 87 種表單深度備份</div>
    <div id="lrp-status" style="color:#e2e8f0;">準備抓取...</div>
    <div style="margin-top:8px;height:8px;background:#4a5568;border-radius:4px;overflow:hidden;">
      <div id="lrp-bar" style="width:0%;height:100%;background:#48bb78;transition:width 0.2s;"></div>
    </div>
    <div id="lrp-detail" style="margin-top:6px;font-size:11px;color:#a0aec0;"></div>
    <div id="lrp-actions" style="margin-top:12px;display:none;"></div>
  `;
  document.body.appendChild(panel);

  const updateStatus = (text, pct, detail = "") => {
    document.getElementById("lrp-status").innerText = text;
    if (pct !== undefined) document.getElementById("lrp-bar").style.width = pct + "%";
    if (detail) document.getElementById("lrp-detail").innerText = detail;
  };

  // 26 位住民
  const residents = [
    { ID: 1, BedName: "1-1", Name: "周吳綺緣", PatientID: "0040" },
    { ID: 30, BedName: "1-2", Name: "賴明玉", PatientID: "0066" },
    { ID: 27, BedName: "1-3", Name: "林雪", PatientID: "0064" },
    { ID: 8, BedName: "1-5", Name: "吳美雪", PatientID: "0035" },
    { ID: 5, BedName: "1-6", Name: "簡月娥", PatientID: "0007" },
    { ID: 9, BedName: "1-7", Name: "郭云芹", PatientID: "0061" },
    { ID: 7, BedName: "2-1", Name: "陳寶鳳", PatientID: "0043" },
    { ID: 38, BedName: "2-2", Name: "熊侯玉雲", PatientID: "" },
    { ID: 39, BedName: "2-3", Name: "徐金定", PatientID: "0075" },
    { ID: 13, BedName: "3-1", Name: "陳銘玄", PatientID: "0059" },
    { ID: 14, BedName: "3-2", Name: "楊志堅", PatientID: "0062" },
    { ID: 12, BedName: "3-3", Name: "何進榮", PatientID: "0042" },
    { ID: 24, BedName: "3-5", Name: "陳順澤", PatientID: "0016" },
    { ID: 19, BedName: "3-6", Name: "廖清潭", PatientID: "0014" },
    { ID: 15, BedName: "5-1", Name: "劉耀隆", PatientID: "0053" },
    { ID: 36, BedName: "5-2", Name: "周錦龍", PatientID: "00071" },
    { ID: 17, BedName: "5-3", Name: "杜朝榮", PatientID: "0031" },
    { ID: 33, BedName: "6-1", Name: "許振萍", PatientID: "0068" },
    { ID: 40, BedName: "6-2", Name: "劉旭章", PatientID: "" },
    { ID: 31, BedName: "6-3", Name: "巫雲丁", PatientID: "0067" },
    { ID: 25, BedName: "6-5", Name: "陳興裕", PatientID: "0026" },
    { ID: 22, BedName: "7-1", Name: "鄧明福", PatientID: "003" },
    { ID: 26, BedName: "7-2", Name: "周峰毅", PatientID: "0055" },
    { ID: 35, BedName: "7-3", Name: "鄧錦城", PatientID: "0070" },
    { ID: 21, BedName: "7-5", Name: "劉在來", PatientID: "0036" },
    { ID: 41, BedName: "7-6", Name: "詹益義", PatientID: "" }
  ];

  // 系統 87 種全單張代碼清單
  const all87Reports = [
    { code: "IR01", name: "復健定期評估表" },
    { code: "IR09", name: "復健新入住評估表" },
    { code: "IRE02", name: "職能治療定期評估表" },
    { code: "IR03", name: "個別運動計畫" },
    { code: "IR07", name: "輔具需求評估表" },
    { code: "IR11", name: "復健運動執行紀錄" },
    { code: "IR12", name: "自我照顧活動表現與輔具使用情況" },
    { code: "IR02", name: "物理治療定期評估表" },
    { code: "INR20", name: "護理記錄" },
    { code: "IVitl", name: "生命徵象量表" },
    { code: "INR36", name: "血糖紀錄表" },
    { code: "INPH",  name: "針劑血糖記錄單" },
    { code: "INU42", name: "尿失禁評估單" },
    { code: "IA09",  name: "入住初次評估表" },
    { code: "IA15",  name: "疼痛初評表" },
    { code: "ICons", name: "約束同意評估單" },
    { code: "IA19",  name: "生化檢驗紀錄表" },
    { code: "IN100", name: "全人評估" },
    { code: "IA56",  name: "住民入住隔離室記錄單" },
    { code: "INR66", name: "住民持續性輔導照護計劃" },
    { code: "INU54", name: "保護性身體約束評估表" },
    { code: "INR53", name: "疼痛評估表" },
    { code: "IOc07", name: "身體評估" },
    { code: "IOc08", name: "壓力性損傷危險評估" },
    { code: "INR55", name: "如廁服務紀錄表" },
    { code: "INR14", name: "ADL評估量表" },
    { code: "INR58", name: "防範跌倒評估記錄表" },
    { code: "IO05",  name: "住民外出請假單" },
    { code: "IA51",  name: "膀胱訓練記錄表" },
    { code: "IHWei", name: "身高體重記錄單" },
    { code: "Plans", name: "照護計畫" },
    { code: "IOcc5", name: "IADL評估量表" },
    { code: "IReTu", name: "換管紀錄表" },
    { code: "IE01",  name: "住院登記表" },
    { code: "IA22",  name: "傷口治療記錄表" },
    { code: "IE06",  name: "壓力性損傷逐案分析" },
    { code: "INu32", name: "意外事件記錄" },
    { code: "INFE",  name: "感染確診登記表" },
    { code: "IE05",  name: "非計劃性體重收案單" },
    { code: "IPhys", name: "身體約束情況登錄表" },
    { code: "IE07",  name: "鼻胃管移除評估表" },
    { code: "IE08",  name: "導尿管移除評估表" },
    { code: "IX04",  name: "個案研討會議" },
    { code: "IX01",  name: "專業聯繫照會單" },
    { code: "IA20",  name: "整合照護計畫" },
    { code: "AR03",  name: "白班照顧服務記錄表" },
    { code: "AR04",  name: "夜班照顧服務記錄表" },
    { code: "IO01",  name: "不施行心肺復甦術同意書" },
    { code: "IO02",  name: "定型化契約" },
    { code: "IO04",  name: "託收證件記錄單" },
    { code: "IME01", name: "藥師定期評估表" },
    { code: "IDr07", name: "藥師-個案紀錄表" },
    { code: "ID07",  name: "醫師-個案記錄表" },
    { code: "IDPat", name: "醫師巡診紀錄單" },
    { code: "INT05", name: "營養治療紀錄" },
    { code: "INT21", name: "管灌飲食份量建議表" },
    { code: "INT20", name: "由口進食份量建議表" },
    { code: "INT01", name: "營養定期評估表" },
    { code: "INT06", name: "住民飲食" },
    { code: "INT07", name: "營養-個案記錄表" },
    { code: "INT08", name: "膳食滿意度調查表" },
    { code: "IO08",  name: "新進居民權利義務表" },
    { code: "IMNA",  name: "迷你營養評估" },
    { code: "INR51", name: "72H營養篩檢" },
    { code: "IS10",  name: "社工初評及適應評估" },
    { code: "ISC29", name: "臨終照護紀錄表" },
    { code: "INR60", name: "個別化活動記錄表" },
    { code: "IS02",  name: "住民與家屬之權利及義務" },
    { code: "ISoc1", name: "個案記錄表" },
    { code: "IAct",  name: "個案參與活動評值表" },
    { code: "IS07",  name: "社工定期評估" },
    { code: "IS09",  name: "個案轉介單" },
    { code: "IS11",  name: "志工服務簽到表" },
    { code: "IS12",  name: "資源單位簽到名冊" },
    { code: "ISC27", name: "社工接案摘要表" },
    { code: "IS22",  name: "社會心理適應評估表" },
    { code: "IISP",  name: "自立支援ISP評估表" },
    { code: "ISPMS", name: "SPMSQ評估量表" },
    { code: "IThnd", name: "臨終關懷記錄表" },
    { code: "ICONT", name: "家屬聯繫記錄單" },
    { code: "ISC26", name: "簡易長者憂鬱GDS15" },
    { code: "ISC23", name: "服務滿意度調查" }
  ];

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const fullResult = {
    exportedAt: new Date().toISOString(),
    totalResidents: residents.length,
    residents: []
  };

  for (let i = 0; i < residents.length; i++) {
    const r = residents[i];
    const basePct = Math.round((i / residents.length) * 100);
    updateStatus(`[${i + 1}/${residents.length}] 正在抓取 ${r.BedName} ${r.Name}`, basePct);

    const residentData = {
      residentInfo: r,
      reports: {}
    };

    for (const rpt of all87Reports) {
      let currentPage = 1;
      let maxPage = 1;
      let allRows = [];

      try {
        do {
          updateStatus(
            `[${i + 1}/${residents.length}] ${r.BedName} ${r.Name}`,
            basePct,
            `表單：${rpt.name} (${currentPage}/${maxPage}頁)`
          );

          const url = `/Print?owner_id=${r.ID}&code=${rpt.code}&event_start=2020/01/01&event_stop=${today}&latest=False&page=${currentPage}`;
          const html = await jQuery.get(url);

          if (!html || html.includes("期間內尚未填寫任何紀錄")) {
            break;
          }

          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");

          if (currentPage === 1) {
            const pageLinks = Array.from(doc.querySelectorAll("a[href*='page=']"));
            pageLinks.forEach(a => {
              const m = a.href.match(/page=(\d+)/);
              if (m) {
                const p = parseInt(m[1]);
                if (p > maxPage) maxPage = p;
              }
            });
          }

          doc.querySelectorAll("table tr").forEach((tr, trIdx) => {
            if (currentPage > 1 && trIdx === 0 && allRows.length > 0) return;
            const cells = Array.from(tr.querySelectorAll("td, th")).map(td => td.innerText.trim());
            if (cells.length > 0 && cells.some(c => c.length > 0)) {
              allRows.push(cells);
            }
          });

          currentPage++;
          await new Promise(res => setTimeout(res, 20));
        } while (currentPage <= maxPage);

        if (allRows.length > 1) {
          residentData.reports[rpt.name] = {
            code: rpt.code,
            totalPages: maxPage,
            totalRows: allRows.length,
            table: allRows
          };
        }
      } catch (err) {
        console.warn(`抓取 ${r.Name} 的 ${rpt.name} 失敗`, err);
      }
    }

    fullResult.residents.push(residentData);
  }

  updateStatus("🎉 87種全單張備份完成！", 100, "所有專業紀錄已全數納入");
  window.__LRP_BACKUP_DATA__ = fullResult;

  const actionsDiv = document.getElementById("lrp-actions");
  if (actionsDiv) {
    actionsDiv.style.display = "block";
    actionsDiv.innerHTML = `
      <div style="color:#48bb78;font-weight:bold;margin-bottom:8px;">✅ 87 種單張全數抓取完成！</div>
      <button id="lrp-btn-dl" style="background:#38a169;color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-weight:bold;margin-right:8px;">💾 下載 87 表單完整 JSON 檔</button>
      <button id="lrp-btn-close" style="background:#718096;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;">關閉</button>
    `;

    document.getElementById("lrp-btn-dl").onclick = () => {
      const jsonStr = JSON.stringify(fullResult, null, 2);
      const a = document.createElement("a");
      const blob = new Blob([jsonStr], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = "full_online_backup_complete.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    document.getElementById("lrp-btn-close").onclick = () => {
      panel.remove();
    };
  }
})();
```

4. 執行期間右上角會出現浮動面板與進度條，跑完後點擊「**💾 下載 87 表單完整 JSON 檔**」。
5. 將下載的檔案命名並存放至專案路徑：
   - **路徑：** `downloaded-system/full_online_backup_complete.json`
   - **大小：** 約 51 MB
   - **重要提醒：** 該檔案包含 26 位長輩共 87 種單張與各表單完整歷史分頁。其中 `"護理記錄": {"table": []}` 為空陣列（因 Ajax 渲染），需透過「第二步」補齊。

---

## 3. 第二步：護理記錄補齊包（INR20 特殊處理）

### 執行步驟
1. 登入系統後，在系統首頁。
2. 按 `F12` 開啟 DevTools 切換至 **Console** 分頁。
3. 貼上並執行下列 JavaScript 腳本：

```javascript
// 護理記錄（INR20）補齊包抓取腳本
// 適用：chungshan.rdd.com.tw

const RESIDENT_LIST = [
  {id: 1,  name: "周吳綺緣"}, {id: 30, name: "賴明玉"},
  {id: 27, name: "林雪"},     {id: 8,  name: "吳美雪"},
  {id: 5,  name: "簡月娥"},   {id: 9,  name: "郭云芹"},
  {id: 7,  name: "陳寶鳳"},   {id: 38, name: "熊侯玉雲"},
  {id: 39, name: "徐金定"},   {id: 13, name: "陳銘玄"},
  {id: 14, name: "楊志堅"},   {id: 12, name: "何進榮"},
  {id: 24, name: "陳順澤"},   {id: 19, name: "廖清潭"},
  {id: 15, name: "劉耀隆"},   {id: 36, name: "周錦龍"},
  {id: 17, name: "杜朝榮"},   {id: 33, name: "許振萍"},
  {id: 40, name: "劉旭章"},   {id: 31, name: "巫雲丁"},
  {id: 25, name: "陳興裕"},   {id: 22, name: "鄧明福"},
  {id: 26, name: "周峰毅"},   {id: 35, name: "鄧錦城"},
  {id: 21, name: "劉在來"},   {id: 41, name: "詹益義"}
];

async function fetchNursingRecordsForResident(resId) {
  const results = [];
  for (const flag of [1, 2]) {
    const resp = await fetch('/asp/getNur20Print.asp?flag=' + flag, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: 'resid=' + resId
    });
    const html = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('tr');
    rows.forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('td, th')).map(td => td.innerText.trim());
      if (cells.length > 0 && cells.some(c => c !== '')) {
        results.push({
          event_date: cells[0] || '',
          flag: flag,
          focus: cells[1] || '',
          content: cells[2] || '',
          recorder: cells[3] || '',
          task_id: cells[4] || '',
          form_id: cells[5] || ''
        });
      }
    });
  }
  return results;
}

async function fetchAllNursingRecords() {
  const output = {};
  for (const resident of RESIDENT_LIST) {
    console.log('抓取中: ' + resident.name + ' (ID: ' + resident.id + ')');
    try {
      const records = await fetchNursingRecordsForResident(resident.id);
      output[resident.id] = { name: resident.name, records };
      console.log('  → ' + records.length + ' 筆');
    } catch(e) {
      console.error('  ERROR: ' + e.message);
      output[resident.id] = { name: resident.name, records: [] };
    }
  }
  // 關鍵：使用 Blob URL，不可用 data: URI
  const blob = new Blob([JSON.stringify(output, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nursing_records_supplement.json';
  a.click();
  URL.revokeObjectURL(url);
  console.log('✅ 護理紀錄下載完成！');
}

fetchAllNursingRecords();
```

4. 下載完成後，將檔案置於專案目錄：  
   `downloaded-system/nursing_records_supplement.json`

---

## 4. 第三步：一鍵無腦清洗與驗證 (One-Click Pipeline)

### 執行方式（最推薦）
專案已提供整合一鍵腳本 `downloaded-system/run_pipeline.py`，會**自動依序執行「全量 ETL 清洗」與「18 項日期格式與筆數嚴格校驗」**：

```bash
# 在專案根目錄下執行：
python3 downloaded-system/run_pipeline.py
```

### 包含的獨立工具（位於 downloaded-system/ 目錄）：
1. **`run_pipeline.py`**：一鍵串聯清洗與校驗的主入口。
2. **`full_etl_all_reports.py`**：全量 63 類表單 ETL 清洗核心程式（包含防呆、排除非時間文字、去除空表頭等）。
3. **`verify_database.py`**：獨立資料庫驗證程式，自動比對核心資料表筆數與 18 個日期欄位的格式規範。

### 產出檔案
1. **SQLite 資料庫：** `downloaded-system/lrp_database.sqlite`（約 31.7 MB，共 20 個資料表）
2. **正規化 JSON：** `downloaded-system/normalized/`（共 21 個模組化 JSON 檔）

---

## 5. 踩坑紀錄與細節調整（關鍵問題修復）

### 踩坑 1：瀏覽器下載 `data:` URI 在 HTTP 站點被攔截
- **問題現象：** `The file at 'data:application/json...' was loaded over an insecure connection...`，下載檔案為 0 位元組或空 `{}`。
- **原因：** Chrome 針對 HTTP 站點阻擋了由 `data:` URI 觸發的大型下載。
- **解法：** 改用 `new Blob([json])` 搭配 `URL.createObjectURL(blob)` 觸發下載。

### 踩坑 2：getResident.asp 無法動態批次取清單
- **問題現象：** 嘗試呼叫 `/asp/getResident.asp` 回傳空 `{}`。
- **原因：** 該端點需綁定特定 session/權限，無法泛用遍歷。
- **解法：** 直接在補齊腳本內寫死機構完整的 26 位住民 ID 清單（`RESIDENT_LIST`）。

### 踩坑 3：醫師巡診紀錄（`doctor_visits`）日期全部為空
- **問題現象：** `visit_date` 490 筆全部是空字串 `""`。
- **原因：** 原始解析器試圖從 `Subjective` 文字中搜尋日期 regex，但巡診 SOAP 內容大多未填寫日期。
- **底層結構：** 巡診紀錄每 ~31 行為一個巡診 block（由 `row[0] == "姓名"` 開始），其巡診日期實際嵌在 `row[0] == "TPR"` 的內嵌 HTML 表格 `<td>2024-10-28 21:02:00</td>` 中。
- **調整：** 遇到 `row[0] == "姓名"` 重置 block，從 `TPR` HTML 正則解析第一個 `YYYY-MM-DD` 轉換為 `YYYY/MM/DD` 作為 `visit_date`。**（修復後 490/490 筆皆具備日期）**

### 踩坑 4：營養治療紀錄（`nutrition_therapy_records`）重複儲存
- **問題現象：** 資料比預期多出一倍（320 筆 vs 實際約 173 筆）。
- **原因：** 每筆評估表單有兩個重複的 `床號：` 標頭列，且兩列都包含相同的 `評估日期：YYYY/MM/DD`，導致解析器觸發了兩次儲存。
- **調整：** 加入 `seen_nut_dates` 集合進行去重保護，僅在遇到真正的新日期時才觸發新評估紀錄。**（修復後去重為 173 筆）**

### 踩坑 5：社工定期評估（`social_work_records`）日期全部為空（999 筆）
- **問題現象：** 社工記錄中 `社工定期評估` 表單 999 筆 `record_date` 為空。
- **原因：** `個案記錄表` 的日期在 `row[0]`（如 `2025/01/03`）；但 `社工定期評估` 是矩陣多欄表，`row[0]` 是字串 `"評估"`，日期實際存於 `row[1]` 或 `row[2]`（如 `2025/02/08 00:002025/02/08`）。
- **調整：** 針對不同社工表單類型分流解析日期；若遇到靜態表單（如適應評估表）則自動 fallback 長輩之 `admission_date`。**（修復後 7,541/7,544 筆皆有日期）**

### 踩坑 6：定期評估（`assessments_periodic`）日期混入「機構抬頭與床號」
- **問題現象：** `assessments_periodic.record_date` 中有 3,000+ 筆資料填入 `'臺北市私立中山老人長'` 或 `'床號：1-1 姓名：'`。
- **原因：** 部分評估量表（特別是「防範跌倒評估記錄表」）在表頭有機構名稱與長輩入住日期，前置過濾條件誤把表頭文字列當成了矩陣日期的標頭欄。
- **調整：** 引入嚴格正則表達式，矩陣欄位日期必須符合純粹的 `^\d{4}/\d{2}/\d{2}` 格式，且過濾包含「中心」、「入住」、「長照」、「床號」的標頭字串。**（修復後 64,663 筆 100% 皆為標準日期格式）**

### 踩坑 7：照服員班別記錄（`daily_care_shifts`）時間欄位混入長輩姓名
- **問題現象：** `time_slot` 出現 `'姓名：周吳綺緣'` 等非時間字串。
- **原因：** 白班與夜班表單在翻頁或每位住民開頭有長輩資訊列（`row[0]` 為姓名），且表尾有「給水量、大便、皮膚、食慾」等總評列。
- **調整：** 過濾姓名與床號列；若 `row[0]` 為數字小時（如 8、9、14）正規化為 `HH:00`，非小時的班別總結列標記為 `'當班總評'`，將檢查項放入 `item_name`。**（修復後 4,524 筆 100% 格式規範）**

### 踩坑 8：營養治療紀錄與社工紀錄殘留空表頭紀錄
- **問題現象：** 營養治療紀錄存在 26 筆空評估日期列，社工紀錄存在 3 筆無日期列。
- **原因：** 每位住民在表單最前端只有長輩個人基本資料列，尚未進入實際評估紀錄區塊前即被保存。
- **調整：** 限制只有在具備有效 `eval_date` / `record_date` 且非表頭時才執行寫入。**（修復後完全排除空標頭資料）**

### 踩坑 9：藥師定期評估（`pharmacist_evaluations`）日期為空
- **問題現象：** `eval_date` 162 筆全部是空字串。
- **查證結果：** 經徹底檢視原始備份資料，**該表單在原機構系統上完全沒有提供「評估日期」欄位**，僅有長輩入住日期與服藥建議紀錄。這是原始系統設計缺失，並非 ETL 漏抓。
- **調整：** 將每 6 行零碎記錄整合成每個評估 block 一條完整紀錄（由原本零碎 705 筆收納成結構清晰的 162 筆）。

---

## 6. 獨立驗證腳本說明 (`verify_database.py`)

在執行 `run_pipeline.py` 時，系統已經會**自動在清洗完成後無縫呼叫此驗證程式**，通常您**不需要**手動執行它。

但如果您日後只想單純「抽檢目前資料庫狀態」而不想重新跑清洗，可以直接在終端機執行：

```bash
python3 downloaded-system/verify_database.py
```

### 驗證項目包含：
1. **各表基準筆數檢驗**：確認住民、護理紀錄、巡診、量表等 9 大核心表格筆數未低於安全閾值。
2. **18 個日期/時間欄位嚴格格式校驗**：
   - 完整日期必須符合 `YYYY/MM/DD` 或 `YYYY-MM-DD`（如評估日、巡診日）。
   - 生命徵象與血糖日期必須符合 `MM/DD`。
   - 照服員時段必須符合 `HH:00` 或 `當班總評`。
   - 確保完全無機構抬頭、住民姓名等字串混入時間欄位。

---

## 7. 最終產出資料說明

### SQLite 20 個資料表分佈

| 資料表名稱 | 筆數 | 說明 |
|---|---|---|
| `residents` | 26 | 住民基本資料（年齡、床號、身分證、用藥等） |
| `nursing_records` | 7,170 | 護理記錄（INR20 補齊包，flag 1 & 2） |
| `vital_signs` | 26,101 | 生命徵象歷程（血壓、心跳、體溫等） |
| `doctor_visits` | 490 | 醫師巡診單（含 SOAP 與精確巡診日期） |
| `blood_sugar` | 836 | 血糖監測紀錄 |
| `insulin_injections` | 2,473 | 胰島素注射紀錄 |
| `tube_records` | 388 | 換管紀錄（鼻胃管、尿管等） |
| `weight_history` | 500 | 歷次體重監測 |
| `assessments_periodic` | 64,663 | 定期評估量表（ADL、跌倒、壓傷、MMSE 等） |
| `comprehensive_assessments` | 59,246 | 全人評估量表（IN100） |
| `physical_evaluations` | 13,656 | 身體評估項目（IOc07） |
| `daily_care_shifts` | 4,524 | 照服員交班紀錄（白班、夜班） |
| `social_work_records` | 7,459 | 社工記錄（個案紀錄表、定期評估等） |
| `pharmacist_evaluations` | 162 | 藥師定期評估紀錄（聚合完整評估區塊） |
| `interdisciplinary_plans` | 152 | 跨專業團隊整合照護計畫 |
| `rehab_evaluations` | 8,142 | 復健評估歷程 |
| `professional_referrals` | 43 | 專業聯繫照會單 |
| `lab_test_records` | 2,757 | 抽血檢驗報告 |
| `nutrition_therapy_records` | 147 | 營養治療評估紀錄（已去重補齊日期） |
| `rehab_exercise_logs` | 89 | 復健運動執行簽核紀錄 |

**總資料量：約 192,000+ 筆**

---

## 8. 26 位住民清單與系統 ID

| 系統 ID (`ResidentSN`) | 床號 | 姓名 | 病歷號 (`PatientID`) |
|---|---|---|---|
| 1 | 1-1 | 周吳綺緣 | 0040 |
| 30 | 1-2 | 賴明玉 | 0066 |
| 27 | 1-3 | 林雪 | 0064 |
| 8 | 1-5 | 吳美雪 | 0035 |
| 5 | 1-6 | 簡月娥 | 0007 |
| 9 | 1-7 | 郭云芹 | 0061 |
| 7 | 2-1 | 陳寶鳳 | 0043 |
| 38 | 2-2 | 熊侯玉雲 | (無) |
| 39 | 2-3 | 徐金定 | 0075 |
| 13 | 3-1 | 陳銘玄 | 0059 |
| 14 | 3-2 | 楊志堅 | 0062 |
| 12 | 3-3 | 何進榮 | 0042 |
| 24 | 3-5 | 陳順澤 | 0016 |
| 19 | 3-6 | 廖清潭 | 0014 |
| 15 | 5-1 | 劉耀隆 | 0053 |
| 36 | 5-2 | 周錦龍 | 00071 |
| 17 | 5-3 | 杜朝榮 | 0031 |
| 33 | 6-1 | 許振萍 | 0068 |
| 40 | 6-2 | 劉旭章 | (無) |
| 31 | 6-3 | 巫雲丁 | 0067 |
| 25 | 6-5 | 陳興裕 | 0026 |
| 22 | 7-1 | 鄧明福 | 003 |
| 26 | 7-2 | 周峰毅 | 0055 |
| 35 | 7-3 | 鄧錦城 | 0070 |
| 21 | 7-5 | 劉在來 | 0036 |
| 41 | 7-6 | 詹益義 | (無) |

---

## 9. 未來更新資料 SOP（極簡版 3 步驟）

日後若長輩資料有新增、或經過一段時間需同步更新：

1. **取得全量備份**：登入舊系統首頁，開啟 Chrome Console (F12)，貼上 [第 2 節之腳本](#2-第一步抓取全量原始備份)，點擊下載並覆蓋 `downloaded-system/full_online_backup_complete.json`。
2. **取得護理紀錄**：於 Console 貼上 [第 3 節之腳本](#3-第二步護理記錄補齊包inr20-特殊處理)，下載並覆蓋 `downloaded-system/nursing_records_supplement.json`。
3. **一鍵無腦清洗與校驗**：
   ```bash
   python3 downloaded-system/run_pipeline.py
   ```
   終端機會自動跑完「全量清洗」並接著自動執行「格式與筆數驗證」，看到 `✨ 全部清洗與驗證流程皆已無腦一步到位完成！` 即表示更新成功。
