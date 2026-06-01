import { requireErpAuth } from '@/lib/api-auth'
import { autoConvertPoToRo, sanitizeEmpty } from '@/lib/po-to-ro'
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
  const { items, ...rawHeader } = body
  delete rawHeader.id; delete rawHeader.purchase_order_items; delete rawHeader.vendor_id; delete rawHeader.created_at
  const header = sanitizeEmpty(rawHeader)

  // 查舊狀態
  const { data: oldPo } = await supabase.from('purchase_orders').select('status, po_no').eq('id', id).single()

  const { data, error } = await supabase.from('purchase_orders').update(header).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.from('purchase_order_items').delete().eq('po_id', id)
  if (items?.length > 0) {
    const rows = items.map((item, i) => { const r = sanitizeEmpty({ ...item, po_id: Number(id), sort_order: i }); delete r.id; delete r.product_id; delete r.discount; return r })
    await supabase.from('purchase_order_items').insert(rows)
  }

  // 狀態改為「已進貨」時，自動建立進貨單（lib/po-to-ro.js）
  await autoConvertPoToRo(supabase, id, { oldStatus: oldPo?.status, newStatus: header.status })

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
