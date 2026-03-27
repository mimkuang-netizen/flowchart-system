import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase.from('stock_adjustments').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const body = await request.json()
  const { items, ...header } = body

  const { data: adj, error } = await supabase.from('stock_adjustments').insert([header]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (items?.length > 0) {
    const rows = items.map(item => ({ ...item, adj_id: adj.id }))
    const { error: e } = await supabase.from('stock_adjustment_items').insert(rows)
    if (e) return NextResponse.json({ error: e.message }, { status: 500 })

    // Update stock_qty for each product
    for (const item of items) {
      if (item.product_id && item.adj_qty !== 0) {
        const { data: prod } = await supabase.from('products').select('stock_qty').eq('id', item.product_id).single()
        if (prod) {
          const newQty = Number(prod.stock_qty || 0) + Number(item.adj_qty)
          await supabase.from('products').update({ stock_qty: newQty }).eq('id', item.product_id)
        }
      }
    }
  }

  return NextResponse.json(adj, { status: 201 })
}
