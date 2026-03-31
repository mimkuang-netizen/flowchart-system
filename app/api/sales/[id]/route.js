import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('sales_orders').select('*, sales_order_items(*)').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request, { params }) {
  const { id } = await params
  const body = await request.json()
  const { items, ...header } = body
  delete header.id; delete header.created_at; delete header.sales_order_items
  header.created_at = new Date().toISOString()

  // Fetch current order status BEFORE updating (for stock adjustment "only once" check)
  const { data: currentOrder } = await supabase.from('sales_orders').select('status').eq('id', id).single()
  const oldStatus = currentOrder?.status

  const { data, error } = await supabase.from('sales_orders').update(header).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('sales_order_items').delete().eq('order_id', id)
  if (items && items.length > 0) {
    const rows = items.map((item, i) => { const r = { ...item, order_id: Number(id), sort_order: i }; delete r.id; return r })
    const { error: e } = await supabase.from('sales_order_items').insert(rows)
    if (e) return NextResponse.json({ error: e.message }, { status: 500 })
  }

  // Stock adjustment: decrease stock when status changes to completed/shipped (only once)
  const newStatus = header.status
  const stockTriggerStatuses = ['completed', 'shipped']
  if (stockTriggerStatuses.includes(newStatus) && !stockTriggerStatuses.includes(oldStatus)) {
    const { data: orderItems } = await supabase.from('sales_order_items').select('*').eq('order_id', id)
    if (orderItems) {
      for (const item of orderItems) {
        if (!item.product_code) continue
        const { data: product } = await supabase.from('products').select('id, stock_qty').eq('code', item.product_code).single()
        if (product) {
          await supabase.from('products').update({ stock_qty: product.stock_qty - item.quantity }).eq('id', product.id)
          console.log('Stock adjusted:', item.product_code, -item.quantity)
        }
      }
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(request, { params }) {
  const { id } = await params
  const { error } = await supabase.from('sales_orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
