import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  if (!user) return NextResponse.redirect(`${baseUrl}/login`)

  const clientId = process.env.COINBASE_CLIENT_ID
  if (!clientId) {
    const { searchParams } = new URL(req.url)
    const source = searchParams.get('source') || 'integrations'
    return NextResponse.redirect(`${baseUrl}/${source}?error=coinbase_not_configured`)
  }

  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source') || 'integrations'

  const redirectUri = `${baseUrl}/api/coinbase/callback`
  const state = Buffer.from(JSON.stringify({ source, userId: user.id })).toString('base64url')

  const authUrl = new URL('https://www.coinbase.com/oauth/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'wallet:accounts:read')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('account', 'all')

  return NextResponse.redirect(authUrl.toString())
}
