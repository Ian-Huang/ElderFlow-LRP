-- ===================================================================
-- Migration 0001: 建立現場實驗室 (Frontline Lab) 通用動態集合資料表
-- 遵循 Schema-less by Default 原則，以 JSON 格式儲存跨職類自製表單資料
-- ===================================================================

CREATE TABLE IF NOT EXISTS sandbox_documents (
  id TEXT PRIMARY KEY,
  collection TEXT NOT NULL,          -- 集合名稱，例如 'visitor_records', 'daily_metrics', 'supplies_fifo'
  data TEXT NOT NULL,                -- 任意 JSON 字串（如訪客姓名、電話、體溫等）
  created_at TEXT NOT NULL,          -- ISO 8601 時間戳
  updated_at TEXT NOT NULL           -- ISO 8601 時間戳
);

-- 建立索引加速依集合查詢與時間倒序排列
CREATE INDEX IF NOT EXISTS idx_sandbox_collection_updated 
ON sandbox_documents (collection, updated_at DESC);
