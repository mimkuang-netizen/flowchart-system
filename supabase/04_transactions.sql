-- =============================================
-- 進銷存交易資料表 SQL
-- 請在 guanyi-crm Supabase → SQL Editor 執行
-- =============================================

-- =============================================
-- 報價單 (Quotations)
-- =============================================
CREATE TABLE IF NOT EXISTS quotations (
  id            BIGSERIAL PRIMARY KEY,
  quote_no      TEXT NOT NULL UNIQUE,         -- 報價單號 e.g. QT2026032701
  customer_id   BIGINT,
  customer_name TEXT NOT NULL,
  quote_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until   DATE,
  status        TEXT NOT NULL DEFAULT 'draft', -- draft / sent / accepted / rejected
  tax_type      TEXT NOT NULL DEFAULT 'taxed', -- taxed / tax_free / included
  subtotal      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id            BIGSERIAL PRIMARY KEY,
  quote_id      BIGINT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  sort_order    INT NOT NULL DEFAULT 0,
  product_id    BIGINT,
  product_code  TEXT,
  product_name  TEXT NOT NULL,
  unit          TEXT,
  quantity      NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount      NUMERIC(5,2) NOT NULL DEFAULT 100, -- percentage 0-100
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes         TEXT
);

ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items DISABLE ROW LEVEL SECURITY;

-- =============================================
-- 銷貨單 (Sales Orders)
-- =============================================
CREATE TABLE IF NOT EXISTS sales_orders (
  id              BIGSERIAL PRIMARY KEY,
  order_no        TEXT NOT NULL UNIQUE,        -- e.g. SO2026032701
  customer_id     BIGINT,
  customer_name   TEXT NOT NULL,
  order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date   DATE,
  status          TEXT NOT NULL DEFAULT 'draft', -- draft / confirmed / shipped / completed
  tax_type        TEXT NOT NULL DEFAULT 'taxed',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  quote_no        TEXT,                        -- 對應報價單號
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  sort_order    INT NOT NULL DEFAULT 0,
  product_id    BIGINT,
  product_code  TEXT,
  product_name  TEXT NOT NULL,
  unit          TEXT,
  quantity      NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount      NUMERIC(5,2) NOT NULL DEFAULT 100,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes         TEXT
);

ALTER TABLE sales_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items DISABLE ROW LEVEL SECURITY;

-- =============================================
-- 銷貨退回 (Sales Returns)
-- =============================================
CREATE TABLE IF NOT EXISTS sales_returns (
  id              BIGSERIAL PRIMARY KEY,
  return_no       TEXT NOT NULL UNIQUE,        -- e.g. SR2026032701
  customer_id     BIGINT,
  customer_name   TEXT NOT NULL,
  return_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  original_order_no TEXT,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'draft', -- draft / confirmed
  tax_type        TEXT NOT NULL DEFAULT 'taxed',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_return_items (
  id            BIGSERIAL PRIMARY KEY,
  return_id     BIGINT NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  sort_order    INT NOT NULL DEFAULT 0,
  product_id    BIGINT,
  product_code  TEXT,
  product_name  TEXT NOT NULL,
  unit          TEXT,
  quantity      NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes         TEXT
);

ALTER TABLE sales_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_return_items DISABLE ROW LEVEL SECURITY;

-- =============================================
-- 採購單 (Purchase Orders)
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              BIGSERIAL PRIMARY KEY,
  po_no           TEXT NOT NULL UNIQUE,        -- e.g. PO2026032701
  vendor_id       BIGINT,
  vendor_name     TEXT NOT NULL,
  po_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date   DATE,
  status          TEXT NOT NULL DEFAULT 'draft', -- draft / sent / partial / completed
  tax_type        TEXT NOT NULL DEFAULT 'taxed',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id            BIGSERIAL PRIMARY KEY,
  po_id         BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  sort_order    INT NOT NULL DEFAULT 0,
  product_id    BIGINT,
  product_code  TEXT,
  product_name  TEXT NOT NULL,
  unit          TEXT,
  quantity      NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  received_qty  NUMERIC(12,4) NOT NULL DEFAULT 0, -- 已進貨數量
  notes         TEXT
);

ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items DISABLE ROW LEVEL SECURITY;

-- =============================================
-- 進貨單 (Receiving Orders)
-- =============================================
CREATE TABLE IF NOT EXISTS receiving_orders (
  id              BIGSERIAL PRIMARY KEY,
  receipt_no      TEXT NOT NULL UNIQUE,        -- e.g. RO2026032701
  vendor_id       BIGINT,
  vendor_name     TEXT NOT NULL,
  receipt_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  po_no           TEXT,                        -- 對應採購單號
  status          TEXT NOT NULL DEFAULT 'draft', -- draft / confirmed
  tax_type        TEXT NOT NULL DEFAULT 'taxed',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receiving_order_items (
  id            BIGSERIAL PRIMARY KEY,
  receipt_id    BIGINT NOT NULL REFERENCES receiving_orders(id) ON DELETE CASCADE,
  sort_order    INT NOT NULL DEFAULT 0,
  product_id    BIGINT,
  product_code  TEXT,
  product_name  TEXT NOT NULL,
  unit          TEXT,
  quantity      NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes         TEXT
);

ALTER TABLE receiving_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_order_items DISABLE ROW LEVEL SECURITY;

-- =============================================
-- 進貨退出 (Purchase Returns)
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_returns (
  id                  BIGSERIAL PRIMARY KEY,
  return_no           TEXT NOT NULL UNIQUE,    -- e.g. PR2026032701
  vendor_id           BIGINT,
  vendor_name         TEXT NOT NULL,
  return_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  original_receipt_no TEXT,
  reason              TEXT,
  status              TEXT NOT NULL DEFAULT 'draft',
  tax_type            TEXT NOT NULL DEFAULT 'taxed',
  subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  total               NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id            BIGSERIAL PRIMARY KEY,
  return_id     BIGINT NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  sort_order    INT NOT NULL DEFAULT 0,
  product_id    BIGINT,
  product_code  TEXT,
  product_name  TEXT NOT NULL,
  unit          TEXT,
  quantity      NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes         TEXT
);

ALTER TABLE purchase_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_items DISABLE ROW LEVEL SECURITY;

-- =============================================
-- 庫存調整 (Stock Adjustments)
-- =============================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id          BIGSERIAL PRIMARY KEY,
  adj_no      TEXT NOT NULL UNIQUE,            -- e.g. SA2026032701
  adj_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  adj_type    TEXT NOT NULL DEFAULT 'adjust',  -- adjust / stocktake
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_adjustment_items (
  id            BIGSERIAL PRIMARY KEY,
  adj_id        BIGINT NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  product_id    BIGINT,
  product_code  TEXT,
  product_name  TEXT NOT NULL,
  unit          TEXT,
  before_qty    NUMERIC(12,4) NOT NULL DEFAULT 0,
  adj_qty       NUMERIC(12,4) NOT NULL DEFAULT 0, -- positive = increase, negative = decrease
  after_qty     NUMERIC(12,4) NOT NULL DEFAULT 0,
  reason        TEXT
);

ALTER TABLE stock_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustment_items DISABLE ROW LEVEL SECURITY;

-- =============================================
-- 快速記帳 (Quick Accounting)
-- =============================================
CREATE TABLE IF NOT EXISTS accounting_entries (
  id          BIGSERIAL PRIMARY KEY,
  entry_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type  TEXT NOT NULL,                   -- income / expense
  category    TEXT NOT NULL,                   -- 費用分類
  description TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash', -- cash / transfer / card
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE accounting_entries DISABLE ROW LEVEL SECURITY;

-- =============================================
-- 完成！共建立 13 張資料表
-- =============================================
