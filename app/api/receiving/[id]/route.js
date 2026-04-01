import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

function getInvoicePeriod(dateStr) {
  if (!dateStr) return ''
  const month = new Date(dateStr).getMonth() + 1
  const pairs = [[1,2],[3,4],[5,6],[7,8],[9,10],[11,12]]
  const pair = pairs.find(p => p.includes(month))
  return pair ? `${pair[0]}-${pair[1]}月` : ''
}

export async function GET(request, { params }) {
  const { id } = await params
  const { data, error } = await supabase.from('receiving_orders').select('*, receiving_order_items(*)').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request, { params }) {
  const { id } = await params
  const body = await request.json()
  const { items, ...header } = body
  delete header.id; delete header.created_at; delete header.receiving_order_items

  // Fetch current order status BEFORE updating (for stock adjustment "only once" check)
  const { data: currentOrder } = await supabase.from('receiving_orders').select('status').eq('id', id).single()
  const oldStatus = currentOrder?.status

  const { data, error } = await supabase.from('receiving_orders').update(header).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.from('receiving_order_items').delete().eq('receipt_id', id)
  if (items?.length > 0) {
    const rows = items.map((item, i) => { const r = { ...item, receipt_id: Number(id), sort_order: i }; delete r.id; return r })
    await supabase.from('receiving_order_items').insert(rows)
  }

  // 自動同步發票到 invoice_statistics（更新時用 upsert by notes 匹配）
  if (header.invoice_no) {
    const period = getInvoicePeriod(header.invoice_date || header.order_date)
    const invoiceNote = `進貨單 ${data.receipt_no || ''} 發票 ${header.invoice_no}`
    // 先查有沒有舊的發票記錄（用進貨單號匹配）
    const matchNote = `進貨單 ${data.receipt_no || ''} 發票`
    const { data: existing } = await supabase.from('invoice_statistics')
      .select('id').like('notes', `${matchNote}%`).limit(1).single()
    const invoiceRow = {
      company_name: header.vendor_name || data.vendor_name || '',
      type: '進貨',
      invoice_period: period,
      invoice_date: header.invoice_date || header.order_date || null,
      pretax_amount: header.subtotal || 0,
      tax: header.tax_amount || 0,
      total_amount: header.total || 0,
      notes: invoiceNote,
    }
    if (existing) {
      await supabase.from('invoice_statistics').update(invoiceRow).eq('id', existing.id)
    } else {
      await supabase.from('invoice_statistics').insert([invoiceRow])
    }
  }

  // Stock adjustment: increase stock when status changes to confirmed (only once)
  const newStatus = header.status
  if (newStatus === 'confirmed' && oldStatus !== 'confirmed') {
    const { data: orderItems } = await supabase.from('receiving_order_items').select('*').eq('receipt_id', id)
    if (orderItems) {
      for (const item of orderItems) {
        if (!item.product_code) continue
        const { data: product } = await supabase.from('products').select('id, stock_qty').eq('code', item.product_code).single()
        if (product) {
          await supabase.from('products').update({ stock_qty: product.stock_qty + item.quantity }).eq('id', product.id)
          console.log('Stock adjusted:', item.product_code, item.quantity)
        }
      }
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(request, { params }) {
  const { id } = await params
  const { error } = await supabase.from('receiving_orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
