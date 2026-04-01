-- =============================================
-- 支票簽收單 (Check Receipts)
-- 請在 Supabase → SQL Editor 執行
-- =============================================

CREATE TABLE IF NOT EXISTS check_receipts (
  id            BIGSERIAL PRIMARY KEY,
  vendor_name   TEXT,                          -- 廠商名稱
  payment_item  TEXT,                          -- 付款項目
  issue_date    DATE,                          -- 開票日期
  check_date    DATE,                          -- 票據日期（兌現日）
  check_no      TEXT,                          -- 支票號碼
  amount        NUMERIC(12,2) DEFAULT 0,       -- 支票金額
  notes         TEXT,                          -- 備註
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE check_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON check_receipts FOR ALL USING (true) WITH CHECK (true);
