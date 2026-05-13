import { SupabaseClient } from '@supabase/supabase-js'

export async function logAudit(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  resource?: string,
  details?: Record<string, any>
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      resource: resource ?? null,
      details: details ?? null,
    })
  } catch {} // never throw from audit logging
}
