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

export async function POST(req: Request) {
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    return NextResponse.json({ error: 'Plaid not configured' }, { status: 503 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { public_token, metadata } = await req.json()
    const plaid = getPlaidClient()

    // Exchange public token for access token
    const exchangeRes = await plaid.itemPublicTokenExchange({ public_token })
    const { access_token, item_id } = exchangeRes.data

    const institutionName = metadata?.institution?.name || 'Unknown Institution'

    // Fetch accounts and balances
    const balancesRes = await plaid.accountsBalanceGet({ access_token })
    const accounts = balancesRes.data.accounts

    // Save connected account
    const { data: connectedAccount, error: connErr } = await supabase
      .from('connected_accounts')
      .insert({
        user_id: user.id,
        integration_type: 'plaid',
        institution_name: institutionName,
        category: inferCategory(accounts),
        plaid_item_id: item_id,
        plaid_access_token: access_token,
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (connErr) throw connErr

    // Save individual account balances
    const balanceRows = accounts.map(acc => ({
      user_id: user.id,
      connected_account_id: connectedAccount.id,
      plaid_account_id: acc.account_id,
      account_name: acc.name,
      account_type: acc.subtype || acc.type,
      current_balance: acc.balances.current ?? 0,
      currency_code: acc.balances.iso_currency_code || 'USD',
      last_updated: new Date().toISOString(),
    }))

    await supabase.from('account_balances').insert(balanceRows)

    return NextResponse.json({
      success: true,
      institution: institutionName,
      accounts: balanceRows.map(b => ({
        name: b.account_name,
        type: b.account_type,
        balance: b.current_balance,
      })),
    })
  } catch (err: any) {
    console.error('Plaid exchange error:', err?.response?.data || err)
    return NextResponse.json({ error: err?.response?.data?.error_message || 'Failed to connect account' }, { status: 500 })
  }
}

function inferCategory(accounts: any[]): string {
  const types = accounts.map(a => a.type)
  if (types.includes('investment')) return 'investment'
  if (types.includes('depository')) return 'banking'
  if (types.includes('credit')) return 'banking'
  return 'banking'
}
