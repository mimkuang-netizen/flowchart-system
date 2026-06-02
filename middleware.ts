// Edge Runtime middleware — 用 auth.config（不含 Prisma）
import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth.config'

const authMiddleware = NextAuth(authConfig).auth

// 對外品牌網域：只能訪問分享相關路徑，其他全部 404 (隱藏後台存在)
const SHARE_HOST = 's.mim.com.tw'
const SHARE_ALLOWED_PREFIXES = [
  '/v/',
  '/api/share-resource/',
  '/_next/',
  '/favicon',
  '/icon',
  '/logo',
]

export default async function middleware(request: import('next/server').NextRequest, event: any) {
  const host = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // 來自對外分享網域 → 限制可訪問路徑
  if (host === SHARE_HOST) {
    const allowed = SHARE_ALLOWED_PREFIXES.some(p => pathname.startsWith(p))
    if (!allowed) {
      return new NextResponse('Not Found', { status: 404 })
    }
    // 允許的公開路徑直接通過，不走 auth
    return NextResponse.next()
  }

  // 其他網域 (主後台 flowchart-system.vercel.app) → 走原本的 NextAuth 流程
  return (authMiddleware as any)(request, event)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|api/auth).*)',
  ],
}
