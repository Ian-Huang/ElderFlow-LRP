# Claude Code 指令
所有問答都以台灣的角度，繁體中文來回答

## Agent skills


### Issue tracker

問題以本地 Markdown 檔案形式存在於 `.scratch/`。參見 `docs/agents/issue-tracker.md`。

### Triage labels

預設五角色詞彙：needs-triage、needs-info、ready-for-agent、ready-for-human、wontfix。參見 `docs/agents/triage-labels.md`。

### Domain docs

單一上下文配置：專案根目錄的 `CONTEXT.md` + `docs/adr/`。參見 `docs/agents/domain.md`。

### 現場工具箱與實驗室規範 (Frontline Lab / Toolkit)
當使用者在對話中提及**「工具箱」、「現場工具箱」、「實驗室」**或具體模組（如**「訪客登記」、「修繕表」、「消毒表」、「自製表單」**）時：
- **自動觸發沙盒邊界**：修改範圍自動限制於現場工具箱目錄（`apps/web/src/pages/frontline-lab/` 或其子模組），**嚴格禁止**未經指示擅自改動 `packages/core` 與系統核心資料庫。
- **自動使用動態存儲**：資料讀寫一律調用 `useSandboxCollection`，讓現場同仁隨意增減欄位，無需等待後端開 table。
- **三件套同步更新**：確保「公開手機填寫端 (Kiosk) ➔ 內部資料庫清單 (DB) ➔ A4 評鑑列印 (A4 Print)」保持連動。
- 遵循詳細指引：`docs/frontline-lab-guide.md`、`docs/frontline-ai-playbook.md` 與 `docs/frontline-reports-guide.md`。