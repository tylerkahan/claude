import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { docId, content } = await req.json()
    if (!docId || !content) return NextResponse.json({ error: 'Missing docId or content' }, { status: 400 })

    // Fetch user data for comparison
    const [
      { data: assets },
      { data: beneficiaries },
      { data: entities },
      { data: digital_assets },
    ] = await Promise.all([
      supabase.from('assets').select('name,category,value,description').eq('user_id', user.id),
      supabase.from('beneficiaries').select('full_name,role,relationship,percentage').eq('user_id', user.id),
      supabase.from('entities').select('name,type,description').eq('user_id', user.id),
      supabase.from('digital_assets').select('platform,type,username').eq('user_id', user.id),
    ])

    const assetList = assets ?? []
    const benList = beneficiaries ?? []
    const entityList = entities ?? []
    const digitalList = digital_assets ?? []

    const assetsText = assetList.map((a: any) => `${a.name} (${a.category}, $${Number(a.value ?? 0).toLocaleString()})`).join(', ') || 'None'
    const bensText = benList.map((b: any) => `${b.full_name} (${b.relationship ?? 'Unknown'}, ${b.percentage ?? 0}%)`).join(', ') || 'None'
    const entitiesText = entityList.map((e: any) => `${e.name} (${e.type})`).join(', ') || 'None'
    const digitalText = digitalList.map((d: any) => `${d.platform} ${d.type} (@${d.username ?? 'N/A'})`).join(', ') || 'None'

    const prompt = `You are an estate planning attorney reviewing a legal document. Analyze this document and identify any gaps or issues.

Document:
${content}

User's Account Data:
Assets: ${assetsText}
Beneficiaries: ${bensText}
Entities: ${entitiesText}
Digital Assets: ${digitalText}

Return a JSON object with this exact structure:
{
  "score": 85,
  "issues": [
    { "severity": "critical", "title": "Asset not addressed", "detail": "Your Chase checking account ($45,000) is not mentioned in the will. Add it to Article III." },
    { "severity": "warning", "title": "Beneficiary allocation", "detail": "John Smith is listed as a beneficiary but has no specific allocation percentage." }
  ],
  "covered_assets": ["Home at 123 Main St", "Tesla Model 3"],
  "missing_assets": ["Chase Checking Account", "Coinbase Bitcoin Wallet"],
  "summary": "This will covers 6 of 8 assets. 2 critical issues need attention before submission."
}

Severity: "critical" = must fix, "warning" = should fix, "info" = suggestion.
Return only valid JSON. No markdown, no code blocks, no commentary.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
    // Extract JSON by finding first { and last } — robust to any surrounding text/markdown
    const firstBrace = rawText.indexOf('{')
    const lastBrace = rawText.lastIndexOf('}')
    const jsonText = firstBrace >= 0 && lastBrace > firstBrace
      ? rawText.slice(firstBrace, lastBrace + 1)
      : rawText

    let review: any
    try {
      review = JSON.parse(jsonText)
    } catch (parseErr) {
      console.error('review-document JSON parse failed. Raw response:', rawText.slice(0, 500))
      review = {
        score: 70,
        issues: [{ severity: 'warning', title: 'Review incomplete', detail: 'Could not fully analyze this document. Please try again.' }],
        covered_assets: [],
        missing_assets: [],
        summary: 'Review analysis encountered an error. Please try again.',
      }
    }

    // Save review to the document
    await supabase.from('legal_documents')
      .update({ ai_review: review, updated_at: new Date().toISOString() })
      .eq('id', docId)
      .eq('user_id', user.id)

    return NextResponse.json(review)
  } catch (err: any) {
    console.error('review-document error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
