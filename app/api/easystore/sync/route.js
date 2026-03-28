import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// 手動同步 EasyStore 訂單
// 需要在 .env.local 設定:
// EASYSTORE_API_URL=https://your-store.easy.co/api/3.0
// EASYSTORE_ACCESS_TOKEN=your_access_token

export async function POST(request) {
  const apiUrl = process.env.EASYSTORE_API_URL
  const token = process.env.EASYSTORE_ACCESS_TOKEN

  if (!apiUrl || !token) {
    return NextResponse.json({
      error: '尚未設定 EasyStore API。請在 .env.local 中設定 EASYSTORE_API_URL 和 EASYSTORE_ACCESS_TOKEN',
    }, { status: 400 })
  }

  try {
    // Fetch recent orders from EasyStore
    const res = await fetch(`${apiUrl}/orders.json?limit=50&sort=-created_at`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `EasyStore API error: ${res.status}` }, { status: 500 })
    }

    const data = await res.json()
    const orders = data.orders || data || []

    let created = 0, skipped = 0

    for (const order of orders) {
      const orderNo = `ES${order.id || order.number}`

      // Check duplicate
      const { data: existing } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('order_no', orderNo)
        .maybeSingle()

      if (existing) { skipped++; continue }

      const customerName = order.customer?.name || order.shipping_address?.name || 'EasyStore客戶'
      const orderDate = order.created_at ? order.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)
      const total = Number(order.total_price || 0)
      const subtotal = Number(order.subtotal_price || total)
      const tax = Number(order.total_tax || 0)

      const { data: salesOrder, error } = await supabase
        .from('sales_orders')
        .insert([{
          order_no: orderNo,
          customer_name: customerName,
          order_date: orderDate,
          status: 'confirmed',
          tax_type: tax > 0 ? 'taxed' : 'exempt',
          subtotal, tax_amount: tax, total,
          notes: `來源: EasyStore #${order.number || order.id}`,
        }])
        .select().single()

      if (error) continue

      const lineItems = (order.line_items || []).map((item, i) => ({
        order_id: salesOrder.id,
        product_code: item.sku || '',
        product_name: item.name || item.title || '',
        unit: '個',
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.price || 0),
        discount: 100,
        amount: Number(item.quantity || 1) * Number(item.price || 0),
        sort_order: i,
      }))

      if (lineItems.length > 0) {
        await supabase.from('sales_order_items').insert(lineItems)
      }
      created++
    }

    return NextResponse.json({ message: `同步完成：新增 ${created} 筆，略過 ${skipped} 筆（已存在）` })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
