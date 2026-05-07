/**
 * IG polling — 繞開 Meta webhook 在 Development mode 不推 IG 訊息的限制。
 *
 * 為什麼存在這支：
 *   - Meta App 在 Live mode 才會把 IG DM / comments 推到 webhook
 *   - 但 App Review 影片需要先拍出「客戶發訊息→後台收到」的畫面才能送審
 *   - 所以用 Graph API 主動 polling，dev mode 也能拿到 Tester（ky__0803）的訊息
 *
 * 呼叫方式：
 *   1. Vercel Cron Job 自動觸發（vercel.json crons 設定）
 *      Vercel Cron 會自動加 Authorization: Bearer {CRON_SECRET}
 *   2. 手動測試：curl -H "Authorization: Bearer $CRON_SECRET" \
 *               https://flowchart-system.vercel.app/api/cron/ig-poll
 *
 * 環境變數：
 *   META_PAGE_ACCESS_TOKEN   — 既有，FB Page 長期 access token（含 IG 權限）
 *   IG_USER_ID               — 新增，IG 商業帳號 user id（17841451805980193）
 *   CRON_SECRET              — 新增，Vercel Cron 自動帶；手動 curl 也用這個
 *
 * 寫入：mim-website Supabase 的 quick_inquiry 表
 *   source = 'INSTAGRAM'         （IG Direct messages）
 *   source = 'INSTAGRAM_COMMENT' （IG 貼文留言）
 *   sourceMessageId 用 IG 的 message_id / comment_id 做去重
 */

import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-admin'
import { autoMatchCustomer, generateCuidLike } from '@/lib/auto-match'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const GRAPH_API_VERSION = 'v21.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

const MAX_CONVERSATIONS = 25
const MESSAGES_PER_CONVERSATION = 20
const MAX_MEDIA = 10
const COMMENTS_PER_MEDIA = 20

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
  if (!igUserId || !accessToken) {
    return NextResponse.json(
      { error: 'IG_USER_ID 或 META_PAGE_ACCESS_TOKEN 未設定' },
      { status: 503 },
    )
  }

  const supabase = getServiceRoleClient()
  const result = {
    startedAt: new Date().toISOString(),
    messages: { received: 0, written: 0, deduped: 0, errors: [] },
    comments: { received: 0, written: 0, deduped: 0, errors: [] },
  }

  await Promise.allSettled([
    pollMessages({ igUserId, accessToken, supabase, result }).catch((e) => {
      result.messages.errors.push({ stage: 'top', message: e.message ?? String(e) })
    }),
    pollComments({ igUserId, accessToken, supabase, result }).catch((e) => {
      result.comments.errors.push({ stage: 'top', message: e.message ?? String(e) })
    }),
  ])

  result.finishedAt = new Date().toISOString()
  return NextResponse.json({ ok: true, ...result })
}

// ============================================================
// IG Direct messages
// ============================================================
async function pollMessages({ igUserId, accessToken, supabase, result }) {
  const convUrl =
    `${GRAPH_BASE}/${igUserId}/conversations` +
    `?platform=instagram` +
    `&limit=${MAX_CONVERSATIONS}` +
    `&access_token=${encodeURIComponent(accessToken)}`

  const convRes = await fetch(convUrl)
  if (!convRes.ok) {
    const errText = await convRes.text()
    throw new Error(`conversations fetch ${convRes.status}: ${errText.slice(0, 300)}`)
  }
  const convData = await convRes.json()
  const conversations = Array.isArray(convData?.data) ? convData.data : []

  for (const conv of conversations) {
    try {
      const msgUrl =
        `${GRAPH_BASE}/${conv.id}` +
        `?fields=messages.limit(${MESSAGES_PER_CONVERSATION}){id,from,to,message,created_time}` +
        `&access_token=${encodeURIComponent(accessToken)}`

      const msgRes = await fetch(msgUrl)
      if (!msgRes.ok) {
        const errText = await msgRes.text()
        result.messages.errors.push({
          conversationId: conv.id,
          status: msgRes.status,
          error: errText.slice(0, 200),
        })
        continue
      }
      const msgData = await msgRes.json()
      const messages = msgData?.messages?.data ?? []

      for (const m of messages) {
        result.messages.received++

        // 跳過自己 IG 帳號發出的訊息（echo）
        if (m.from?.id === igUserId) continue
        if (!m.id) continue

        // dedup
        const { data: dup } = await supabase
          .from('quick_inquiry')
          .select('id')
          .eq('source', 'INSTAGRAM')
          .eq('sourceMessageId', m.id)
          .maybeSingle()
        if (dup) {
          result.messages.deduped++
          continue
        }

        const senderId = m.from?.id ?? null
        const senderUsername = m.from?.username ?? 'IG 用戶'
        const text = (m.message ?? '').toString().trim() || '[空訊息]'
        const receivedAt = m.created_time ? new Date(m.created_time) : new Date()

        const match = await autoMatchCustomer({}, supabase)

        const { error } = await supabase.from('quick_inquiry').insert({
          id: generateCuidLike(),
          source: 'INSTAGRAM',
          customerName: senderUsername,
          customerPhone: null,
          customerEmail: null,
          customerNote: `INSTAGRAM senderId: ${senderId} (polled)`,
          rawContent: text.slice(0, 5000),
          attachmentUrls: null,
          matchedUserId: match.matchedUserId,
          matchedCustomerId: match.matchedCustomerId,
          matchConfidence: match.matchConfidence,
          status: 'NEW',
          receivedAt: receivedAt.toISOString(),
          sourceMessageId: m.id,
        })
        if (error) {
          result.messages.errors.push({ messageId: m.id, error: error.message })
          continue
        }
        result.messages.written++
      }
    } catch (e) {
      result.messages.errors.push({
        conversationId: conv.id,
        error: e.message ?? String(e),
      })
    }
  }
}

// ============================================================
// IG Comments
// ============================================================
async function pollComments({ igUserId, accessToken, supabase, result }) {
  const mediaUrl =
    `${GRAPH_BASE}/${igUserId}/media` +
    `?fields=id` +
    `&limit=${MAX_MEDIA}` +
    `&access_token=${encodeURIComponent(accessToken)}`

  const mediaRes = await fetch(mediaUrl)
  if (!mediaRes.ok) {
    const errText = await mediaRes.text()
    throw new Error(`media fetch ${mediaRes.status}: ${errText.slice(0, 300)}`)
  }
  const mediaData = await mediaRes.json()
  const mediaList = Array.isArray(mediaData?.data) ? mediaData.data : []

  for (const media of mediaList) {
    try {
      const commentUrl =
        `${GRAPH_BASE}/${media.id}/comments` +
        `?fields=id,text,timestamp,username,from` +
        `&limit=${COMMENTS_PER_MEDIA}` +
        `&access_token=${encodeURIComponent(accessToken)}`

      const commentRes = await fetch(commentUrl)
      if (!commentRes.ok) {
        const errText = await commentRes.text()
        result.comments.errors.push({
          mediaId: media.id,
          status: commentRes.status,
          error: errText.slice(0, 200),
        })
        continue
      }
      const commentData = await commentRes.json()
      const comments = Array.isArray(commentData?.data) ? commentData.data : []

      for (const c of comments) {
        result.comments.received++

        // 跳過自己回的留言
        if (c.from?.id === igUserId) continue
        if (!c.id) continue

        // dedup
        const { data: dup } = await supabase
          .from('quick_inquiry')
          .select('id')
          .eq('source', 'INSTAGRAM_COMMENT')
          .eq('sourceMessageId', c.id)
          .maybeSingle()
        if (dup) {
          result.comments.deduped++
          continue
        }

        const username = c.username ?? c.from?.username ?? 'IG 留言用戶'
        const text = (c.text ?? '').toString().trim() || '[空留言]'
        const receivedAt = c.timestamp ? new Date(c.timestamp) : new Date()

        const match = await autoMatchCustomer({}, supabase)

        const { error } = await supabase.from('quick_inquiry').insert({
          id: generateCuidLike(),
          source: 'INSTAGRAM_COMMENT',
          customerName: username,
          customerPhone: null,
          customerEmail: null,
          customerNote: `INSTAGRAM comment on media: ${media.id} (polled)`,
          rawContent: text.slice(0, 5000),
          attachmentUrls: null,
          matchedUserId: match.matchedUserId,
          matchedCustomerId: match.matchedCustomerId,
          matchConfidence: match.matchConfidence,
          status: 'NEW',
          receivedAt: receivedAt.toISOString(),
          sourceMessageId: c.id,
        })
        if (error) {
          result.comments.errors.push({ commentId: c.id, error: error.message })
          continue
        }
        result.comments.written++
      }
    } catch (e) {
      result.comments.errors.push({
        mediaId: media.id,
        error: e.message ?? String(e),
      })
    }
  }
}
