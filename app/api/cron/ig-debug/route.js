/**
 * IG debug endpoint — 一次性 debug
 * 用 META_PAGE_ACCESS_TOKEN 對 Graph API 多個基礎 endpoint 各打一次，
 * 把結果完整回傳，讓我們看清楚 token 到底對應到誰、有哪些權限、IG ID 對不對。
 *
 * 用 CRON_SECRET 保護，跟 ig-poll 同一個 secret。
 *
 * Debug 完之後這個 endpoint 應該刪掉（避免持續曝露 token info）。
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GRAPH_API_VERSION = 'v21.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export async function GET(request) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET 未設定' }, { status: 503 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const igUserId = process.env.IG_USER_ID
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN
  if (!accessToken) {
    return NextResponse.json({ error: 'META_PAGE_ACCESS_TOKEN 未設定' }, { status: 503 })
  }

  const probe = async (label, path) => {
    try {
      const url = `${GRAPH_BASE}${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(accessToken)}`
      const r = await fetch(url)
      const text = await r.text()
      let json
      try { json = JSON.parse(text) } catch { json = { raw: text.slice(0, 500) } }
      return { label, status: r.status, ok: r.ok, body: json }
    } catch (e) {
      return { label, status: 'fetch-failed', error: e.message ?? String(e) }
    }
  }

  const results = {
    env: {
      hasToken: true,
      tokenLength: accessToken.length,
      tokenPrefix: accessToken.slice(0, 4),
      igUserIdConfigured: igUserId ?? null,
    },
    probes: await Promise.all([
      // 1. token 對應到的物件（page or app or user）
      probe('me', '/me?fields=id,name,category'),
      // 2. token 含哪些 permission scopes
      probe('me-permissions', '/me/permissions'),
      // 3. token 對應 user 擁有的 pages（如果是 user token）
      probe('me-accounts', '/me/accounts?fields=id,name,instagram_business_account{id,username}'),
      // 4. /me 上有沒有掛 IG 帳號（如果 token 是 page token）
      probe('me-ig-account', '/me?fields=instagram_business_account{id,username,name}'),
      // 5. 直接打配置的 IG_USER_ID 看能不能讀
      igUserId ? probe('ig-by-id', `/${igUserId}?fields=id,username,name`) : Promise.resolve({ label: 'ig-by-id', skipped: 'IG_USER_ID 未設' }),
      // 6. 嘗試用 /me/conversations?platform=instagram（page token 路徑）
      probe('me-conversations-ig', '/me/conversations?platform=instagram&limit=3'),
      // 7. 嘗試用 IG_USER_ID/conversations
      igUserId ? probe('ig-conversations', `/${igUserId}/conversations?platform=instagram&limit=3`) : Promise.resolve({ label: 'ig-conversations', skipped: 'IG_USER_ID 未設' }),
    ]),
  }

  return NextResponse.json(results, { status: 200 })
}
