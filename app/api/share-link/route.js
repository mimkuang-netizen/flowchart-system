/**
 * POST /api/share-link
 * 為一筆 quotation/sales 產生（或取用既有）分享 token
 *
 * Body: { type: 'quotation'|'sales', id: number }
 * Returns: { token, url }
 *
 * 需要 ERP 登入（只有員工可以建立分享連結）
 */
import { requireErpAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const VALID_TYPES = new Set(['quotation', 'sales'])

// URL-safe 隨機 token (22 字元，約 130-bit 熵 — 客戶猜不到)
function generateToken() {
  return crypto.randomBytes(16).toString('base64url')
}

export async function POST(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr

  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }
  const { type, id } = body
  if (!VALID_TYPES.has(type) || !id) {
    return NextResponse.json({ error: 'type 必填 (quotation/sales), id 必填' }, { status: 400 })
  }
  const resourceId = Number(id)

  // 已有 token (沒被 revoked) → 直接回用
  const { data: existing } = await supabase
    .from('shared_links')
    .select('token')
    .eq('resource_type', type)
    .eq('resource_id', resourceId)
    .eq('revoked', false)
    .maybeSingle()

  if (existing?.token) {
    return NextResponse.json({ token: existing.token })
  }

  // 否則新建一個 (對 (type, id) 有 UNIQUE 約束，撞 race 也安全)
  let token, attempts = 0
  while (attempts < 5) {
    token = generateToken()
    const { data, error } = await supabase
      .from('shared_links')
      .insert([{ token, resource_type: type, resource_id: resourceId }])
      .select('token')
      .single()
    if (!error) return NextResponse.json({ token: data.token })
    // 若是 UNIQUE (type, id) 衝突 (剛剛被別人建了) → 再撈一次
    const { data: again } = await supabase
      .from('shared_links')
      .select('token')
      .eq('resource_type', type)
      .eq('resource_id', resourceId)
      .eq('revoked', false)
      .maybeSingle()
    if (again?.token) return NextResponse.json({ token: again.token })
    attempts++
  }
  return NextResponse.json({ error: 'token 產生失敗' }, { status: 500 })
}
