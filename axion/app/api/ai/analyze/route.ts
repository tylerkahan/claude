import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(user.id, 20, 60_000)
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

    const [
      { data: profile },
      { data: assets },
      { data: beneficiaries },
      { data: compliance },
      { data: familyMembers },
      { data: connectedAccounts },
      { data: accountBalances },
      { data: documents },
      { data: digitalAssets },
      { data: entities },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('assets').select('*').eq('user_id', user.id),
      supabase.from('beneficiaries').select('*').eq('user_id', user.id),
      supabase.from('compliance_checks').select('*').eq('user_id', user.id),
      supabase.from('family_members').select('*').eq('user_id', user.id),
      supabase.from('connected_accounts').select('*').eq('user_id', user.id),
      supabase.from('account_balances').select('*').eq('user_id', user.id),
      supabase.from('documents').select('*').eq('user_id', user.id),
      supabase.from('digital_assets').select('*').eq('user_id', user.id),
      supabase.from('entities').select('*').eq('user_id', user.id),
    ])

    const manualTotal = (assets ?? []).reduce((s: number, a: any) => s + (a.value || 0), 0)
    const connectedTotal = (accountBalances ?? []).reduce((s: number, b: any) => s + (b.current_balance || 0), 0)
    const netWorth = manualTotal + connectedTotal
    const mortgageTotal = (assets ?? []).reduce((s: number, a: any) => s + (a.mortgage || 0), 0)

    const prompt = `You are an expert estate planning AI. Analyze this client's complete estate profile and return a JSON health report.

CLIENT PROFILE:
- Name: ${profile?.full_name || 'Unknown'}
- State: ${profile?.state || 'Unknown'}
- Marital Status: ${profile?.marital_status || 'Unknown'}
- Net Worth: $${Math.round(netWorth - mortgageTotal).toLocaleString()}
- Total Assets: $${Math.round(netWorth).toLocaleString()}
- Total Mortgages: $${Math.round(mortgageTotal).toLocaleString()}

ASSETS (${(assets ?? []).length}):
${(assets ?? []).map((a: any) => `  - ${a.name}: ${a.category} $${Math.round(a.value || 0).toLocaleString()}${a.mortgage ? ` (mortgage: $${Math.round(a.mortgage).toLocaleString()})` : ''}${a.metadata?.entity_name ? ` [${a.metadata.entity_name}]` : ''}`).join('\n') || '  None'}

CONNECTED ACCOUNTS (${(connectedAccounts ?? []).length}):
${(connectedAccounts ?? []).map((c: any) => {
  const bal = (accountBalances ?? []).filter((b: any) => b.connected_account_id === c.id).reduce((s: number, b: any) => s + (b.current_balance || 0), 0)
  return `  - ${c.institution_name}: ${c.category} $${Math.round(bal).toLocaleString()}`
}).join('\n') || '  None'}

BENEFICIARIES (${(beneficiaries ?? []).length}):
${(beneficiaries ?? []).map((b: any) => `  - ${b.full_name} (${b.relationship})`).join('\n') || '  None'}

FAMILY MEMBERS (${(familyMembers ?? []).length}):
${(familyMembers ?? []).map((f: any) => `  - ${f.full_name} (${f.relationship})`).join('\n') || '  None'}

DOCUMENTS (${(documents ?? []).length}):
${(documents ?? []).map((d: any) => `  - ${d.name || d.document_type}`).join('\n') || '  None'}

ENTITIES/TRUSTS (${(entities ?? []).length}):
${(entities ?? []).map((e: any) => `  - ${e.name} (${e.type})`).join('\n') || '  None'}

COMPLIANCE: ${(compliance ?? []).filter((c: any) => c.completed).length} of ${(compliance ?? []).length} items completed

Return ONLY a valid JSON object, no markdown or explanation:
{
  "estate_score": <0-100 integer>,
  "score_label": <"Critical" | "Needs Work" | "Fair" | "Good" | "Excellent">,
  "summary": "<2 sentences, use their real name and specific dollar amounts, explain their biggest opportunity or risk>",
  "insights": [
    {
      "id": "<unique_snake_case_id>",
      "severity": <"critical" | "high" | "medium">,
      "title": "<specific title with real numbers when possible>",
      "description": "<1-2 sentences using their actual data — asset names, dollar amounts, family member names>",
      "page": <"vault" | "beneficiaries" | "family" | "compliance" | "entities" | "attorney" | "networth" | "digital" | "integrations">,
      "action": "<specific action verb phrase>"
    }
  ]
}

Scoring:
- 0-30: Critical (no will, no beneficiaries, large estate totally unprotected)
- 31-50: Needs Work (some basics present, major gaps remain)
- 51-70: Fair (core docs started, structure incomplete)
- 71-85: Good (well organized, minor optimizations needed)
- 86-100: Excellent (comprehensive, tax-optimized plan)

Generate 4-8 insights ordered by severity. Reference their real asset names, dollar amounts, and people by name. For sparse profiles, focus on the most impactful first steps.`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      try { parsed = match ? JSON.parse(match[0]) : null } catch { parsed = null }
    }

    if (!parsed) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    await supabase.from('ai_insights').upsert({
      user_id: user.id,
      estate_score: parsed.estate_score ?? 0,
      score_label: parsed.score_label ?? 'Unknown',
      summary: parsed.summary ?? '',
      insights: parsed.insights ?? [],
      generated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return NextResponse.json({ success: true, ...parsed })
  } catch (err: any) {
    console.error('AI analyze error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
