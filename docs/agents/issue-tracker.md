# 問題追蹤器：本地 Markdown

本倉庫的問題與規格（您可能稱之為 PRD）以 Markdown 檔案形式存在於 `.scratch/` 中。

## 慣例

- 每個功能一個目錄：`.scratch/<feature-slug>/`
- 規格檔為 `.scratch/<feature-slug>/spec.md`
- 實作問題每張票一個檔案，置於 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，編號從 `01` 開始 —— 絕不使用單一合併票券檔
- 分流狀態記錄在每個問題檔案頂部附近的 `Status:` 行（參見 `triage-labels.md` 的角色字串）
- 註解與對話歷程附加在檔案底部的 `## Comments` 標題下

## 當技能指示「發布到問題追蹤器」

在 `.scratch/<feature-slug>/` 下建立新檔案（如需目錄則自動建立）。

## 當技能指示「獲取相關票券」

讀取參考路徑的檔案。使用者通常會直接傳遞路徑或問題編號。

## 導航操作

供 `/wayfinder` 使用。**地圖** 是一個檔案，每張**子票券**對應一個子檔案。

- **地圖**：`.scratch/<effort>/map.md` — 包含備註 / 目前決策 / 迷霧區。
- **子票券**：`.scratch/<effort>/issues/NN-<slug>.md`，編號從 `01` 開始，內含問題描述。`Type:` 行記錄票券類型（`research`/`prototype`/`grilling`/`task`）；`Status:` 行記錄 `claimed`/`resolved`。
- **阻塞**：頂部附近的 `Blocked by: NN, NN` 行。當列出的所有檔案皆為 `resolved` 時，該票券解除阻塞。
- **前沿**：掃描 `.scratch/<effort>/issues/` 找出開啟、未阻塞、未認領的檔案；編號最小者優先。
- **認領**：設定 `Status: claimed` 並儲存，然後再開始工作。
- **解決**：在 `## Answer` 標題下附加答案，設定 `Status: resolved`，再將情境指標（摘要 + 連結）附加到地圖的「目前決策」區段。