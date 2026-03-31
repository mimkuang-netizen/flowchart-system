import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// 報價單轉銷貨單
export async function POST(request, { params }) {
  const { id } = await params

  // 取得報價單
  const { data: quote, error: qErr } = await supabase
    .from('quotations')
    .select('*, quotation_items(*)')
    .eq('id', id)
    .single()

  if (qErr || !quote) return NextResponse.json({ error: '找不到報價單' }, { status: 404 })

  // 產生銷貨單號
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const seq = String(Math.floor(Math.random() * 900) + 100)
  const orderNo = `SO${ymd}${seq}`

  // 建立銷貨單
  const { data: salesOrder, error: sErr } = await supabase
    .from('sales_orders')
    .insert([{
      order_no: orderNo,
      customer_name: quote.customer_name,
      order_date: d.toISOString().slice(0, 10),
      status: 'draft',
      tax_type: quote.tax_type || 'taxed',
      subtotal: quote.subtotal || 0,
      tax_amount: quote.tax_amount || 0,
      total: quote.total || 0,
      quote_no: quote.quote_no,
      notes: quote.notes ? `從報價單 ${quote.quote_no} 轉入\n${quote.notes}` : `從報價單 ${quote.quote_no} 轉入`,
    }])
    .select().single()

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  // 複製商品明細
  const items = (quote.quotation_items || []).map((item, i) => ({
    order_id: salesOrder.id,
    product_code: item.product_code || '',
    product_name: item.product_name || '',
    unit: item.unit || '',
    quantity: item.quantity || 1,
    unit_price: item.unit_price || 0,
    discount: item.discount || 100,
    amount: item.amount || 0,
    remark: item.remark || null,
    sort_order: item.sort_order || i,
  }))

  if (items.length > 0) {
    await supabase.from('sales_order_items').insert(items)
  }

  // 更新報價單狀態為已接受
  await supabase.from('quotations').update({ status: 'accepted' }).eq('id', id)

  return NextResponse.json({
    message: `已轉為銷貨單 ${orderNo}`,
    sales_order_id: salesOrder.id,
    order_no: orderNo,
  })
}
