import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { id } = await params

  // First get customer info
  const { data: customer } = await supabase
    .from('customers')
    .select('short_name, full_name, code')
    .eq('id', id)
    .single()

  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const customerName = customer.short_name

  // Get quotations for this customer
  const { data: quotations } = await supabase
    .from('quotations')
    .select('id, quote_no, quote_date, valid_date, status, total, notes')
    .eq('customer_name', customerName)
    .order('quote_date', { ascending: false })

  // Get sales orders for this customer
  const { data: salesOrders } = await supabase
    .from('sales_orders')
    .select('id, order_no, order_date, status, total, notes, invoice_type, invoice_no')
    .eq('customer_name', customerName)
    .order('order_date', { ascending: false })

  return NextResponse.json({
    customer,
    quotations: quotations || [],
    sales_orders: salesOrders || [],
  })
}
