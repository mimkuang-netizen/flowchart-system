import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const customer = searchParams.get('customer') || ''

  let query = supabase
    .from('sales_orders')
    .select('*')
    .neq('status', 'draft')
    .order('order_date', { ascending: false })

  if (from) query = query.gte('order_date', from)
  if (to) query = query.lte('order_date', to)
  if (customer) query = query.ilike('customer_name', `%${customer}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
