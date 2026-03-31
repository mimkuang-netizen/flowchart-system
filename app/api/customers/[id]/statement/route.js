import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''

  // Get customer info
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (custErr || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // Get sales orders for this customer within date range
  let query = supabase
    .from('sales_orders')
    .select('*, sales_order_items(*)')
    .eq('customer_name', customer.short_name)
    .order('order_date', { ascending: true })

  if (from) query = query.gte('order_date', from)
  if (to) query = query.lte('order_date', to)

  const { data: orders, error: ordErr } = await query

  if (ordErr) {
    return NextResponse.json({ error: ordErr.message }, { status: 500 })
  }

  const orderList = orders || []

  // Calculate summary
  const total_amount = orderList.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const paid_amount = orderList
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const unpaid_amount = total_amount - paid_amount

  return NextResponse.json({
    customer,
    orders: orderList,
    summary: {
      total_orders: orderList.length,
      total_amount,
      paid_amount,
      unpaid_amount,
    },
  })
}
