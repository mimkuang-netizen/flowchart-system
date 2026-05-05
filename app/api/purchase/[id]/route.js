import { requireErpAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const { id } = await params
  const { data, error } = await supabase.from('purchase_orders').select('*, purchase_order_items(*)').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request, { params }) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const { id } = await params
  const body = await request.json()
  const { items, ...header } = body
  delete header.id; delete header.purchase_order_items; delete header.vendor_id
  header.created_at = new Date().toISOString()

  // 查舊狀態
  const { data: oldPo } = await supabase.from('purchase_orders').select('status, po_no').eq('id', id).single()

  const { data, error } = await supabase.from('purchase_orders').update(header).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.from('purchase_order_items').delete().eq('po_id', id)
  if (items?.length > 0) {
    const rows = items.map((item, i) => { const r = { ...item, po_id: Number(id), sort_order: i }; delete r.id; delete r.product_id; delete r.discount; return r })
    await supabase.from('purchase_order_items').insert(rows)
  }

  // 狀態改為「已進貨」時，自動建立進貨單
  if (header.status === 'received' && oldPo?.status !== 'received') {
    // 檢查是否已有對應進貨單
    const { data: existingRO } = await supabase.from('receiving_orders').select('id').eq('po_no', data.po_no)
    if (!existingRO || existingRO.length === 0) {
      const po = await supabase.from('purchase_orders').select('*, purchase_order_items(*)').eq('id', id).single()
      const poData = po.data
      const d = new Date()
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
      const { data: todayROs } = await supabase.from('receiving_orders').select('receipt_no').like('receipt_no', `${ymd}%`)
      const existingNos = new Set((todayROs || []).map(o => o.receipt_no))
      let seq = (todayROs?.length || 0) + 1
      while (existingNos.has(`${ymd}${String(seq).padStart(3, '0')}`)) seq++
      const receiptNo = `${ymd}${String(seq).padStart(3, '0')}`

      const { data: ro } = await supabase.from('receiving_orders').insert([{
        receipt_no: receiptNo,
        vendor_name: poData.vendor_name,
        receipt_date: d.toISOString().slice(0, 10),
        po_no: poData.po_no,
        status: 'confirmed',
        tax_type: poData.tax_type || 'taxed',
        subtotal: poData.subtotal || 0,
        tax_amount: poData.tax_amount || 0,
        total: poData.total || 0,
        notes: `從採購單 ${poData.po_no} 自動轉入`,
      }]).select().single()

      if (ro) {
        const roItems = (poData.purchase_order_items || []).map((item, i) => ({
          receipt_id: ro.id,
          product_code: item.product_code || '',
          product_name: item.product_name || '',
          unit: item.unit || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          amount: item.amount || 0,
          sort_order: item.sort_order || i,
        }))
        if (roItems.length > 0) await supabase.from('receiving_order_items').insert(roItems)
      }
    }
  }

  // 狀態改為「已匯款」時，把對應進貨單標記為 paid（從應付帳款排除）
  if (header.status === 'paid' && oldPo?.status !== 'paid') {
    await supabase.from('receiving_orders').update({ status: 'paid' }).eq('po_no', data.po_no)
  }

  return NextResponse.json(data)
}

export async function DELETE(request, { params }) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const { id } = await params
  const { error } = await supabase.from('purchase_orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
