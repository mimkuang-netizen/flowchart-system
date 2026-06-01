/**
 * 統一單號產生器（YYYYMMDD + 4 位序號）
 *
 * 規則：
 * - 編號依「選擇的日期」(dateField)，不是今天
 * - 序號 = 該日期已有筆數 + 1，4 位數補零
 * - 範例：2026/05/30 第 6 張報價單 → "202605300006"
 *
 * 所有產生單號的進出口都集中在這裡，避免格式漂移。
 */

// 7 個模組的設定（table / field / dateField）
export const ORDER_CONFIGS = {
  quotations:        { table: 'quotations',        field: 'quote_no',   dateField: 'quote_date' },
  purchase_orders:   { table: 'purchase_orders',   field: 'po_no',      dateField: 'po_date' },
  receiving_orders:  { table: 'receiving_orders',  field: 'receipt_no', dateField: 'receipt_date' },
  sales_orders:      { table: 'sales_orders',      field: 'order_no',   dateField: 'order_date' },
  sales_returns:     { table: 'sales_returns',     field: 'return_no',  dateField: 'return_date' },
  purchase_returns:  { table: 'purchase_returns',  field: 'return_no',  dateField: 'return_date' },
  stock_adjustments: { table: 'stock_adjustments', field: 'adj_no',     dateField: 'adj_date' },
}

// 將 'YYYY-MM-DD' 轉為 'YYYYMMDD'
export function ymdCompact(dateStr) {
  if (!dateStr) {
    const d = new Date()
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  }
  return String(dateStr).slice(0, 10).replace(/-/g, '')
}

/**
 * 計算指定日期+模組的下一個單號
 * @param supabase  service_role client
 * @param key       ORDER_CONFIGS 的 key (e.g. 'quotations')
 * @param dateStr   選擇的日期 'YYYY-MM-DD' 或 'YYYYMMDD'
 * @param excludeNo (選填) 編輯時要排除自己這張，避免把自己算進去
 * @returns         e.g. "202605300006"
 */
export async function nextOrderNo(supabase, key, dateStr, excludeNo = null) {
  const cfg = ORDER_CONFIGS[key]
  if (!cfg) throw new Error(`未知的單號模組：${key}`)

  const ymd = ymdCompact(dateStr)

  // 撈當日所有單號（用 prefix match）
  let query = supabase.from(cfg.table).select(cfg.field).like(cfg.field, `${ymd}%`)
  const { data, error } = await query
  if (error) throw new Error(`查詢 ${cfg.table} 失敗: ${error.message}`)

  // 排除自己（編輯時用），且只計算「YYYYMMDD + 純數字 4 位」格式的舊單
  const validRows = (data || []).filter(r => {
    const no = r[cfg.field]
    if (!no) return false
    if (excludeNo && no === excludeNo) return false
    return /^\d{12}$/.test(no)
  })

  // 算出當日已用過的最大序號
  let maxSeq = 0
  for (const row of validRows) {
    const seq = parseInt(row[cfg.field].slice(8), 10)
    if (seq > maxSeq) maxSeq = seq
  }

  // 還要把不符新格式的舊單也計入「已存在筆數」，避免新號跟舊號撞
  const totalCount = (data || []).filter(r => excludeNo ? r[cfg.field] !== excludeNo : true).length
  const nextSeq = Math.max(maxSeq + 1, totalCount + 1)

  return `${ymd}${String(nextSeq).padStart(4, '0')}`
}

/**
 * 確保即將寫入的單號是合法的；若衝突或缺漏，自動補一個
 * 主要給 POST/PUT 路由使用，避免前端送來的號碼已被別人搶用
 */
export async function ensureOrderNo(supabase, key, dateStr, candidateNo, excludeNo = null) {
  const ymd = ymdCompact(dateStr)
  const cfg = ORDER_CONFIGS[key]

  // 如果前端送來合法且未撞號的編號，直接用
  if (candidateNo && /^\d{12}$/.test(candidateNo) && candidateNo.startsWith(ymd)) {
    const { data } = await supabase.from(cfg.table).select(cfg.field).eq(cfg.field, candidateNo).limit(1)
    const conflict = data && data.length > 0 && (!excludeNo || data[0][cfg.field] !== excludeNo)
    if (!conflict) return candidateNo
  }

  // 否則重新算
  return nextOrderNo(supabase, key, dateStr, excludeNo)
}
