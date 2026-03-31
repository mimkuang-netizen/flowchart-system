import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// 採購單轉進貨單
export async function POST(request, { params }) {
  const { id } = await params

  // 取得採購單
  const { data: po, error: pErr } = await supabase
    .from('purchase_orders')
    .select('*, purchase_order_items(*)')
    .eq('id', id)
    .single()

  if (pErr || !po) return NextResponse.json({ error: '找不到採購單' }, { status: 404 })

  // 產生進貨單號
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const seq = String(Math.floor(Math.random() * 900) + 100)
  const receiptNo = `RO${ymd}${seq}`

  // 建立進貨單
  const { data: receiving, error: rErr } = await supabase
    .from('receiving_orders')
    .insert([{
      receipt_no: receiptNo,
      vendor_name: po.vendor_name,
      receipt_date: d.toISOString().slice(0, 10),
      po_no: po.po_no,
      status: 'draft',
      tax_type: po.tax_type || 'taxed',
      subtotal: po.subtotal || 0,
      tax_amount: po.tax_amount || 0,
      total: po.total || 0,
      notes: po.notes ? `從採購單 ${po.po_no} 轉入\n${po.notes}` : `從採購單 ${po.po_no} 轉入`,
    }])
    .select().single()

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  // 複製商品明細
  const items = (po.purchase_order_items || []).map((item, i) => ({
    receipt_id: receiving.id,
    product_code: item.product_code || '',
    product_name: item.product_name || '',
    unit: item.unit || '',
    quantity: item.quantity || 1,
    unit_price: item.unit_price || 0,
    amount: item.amount || 0,
    sort_order: item.sort_order || i,
  }))

  if (items.length > 0) {
    await supabase.from('receiving_order_items').insert(items)
  }

  // 更新採購單狀態為已完成
  await supabase.from('purchase_orders').update({ status: 'completed' }).eq('id', id)

  return NextResponse.json({
    message: `已轉為進貨單 ${receiptNo}`,
    receiving_id: receiving.id,
    receipt_no: receiptNo,
  })
}
