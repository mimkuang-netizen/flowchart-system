// Server-only Supabase service_role client.
// Use ONLY in API route handlers (webhooks, admin actions).
// NEVER import from client components.

import { createClient } from '@supabase/supabase-js'

let cached = null

export function getServiceRoleClient() {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase env not set: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
