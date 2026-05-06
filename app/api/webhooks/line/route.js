/**
 * LINE Messaging API webhook
 * Phase 3 — 把 LINE @jtv8397z 進來的訊息寫進 mim Supabase 的 quick_inquiry 表，
 *           讓 mim-website /admin/inquiries triage 介面看得到。
 *
 * 部署位置：https://flowchart-system.vercel.app/api/webhooks/line
 *
 * 安全：用 LINE_CHANNEL_SECRET HMAC-SHA256 驗 X-Line-Signature header。
 * 環境變數：
 *   LINE_CHANNEL_SECRET           — LINE Developers Console 取得
 *   LINE_CHANNEL_ACCESS_TOKEN     — LINE Developers Console 取得（用來 fetch 用戶 displayName）
 */

import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getServiceRoleClient } from '@/lib/supabase-admin'
import { autoMatchCustomer, generateCuidLike } from '@/lib/auto-match'

export const runtime = 'nodejs'

// LINE 健康檢查（驗證 webhook URL 合法時 LINE Console 會送 GET）
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'LINE Messaging webhook',
    note: 'LINE Console 的「驗證」按鈕會打 POST 而不是 GET',
  })
}

export async function POST(request) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET
  if (!channelSecret) {
    console.error('[LINE webhook] LINE_CHANNEL_SECRET 未設定')
    return NextResponse.json({ error: 'webhook 未設定' }, { status: 503 })
  }

  // 1. read raw body for signature verification
  const rawBody = await request.text()
  const signature = request.headers.get('x-line-signature')
  const expected = crypto.createHmac('sha256', channelSecret).update(rawBody).digest('base64')
  if (!signature || signature !== expected) {
    console.warn('[LINE webhook] signature 不合')
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  // 2. parse payload
  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const events = Array.isArray(payload?.events) ? payload.events : []
  if (events.length === 0) {
    // LINE 「驗證」按鈕送的是空 events 陣列，要回 200 OK
    return NextResponse.json({ ok: true, note: 'no events (probably webhook verification)' })
  }

  const supabase = getServiceRoleClient()
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const results = { received: events.length, written: 0, deduped: 0, skipped: 0, errors: [] }

  for (const event of events) {
    try {
      if (event.type !== 'message') {
        results.skipped++
        continue
      }
      const msg = event.message
      const lineUserId = event.source?.userId
      if (!lineUserId) { results.skipped++; continue }

      // 暫只處理 text；image / video / audio / sticker / location 之後 Phase 加
      const messageText =
        msg?.type === 'text' ? msg.text :
        msg?.type === 'image' ? '[圖片]' :
        msg?.type === 'sticker' ? '[貼圖]' :
        msg?.type === 'video' ? '[影片]' :
        msg?.type === 'audio' ? '[語音]' :
        msg?.type === 'location' ? `[位置] ${msg.title ?? ''} ${msg.address ?? ''}`.trim() :
        msg?.type === 'file' ? `[檔案] ${msg.fileName ?? ''}` :
        '[未知訊息類型]'

      const messageId = msg?.id
      const timestamp = new Date(event.timestamp || Date.now())

      // dedup
      if (messageId) {
        const { data: dup } = await supabase
          .from('quick_inquiry')
          .select('id')
          .eq('source', 'LINE')
          .eq('sourceMessageId', messageId)
          .maybeSingle()
        if (dup) { results.deduped++; continue }
      }

      // fetch displayName（LINE Profile API）
      let displayName = 'LINE 用戶'
      if (accessToken) {
        try {
          const r = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId)}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          if (r.ok) {
            const profile = await r.json()
            if (profile.displayName) displayName = profile.displayName
          }
        } catch (e) {
          // ignore — 拿不到 profile 還是要寫詢問
        }
      }

      // autoMatch — 用 lineId 查 User 看是不是現有會員
      const match = await autoMatchCustomer({ lineId: lineUserId }, supabase)

      // attachmentUrls — 圖片 / 影片等 binary 訊息要先 fetch content
      // 這次先存 messageId，未來可寫 worker 把 content 拉到 Storage
      const attachmentUrls =
        msg?.type === 'image' || msg?.type === 'video' || msg?.type === 'audio' || msg?.type === 'file'
          ? [{ type: msg.type, lineMessageId: messageId }]
          : null

      const { error } = await supabase.from('quick_inquiry').insert({
        id: generateCuidLike(),
        source: 'LINE',
        customerName: displayName,
        customerPhone: null,
        customerEmail: null,
        customerNote: `LINE userId: ${lineUserId}`,
        rawContent: messageText.slice(0, 5000),
        attachmentUrls,
        matchedUserId: match.matchedUserId,
        matchedCustomerId: match.matchedCustomerId,
        matchConfidence: match.matchConfidence,
        status: 'NEW',
        receivedAt: timestamp.toISOString(),
        sourceMessageId: messageId ?? null,
      })

      if (error) {
        console.error('[LINE webhook] insert 失敗', error)
        results.errors.push({ messageId, error: error.message })
        continue
      }
      results.written++
    } catch (e) {
      console.error('[LINE webhook] event 處理錯誤', e)
      results.errors.push({ message: e.message ?? String(e) })
    }
  }

  // LINE 規範：webhook 必須在 30 秒內回 200，不論處理結果
  return NextResponse.json({ ok: true, ...results })
}
