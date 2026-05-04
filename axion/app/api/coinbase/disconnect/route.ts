import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { account_id } = await req.json()

    // Get token to revoke
    const { data: conn } = await supabase
      .from('connected_accounts')
      .select('coinbase_access_token')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single()

    // Best-effort revoke
    if (conn?.coinbase_access_token) {
      await fetch('https://api.coinbase.com/oauth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: conn.coinbase_access_token }),
      }).catch(() => {})
    }

    await supabase.from('account_balances').delete().eq('connected_account_id', account_id)
    await supabase.from('connected_accounts').delete().eq('id', account_id).eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
