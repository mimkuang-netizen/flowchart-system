/**
 * 採購單 → 進貨單 自動轉換邏輯
 *
 * 設計理由：建單 (POST) 與編輯 (PUT) 都可能把 status 變成 'received'，
 * 因此把判斷+轉單流程集中在一處，呼叫端只負責決定要不要呼叫。
 *
 * 使用方式：
 *   import { autoConvertPoToRo } from '@/lib/po-to-ro'
 *   await autoConvertPoToRo(supabase, poId, { oldStatus, newStatus })
 *
 * @param supabase   service_role client（已通過 requireErpAuth 驗證）
 * @param poId       採購單 id
 * @param opts.oldStatus  舊狀態（新建時可省略 / 傳 null）
 * @param opts.newStatus  新狀態（必填，由呼叫端從 payload 拿）
 *
 * @returns { receipt_no, receiving_id } 若成功建立進貨單；否則 null
 */
export async function autoConvertPoToRo(supabase, poId, { oldStatus, newStatus }) {
  // 條件 1：新狀態必須是 'received'
  if (newStatus !== 'received') return null
  // 條件 2：舊狀態不是 'received'（避免重複觸發；新建時 oldStatus 為 null 也通過）
  if (oldStatus === 'received') return null

  // 取得採購單完整資料 + 明細
  const { data: po } = await supabase
    .from('purchase_orders')
    .select('*, purchase_order_items(*)')
    .eq('id', poId)
    .single()
  if (!po) return null

  // 條件 3：檢查是否已有對應進貨單（用 po_no 比對，避免重複建立）
  if (po.po_no) {
    const { data: existing } = await supabase
      .from('receiving_orders')
      .select('id')
      .eq('po_no', po.po_no)
      .limit(1)
    if (existing && existing.length > 0) return null
  }

  // 產生進貨單號（YYYYMMDD + 4 位序號，依今天日期計算）
  const { nextOrderNo } = await import('./order-no.js')
  const d = new Date()
  const todayStr = d.toISOString().slice(0, 10)
  const receiptNo = await nextOrderNo(supabase, 'receiving_orders', todayStr)

  // 建立進貨單（狀態 = 已確認）
  const { data: ro, error: roErr } = await supabase
    .from('receiving_orders')
    .insert([{
      receipt_no: receiptNo,
      vendor_name: po.vendor_name,
      receipt_date: d.toISOString().slice(0, 10),
      po_no: po.po_no || null,
      status: 'confirmed',
      tax_type: po.tax_type || 'taxed',
      subtotal: po.subtotal || 0,
      tax_amount: po.tax_amount || 0,
      total: po.total || 0,
      notes: `從採購單 ${po.po_no || ''} 自動轉入`,
    }])
    .select()
    .single()
  if (roErr || !ro) return null

  // 複製明細
  const items = (po.purchase_order_items || []).map((item, i) => ({
    receipt_id: ro.id,
    product_code: item.product_code || '',
    product_name: item.product_name || '',
    unit: item.unit || '',
    quantity: item.quantity || 1,
    unit_price: item.unit_price || 0,
    amount: item.amount || 0,
    sort_order: item.sort_order ?? i,
  }))
  if (items.length > 0) {
    await supabase.from('receiving_order_items').insert(items)
  }

  // 進貨單已確認 → 同步增加庫存（複製自 receiving PUT 的同樣邏輯）
  for (const item of items) {
    if (!item.product_code) continue
    const { data: product } = await supabase
      .from('products')
      .select('id, stock_qty')
      .eq('code', item.product_code)
      .single()
    if (product) {
      await supabase
        .from('products')
        .update({ stock_qty: (product.stock_qty || 0) + Number(item.quantity || 0) })
        .eq('id', product.id)
    }
  }

  return { receipt_no: receiptNo, receiving_id: ro.id }
}

// 把空字串轉成 null，避免 DATE / 數字欄位寫入失敗（與 receiving API 同樣的處理）
export function sanitizeEmpty(obj) {
  const out = { ...obj }
  for (const k of Object.keys(out)) {
    if (out[k] === '') out[k] = null
  }
  return out
}
