import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRecommendations, buildAIContext } from '@/lib/recommendations'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function getUserContext(supabase: any, userId: string): Promise<string> {
  const [
    { data: profile },
    { data: assets },
    { data: beneficiaries },
    { data: compliance },
    { data: familyMembers },
    { data: connectedAccounts },
    { data: accountBalances },
    { data: documents },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('assets').select('*').eq('user_id', userId),
    supabase.from('beneficiaries').select('*').eq('user_id', userId),
    supabase.from('compliance_checks').select('*').eq('user_id', userId),
    supabase.from('family_members').select('*').eq('user_id', userId),
    supabase.from('connected_accounts').select('*').eq('user_id', userId),
    supabase.from('account_balances').select('*').eq('user_id', userId),
    supabase.from('documents').select('*').eq('user_id', userId),
  ])

  const engineData = {
    profile,
    assets: assets ?? [],
    beneficiaries: beneficiaries ?? [],
    compliance: compliance ?? [],
    familyMembers: familyMembers ?? [],
    connectedAccounts: connectedAccounts ?? [],
    accountBalances: accountBalances ?? [],
    documents: documents ?? [],
  }

  const recommendations = buildRecommendations(engineData)
  return buildAIContext({ ...engineData, recommendations })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { messages } = await req.json()

    // Build personalized context from user's actual data
    let userContext = ''
    if (user) {
      try {
        userContext = await getUserContext(supabase, user.id)
      } catch (e) {
        console.error('Failed to build user context:', e)
      }
    }

    const systemPrompt = userContext
      ? `You are Axion AI — a personalized estate planning advisor with full access to this client's estate data.

${userContext}

## YOUR ROLE
- Reference the client by name and use their specific numbers (estate value, asset names, family members)
- Proactively surface their priority gaps when relevant — don't wait to be asked
- Give concrete, personalized recommendations based on their state, family, and estate size
- When suggesting actions, point to the exact Axion page: Vault, Beneficiaries, Family, Attorney, Compliance, Integrations
- Keep responses focused and under 250 words unless the complexity requires more
- End with one clear next step they should take today

Always note that responses are informational, not legal advice, and recommend consulting a licensed estate attorney for their specific situation.`
      : `You are Axion AI, an expert estate planning advisor. Help users understand estate planning concepts including wills, trusts, beneficiaries, powers of attorney, healthcare directives, estate taxes, probate, and digital asset planning. Be concise and practical. Always note that responses are informational, not legal advice.`

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: any) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      })),
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ text })
  } catch (err: any) {
    console.error('Chat API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
