# 領域文件

工程技能在探索代碼庫時，應如何消費本倉庫的領域文件。

## 探索前請先閱讀

- 專案根目錄的 **`CONTEXT.md`**，或
- 專案根目錄的 **`CONTEXT-MAP.md`**（若存在）— 它指向每個上下文的 `CONTEXT.md`。請閱讀與主題相關的每一份。
- **`docs/adr/`** — 閱讀涉及您即將作業區域的 ADR。多上下文倉庫還請檢查 `src/<context>/docs/adr/` 的上下文專屬決策。

若上述檔案不存在，**請靜默繼續**。不要標記缺失、不要建議預先建立。`/domain-modeling` 技能（經由 `/grill-with-docs` 與 `/improve-codebase-architecture` 觸達）會在術語或決策實際被釐清時，按需建立它們。

## 檔案結構

單一上下文倉庫（多數倉庫）：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多上下文倉庫（根目錄存在 `CONTEXT-MAP.md`）：

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← 系統層級決策
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← 上下文專屬決策
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## 使用詞彙表的術語

當您的輸出提到領域概念（問題標題、重構提案、假設、測試名稱），請使用 `CONTEXT.md` 定義的術語。不要漂移到詞彙表明確避免的同義詞。

若您需要的概念尚未在詞彙表中，這是一個訊號 — 要么您正在發明專案不使用的語言（請重新考慮），要么確有缺口（記錄下來給 `/domain-modeling`）。

## 標記 ADR 衝突

若您的輸出與現有 ADR 衝突，請明確提出，而非靜默覆蓋：

> _與 ADR-0007 (event-sourced orders) 衝突 — 但值得重啟討論，因為…_