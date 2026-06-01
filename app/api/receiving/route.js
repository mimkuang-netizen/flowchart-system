import { requireErpAuth } from '@/lib/api-auth'
import { ensureOrderNo } from '@/lib/order-no'
import { NextResponse } from 'next/server'

function getInvoicePeriod(dateStr) {
  if (!dateStr) return ''
  const month = new Date(dateStr).getMonth() + 1
  const pairs = [[1,2],[3,4],[5,6],[7,8],[9,10],[11,12]]
  const pair = pairs.find(p => p.includes(month))
  return pair ? `${pair[0]}-${pair[1]}月` : ''
}

// 把空字串轉成 null，避免 DATE 或數字欄位寫入失敗
function sanitizeEmpty(obj) {
  const out = { ...obj }
  for (const k of Object.keys(out)) {
    if (out[k] === '') out[k] = null
  }
  return out
}

export async function GET(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  let query = supabase.from('receiving_orders').select('*').order('created_at', { ascending: false })
  if (q) query = query.or(`receipt_no.ilike.%${q}%,vendor_name.ilike.%${q}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const body = await request.json()
  const { items, ...rawHeader } = body
  const header = sanitizeEmpty(rawHeader)
  // 統一單號：YYYYMMDD + 4 位序號，依 receipt_date 計算
  header.receipt_no = await ensureOrderNo(supabase, 'receiving_orders', header.receipt_date, header.receipt_no)
  const { data: rec, error } = await supabase.from('receiving_orders').insert([header]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (items?.length > 0) {
    const rows = items.map((item, i) => { const r = sanitizeEmpty({ ...item, receipt_id: rec.id, sort_order: i }); delete r.id; delete r.product_id; return r })
    await supabase.from('receiving_order_items').insert(rows)
  }

  // 自動同步發票到 invoice_statistics
  if (rec.invoice_no) {
    const period = getInvoicePeriod(rec.invoice_date || rec.order_date)
    await supabase.from('invoice_statistics').insert([{
      company_name: rec.vendor_name || '',
      type: '進貨',
      invoice_period: period,
      invoice_date: rec.invoice_date || rec.order_date || null,
      pretax_amount: rec.subtotal || 0,
      tax: rec.tax_amount || 0,
      total_amount: rec.total || 0,
      notes: `進貨單 ${rec.receipt_no || ''} 發票 ${rec.invoice_no}`,
    }])
  }

  return NextResponse.json(rec, { status: 201 })
}
