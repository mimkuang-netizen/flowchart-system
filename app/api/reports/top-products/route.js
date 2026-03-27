import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start_date') || ''
  const endDate = searchParams.get('end_date') || ''

  // Fetch sales_order_items joined with sales_orders for date filtering
  let query = supabase
    .from('sales_order_items')
    .select('product_code, product_name, quantity, amount, sales_orders!inner(order_date, status)')
    .neq('sales_orders.status', 'draft')

  if (startDate) query = query.gte('sales_orders.order_date', startDate)
  if (endDate) query = query.lte('sales_orders.order_date', endDate)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate by product_code + product_name
  const map = {}
  for (const row of (data || [])) {
    const key = row.product_code || row.product_name
    if (!map[key]) {
      map[key] = {
        product_code: row.product_code || '',
        product_name: row.product_name || '',
        total_quantity: 0,
        total_amount: 0,
      }
    }
    map[key].total_quantity += Number(row.quantity || 0)
    map[key].total_amount += Number(row.amount || 0)
  }

  const result = Object.values(map)
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 50)

  return NextResponse.json(result)
}
