import { requireErpAuth } from '@/lib/api-auth'
import { ensureOrderNo } from '@/lib/order-no'
import { sanitizeEmpty } from '@/lib/po-to-ro'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const paymentStatus = searchParams.get('payment_status') || ''
  const customer = searchParams.get('customer') || ''
  const limit = Number(searchParams.get('limit')) || 0
  const offset = Number(searchParams.get('offset')) || 0

  let query = supabase.from('sales_orders').select('*').order('created_at', { ascending: false })
  if (q) query = query.or(`order_no.ilike.%${q}%,customer_name.ilike.%${q}%`)
  if (paymentStatus) query = query.eq('payment_status', paymentStatus)
  if (customer) query = query.eq('customer_name', customer)
  if (limit > 0) query = query.range(offset, offset + limit - 1)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const body = await request.json()
  const { items, ...rawHeader } = body
  const header = sanitizeEmpty(rawHeader)
  // 統一單號：YYYYMMDD + 4 位序號，依 order_date 計算
  header.order_no = await ensureOrderNo(supabase, 'sales_orders', header.order_date, header.order_no)

  const { data: order, error } = await supabase.from('sales_orders').insert([header]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (items && items.length > 0) {
    const rows = items.map((item, i) => ({ ...item, order_id: order.id, sort_order: i }))
    const { error: itemErr } = await supabase.from('sales_order_items').insert(rows)
    if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })
  }

  return NextResponse.json(order, { status: 201 })
}
