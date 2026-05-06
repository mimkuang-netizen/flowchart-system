/**
 * Meta（Facebook Messenger + Instagram DM）webhook
 * Phase 3 — 把 FB Page 私訊 + IG @mim_master_mirror DM 寫進 quick_inquiry。
 *
 * 部署位置：https://flowchart-system.vercel.app/api/webhooks/meta
 *
 * 兩種 request：
 *   1. GET  — Meta App Console 設定 webhook 時的 verify handshake
 *            用 hub.verify_token 比對 → 回 hub.challenge
 *   2. POST — 真正的訊息事件
 *            用 X-Hub-Signature-256 = sha256=HMAC(APP_SECRET, body) 驗章
 *
 * 環境變數：
 *   META_APP_SECRET     — Meta App 的 App Secret（Settings → Basic）
 *   META_VERIFY_TOKEN   — 自己定義的隨機字串，跟 Meta Console 設定的 verify token 一致
 *   META_PAGE_ACCESS_TOKEN — 拿 FB user 顯示名稱用的 token（可選）
 */

import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getServiceRoleClient } from '@/lib/supabase-admin'
import { autoMatchCustomer, generateCuidLike } from '@/lib/auto-match'

export const runtime = 'nodejs'

// ============================================================
// GET — Meta verify handshake
// ============================================================
export async function GET(request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  const expected = process.env.META_VERIFY_TOKEN
  if (!expected) {
    return NextResponse.json({ error: 'META_VERIFY_TOKEN 未設定' }, { status: 503 })
  }

  if (mode === 'subscribe' && token === expected) {
    // Meta 規範：要直接回 challenge 純文字（不能是 JSON）
    return new Response(challenge ?? '', { status: 200, headers: { 'content-type': 'text/plain' } })
  }
  return NextResponse.json({ error: 'verify failed' }, { status: 403 })
}

// ============================================================
// POST — 真正的訊息事件（FB Page + IG）
// ============================================================
export async function POST(request) {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) {
    console.error('[Meta webhook] META_APP_SECRET 未設定')
    return NextResponse.json({ error: 'webhook 未設定' }, { status: 503 })
  }

  const rawBody = await request.text()
  const sigHeader = request.headers.get('x-hub-signature-256')
  if (!sigHeader || !sigHeader.startsWith('sha256=')) {
    return NextResponse.json({ error: 'missing signature' }, { status: 401 })
  }

  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  // timing-safe compare
  const a = Buffer.from(sigHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.warn('[Meta webhook] signature 不合')
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const supabase = getServiceRoleClient()
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN
  const results = { received: 0, written: 0, deduped: 0, skipped: 0, errors: [] }

  // payload.object 可能是 'page'（FB Messenger）或 'instagram'（IG DM）
  const isInstagram = payload.object === 'instagram'
  const sourceTag = isInstagram ? 'INSTAGRAM' : 'FACEBOOK'

  const entries = Array.isArray(payload?.entry) ? payload.entry : []

  for (const entry of entries) {
    const messagingEvents = Array.isArray(entry.messaging) ? entry.messaging : []
    results.received += messagingEvents.length

    for (const event of messagingEvents) {
      try {
        const msg = event.message
        if (!msg || msg.is_echo) {
          // is_echo = 自己 page 發出的訊息，不要寫進 triage
          results.skipped++
          continue
        }
        const senderId = event.sender?.id
        const messageId = msg.mid
        const timestamp = new Date(event.timestamp || Date.now())
        if (!senderId || !messageId) { results.skipped++; continue }

        // dedup
        const { data: dup } = await supabase
          .from('quick_inquiry')
          .select('id')
          .eq('source', sourceTag)
          .eq('sourceMessageId', messageId)
          .maybeSingle()
        if (dup) { results.deduped++; continue }

        // text + attachments 摘要
        let textContent = msg.text ?? ''
        const attachments = Array.isArray(msg.attachments) ? msg.attachments : []
        const attachmentSummary = attachments.map(a => {
          const t = a.type ?? 'unknown'
          if (t === 'image') return '[圖片]'
          if (t === 'video') return '[影片]'
          if (t === 'audio') return '[語音]'
          if (t === 'file') return `[檔案] ${a.payload?.url ?? ''}`
          if (t === 'location') return '[位置]'
          return `[${t}]`
        }).join(' ')

        const rawContent = (textContent + (attachmentSummary ? '\n' + attachmentSummary : '')).trim() || '[空訊息]'

        const attachmentUrls = attachments.length > 0
          ? attachments.map(a => ({ type: a.type, url: a.payload?.url ?? null, mid: messageId }))
          : null

        // displayName — FB / IG 都可以用 Graph API 拿
        let displayName = isInstagram ? 'IG 用戶' : 'FB 用戶'
        if (accessToken) {
          try {
            // FB user: GET /{user-id}?fields=name
            // IG user: GET /{user-id}?fields=username（IG 只給 username 不給 name）
            const fields = isInstagram ? 'username' : 'name'
            const r = await fetch(
              `https://graph.facebook.com/v21.0/${encodeURIComponent(senderId)}?fields=${fields}&access_token=${encodeURIComponent(accessToken)}`
            )
            if (r.ok) {
              const profile = await r.json()
              displayName = profile.name ?? profile.username ?? displayName
            }
          } catch {
            // ignore
          }
        }

        const match = await autoMatchCustomer({ /* FB / IG 沒有 phone / email / lineId */ }, supabase)

        const { error } = await supabase.from('quick_inquiry').insert({
          id: generateCuidLike(),
          source: sourceTag,
          customerName: displayName,
          customerPhone: null,
          customerEmail: null,
          customerNote: `${sourceTag} senderId: ${senderId}`,
          rawContent: rawContent.slice(0, 5000),
          attachmentUrls,
          matchedUserId: match.matchedUserId,
          matchedCustomerId: match.matchedCustomerId,
          matchConfidence: match.matchConfidence,
          status: 'NEW',
          receivedAt: timestamp.toISOString(),
          sourceMessageId: messageId,
        })

        if (error) {
          console.error('[Meta webhook] insert 失敗', error)
          results.errors.push({ messageId, error: error.message })
          continue
        }
        results.written++
      } catch (e) {
        console.error('[Meta webhook] event 處理錯誤', e)
        results.errors.push({ message: e.message ?? String(e) })
      }
    }
  }

  // Meta 規範：webhook 必須在 20 秒內回 200，不論處理結果
  return NextResponse.json({ ok: true, ...results })
}
