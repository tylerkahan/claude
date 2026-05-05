import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRecommendations } from '@/lib/recommendations'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [
      { data: profile },
      { data: assets },
      { data: beneficiaries },
      { data: compliance },
      { data: familyMembers },
      { data: connectedAccounts },
      { data: accountBalances },
      { data: documents },
      { data: digitalAssets },
      { data: entities },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('assets').select('*').eq('user_id', user.id),
      supabase.from('beneficiaries').select('*').eq('user_id', user.id),
      supabase.from('compliance_checks').select('*').eq('user_id', user.id),
      supabase.from('family_members').select('*').eq('user_id', user.id),
      supabase.from('connected_accounts').select('*').eq('user_id', user.id),
      supabase.from('account_balances').select('*').eq('user_id', user.id),
      supabase.from('documents').select('*').eq('user_id', user.id),
      supabase.from('digital_assets').select('*').eq('user_id', user.id),
      supabase.from('entities').select('*').eq('user_id', user.id),
    ])

    const recommendations = buildRecommendations({
      profile,
      assets: assets ?? [],
      beneficiaries: beneficiaries ?? [],
      compliance: compliance ?? [],
      familyMembers: familyMembers ?? [],
      connectedAccounts: connectedAccounts ?? [],
      accountBalances: accountBalances ?? [],
      documents: documents ?? [],
      digitalAssets: digitalAssets ?? [],
      entities: entities ?? [],
    })

    return NextResponse.json({ recommendations, profile })
  } catch (err: any) {
    console.error('Recommendations error:', err)
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}
