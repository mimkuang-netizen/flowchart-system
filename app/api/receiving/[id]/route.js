import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { id } = await params
  const { data, error } = await supabase.from('receiving_orders').select('*, receiving_order_items(*)').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request, { params }) {
  const { id } = await params
  const body = await request.json()
  const { items, ...header } = body
  delete header.id; delete header.created_at; delete header.receiving_order_items
  const { data, error } = await supabase.from('receiving_orders').update(header).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.from('receiving_order_items').delete().eq('receipt_id', id)
  if (items?.length > 0) {
    const rows = items.map((item, i) => { const r = { ...item, receipt_id: Number(id), sort_order: i }; delete r.id; return r })
    await supabase.from('receiving_order_items').insert(rows)
  }
  return NextResponse.json(data)
}

export async function DELETE(request, { params }) {
  const { id } = await params
  const { error } = await supabase.from('receiving_orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
