import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: save a manual account (crypto or real estate)
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { integration_type, institution_name, category, account_name, account_type, current_balance } = body

    // Insert connected account
    const { data: conn, error: connErr } = await supabase
      .from('connected_accounts')
      .insert({
        user_id: user.id,
        integration_type,
        institution_name,
        category,
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (connErr) throw connErr

    // Insert balance entry
    await supabase.from('account_balances').insert({
      user_id: user.id,
      connected_account_id: conn.id,
      account_name,
      account_type,
      current_balance,
      last_updated: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, id: conn.id })
  } catch (err: any) {
    console.error('Save account error:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

// DELETE: remove a manual account
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { account_id } = await req.json()

    await supabase.from('account_balances').delete().eq('connected_account_id', account_id)
    await supabase.from('connected_accounts').delete().eq('id', account_id).eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
