import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'customer'
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''

  if (type === 'customer') {
    // Customer sales ranking
    let query = supabase
      .from('sales_orders')
      .select('customer_name, total')
      .neq('status', 'draft')

    if (from) query = query.gte('order_date', from)
    if (to) query = query.lte('order_date', to)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Group by customer
    const map = {}
    for (const row of (data || [])) {
      if (!map[row.customer_name]) map[row.customer_name] = { customer_name: row.customer_name, total: 0, order_count: 0 }
      map[row.customer_name].total += Number(row.total || 0)
      map[row.customer_name].order_count += 1
    }
    const result = Object.values(map).sort((a, b) => b.total - a.total)
    return NextResponse.json(result)
  }

  if (type === 'product') {
    // Top products by sales
    let query = supabase
      .from('sales_order_items')
      .select('product_name, quantity, amount, sales_orders!inner(order_date, status)')
      .neq('sales_orders.status', 'draft')

    if (from) query = query.gte('sales_orders.order_date', from)
    if (to) query = query.lte('sales_orders.order_date', to)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const map = {}
    for (const row of (data || [])) {
      if (!map[row.product_name]) map[row.product_name] = { product_name: row.product_name, total: 0, qty: 0 }
      map[row.product_name].total += Number(row.amount || 0)
      map[row.product_name].qty += Number(row.quantity || 0)
    }
    const result = Object.values(map).sort((a, b) => b.total - a.total)
    return NextResponse.json(result)
  }

  return NextResponse.json([])
}
