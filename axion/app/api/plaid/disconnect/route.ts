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
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { account_id } = await req.json()

    // Get the connection
    const { data: conn } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single()

    if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Remove the Plaid item if it's a Plaid connection
    if (conn.integration_type === 'plaid' && conn.plaid_access_token && process.env.PLAID_CLIENT_ID) {
      try {
        const plaid = getPlaidClient()
        await plaid.itemRemove({ access_token: conn.plaid_access_token })
      } catch (e) {
        // Log but don't fail — still clean up our DB
        console.error('Plaid item removal failed:', e)
      }
    }

    // Delete account balances and the connection
    await supabase.from('account_balances').delete().eq('connected_account_id', account_id)
    await supabase.from('connected_accounts').delete().eq('id', account_id).eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Disconnect error:', err)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
