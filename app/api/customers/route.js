import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const tag = searchParams.get('tag') || ''

  let query = supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(`code.ilike.%${q}%,short_name.ilike.%${q}%,contact.ilike.%${q}%,phone.ilike.%${q}%`)
  }
  if (tag) {
    query = query.contains('tags', [tag])
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach order count from sales_orders & quote count from quotations
  const [{ data: orders }, { data: quotes }] = await Promise.all([
    supabase.from('sales_orders').select('customer_name'),
    supabase.from('quotations').select('customer_name'),
  ])
  const orderMap = {}
  if (orders) orders.forEach(o => { orderMap[o.customer_name] = (orderMap[o.customer_name] || 0) + 1 })
  const quoteMap = {}
  if (quotes) quotes.forEach(q => { quoteMap[q.customer_name] = (quoteMap[q.customer_name] || 0) + 1 })
  const enriched = data.map(c => ({
    ...c,
    order_count: orderMap[c.short_name] || 0,
    quote_count: quoteMap[c.short_name] || 0,
  }))

  return NextResponse.json(enriched)
}

export async function POST(request) {
  const body = await request.json()
  const { data, error } = await supabase
    .from('customers')
    .insert([body])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
