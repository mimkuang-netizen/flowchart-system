// 共用 API auth helper
// 每個進銷存 API route 開頭呼叫 requireErpAuth 驗 NextAuth session
// 通過後取得 service_role 的 supabase client（bypass RLS）

import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { auth } from '@/lib/auth'

const ALLOWED_ROLES = ['ADMIN', 'EMPLOYEE'] as const
type AllowedRole = typeof ALLOWED_ROLES[number]

let cachedClient: SupabaseClient | null = null
function getServiceRoleClient(): SupabaseClient {
  if (cachedClient) return cachedClient
  cachedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  return cachedClient
}

type SuccessResult = {
  error: null
  supabase: SupabaseClient
  session: {
    user: { id: string; email?: string | null; name?: string | null; role: AllowedRole }
  }
}
type FailResult = {
  error: NextResponse
  supabase: null
  session: null
}

export async function requireErpAuth(): Promise<SuccessResult | FailResult> {
  const session = await auth()
  const user = session?.user as { id?: string; email?: string | null; name?: string | null; role?: string } | undefined
  if (!user?.role || !ALLOWED_ROLES.includes(user.role as AllowedRole)) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      supabase: null,
      session: null,
    }
  }
  return {
    error: null,
    supabase: getServiceRoleClient(),
    session: {
      user: {
        id: user.id!,
        email: user.email,
        name: user.name,
        role: user.role as AllowedRole,
      },
    },
  }
}
