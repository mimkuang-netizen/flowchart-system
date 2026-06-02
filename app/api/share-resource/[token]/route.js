/**
 * GET /api/share-resource/[token]
 * 公開 endpoint — 用 token 查出對應的 quotation/sales 資料
 *
 * 不需登入，但 token 不可猜（22-char base64url ≈ 130-bit 熵）
 * Returns: { type, data }   data 含主表 + items
 */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// 用 service-role client 直接讀，繞過 RLS
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

export async function GET(request, { params }) {
  const { token } = await params
  if (!token) return NextResponse.json({ error: 'token 必填' }, { status: 400 })

  const supabase = getClient()
  const { data: link, error: linkErr } = await supabase
    .from('shared_links')
    .select('resource_type, resource_id, revoked')
    .eq('token', token)
    .maybeSingle()

  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })
  if (!link || link.revoked) return NextResponse.json({ error: '連結不存在或已撤回' }, { status: 404 })

  const { resource_type, resource_id } = link
  let data, err
  if (resource_type === 'quotation') {
    ({ data, error: err } = await supabase
      .from('quotations')
      .select('*, quotation_items(*)')
      .eq('id', resource_id)
      .single())
  } else if (resource_type === 'sales') {
    ({ data, error: err } = await supabase
      .from('sales_orders')
      .select('*, sales_order_items(*)')
      .eq('id', resource_id)
      .single())
  } else {
    return NextResponse.json({ error: '未知資源類型' }, { status: 500 })
  }
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })

  return NextResponse.json({ type: resource_type, data })
}
