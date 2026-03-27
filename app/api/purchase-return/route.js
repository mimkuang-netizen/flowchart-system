import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  let query = supabase.from('purchase_returns').select('*').order('created_at', { ascending: false })
  if (q) query = query.or(`return_no.ilike.%${q}%,vendor_name.ilike.%${q}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const body = await request.json()
  const { items, ...header } = body
  const { data: ret, error } = await supabase.from('purchase_returns').insert([header]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (items?.length > 0) {
    const rows = items.map((item, i) => ({ ...item, return_id: ret.id, sort_order: i }))
    await supabase.from('purchase_return_items').insert(rows)
  }
  return NextResponse.json(ret, { status: 201 })
}
