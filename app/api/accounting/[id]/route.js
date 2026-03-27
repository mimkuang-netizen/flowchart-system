import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function DELETE(request, { params }) {
  const { id } = await params
  const { error } = await supabase.from('accounting_entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
