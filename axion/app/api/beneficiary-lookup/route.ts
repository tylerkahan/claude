import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Called from the beneficiary portal to find what estate they're linked to
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'Service not configured' }, { status: 503 })

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    // Look up beneficiary records that match this user's email
    const { data: bens } = await admin
      .from('beneficiaries')
      .select('*, profiles!beneficiaries_user_id_fkey(full_name, attorney_name, attorney_firm, attorney_email, attorney_phone)')
      .eq('email', user.email)

    if (!bens || bens.length === 0) return NextResponse.json({ found: false })

    // Mark invite as accepted if not already
    for (const b of bens) {
      if (b.invite_status === 'invited') {
        await admin.from('beneficiaries').update({ invite_status: 'accepted' }).eq('id', b.id)
      }
    }

    return NextResponse.json({ found: true, records: bens })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
