import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { id } = await params
  const { data, error } = await supabase.from('sales_returns').select('*, sales_return_items(*)').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request, { params }) {
  const { id } = await params
  const body = await request.json()
  const { items, ...header } = body
  delete header.id; delete header.created_at; delete header.sales_return_items
  const { data, error } = await supabase.from('sales_returns').update(header).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.from('sales_return_items').delete().eq('return_id', id)
  if (items?.length > 0) {
    const rows = items.map((item, i) => { const r = { ...item, return_id: Number(id), sort_order: i }; delete r.id; return r })
    await supabase.from('sales_return_items').insert(rows)
  }
  return NextResponse.json(data)
}

export async function DELETE(request, { params }) {
  const { id } = await params
  const { error } = await supabase.from('sales_returns').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
