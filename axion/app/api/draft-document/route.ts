import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(user.id + ':draft', 5, 60_000)
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

    const { type, docId } = await req.json()
    if (!type || !docId) return NextResponse.json({ error: 'Missing type or docId' }, { status: 400 })

    // Fetch all user data in parallel
    const [
      { data: profile },
      { data: beneficiaries },
      { data: assets },
      { data: entities },
      { data: family_members },
      { data: digital_assets },
      { data: connected_accounts },
    ] = await Promise.all([
      supabase.from('profiles').select('full_name,state,date_of_birth,marital_status,address,city,zip').eq('id', user.id).single(),
      supabase.from('beneficiaries').select('full_name,role,relationship,percentage,date_of_birth').eq('user_id', user.id),
      supabase.from('assets').select('name,category,value,description').eq('user_id', user.id),
      supabase.from('entities').select('name,type,description').eq('user_id', user.id),
      supabase.from('family_members').select('full_name,relationship,date_of_birth').eq('user_id', user.id),
      supabase.from('digital_assets').select('platform,type,username').eq('user_id', user.id),
      supabase.from('connected_accounts').select('institution_name,category,current_balance').eq('user_id', user.id),
    ])

    const p: Record<string, any> = profile ?? {}
    const bens = beneficiaries ?? []
    const assetList = assets ?? []
    const entityList = entities ?? []
    const familyList = family_members ?? []
    const digitalList = digital_assets ?? []
    const accountList = connected_accounts ?? []

    const beneficiariesText = bens.length
      ? bens.map((b: any) => `- ${b.full_name} (${b.relationship ?? 'Unknown'}, Role: ${b.role ?? 'N/A'}, ${b.percentage ?? 0}%${b.date_of_birth ? ', DOB: ' + b.date_of_birth : ''})`).join('\n')
      : '- No beneficiaries on file'

    const assetsText = assetList.length
      ? assetList.map((a: any) => `- ${a.name} (${a.category}): $${Number(a.value ?? 0).toLocaleString()}${a.description ? ' — ' + a.description : ''}`).join('\n')
      : '- No assets on file'

    const entitiesText = entityList.length
      ? entityList.map((e: any) => `- ${e.name} (${e.type})${e.description ? ': ' + e.description : ''}`).join('\n')
      : '- No entities on file'

    const familyText = familyList.length
      ? familyList.map((f: any) => `- ${f.full_name} (${f.relationship})${f.date_of_birth ? ', DOB: ' + f.date_of_birth : ''}`).join('\n')
      : '- No family members on file'

    const digitalText = digitalList.length
      ? digitalList.map((d: any) => `- ${d.platform} (${d.type}): @${d.username ?? 'N/A'}`).join('\n')
      : '- No digital assets on file'

    const accountsText = accountList.length
      ? accountList.map((a: any) => `- ${a.institution_name} (${a.category}): $${Number(a.current_balance ?? 0).toLocaleString()}`).join('\n')
      : '- No connected accounts on file'

    const typeLabel = type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

    const prompt = `You are an expert estate planning attorney. Draft a complete, legally formatted ${typeLabel} for ${p.full_name ?? 'the client'} in ${p.state ?? 'their state'}.

IMPORTANT: This is for a software platform. Include a prominent disclaimer at the very top: "DRAFT DOCUMENT — NOT LEGALLY BINDING. This AI-generated document requires review and approval by a licensed attorney before execution."

User Information:
- Full Name: ${p.full_name ?? 'Unknown'}
- State: ${p.state ?? 'Unknown'}
- Date of Birth: ${p.date_of_birth ?? 'Unknown'}
- Marital Status: ${p.marital_status ?? 'Unknown'}
- Address: ${p.address ?? ''}, ${p.city ?? ''}, ${p.zip ?? ''}

Beneficiaries:
${beneficiariesText}

Assets:
${assetsText}

Financial Accounts:
${accountsText}

Entities/Trusts:
${entitiesText}

Family Members:
${familyText}

Digital Assets:
${digitalText}

Instructions:
- Follow ${p.state ?? 'applicable'} state law specifically
- Use proper legal language and formatting
- Number all sections and articles
- Include all standard clauses required for this document type in ${p.state ?? 'the applicable state'}
- Reference specific assets and beneficiaries from the data above
- For a Will: include executor designation, asset distribution, guardianship if children present
- For Healthcare Directive: include specific medical situations and wishes
- For POA: include specific powers granted
- Make the document complete and comprehensive
- Format with clear section headers, numbered clauses

Generate the complete document text only. No commentary before or after.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0].type === 'text' ? message.content[0].text : ''
    const title = `${typeLabel}${p.full_name ? ' — ' + p.full_name : ''}`

    // Upsert the document
    const { error } = await supabase.from('legal_documents').upsert({
      id: docId,
      user_id: user.id,
      type,
      title,
      content,
      status: 'draft',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    if (error) {
      console.error('DB upsert error:', error)
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 })
    }

    return NextResponse.json({ content, docId })
  } catch (err: any) {
    console.error('draft-document error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
