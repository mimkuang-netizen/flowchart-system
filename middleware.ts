// Edge Runtime middleware — 用 auth.config（不含 Prisma）
import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

export default NextAuth(authConfig).auth

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|api/auth).*)',
  ],
}
