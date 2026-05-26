import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SITE_URL = 'https://axion-app-nine.vercel.app'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/onboarding'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${SITE_URL}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  return NextResponse.redirect(`${SITE_URL}${next}`)
}
