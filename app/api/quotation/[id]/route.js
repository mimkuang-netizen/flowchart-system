import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('quotations')
    .select('*, quotation_items(*)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request, { params }) {
  const { id } = await params
  const body = await request.json()
  const { items, ...header } = body

  delete header.id
  delete header.created_at
  delete header.quotation_items

  const { data, error } = await supabase
    .from('quotations')
    .update(header)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Replace all items
  await supabase.from('quotation_items').delete().eq('quote_id', id)
  if (items && items.length > 0) {
    const rows = items.map((item, i) => {
      const row = { ...item, quote_id: Number(id), sort_order: i }
      delete row.id
      return row
    })
    const { error: itemErr } = await supabase.from('quotation_items').insert(rows)
    if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request, { params }) {
  const { id } = await params
  const { error } = await supabase.from('quotations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
