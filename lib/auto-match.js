// Phase 3 — 自動比對既有客戶（webhook 共用）
// 移植自 mim-website src/lib/customer-match.ts，改用 supabase-js client。
// 比對優先序：lineId > phone > email
//
// 回傳 { matchedUserId, matchedCustomerId, matchConfidence }
// matchConfidence 列舉：AUTO_LINE / AUTO_PHONE / AUTO_EMAIL / NEW_CUSTOMER

const normalizePhone = (p) => (p ?? '').replace(/[\s\-()]/g, '').trim()

/**
 * @param {{ phone?: string|null, email?: string|null, lineId?: string|null }} input
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase  service_role client
 */
export async function autoMatchCustomer(input, supabase) {
  // 1. lineId
  if (input.lineId) {
    const { data: u } = await supabase
      .from('User')
      .select('id')
      .eq('lineId', input.lineId)
      .maybeSingle()
    if (u?.id) {
      const customerId = await findLinkedCustomerId(u.id, supabase)
      return { matchedUserId: u.id, matchedCustomerId: customerId, matchConfidence: 'AUTO_LINE' }
    }
  }

  // 2. phone
  const phone = normalizePhone(input.phone)
  if (phone) {
    const { data: u } = await supabase
      .from('User')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()
    if (u?.id) {
      const customerId = await findLinkedCustomerId(u.id, supabase)
      return { matchedUserId: u.id, matchedCustomerId: customerId, matchConfidence: 'AUTO_PHONE' }
    }
    // ERP customers (phone or mobile)
    const { data: erp } = await supabase
      .from('customers')
      .select('id')
      .or(`phone.eq.${phone},mobile.eq.${phone}`)
      .limit(1)
    if (erp && erp.length > 0) {
      return { matchedUserId: null, matchedCustomerId: erp[0].id, matchConfidence: 'AUTO_PHONE' }
    }
  }

  // 3. email
  if (input.email) {
    const email = input.email.toLowerCase().trim()
    const { data: u } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (u?.id) {
      const customerId = await findLinkedCustomerId(u.id, supabase)
      return { matchedUserId: u.id, matchedCustomerId: customerId, matchConfidence: 'AUTO_EMAIL' }
    }
    const { data: erp } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .limit(1)
    if (erp && erp.length > 0) {
      return { matchedUserId: null, matchedCustomerId: erp[0].id, matchConfidence: 'AUTO_EMAIL' }
    }
  }

  return { matchedUserId: null, matchedCustomerId: null, matchConfidence: 'NEW_CUSTOMER' }
}

async function findLinkedCustomerId(userId, supabase) {
  const { data } = await supabase
    .from('customer_link')
    .select('customerId')
    .eq('userId', userId)
    .order('createdAt', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data?.customerId ?? null
}

/**
 * 生成 cuid-like id（不嚴格遵循 cuid 演算法，但格式相容 — 開頭 'c' + 時間戳 + 隨機）
 * 因為 flowchart-system 沒走 Prisma client，所以 INSERT quick_inquiry 時要自己生 id
 */
export function generateCuidLike() {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 10)
  const r2 = Math.random().toString(36).slice(2, 10)
  return 'c' + t + r + r2
}
