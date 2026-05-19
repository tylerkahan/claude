import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { rateLimit } from '@/lib/rateLimit'
import { logAudit } from '@/lib/audit'

const SITE_URL = 'https://axion-app-nine.vercel.app'

const DOC_TYPE_LABELS: Record<string, string> = {
  will: 'Last Will & Testament',
  healthcare_directive: 'Healthcare Directive',
  poa_financial: 'Power of Attorney (Financial)',
  healthcare_proxy: 'Healthcare Proxy',
  living_trust: 'Revocable Living Trust',
  advance_directive: 'Advance Directive (DNR)',
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`submit-doc:${user.id}`, 5, 60_000)
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

    const { docId, target } = await req.json()
    if (!docId || !target) return NextResponse.json({ error: 'Missing docId or target' }, { status: 400 })

    if (target === 'axion_attorney') {
      return NextResponse.json(
        { error: 'Axion AI Attorney is a Pro feature. Coming soon.', paywall: true },
        { status: 402 }
      )
    }

    if (target !== 'user_attorney') {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
    }

    // Fetch attorney info from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('attorney_name, attorney_email, attorney_firm, full_name')
      .eq('id', user.id)
      .single()

    if (!profile?.attorney_email) {
      return NextResponse.json(
        { error: 'No attorney designated. Please add one on the Attorney Connect page.' },
        { status: 400 }
      )
    }

    const attorney_name: string = profile.attorney_name || 'Counselor'
    const attorney_email: string = profile.attorney_email
    const attorney_firm: string | null = profile.attorney_firm || null
    const grantor_name: string = profile.full_name || user.email || 'A client'

    // Fetch document
    const { data: doc, error: docErr } = await supabase
      .from('legal_documents')
      .select('id, user_id, type, title')
      .eq('id', docId)
      .eq('user_id', user.id)
      .single()

    if (docErr || !doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const docTypeLabel = DOC_TYPE_LABELS[doc.type] ?? 'legal document'
    const docTitle = doc.title || docTypeLabel

    // Generate secure token (two UUIDs concatenated)
    const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`

    const { error: updateErr } = await supabase
      .from('legal_documents')
      .update({
        status: 'submitted',
        submission_token: token,
        submission_target: 'user_attorney',
        submitted_to_email: attorney_email,
        submitted_to_name: attorney_name,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId)
      .eq('user_id', user.id)

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    }

    // Send email (graceful skip if Resend not configured)
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      try {
        const resend = new Resend(apiKey)
        const fromAddress = process.env.RESEND_FROM_EMAIL || 'Axion Estate <onboarding@resend.dev>'
        const firstName = attorney_name.split(' ')[0] || 'Counselor'
        const firmLine = attorney_firm ? `<br><span style="color:#6b7ab8;">${attorney_firm}</span>` : ''
        const reviewUrl = `${SITE_URL}/attorney-portal/${token}`

        await resend.emails.send({
          from: fromAddress,
          to: attorney_email,
          subject: `Review request from ${grantor_name} — ${docTitle}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#03040d;font-family:'Inter',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#03040d;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
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

        <!-- Hero card -->
        <tr>
          <td style="background:rgba(8,14,40,0.95);border:1px solid rgba(0,100,255,0.3);border-radius:20px;padding:40px 36px;">

            <!-- Icon -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <div style="width:72px;height:72px;background:rgba(0,100,255,0.12);border:1px solid rgba(0,100,255,0.35);border-radius:50%;text-align:center;line-height:72px;font-size:32px;margin:0 auto;">📋</div>
                </td>
              </tr>
            </table>

            <!-- Heading -->
            <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:800;color:#ffffff;text-align:center;letter-spacing:-0.02em;">
              Document review request
            </h1>
            <p style="margin:0 0 28px 0;font-size:15px;color:#9aa3c8;text-align:center;line-height:1.7;">
              Dear ${firstName},${firmLine}
            </p>
            <p style="margin:0 0 28px 0;font-size:15px;color:#9aa3c8;text-align:center;line-height:1.7;">
              <strong style="color:#ffffff;">${grantor_name}</strong> has requested your review of a legal document drafted on Axion.
            </p>
            <p style="margin:0 0 28px 0;font-size:14px;color:#9aa3c8;text-align:center;line-height:1.7;font-style:italic;">
              "I'm using Axion to draft my ${docTypeLabel} and have requested your review."
            </p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#0055ff,#00aaff);color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;letter-spacing:0.02em;">
                    Review Document →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,100,255,0.07);border:1px solid rgba(0,100,255,0.2);border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:18px 24px;">
                  <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#00aaff;text-transform:uppercase;letter-spacing:0.08em;">Secure access</p>
                  <p style="margin:0;font-size:13px;color:#9aa3c8;line-height:1.7;">
                    This is a secure link. The document will only be accessible through Axion's attorney portal.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:12px;color:#4a5578;text-align:center;line-height:1.7;">
              If you weren't expecting this request, you may safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
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
      } catch (emailErr: any) {
        console.error('Submit email send failed:', emailErr?.message)
      }
    }

    await logAudit(supabase, user.id, 'document_submitted', attorney_email, { docId, target })

    return NextResponse.json({ success: true, attorney_name, attorney_email })
  } catch (e: any) {
    console.error('Submit document error:', e.message)
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
