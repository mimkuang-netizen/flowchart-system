import { supabase } from '@/lib/supabase'

export async function logAction({ action, module, record_id, record_no, description, details }) {
  await supabase.from('audit_logs').insert([{ action, module, record_id: String(record_id || ''), record_no: record_no || '', description: description || '', details: details || null }])
}
