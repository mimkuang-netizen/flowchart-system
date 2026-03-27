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

  // Attach order count from sales_orders
  const { data: orders } = await supabase
    .from('sales_orders')
    .select('customer_name')
  const orderMap = {}
  if (orders) {
    orders.forEach(o => {
      const name = o.customer_name
      orderMap[name] = (orderMap[name] || 0) + 1
    })
  }
  const enriched = data.map(c => ({
    ...c,
    order_count: orderMap[c.short_name] || 0
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
