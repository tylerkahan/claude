import { NextResponse } from 'next/server'
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'
import { createClient } from '@/lib/supabase/server'

function getPlaidClient() {
  const env = process.env.PLAID_ENV || 'sandbox'
  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[env as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID ?? '',
          'PLAID-SECRET': process.env.PLAID_SECRET ?? '',
        },
      },
    })
  )
}

export async function POST() {
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    return NextResponse.json({ error: 'Plaid not configured' }, { status: 503 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get all active Plaid connections
    const { data: connections } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_type', 'plaid')
      .eq('status', 'active')

    if (!connections || connections.length === 0) {
      return NextResponse.json({ synced: 0 })
    }

    const plaid = getPlaidClient()
    let totalSynced = 0

    for (const conn of connections) {
      try {
        const balancesRes = await plaid.accountsBalanceGet({ access_token: conn.plaid_access_token })
        const accounts = balancesRes.data.accounts

        for (const acc of accounts) {
          await supabase.from('account_balances')
            .upsert({
              user_id: user.id,
              connected_account_id: conn.id,
              plaid_account_id: acc.account_id,
              account_name: acc.name,
              account_type: acc.subtype || acc.type,
              current_balance: acc.balances.current ?? 0,
              currency_code: acc.balances.iso_currency_code || 'USD',
              last_updated: new Date().toISOString(),
            }, { onConflict: 'connected_account_id,plaid_account_id' })
        }

        await supabase.from('connected_accounts')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', conn.id)

        totalSynced++
      } catch (e) {
        console.error(`Failed to sync ${conn.institution_name}:`, e)
      }
    }

    return NextResponse.json({ synced: totalSynced })
  } catch (err: any) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
