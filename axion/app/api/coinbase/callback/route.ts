import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  if (oauthError) {
    return NextResponse.redirect(`${baseUrl}/integrations?error=coinbase_denied`)
  }
  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/integrations?error=coinbase_error`)
  }

  // Decode state
  let stateData: { source: string; userId: string }
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
  } catch {
    return NextResponse.redirect(`${baseUrl}/integrations?error=invalid_state`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.id !== stateData.userId) {
    return NextResponse.redirect(`${baseUrl}/login`)
  }

  try {
    const redirectUri = `${baseUrl}/api/coinbase/callback`

    // Exchange code for tokens
    const tokenRes = await fetch('https://api.coinbase.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.COINBASE_CLIENT_ID,
        client_secret: process.env.COINBASE_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokens.access_token) throw new Error('No access token received')

    // Fetch all accounts with balances
    let allAccounts: any[] = []
    let nextUri = 'https://api.coinbase.com/v2/accounts?limit=100'
    while (nextUri) {
      const res = await fetch(nextUri, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'CB-VERSION': '2024-01-01',
        },
      })
      const data = await res.json()
      allAccounts = allAccounts.concat(data.data || [])
      nextUri = data.pagination?.next_uri ? `https://api.coinbase.com${data.pagination.next_uri}` : ''
    }

    // Only keep wallets with a non-zero balance
    const activeAccounts = allAccounts.filter(a =>
      a.type === 'wallet' && parseFloat(a.balance?.amount || '0') > 0
    )

    // Insert connected_account row
    const { data: conn, error: connErr } = await supabase
      .from('connected_accounts')
      .insert({
        user_id: user.id,
        integration_type: 'coinbase',
        institution_name: 'Coinbase',
        category: 'crypto',
        coinbase_access_token: tokens.access_token,
        coinbase_refresh_token: tokens.refresh_token || null,
        last_synced_at: new Date().toISOString(),
        status: 'active',
      })
      .select()
      .single()

    if (connErr) throw connErr

    // Insert a balance row per wallet
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

    const redirectTo = stateData.source === 'onboarding' ? '/onboarding' : '/integrations'
    return NextResponse.redirect(`${baseUrl}${redirectTo}?coinbase=connected`)
  } catch (err) {
    console.error('Coinbase callback error:', err)
    return NextResponse.redirect(`${baseUrl}/integrations?error=coinbase_failed`)
  }
}
