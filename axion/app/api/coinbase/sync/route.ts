import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: conns } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_type', 'coinbase')
      .eq('status', 'active')

    if (!conns?.length) return NextResponse.json({ success: true, synced: 0 })

    for (const conn of conns) {
      const accessToken = conn.coinbase_access_token
      if (!accessToken) continue

      // Fetch all accounts
      let allAccounts: any[] = []
      let nextUri = 'https://api.coinbase.com/v2/accounts?limit=100'
      while (nextUri) {
        const res = await fetch(nextUri, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'CB-VERSION': '2024-01-01',
          },
        })
        if (!res.ok) {
          await supabase.from('connected_accounts').update({ status: 'error' }).eq('id', conn.id)
          nextUri = ''
          continue
        }
        const data = await res.json()
        allAccounts = allAccounts.concat(data.data || [])
        nextUri = data.pagination?.next_uri ? `https://api.coinbase.com${data.pagination.next_uri}` : ''
      }

      const activeAccounts = allAccounts.filter(a =>
        a.type === 'wallet' && parseFloat(a.balance?.amount || '0') > 0
      )

      // Replace balances
      await supabase.from('account_balances').delete().eq('connected_account_id', conn.id)
      if (activeAccounts.length > 0) {
        await supabase.from('account_balances').insert(
          activeAccounts.map((a: any) => ({
            user_id: user.id,
            connected_account_id: conn.id,
            account_name: `${parseFloat(a.balance.amount).toFixed(6)} ${a.balance.currency}`,
            account_type: 'crypto_wallet',
            current_balance: parseFloat(a.native_balance?.amount || '0'),
            currency_code: a.native_balance?.currency || 'USD',
            last_updated: new Date().toISOString(),
          }))
        )
      }

      await supabase
        .from('connected_accounts')
        .update({ last_synced_at: new Date().toISOString(), status: 'active' })
        .eq('id', conn.id)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Coinbase sync error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
