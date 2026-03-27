import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
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
  const body = await request.json()
  const { items, ...header } = body

  // 移除前端傳來但資料表不需要的欄位
  delete header.customer_id
  delete header.quotation_items

  // 清理 items 中的 product_id（若資料表欄位型別不符）
  const cleanItems = items?.map((item, i) => {
    const row = { ...item, sort_order: i }
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
