import { requireErpAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function DELETE(request, { params }) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const { id } = await params
  const { error } = await supabase
    .from('tag_options')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
