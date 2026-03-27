import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || ''
  const from = searchParams.get('from') || searchParams.get('start_date') || ''
  const to = searchParams.get('to') || searchParams.get('end_date') || ''

  let query = supabase.from('accounting_entries').select('*').order('entry_date', { ascending: false })
  if (type === 'expense' || type === 'income') query = query.eq('entry_type', type)
  if (from) query = query.gte('entry_date', from)
  if (to) query = query.lte('entry_date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request) {
  const body = await request.json()
  const { data, error } = await supabase.from('accounting_entries').insert([body]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
