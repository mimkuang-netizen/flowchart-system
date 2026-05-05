import { requireErpAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const paymentStatus = searchParams.get('payment_status') || ''
  const customer = searchParams.get('customer') || ''

  let query = supabase.from('sales_orders').select('*').order('created_at', { ascending: false })
  if (q) query = query.or(`order_no.ilike.%${q}%,customer_name.ilike.%${q}%`)
  if (paymentStatus) query = query.eq('payment_status', paymentStatus)
  if (customer) query = query.eq('customer_name', customer)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const body = await request.json()
  const { items, ...header } = body

  // 自動產生不重複的銷貨單號
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const { data: todayOrders } = await supabase.from('sales_orders').select('order_no').like('order_no', `${ymd}%`)
  const existingNos = new Set((todayOrders || []).map(o => o.order_no))
  let seq = (todayOrders?.length || 0) + 1
  while (existingNos.has(`${ymd}${String(seq).padStart(3, '0')}`)) seq++
  header.order_no = `${ymd}${String(seq).padStart(3, '0')}`

  const { data: order, error } = await supabase.from('sales_orders').insert([header]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (items && items.length > 0) {
    const rows = items.map((item, i) => ({ ...item, order_id: order.id, sort_order: i }))
    const { error: itemErr } = await supabase.from('sales_order_items').insert(rows)
    if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })
  }

  return NextResponse.json(order, { status: 201 })
}
