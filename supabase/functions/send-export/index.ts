// Sends an export (PDF/Excel made in the app) to the club inbox as an attachment.
// Only admins (coaches) and superadmins may call it.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Same sender as the training report. onboarding@resend.dev can only deliver
// to the Resend account owner, so exports go to the club inbox.
const RECIPIENT = 'strelskiklubvsk@gmail.com'
const FROM = 'VSK Izvoz <onboarding@resend.dev>'
const MAX_BASE64_LENGTH = 14_000_000 // ~10 MB file

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)

  try {
    // Who is calling? Must be a logged-in admin or superadmin.
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!jwt) return json({ ok: false, error: 'Not logged in' }, 401)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !userData?.user) return json({ ok: false, error: 'Not logged in' }, 401)
    const { data: member } = await supabase
      .from('members')
      .select('role, ime, priimek, email')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (!member || (member.role !== 'admin' && member.role !== 'superadmin')) {
      return json({ ok: false, error: 'Only coaches can send exports' }, 403)
    }

    const { filename, content, subject, lines } = await req.json()
    if (!filename || !content) return json({ ok: false, error: 'Missing file' }, 400)
    if (String(content).length > MAX_BASE64_LENGTH) return json({ ok: false, error: 'File too large' }, 413)
    const safeName = String(filename).replace(/[^\w.\-]+/g, '_').slice(0, 120)
    if (!/\.(pdf|xlsx)$/i.test(safeName)) return json({ ok: false, error: 'Only PDF or Excel files' }, 400)

    const sender = `${member.ime || ''} ${member.priimek || ''}`.trim() || member.email || userData.user.email
    const metaHtml = (Array.isArray(lines) ? lines : [])
      .slice(0, 10)
      .map((l: unknown) => `<div style="font-size:13px;color:#374151;margin-top:2px;">${escapeHtml(String(l))}</div>`)
      .join('')
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;">
        <h2 style="margin:0 0 8px;color:#111;">${escapeHtml(String(subject || 'VSK izvoz'))}</h2>
        ${metaHtml}
        <p style="font-size:13px;color:#374151;margin-top:14px;">Izvoz je v priponki (<b>${escapeHtml(safeName)}</b>).</p>
        <p style="font-size:12px;color:#6b7280;margin-top:14px;">Poslal: ${escapeHtml(String(sender))} · VSK Planner</p>
      </div>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [RECIPIENT],
        subject: String(subject || 'VSK izvoz').slice(0, 200),
        html,
        attachments: [{ filename: safeName, content: String(content) }],
      }),
    })
    const resendData = await resendRes.json()
    if (!resendRes.ok) return json({ ok: false, error: resendData?.message || 'Email failed' }, 502)
    return json({ ok: true, id: resendData?.id })
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500)
  }
})
