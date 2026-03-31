import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// EasyStore 訂單同步
// 支援 POST（手動同步按鈕）和 GET（Vercel Cron 定時同步）
// 因為 EasyStore 不支援 Webhook，改用主動拉取方式

async function syncOrders() {
  const apiUrl = process.env.EASYSTORE_API_URL
  const token = process.env.EASYSTORE_ACCESS_TOKEN

  if (!apiUrl || !token) {
    return { error: '尚未設定 EasyStore API。請在環境變數中設定 EASYSTORE_API_URL 和 EASYSTORE_ACCESS_TOKEN', status: 400 }
  }

  // Fetch recent orders from EasyStore
  const res = await fetch(`${apiUrl}/orders.json?limit=50&sort=-created_at`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    return { error: `EasyStore API error: ${res.status} - ${text}`, status: 500 }
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
        tax_type: tax > 0 ? 'taxed' : 'tax_free',
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

  return { message: `同步完成：新增 ${created} 筆，略過 ${skipped} 筆（已存在）`, created, skipped }
}

// POST: 手動同步（從前端按鈕觸發）
export async function POST() {
  try {
    const result = await syncOrders()
    return NextResponse.json(result, { status: result.status || 200 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET: Vercel Cron 定時同步（每小時自動拉取一次）
export async function GET(request) {
  // 驗證 Vercel Cron 請求（可選安全檢查）
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncOrders()
    return NextResponse.json(result, { status: result.status || 200 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
