import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const SITE_URL = 'https://axion-app-nine.vercel.app'

export async function POST(req: NextRequest) {
  try {
    const { beneficiary_id, email, grantor_name } = await req.json()
    if (!email || !beneficiary_id) return NextResponse.json({ error: 'Missing email or beneficiary_id' }, { status: 400 })

    // Verify the caller is authenticated
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify this beneficiary belongs to the caller
    const { data: ben } = await supabase
      .from('beneficiaries')
      .select('id, full_name, role, relationship')
      .eq('id', beneficiary_id)
      .eq('user_id', user.id)
      .single()
    if (!ben) return NextResponse.json({ error: 'Beneficiary not found' }, { status: 404 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      await supabase.from('beneficiaries').update({ invite_status: 'invited', invite_sent_at: new Date().toISOString() }).eq('id', beneficiary_id)
      return NextResponse.json({ success: true, fallback: true })
    }

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    // Generate invite link (does NOT send an email — we send our own)
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${SITE_URL}/beneficiary`,
        data: {
          beneficiary_id,
          grantor_user_id: user.id,
          grantor_name: grantor_name || 'Your contact',
          role: 'beneficiary',
        },
      },
    })

    if (linkError && !linkError.message?.includes('already been registered')) {
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }

    const inviteLink = (linkData as any)?.properties?.action_link || `${SITE_URL}/beneficiary`
    const displayGrantor = grantor_name || 'Someone'
    const firstName = ben.full_name?.split(' ')[0] || 'there'
    const roleLabel = ben.role || 'Beneficiary'

    // Send branded email via Resend
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      const resend = new Resend(apiKey)
      const fromAddress = process.env.RESEND_FROM_EMAIL || 'Axion Estate <onboarding@resend.dev>'

      await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: `${displayGrantor} has named you in their estate plan`,
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
          <td style="background:rgba(8,14,40,0.95);border:1px solid rgba(0,100,255,0.25);border-radius:20px;padding:40px 36px;">

            <!-- Icon -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <div style="width:72px;height:72px;background:linear-gradient(135deg,rgba(0,85,255,0.2),rgba(0,170,255,0.15));border:1px solid rgba(0,100,255,0.35);border-radius:50%;text-align:center;line-height:72px;font-size:32px;margin:0 auto;">🔐</div>
                </td>
              </tr>
            </table>

            <!-- Heading -->
            <h1 style="margin:0 0 12px 0;font-size:26px;font-weight:800;color:#ffffff;text-align:center;letter-spacing:-0.02em;">
              You've been named in an estate plan
            </h1>
            <p style="margin:0 0 28px 0;font-size:15px;color:#9aa3c8;text-align:center;line-height:1.7;">
              Hi ${firstName}, <strong style="color:#ffffff;">${displayGrantor}</strong> has added you as a <strong style="color:#ffffff;">${roleLabel}</strong> in their estate plan on Axion — a secure platform for managing and transferring estates.
            </p>

            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,85,255,0.07);border:1px solid rgba(0,100,255,0.2);border-radius:12px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#6b7ab8;text-transform:uppercase;letter-spacing:0.08em;">What this means</p>
                  <ul style="margin:8px 0 0 0;padding-left:18px;color:#9aa3c8;font-size:14px;line-height:1.9;">
                    <li>You have been designated as a <strong style="color:#fff;">${roleLabel}</strong> by ${displayGrantor}</li>
                    <li>Your secure beneficiary portal is ready to activate</li>
                    <li>No financial details are visible until the estate is transferred</li>
                    <li>You'll be contacted by the estate attorney when access is granted</li>
                  </ul>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${inviteLink}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0055ff,#00aaff);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.02em;">
                    Activate Your Beneficiary Portal →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:12px;color:#4a5578;text-align:center;line-height:1.7;">
              This link expires in 24 hours. If you weren't expecting this email, you can safely ignore it.
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
    }

    // Mark as invited
    await supabase.from('beneficiaries').update({
      invite_status: 'invited',
      invite_sent_at: new Date().toISOString(),
    }).eq('id', beneficiary_id)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
