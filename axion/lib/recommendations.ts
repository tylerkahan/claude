// ── Shared recommendations engine ─────────────────────────────────────────────
// Used by: /api/recommendations, /api/chat (AI context), /dashboard (server)

export type Recommendation = {
  id: string
  severity: 'critical' | 'high' | 'medium'
  title: string
  description: string
  action: string
  actionPath: string
}

export const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K`
  : `$${n.toLocaleString()}`

// States with their own estate tax (threshold in USD)
const STATE_ESTATE_TAX: Record<string, number> = {
  OR: 1_000_000, MA: 2_000_000, RI: 1_733_264, MD: 5_000_000,
  MN: 3_000_000, IL: 4_000_000, ME: 6_800_000, CT: 12_920_000,
  NY: 6_940_000, WA: 2_193_000, HI: 5_490_000, VT: 5_000_000,
  DC: 4_528_800,
}

interface EngineInput {
  profile: any
  assets: any[]
  beneficiaries: any[]
  compliance: any[]
  familyMembers: any[]
  connectedAccounts: any[]
  accountBalances: any[]
  documents: any[]
  digitalAssets?: any[]
  entities?: any[]
}

export function buildRecommendations(data: EngineInput): Recommendation[] {
  const { profile, assets, beneficiaries, compliance, familyMembers,
          connectedAccounts, accountBalances, documents } = data

  const recs: Recommendation[] = []
  const hasCheck = (id: string) => compliance?.some((c: any) => c.check_id === id && c.completed) ?? false

  const manualValue  = assets?.reduce((s: number, a: any) => s + (a.value || 0), 0) ?? 0
  const connValue    = accountBalances?.reduce((s: number, b: any) => s + (b.current_balance || 0), 0) ?? 0
  const totalEstate  = manualValue + connValue
  const numChildren  = profile?.num_children ?? 0
  const state        = profile?.state || ''

  // ── Critical ────────────────────────────────────────────────────────────────

  if (totalEstate > 13_610_000) {
    recs.push({
      id: 'federal_estate_tax', severity: 'critical',
      title: 'Federal estate tax exposure',
      description: `Your ${fmt(totalEstate)} estate exceeds the $13.61M federal exemption. Heirs could owe 40% on the excess — that's ${fmt((totalEstate - 13_610_000) * 0.4)}.`,
      action: 'Talk to a tax attorney', actionPath: '/attorney',
    })
  }

  if (!hasCheck('will')) {
    recs.push({
      id: 'no_will', severity: 'critical',
      title: 'No will on file',
      description: 'Without a will, the state decides who gets your assets. Your family could face months of probate court with no say in the outcome.',
      action: 'Upload your will', actionPath: '/vault',
    })
  }

  if (numChildren > 0 && !hasCheck('will')) {
    recs.push({
      id: 'no_guardian', severity: 'critical',
      title: `No guardian named for your ${numChildren > 1 ? `${numChildren} children` : 'child'}`,
      description: 'If you die without a will that names a guardian, a judge will decide who raises your children.',
      action: 'Create a will with guardian', actionPath: '/attorney',
    })
  }

  // ── High ────────────────────────────────────────────────────────────────────

  if (!hasCheck('poa')) {
    recs.push({
      id: 'no_poa', severity: 'high',
      title: 'No Power of Attorney',
      description: 'If you become incapacitated, no one is legally authorized to pay your bills, manage investments, or handle your affairs.',
      action: 'Get a durable POA', actionPath: '/attorney',
    })
  }

  if (!hasCheck('healthcare')) {
    recs.push({
      id: 'no_healthcare', severity: 'high',
      title: 'No healthcare directive',
      description: "Without a healthcare directive, doctors and family won't know your medical wishes if you can't speak for yourself.",
      action: 'Create a healthcare directive', actionPath: '/attorney',
    })
  }

  if (!hasCheck('trust') && totalEstate > 1_000_000) {
    recs.push({
      id: 'no_trust', severity: 'high',
      title: 'No trust — probate risk on large estate',
      description: `Your ${fmt(totalEstate)} estate will go through public probate court without a revocable trust. Probate is slow (12–18 months), expensive (3–7% of estate), and public record.`,
      action: 'Talk to an estate attorney', actionPath: '/attorney',
    })
  }

  if (!beneficiaries?.length) {
    recs.push({
      id: 'no_beneficiaries', severity: 'high',
      title: 'No beneficiaries named',
      description: 'You haven\'t named any beneficiaries. Financial accounts without named beneficiaries go through probate even if you have a will.',
      action: 'Add beneficiaries', actionPath: '/beneficiaries',
    })
  }

  if (connectedAccounts?.length && !beneficiaries?.length) {
    recs.push({
      id: 'accounts_no_bens', severity: 'high',
      title: `${connectedAccounts.length} connected account${connectedAccounts.length > 1 ? 's' : ''} need beneficiaries`,
      description: 'Your financial accounts need beneficiary designations on file with each institution, not just in your will.',
      action: 'Name beneficiaries', actionPath: '/beneficiaries',
    })
  }

  const stateThreshold = STATE_ESTATE_TAX[state]
  if (stateThreshold && totalEstate > stateThreshold) {
    recs.push({
      id: 'state_estate_tax', severity: 'high',
      title: `${state} state estate tax risk`,
      description: `${state} taxes estates above $${(stateThreshold / 1_000_000).toFixed(1)}M. Your ${fmt(totalEstate)} estate may owe state-level taxes in addition to federal.`,
      action: 'Review state tax planning', actionPath: '/attorney',
    })
  }

  // ── Medium ──────────────────────────────────────────────────────────────────

  if (!documents?.length) {
    recs.push({
      id: 'no_documents', severity: 'medium',
      title: 'Vault is empty',
      description: 'Upload your will, trust, POA, insurance policies, and other key documents so your family can find them instantly.',
      action: 'Upload documents', actionPath: '/vault',
    })
  }

  if (!familyMembers?.length) {
    recs.push({
      id: 'no_family', severity: 'medium',
      title: 'No family members added',
      description: 'Add your spouse, children, and key contacts so they know about your estate plan and can access documents.',
      action: 'Add family members', actionPath: '/family',
    })
  }

  if (
    (profile?.marital_status === 'Married' || profile?.marital_status === 'Domestic Partnership') &&
    profile?.spouse_name &&
    !familyMembers?.some((f: any) =>
      f.relationship?.toLowerCase().includes('spouse') ||
      f.relationship?.toLowerCase().includes('partner')
    )
  ) {
    recs.push({
      id: 'spouse_not_added', severity: 'medium',
      title: `${profile.spouse_name} not in family members`,
      description: 'Your spouse should be added to your family members so they have access to your estate plan.',
      action: 'Add your spouse', actionPath: '/family',
    })
  }

  // Sort: critical → high → medium
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2 }
  return recs.sort((a, b) => order[a.severity] - order[b.severity])
}

// ── AI system prompt builder ───────────────────────────────────────────────────

export function buildAIContext(data: EngineInput & { recommendations: Recommendation[] }): string {
  const { profile, assets, beneficiaries, compliance, familyMembers,
          connectedAccounts, accountBalances, digitalAssets, entities, recommendations } = data

  const hasCheck = (id: string) => compliance?.some((c: any) => c.check_id === id && c.completed) ?? false
  const manualValue = assets?.reduce((s: number, a: any) => s + (a.value || 0), 0) ?? 0
  const connValue   = accountBalances?.reduce((s: number, b: any) => s + (b.current_balance || 0), 0) ?? 0
  const totalEstate = manualValue + connValue

  const accountLines = connectedAccounts?.length
    ? connectedAccounts.map((c: any) => {
        const bal = accountBalances
          ?.filter((b: any) => b.connected_account_id === c.id)
          .reduce((s: number, b: any) => s + (b.current_balance || 0), 0) ?? 0
        return `  - ${c.institution_name}: ${fmt(bal)} (${c.category})`
      }).join('\n')
    : '  - None connected'

  const assetLines = assets?.length
    ? assets.map((a: any) => `  - ${a.name}: ${fmt(a.value || 0)} (${a.category})`).join('\n')
    : '  - None recorded'

  const gapLines = recommendations.length
    ? recommendations.map(r => `  ⚠ [${r.severity.toUpperCase()}] ${r.title}`).join('\n')
    : '  ✓ No major gaps detected'

  return `
━━━ CLIENT ESTATE PROFILE ━━━

NAME: ${profile?.full_name || 'Unknown'}
STATE: ${profile?.state || 'Unknown'}
MARITAL STATUS: ${profile?.marital_status || 'Unknown'}${profile?.spouse_name ? `\nSPOUSE: ${profile.spouse_name}` : ''}
CHILDREN: ${profile?.num_children || 0}
GOALS: ${profile?.goals || 'Not specified'}

TOTAL ESTATE: ${fmt(totalEstate)}
${assetLines}
${accountLines}

ESTATE PLAN STATUS:
  Will:                ${hasCheck('will')       ? '✓ Yes' : '✗ MISSING'}
  Trust:               ${hasCheck('trust')      ? '✓ Yes' : '✗ MISSING'}
  Power of Attorney:   ${hasCheck('poa')        ? '✓ Yes' : '✗ MISSING'}
  Healthcare Directive:${hasCheck('healthcare') ? '✓ Yes' : '✗ MISSING'}

BENEFICIARIES (${beneficiaries?.length || 0}):
${beneficiaries?.length ? beneficiaries.map((b: any) => `  - ${b.full_name} (${b.relationship || 'Unknown'})`).join('\n') : '  - NONE NAMED'}

FAMILY MEMBERS (${familyMembers?.length || 0}):
${familyMembers?.length ? familyMembers.map((f: any) => `  - ${f.name} (${f.relationship})`).join('\n') : '  - None added'}

DIGITAL ASSETS (${digitalAssets?.length || 0}):
${digitalAssets?.length ? digitalAssets.map((d: any) => `  - ${d.platform} (${d.type}): ${fmt(d.estimated_value || 0)}`).join('\n') : '  - None recorded'}

BUSINESS ENTITIES (${entities?.length || 0}):
${entities?.length ? entities.map((e: any) => `  - ${e.name} (${e.type || 'Unknown type'})`).join('\n') : '  - None recorded'}

PRIORITY GAPS:
${gapLines}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
}
