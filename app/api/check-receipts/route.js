import { requireErpAuth } from "@/lib/api-auth"
import { NextResponse } from "next/server"

export async function GET() {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const { data, error } = await supabase
    .from("check_receipts")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const body = await req.json()
  const { data, error } = await supabase
    .from("check_receipts")
    .insert([body])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
