import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { beneficiary_id, email, grantor_name } = await req.json()
    if (!email || !beneficiary_id) return NextResponse.json({ error: 'Missing email or beneficiary_id' }, { status: 400 })

    // Verify the caller is authenticated
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify this beneficiary belongs to the caller
    const { data: ben } = await supabase.from('beneficiaries').select('id').eq('id', beneficiary_id).eq('user_id', user.id).single()
    if (!ben) return NextResponse.json({ error: 'Beneficiary not found' }, { status: 404 })

    // Use service role key to send invite
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      // Fallback: just mark as invited and return a signup link
      await supabase.from('beneficiaries').update({ invite_status: 'invited', invite_sent_at: new Date().toISOString() }).eq('id', beneficiary_id)
      const signupUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://axion-app-nine.vercel.app'}/beneficiary-signup?ref=${beneficiary_id}`
      return NextResponse.json({ success: true, fallback: true, signupUrl })
    }

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://axion-app-nine.vercel.app'

    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/beneficiary`,
      data: {
        beneficiary_id,
        grantor_user_id: user.id,
        grantor_name: grantor_name || 'Your contact',
        role: 'beneficiary',
      },
    })

    if (error) {
      // If user already exists, just mark as invited
      if (error.message?.includes('already been registered')) {
        await supabase.from('beneficiaries').update({ invite_status: 'invited', invite_sent_at: new Date().toISOString() }).eq('id', beneficiary_id)
        return NextResponse.json({ success: true, note: 'User already exists — marked as invited' })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Mark as invited
    await supabase.from('beneficiaries').update({ invite_status: 'invited', invite_sent_at: new Date().toISOString() }).eq('id', beneficiary_id)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
