import { requireErpAuth } from '@/lib/api-auth'
import { autoConvertPoToRo, sanitizeEmpty } from '@/lib/po-to-ro'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''
  const limit = Number(searchParams.get('limit')) || 0
  const offset = Number(searchParams.get('offset')) || 0
  let query = supabase.from('purchase_orders').select('*').order('created_at', { ascending: false })
  if (q) query = query.or(`po_no.ilike.%${q}%,vendor_name.ilike.%${q}%`)
  if (status) query = query.eq('status', status)
  if (limit > 0) query = query.range(offset, offset + limit - 1)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const body = await request.json()
  const { items, ...rawHeader } = body
  delete rawHeader.vendor_id
  const header = sanitizeEmpty(rawHeader)
  const { data: po, error } = await supabase.from('purchase_orders').insert([header]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (items?.length > 0) {
    const rows = items.map((item, i) => { const r = sanitizeEmpty({ ...item, po_id: po.id, sort_order: i }); delete r.id; delete r.product_id; delete r.discount; return r })
    const { error: e } = await supabase.from('purchase_order_items').insert(rows)
    if (e) return NextResponse.json({ error: e.message }, { status: 500 })
  }

  // 建單時就選「已進貨」也要自動轉進貨單（oldStatus 傳 null = 新建）
  await autoConvertPoToRo(supabase, po.id, { oldStatus: null, newStatus: po.status })

  return NextResponse.json(po, { status: 201 })
}
