import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// EasyStore Webhook: 當客戶在 EasyStore 下單時，自動在銷貨單建立一筆新訂單
// Webhook URL: https://flowchart-system.vercel.app/api/easystore/webhook
// 在 EasyStore 後台設定 Webhook，事件選擇 order.created

export async function POST(request) {
  try {
    const body = await request.json()

    // EasyStore webhook payload
    const order = body.order || body

    if (!order) {
      return NextResponse.json({ error: 'No order data' }, { status: 400 })
    }

    // Map EasyStore order to sales_orders
    const orderNo = `ES${order.id || order.number || Date.now()}`
    const customerName = order.customer?.name || order.shipping_address?.name || order.billing_address?.name || 'EasyStore客戶'
    const orderDate = order.created_at ? order.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)
    const total = Number(order.total_price || order.total || 0)
    const subtotal = Number(order.subtotal_price || order.subtotal || total)
    const tax = Number(order.total_tax || 0)
    const notes = [
      order.note ? `客戶備註: ${order.note}` : '',
      order.shipping_address ? `送貨: ${order.shipping_address.address1 || ''} ${order.shipping_address.city || ''}` : '',
      `來源: EasyStore #${order.number || order.id || ''}`,
    ].filter(Boolean).join('\n')

    // Check if already imported (avoid duplicates)
    const { data: existing } = await supabase
      .from('sales_orders')
      .select('id')
      .eq('order_no', orderNo)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ message: 'Order already exists', id: existing.id })
    }

    // Insert sales order header
    const { data: salesOrder, error } = await supabase
      .from('sales_orders')
      .insert([{
        order_no: orderNo,
        customer_name: customerName,
        order_date: orderDate,
        status: 'confirmed',
        tax_type: tax > 0 ? 'taxed' : 'exempt',
        subtotal,
        tax_amount: tax,
        total,
        notes,
      }])
      .select()
      .single()

    if (error) {
      console.error('EasyStore webhook insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Insert line items
    const lineItems = (order.line_items || order.items || []).map((item, i) => ({
      order_id: salesOrder.id,
      product_code: item.sku || item.product_id?.toString() || '',
      product_name: item.name || item.title || '',
      unit: '個',
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.price || 0),
      discount: 100,
      amount: Number(item.quantity || 1) * Number(item.price || 0),
      sort_order: i,
    }))

    if (lineItems.length > 0) {
      const { error: itemErr } = await supabase.from('sales_order_items').insert(lineItems)
      if (itemErr) console.error('EasyStore webhook items error:', itemErr)
    }

    return NextResponse.json({
      message: 'Order created successfully',
      sales_order_id: salesOrder.id,
      order_no: orderNo,
    })
  } catch (err) {
    console.error('EasyStore webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// GET: 用來測試 webhook 是否正常運作
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'EasyStore webhook endpoint is active',
    usage: 'POST order data to this endpoint to create a sales order',
  })
}
