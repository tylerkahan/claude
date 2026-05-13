import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'
import { logAudit } from '@/lib/audit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CHECKLIST_IDS = ['will','poa','healthcare','trust','beneficiaries','life_insurance','digital','property','tax','contacts','funeral','review']

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(user.id, 10, 60_000)
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

    // Fetch all account data in parallel
    const [
      { data: profile },
      { data: assets },
      { data: beneficiaries },
      { data: existingChecks },
      { data: familyMembers },
      { data: connectedAccounts },
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
      supabase.from('documents').select('*').eq('user_id', user.id),
      supabase.from('digital_assets').select('*').eq('user_id', user.id),
      supabase.from('entities').select('*').eq('user_id', user.id),
    ])

    // ── Rule-based auto-detection ─────────────────────────────────────────
    const docCategories = (documents ?? []).map((d: any) => d.category?.toLowerCase() ?? '')
    const assetCategories = (assets ?? []).map((a: any) => a.category?.toLowerCase() ?? '')
    const connTypes = (connectedAccounts ?? []).map((c: any) => c.category?.toLowerCase() ?? '')
    const primaryBens = (beneficiaries ?? []).filter((b: any) => b.role?.toLowerCase().includes('primary'))
    const hasTrustEntity = (entities ?? []).some((e: any) => e.type?.toLowerCase().includes('trust'))

    const autoDetected: Record<string, boolean> = {
      will:          docCategories.some(c => c.includes('will')),
      trust:         docCategories.some(c => c.includes('trust')) || hasTrustEntity,
      poa:           docCategories.some(c => c.includes('attorney') || c.includes('poa')),
      healthcare:    docCategories.some(c => c.includes('health') || c.includes('directive') || c.includes('living')),
      beneficiaries: primaryBens.length > 0,
      life_insurance: assetCategories.some(c => c.includes('insurance')) || connTypes.some(c => c.includes('insurance')),
      digital:       (digitalAssets ?? []).length > 0,
      property:      assetCategories.some(c => c.includes('real') || c.includes('property')) || connTypes.some(c => c.includes('real_estate')),
      tax:           docCategories.some(c => c.includes('tax')),
      contacts:      !!(profile?.attorney_name || profile?.attorney_email),
      funeral:       false, // manual only
      review:        false, // manual only — check existing
    }

    // Respect existing manual checks for items we can't auto-detect
    const existingMap: Record<string, boolean> = {}
    ;(existingChecks ?? []).forEach((r: any) => { existingMap[r.check_id] = r.completed })
    if (existingMap['funeral']) autoDetected['funeral'] = true
    if (existingMap['review'])  autoDetected['review']  = true

    // ── Build context for AI action steps ────────────────────────────────
    const incompleteItems = CHECKLIST_IDS.filter(id => !autoDetected[id])

    const accountSummary = {
      name: profile?.full_name || 'User',
      state: profile?.state,
      marital_status: profile?.marital_status,
      num_children: familyMembers?.filter((f: any) => f.relationship === 'Child').length ?? 0,
      total_beneficiaries: (beneficiaries ?? []).length,
      primary_beneficiaries: primaryBens.length,
      documents_uploaded: (documents ?? []).map((d: any) => d.category),
      digital_assets_count: (digitalAssets ?? []).length,
      entities_count: (entities ?? []).length,
      has_real_estate: assetCategories.some(c => c.includes('real')) || connTypes.some(c => c.includes('real')),
      has_attorney_contact: !!(profile?.attorney_name),
      attorney_name: profile?.attorney_name || null,
    }

    // Ask Claude to generate specific action steps for each incomplete item
    const prompt = `You are an estate planning assistant. Based on this user's account data, generate a short, specific, actionable instruction for each incomplete compliance item.

User account summary:
${JSON.stringify(accountSummary, null, 2)}

Generate a JSON object with a key for each of these incomplete compliance items: ${incompleteItems.join(', ')}

For each key, provide:
- "action": 1-2 sentence specific instruction telling the user exactly what to do (reference their actual situation where possible, e.g. mention their state, family situation, etc.)
- "link": the most relevant page in the app to take action (one of: /vault, /beneficiaries, /entities, /digital, /attorney, /profile, /family)

Example format:
{
  "will": {
    "action": "You haven't uploaded a will yet. Upload a signed copy to your Document Vault, or connect with an estate attorney to draft one.",
    "link": "/vault"
  }
}

Be concise and direct. Reference the user's name (${accountSummary.name}) and specific details when relevant. Only return valid JSON, no markdown.`

    let actionSteps: Record<string, { action: string; link: string }> = {}

    if (incompleteItems.length > 0) {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-opus-4-5',
          max_tokens: 1200,
          messages: [{ role: 'user', content: prompt }],
        })
        const text = (response.content[0] as any).text.trim()
        const jsonStr = text.startsWith('{') ? text : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
        actionSteps = JSON.parse(jsonStr)
      } catch {
        // Fallback static action steps
        const fallbacks: Record<string, { action: string; link: string }> = {
          will:          { action: 'Upload a signed copy of your Last Will & Testament to your Document Vault.', link: '/vault' },
          trust:         { action: 'Upload your trust document or add a trust entity in the Entity Tree.', link: '/entities' },
          poa:           { action: 'Upload a signed Power of Attorney document to your Document Vault.', link: '/vault' },
          healthcare:    { action: 'Upload your Healthcare Directive or Living Will to your Document Vault.', link: '/vault' },
          beneficiaries: { action: 'Add at least one Primary Beneficiary to your account.', link: '/beneficiaries' },
          life_insurance:{ action: 'Add your life insurance policy as an asset or upload the policy document.', link: '/vault' },
          digital:       { action: 'Add your online accounts, crypto wallets, and digital subscriptions.', link: '/digital' },
          property:      { action: 'Add your real estate properties and upload any property deeds.', link: '/vault' },
          tax:           { action: 'Upload your last 3 years of tax returns to your Document Vault.', link: '/vault' },
          contacts:      { action: 'Add your estate attorney contact on the Attorney Connect page.', link: '/attorney' },
          funeral:       { action: 'Document your end-of-life preferences in your profile notes.', link: '/profile' },
          review:        { action: 'Schedule an annual review of your estate plan with your attorney.', link: '/attorney' },
        }
        incompleteItems.forEach(id => { actionSteps[id] = fallbacks[id] })
      }
    }

    // ── Save auto-detected results to DB ─────────────────────────────────
    const upsertRows = Object.entries(autoDetected).map(([check_id, completed]) => ({
      user_id: user.id,
      check_id,
      completed,
      updated_at: new Date().toISOString(),
    }))
    await supabase.from('compliance_checks').upsert(upsertRows, { onConflict: 'user_id,check_id' })

    await logAudit(supabase, user.id, 'compliance_scan')

    return NextResponse.json({ completed: autoDetected, actionSteps })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
