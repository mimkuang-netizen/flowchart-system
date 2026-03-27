import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''

  let query = supabase
    .from('quotations')
    .select('*')
    .order('created_at', { ascending: false })

  if (q) query = query.or(`quote_no.ilike.%${q}%,customer_name.ilike.%${q}%`)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const body = await request.json()
  const { items, ...header } = body

  const { data: quote, error } = await supabase
    .from('quotations')
    .insert([header])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (items && items.length > 0) {
    const rows = items.map((item, i) => ({ ...item, quote_id: quote.id, sort_order: i }))
    const { error: itemErr } = await supabase.from('quotation_items').insert(rows)
    if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })
  }

  return NextResponse.json(quote, { status: 201 })
}
