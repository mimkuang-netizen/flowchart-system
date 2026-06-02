/**
 * POST /api/share-resource/[token]/sign
 * 公開 endpoint — 客戶在分享頁回簽用
 *
 * Body: { signature_data: 'data:image/png;base64,...', signer_name?: string }
 * 規則:
 *   - 只支援 quotation 類型 (報價單)
 *   - 已簽過的不能再簽 (avoid 覆蓋)
 *   - 圖檔限制 1 MB 以下 (base64 字串長度約 1.4 MB)
 */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

const MAX_DATA_LEN = 1_500_000  // ~1.1 MB png

export async function POST(request, { params }) {
  const { token } = await params
  if (!token) return NextResponse.json({ error: 'token 必填' }, { status: 400 })

  let body
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const { signature_data, signer_name } = body || {}
  if (!signature_data || !signature_data.startsWith('data:image/')) {
    return NextResponse.json({ error: '簽名資料格式錯誤' }, { status: 400 })
  }
  if (signature_data.length > MAX_DATA_LEN) {
    return NextResponse.json({ error: '簽名檔案過大，請壓縮後再試' }, { status: 400 })
  }

  const supabase = getClient()
  const { data: link } = await supabase
    .from('shared_links')
    .select('resource_type, resource_id, revoked')
    .eq('token', token)
    .maybeSingle()

  if (!link || link.revoked) return NextResponse.json({ error: '連結不存在或已撤回' }, { status: 404 })
  if (link.resource_type !== 'quotation') {
    return NextResponse.json({ error: '此類單據不支援回簽' }, { status: 400 })
  }

  // 檢查是否已簽過
  const { data: q } = await supabase
    .from('quotations')
    .select('signed_at')
    .eq('id', link.resource_id)
    .single()
  if (q?.signed_at) {
    return NextResponse.json({ error: '此報價單已簽收，不可重複回簽' }, { status: 400 })
  }

  // 更新報價單
  const { error: updErr } = await supabase
    .from('quotations')
    .update({
      signed_at: new Date().toISOString(),
      signature_data,
      signer_name: (signer_name || '').slice(0, 50) || null,
      status: 'accepted',  // 簽名等同接受
    })
    .eq('id', link.resource_id)

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
  return NextResponse.json({ ok: true, signed_at: new Date().toISOString() })
}
