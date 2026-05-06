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

    // Save account balances
    const balanceRows = accounts.map((acc: any) => ({
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

    // Fetch and save investment holdings (if this is an investment account)
    const hasInvestment = accounts.some((a: any) => a.type === 'investment')
    let holdingCount = 0
    if (hasInvestment) {
      try {
        const holdingsRes = await plaid.investmentsHoldingsGet({ access_token })
        const { holdings, securities } = holdingsRes.data
        const secMap: Record<string, any> = {}
        securities.forEach((s: any) => { secMap[s.security_id] = s })

        const holdingRows = holdings.map((h: any) => {
          const sec = secMap[h.security_id] || {}
          return {
            user_id: user.id,
            connected_account_id: connectedAccount.id,
            plaid_account_id: h.account_id,
            security_id: h.security_id,
            ticker_symbol: sec.ticker_symbol || null,
            security_name: sec.name || sec.ticker_symbol || 'Unknown',
            security_type: sec.type || 'equity',
            quantity: h.quantity,
            institution_price: h.institution_price,
            institution_value: h.institution_value,
            cost_basis: h.cost_basis ?? null,
            last_updated: new Date().toISOString(),
          }
        })

        if (holdingRows.length > 0) {
          await supabase.from('account_holdings').insert(holdingRows)
          holdingCount = holdingRows.length
        }
      } catch (e) {
        // Investment product may not be available for this institution
        console.log('Could not fetch holdings (investment product not available):', e)
      }
    }

    return NextResponse.json({
      success: true,
      connected_account_id: connectedAccount.id,
      institution: institutionName,
      accounts: balanceRows.map((b: any) => ({ name: b.account_name, type: b.account_type, balance: b.current_balance })),
      holdings: holdingCount,
    })
  } catch (err: any) {
    console.error('Plaid exchange error:', err?.response?.data || err)
    return NextResponse.json({ error: err?.response?.data?.error_message || 'Failed to connect account' }, { status: 500 })
  }
}

function inferCategory(accounts: any[]): string {
  const types = accounts.map((a: any) => a.type)
  if (types.includes('investment')) return 'investment'
  if (types.includes('credit') && !types.includes('depository')) return 'credit'
  if (types.includes('depository')) return 'banking'
  return 'banking'
}
