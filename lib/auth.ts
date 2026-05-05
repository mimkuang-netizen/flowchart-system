// flowchart-system NextAuth 完整實例（Node runtime）
// Edge Runtime 用 lib/auth.config.ts（middleware）

import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import LINE from 'next-auth/providers/line'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { authConfig } from './auth.config'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

const ALLOWED_ROLES = ['ADMIN', 'EMPLOYEE'] as const

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  adapter: PrismaAdapter(prisma) as any,

  providers: [
    LINE({
      clientId: process.env.LINE_CLIENT_ID!,
      clientSecret: process.env.LINE_CLIENT_SECRET!,
    }),
    Credentials({
      id: 'credentials',
      name: '帳號登入',
      credentials: {
        account: { label: '帳號', type: 'text' },
        password: { label: '密碼', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = z
          .object({ account: z.string().min(1), password: z.string().min(6) })
          .safeParse(credentials)
        if (!parsed.success) return null

        const { account, password } = parsed.data
        const isPhone = /^0\d{8,9}$/.test(account)
        const user = isPhone
          ? await prisma.user.findUnique({ where: { phone: account } })
          : await prisma.user.findUnique({ where: { email: account } })
        if (!user || !user.password) return null

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        if (!ALLOWED_ROLES.includes(user.role as typeof ALLOWED_ROLES[number])) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],
})
