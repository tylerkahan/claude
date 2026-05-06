import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ insights: null })

    const { data } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({ insights: data ?? null })
  } catch {
    return NextResponse.json({ insights: null })
  }
}
