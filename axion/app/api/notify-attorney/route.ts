import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { attorney_name, attorney_email, attorney_firm, grantor_name } = await req.json()
    if (!attorney_email) return NextResponse.json({ error: 'No attorney email provided' }, { status: 400 })

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      // No Resend key configured — skip silently
      return NextResponse.json({ success: true, skipped: true })
    }

    const resend = new Resend(apiKey)
    const displayName = grantor_name || 'A client'
    const firmLine = attorney_firm ? ` at ${attorney_firm}` : ''

    await resend.emails.send({
      from: 'Axion Estate Platform <onboarding@resend.dev>',
      to: attorney_email,
      subject: `You've been designated as estate transfer contact for ${displayName}`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#03040d;color:#e8eaf6;padding:40px 32px;border-radius:16px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#0055ff,#00aaff);border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:16px;font-weight:800;">A</span>
            </div>
            <span style="font-size:20px;font-weight:800;color:#fff;letter-spacing:.06em;">AXION</span>
          </div>

          <h1 style="font-size:22px;font-weight:700;color:#fff;margin-bottom:10px;">
            You've been designated as an estate transfer contact
          </h1>
          <p style="font-size:15px;color:#9aa3c8;line-height:1.7;margin-bottom:24px;">
            Hello${attorney_name ? ` ${attorney_name}` : ''}${firmLine},
          </p>
          <p style="font-size:15px;color:#9aa3c8;line-height:1.7;margin-bottom:24px;">
            <strong style="color:#fff;">${displayName}</strong> has designated you as their estate transfer contact on the Axion Estate Platform. This means that upon their passing, their named beneficiaries may contact you to initiate the transfer of their estate documents and digital assets.
          </p>

          <div style="background:rgba(0,85,255,0.08);border:1px solid rgba(0,100,255,0.25);border-radius:12px;padding:20px 24px;margin-bottom:28px;">
            <div style="font-size:12px;font-weight:700;color:#6b7ab8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;">What this means</div>
            <ul style="margin:0;padding:0 0 0 18px;color:#9aa3c8;font-size:14px;line-height:1.8;">
              <li>You are listed as the point of contact for estate access after ${displayName}'s passing.</li>
              <li>Beneficiaries will reach out to you directly when they request access to the estate.</li>
              <li>No action is required from you at this time.</li>
            </ul>
          </div>

          <p style="font-size:13px;color:#6b7ab8;line-height:1.7;">
            If you believe you received this message in error, or have questions about Axion Estate Platform, please disregard this email or contact support.
          </p>

          <div style="border-top:1px solid rgba(0,100,255,0.12);margin-top:32px;padding-top:20px;font-size:12px;color:#3d4a7a;">
            Axion Estate Platform · Secure Estate Management · <a href="https://axion-app-nine.vercel.app" style="color:#0077cc;">axion-app-nine.vercel.app</a>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    // Non-fatal — email send failure shouldn't block the save
    console.error('Attorney notify error:', e.message)
    return NextResponse.json({ success: true, warning: e.message })
  }
}
