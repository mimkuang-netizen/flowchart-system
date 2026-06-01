import { requireErpAuth } from '@/lib/api-auth'
import { ensureOrderNo } from '@/lib/order-no'
import { sanitizeEmpty } from '@/lib/po-to-ro'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''
  const customer = searchParams.get('customer') || ''

  let query = supabase
    .from('quotations')
    .select('*')
    .order('created_at', { ascending: false })

  if (q) query = query.or(`quote_no.ilike.%${q}%,customer_name.ilike.%${q}%`)
  if (status) query = query.eq('status', status)
  if (customer) query = query.eq('customer_name', customer)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const body = await request.json()
  const { items, ...rawHeader } = body

  // 移除前端傳來但資料表不需要的欄位
  delete rawHeader.customer_id
  delete rawHeader.quotation_items
  const header = sanitizeEmpty(rawHeader)
  // 統一單號：YYYYMMDD + 4 位序號，依 quote_date 計算
  header.quote_no = await ensureOrderNo(supabase, 'quotations', header.quote_date, header.quote_no)

  // 清理 items 中的 product_id（若資料表欄位型別不符）
  const cleanItems = items?.map((item, i) => {
    const row = sanitizeEmpty({ ...item, sort_order: i })
    delete row.product_id
    delete row.id
    return row
  })

  const { data: quote, error } = await supabase
    .from('quotations')
    .insert([header])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (cleanItems && cleanItems.length > 0) {
    const rows = cleanItems.map(item => ({ ...item, quote_id: quote.id }))
    const { error: itemErr } = await supabase.from('quotation_items').insert(rows)
    if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })
  }

  return NextResponse.json(quote, { status: 201 })
}
