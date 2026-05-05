import { requireErpAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''
  let query = supabase.from('purchase_orders').select('*').order('created_at', { ascending: false })
  if (q) query = query.or(`po_no.ilike.%${q}%,vendor_name.ilike.%${q}%`)
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const body = await request.json()
  const { items, ...header } = body
  delete header.vendor_id
  const { data: po, error } = await supabase.from('purchase_orders').insert([header]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (items?.length > 0) {
    const rows = items.map((item, i) => { const r = { ...item, po_id: po.id, sort_order: i }; delete r.id; delete r.product_id; delete r.discount; return r })
    const { error: e } = await supabase.from('purchase_order_items').insert(rows)
    if (e) return NextResponse.json({ error: e.message }, { status: 500 })
  }
  return NextResponse.json(po, { status: 201 })
}
