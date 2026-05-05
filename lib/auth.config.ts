// Edge Runtime 相容版（給 middleware 用）
// 不含 Prisma — 純粹 callbacks + provider 殼
import type { NextAuthConfig, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

const ALLOWED_ROLES = ['ADMIN', 'EMPLOYEE']

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id
        token.role = (user as { role?: string }).role ?? 'CUSTOMER'
      }
      return token
    },
    session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        ;(session.user as { id?: string }).id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const role = (auth?.user as { role?: string })?.role
      const pathname = nextUrl.pathname

      const publicPaths = ['/login', '/api/auth', '/_next', '/favicon', '/icon']
      if (publicPaths.some(p => pathname.startsWith(p))) return true

      if (!isLoggedIn) return false
      return ALLOWED_ROLES.includes(role ?? '')
    },
  },

  providers: [], // 完整 providers 在 auth.ts
}
