import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const type = searchParams.get('type') || ''
  const period = searchParams.get('period') || ''

  let query = supabase.from('invoice_statistics').select('*').order('invoice_date', { ascending: false })

  if (q) query = query.or(`company_name.ilike.%${q}%,notes.ilike.%${q}%`)
  if (type) query = query.eq('type', type)
  if (period) query = query.eq('invoice_period', period)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const body = await request.json()
  const { data, error } = await supabase.from('invoice_statistics').insert([body]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
