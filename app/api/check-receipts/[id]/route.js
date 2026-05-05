import { requireErpAuth } from "@/lib/api-auth"
import { NextResponse } from "next/server"

export async function PUT(req, { params }) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const { id } = await params
  const body = await req.json()
  const { data, error } = await supabase
    .from("check_receipts")
    .update(body)
    .eq("id", id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req, { params }) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const { id } = await params
  const { error } = await supabase
    .from("check_receipts")
    .delete()
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
