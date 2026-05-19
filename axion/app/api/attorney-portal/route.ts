import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const SITE_URL = 'https://axion-app-nine.vercel.app'

const DOC_TYPE_LABELS: Record<string, string> = {
  will: 'Last Will & Testament',
  healthcare_directive: 'Healthcare Directive',
  poa_financial: 'Power of Attorney (Financial)',
  healthcare_proxy: 'Healthcare Proxy',
  living_trust: 'Revocable Living Trust',
  advance_directive: 'Advance Directive (DNR)',
}

function getAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const admin = getAdmin()
    if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const { data: document, error } = await admin
      .from('legal_documents')
      .select('*')
      .eq('submission_token', token)
      .single()

    if (error || !document) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, state')
      .eq('id', document.user_id)
      .single()

    // Fetch grantor email via admin auth API
    let grantorEmail: string | null = null
    try {
      const { data: userData } = await admin.auth.admin.getUserById(document.user_id)
      grantorEmail = userData?.user?.email ?? null
    } catch {}

    // Strip ai_review from response — attorney should review independently
    const { ai_review, ...documentForAttorney } = document as any
    void ai_review

    return NextResponse.json({
      document: documentForAttorney,
      grantor: {
        name: profile?.full_name || 'Client',
        state: profile?.state || null,
        email: grantorEmail,
      },
    })
  } catch (e: any) {
    console.error('Attorney portal GET error:', e.message)
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, action, content, notes } = body

    if (!token || !action) return NextResponse.json({ error: 'Missing token or action' }, { status: 400 })

    const admin = getAdmin()
    if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const { data: doc, error: docErr } = await admin
      .from('legal_documents')
      .select('*')
      .eq('submission_token', token)
      .single()

    if (docErr || !doc) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })

    const nowIso = new Date().toISOString()

    if (action === 'save') {
      const { error } = await admin
        .from('legal_documents')
        .update({ content: content ?? doc.content, updated_at: nowIso })
        .eq('id', doc.id)
      if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'approve' || action === 'reject') {
      // Look up grantor info
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', doc.user_id)
        .single()

      let grantorEmail: string | null = null
      try {
        const { data: userData } = await admin.auth.admin.getUserById(doc.user_id)
        grantorEmail = userData?.user?.email ?? null
      } catch {}

      const grantorName = profile?.full_name || 'there'
      const docTitle = doc.title || DOC_TYPE_LABELS[doc.type] || 'your document'
      const attorneyName = doc.submitted_to_name || 'Your attorney'

      if (action === 'approve') {
        const updates: any = {
          status: 'attorney_approved',
          attorney_notes: notes ?? null,
          attorney_approved_at: nowIso,
          updated_at: nowIso,
        }
        if (typeof content === 'string') updates.content = content
        const { error } = await admin.from('legal_documents').update(updates).eq('id', doc.id)
        if (error) return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })

        await sendGrantorEmail({
          to: grantorEmail,
          grantorName,
          docTitle,
          attorneyName,
          approved: true,
          notes: notes ?? null,
          docId: doc.id,
        })

        return NextResponse.json({ success: true })
      }

      // reject: keep status as 'submitted' but record notes
      const { error } = await admin
        .from('legal_documents')
        .update({ attorney_notes: notes ?? null, updated_at: nowIso })
        .eq('id', doc.id)
      if (error) return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 })

      await sendGrantorEmail({
        to: grantorEmail,
        grantorName,
        docTitle,
        attorneyName,
        approved: false,
        notes: notes ?? null,
        docId: doc.id,
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('Attorney portal POST error:', e.message)
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}

async function sendGrantorEmail(params: {
  to: string | null
  grantorName: string
  docTitle: string
  attorneyName: string
  approved: boolean
  notes: string | null
  docId: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !params.to) return
  try {
    const resend = new Resend(apiKey)
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Axion Estate <onboarding@resend.dev>'
    const firstName = params.grantorName.split(' ')[0] || 'there'
    const docUrl = `${SITE_URL}/draft/${params.docId}`

    const headline = params.approved
      ? 'Your attorney approved your document'
      : 'Your attorney has requested changes'
    const icon = params.approved ? '✅' : '📝'
    const accent = params.approved ? '#00cc66' : '#ffaa00'
    const subject = params.approved
      ? `${params.attorneyName} approved your ${params.docTitle}`
      : `${params.attorneyName} has requested changes to your ${params.docTitle}`

    const notesBlock = params.notes
      ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.02);border:1px solid rgba(0,100,255,0.12);border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:18px 24px;">
            <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:0.08em;">Attorney notes</p>
            <p style="margin:0;font-size:13px;color:#9aa3c8;line-height:1.7;white-space:pre-wrap;">${escapeHtml(params.notes)}</p>
          </td>
        </tr>
      </table>`
      : ''

    await resend.emails.send({
      from: fromAddress,
      to: params.to,
      subject,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#03040d;font-family:'Inter',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#03040d;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="padding:0 0 32px 0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;height:36px;background:linear-gradient(135deg,#0055ff,#00aaff);border-radius:8px;text-align:center;vertical-align:middle;">
                  <span style="color:#fff;font-size:18px;font-weight:800;line-height:36px;">A</span>
                </td>
                <td style="padding-left:10px;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.06em;vertical-align:middle;">AXION</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:rgba(8,14,40,0.95);border:1px solid rgba(0,100,255,0.3);border-radius:20px;padding:40px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <div style="width:72px;height:72px;background:rgba(0,100,255,0.12);border:1px solid ${accent}55;border-radius:50%;text-align:center;line-height:72px;font-size:32px;margin:0 auto;">${icon}</div>
                </td>
              </tr>
            </table>
            <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:800;color:#ffffff;text-align:center;letter-spacing:-0.02em;">${headline}</h1>
            <p style="margin:0 0 28px 0;font-size:15px;color:#9aa3c8;text-align:center;line-height:1.7;">
              Hi ${firstName},
            </p>
            <p style="margin:0 0 28px 0;font-size:15px;color:#9aa3c8;text-align:center;line-height:1.7;">
              <strong style="color:#ffffff;">${escapeHtml(params.attorneyName)}</strong> has finished reviewing <strong style="color:#ffffff;">${escapeHtml(params.docTitle)}</strong>${params.approved ? ' and approved it for next steps.' : ' and requested some changes before it can move forward.'}
            </p>
            ${notesBlock}
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
              <tr>
                <td align="center">
                  <a href="${docUrl}" style="display:inline-block;background:linear-gradient(135deg,#0055ff,#00aaff);color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;letter-spacing:0.02em;">
                    Open Document →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 0 0 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#3d4a7a;line-height:1.8;">
              Axion Estate Platform · Secure Estate Management<br>
              <a href="${SITE_URL}" style="color:#0055ff;text-decoration:none;">${SITE_URL}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
    })
  } catch (e: any) {
    console.error('Grantor email send failed:', e?.message)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
