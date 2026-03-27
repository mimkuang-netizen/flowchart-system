import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('stock_adjustments')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const body = await request.json()
  const { product_id, product_code, product_name, adjust_type, quantity, before_qty, after_qty, notes } = body

  // Generate adjust_no: ADJ-YYYYMMDD-XXX
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  const adjust_no = `ADJ-${dateStr}-${rand}`

  const row = {
    adjust_no,
    adjust_date: now.toISOString(),
    product_id,
    product_code,
    product_name,
    adjust_type,
    quantity,
    before_qty,
    after_qty,
    notes
  }

  const { data, error } = await supabase
    .from('stock_adjustments')
    .insert([row])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update product stock_qty
  if (product_id) {
    const { error: updateErr } = await supabase
      .from('products')
      .update({ stock_qty: after_qty })
      .eq('id', product_id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
