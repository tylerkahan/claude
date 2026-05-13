import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { rateLimit } from '@/lib/rateLimit'
import { logAudit } from '@/lib/audit'

const SITE_URL = 'https://axion-app-nine.vercel.app'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(user.id, 3, 60_000)
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

    const { attorney_name, attorney_email, attorney_firm, grantor_name } = await req.json()
    if (!attorney_email) return NextResponse.json({ error: 'No attorney email provided' }, { status: 400 })

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ success: true, skipped: true })

    const resend = new Resend(apiKey)
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Axion Estate <onboarding@resend.dev>'
    const displayName = grantor_name || 'A client'
    const firstName = attorney_name?.split(' ')[0] || 'Counselor'
    const firmLine = attorney_firm ? `<br><span style="color:#6b7ab8;">${attorney_firm}</span>` : ''

    await resend.emails.send({
      from: fromAddress,
      to: attorney_email,
      subject: `You've been designated as estate transfer contact — ${displayName}`,
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
          <td style="background:rgba(8,14,40,0.95);border:1px solid rgba(102,68,255,0.3);border-radius:20px;padding:40px 36px;">

            <!-- Icon -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <div style="width:72px;height:72px;background:rgba(102,68,255,0.12);border:1px solid rgba(102,68,255,0.35);border-radius:50%;text-align:center;line-height:72px;font-size:32px;margin:0 auto;">⚖️</div>
                </td>
              </tr>
            </table>

            <!-- Heading -->
            <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:800;color:#ffffff;text-align:center;letter-spacing:-0.02em;">
              You've been designated as an<br>estate transfer contact
            </h1>
            <p style="margin:0 0 28px 0;font-size:15px;color:#9aa3c8;text-align:center;line-height:1.7;">
              Dear ${firstName},${firmLine}
            </p>
            <p style="margin:0 0 28px 0;font-size:15px;color:#9aa3c8;text-align:center;line-height:1.7;">
              <strong style="color:#ffffff;">${displayName}</strong> has designated you as their estate transfer contact on Axion — a secure estate management platform. You are now listed as the attorney of record responsible for facilitating the transfer of their estate to named beneficiaries upon their passing.
            </p>

            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(102,68,255,0.07);border:1px solid rgba(102,68,255,0.2);border-radius:12px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;color:#8866ff;text-transform:uppercase;letter-spacing:0.08em;">Your role</p>
                  <ul style="margin:0;padding-left:18px;color:#9aa3c8;font-size:14px;line-height:1.9;">
                    <li>You are the designated estate transfer attorney for <strong style="color:#fff;">${displayName}</strong></li>
                    <li>Upon their passing, beneficiaries may contact you through the Axion platform to request access</li>
                    <li>You will receive a formal access request from each named beneficiary via email</li>
                    <li>No action is required from you at this time</li>
                  </ul>
                </td>
              </tr>
            </table>

            <!-- What is Axion -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.02);border:1px solid rgba(0,100,255,0.12);border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:18px 24px;">
                  <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#6b7ab8;text-transform:uppercase;letter-spacing:0.08em;">About Axion</p>
                  <p style="margin:0;font-size:13px;color:#9aa3c8;line-height:1.7;">
                    Axion is a secure estate management platform that helps individuals organize their wills, trusts, beneficiaries, digital assets, and legal documents in one place. The platform enables a structured transfer process when an estate needs to be settled.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:12px;color:#4a5578;text-align:center;line-height:1.7;">
              If you believe you received this in error or have questions, please disregard this email.<br>
              This is an automated notification — no reply is needed at this time.
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

    await logAudit(supabase, user.id, 'attorney_designated', attorney_email)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Attorney notify error:', e.message)
    return NextResponse.json({ success: true, warning: e.message })
  }
}
