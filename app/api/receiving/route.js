import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  let query = supabase.from('receiving_orders').select('*').order('created_at', { ascending: false })
  if (q) query = query.or(`receipt_no.ilike.%${q}%,vendor_name.ilike.%${q}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const body = await request.json()
  const { items, ...header } = body
  const { data: rec, error } = await supabase.from('receiving_orders').insert([header]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (items?.length > 0) {
    const rows = items.map((item, i) => ({ ...item, receipt_id: rec.id, sort_order: i }))
    await supabase.from('receiving_order_items').insert(rows)
  }
  return NextResponse.json(rec, { status: 201 })
}
