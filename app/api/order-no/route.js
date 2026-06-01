import { requireErpAuth } from '@/lib/api-auth'
import { nextOrderNo, ORDER_CONFIGS } from '@/lib/order-no'
import { NextResponse } from 'next/server'

// GET /api/order-no?type=quotations&date=2026-05-30&exclude=20260530001
// 用法：表單載入或日期改動時呼叫，取得下一個應該用的單號（純預覽，實際存檔由 server 再確認）
export async function GET(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const date = searchParams.get('date') || ''
  const exclude = searchParams.get('exclude') || null
  if (!type || !ORDER_CONFIGS[type]) {
    return NextResponse.json({ error: `type 必填且須為 ${Object.keys(ORDER_CONFIGS).join('/')}` }, { status: 400 })
  }
  try {
    const no = await nextOrderNo(supabase, type, date, exclude)
    return NextResponse.json({ no })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
