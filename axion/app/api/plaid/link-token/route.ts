import { NextResponse } from 'next/server'
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid'
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
    return NextResponse.json({ error: 'Plaid not configured. Add PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV to your environment variables.' }, { status: 503 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const plaid = getPlaidClient()
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'Axion Estate',
      products: [Products.Assets],
      country_codes: [CountryCode.Us],
      language: 'en',
    })

    return NextResponse.json({ link_token: response.data.link_token })
  } catch (err: any) {
    console.error('Plaid link token error:', err?.response?.data || err)
    return NextResponse.json({ error: err?.response?.data?.error_message || 'Failed to create link token' }, { status: 500 })
  }
}
