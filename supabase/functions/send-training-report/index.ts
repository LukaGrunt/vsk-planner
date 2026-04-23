import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RECIPIENT = 'strelskiklubvsk@gmail.com'
const FROM = 'VSK Trening Poročilo <onboarding@resend.dev>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    training: 'Trening',
    competition: 'Tekma',
    news: 'Novica',
    event: 'Dogodek',
  }
  return map[type] || type || 'Trening'
}

interface Weapon {
  vrsta_orozja?: string
  model_orozja?: string
  kaliber?: string
  serijska_stevilka?: string
}

interface License {
  vrsta?: string
  stevilo?: string
}

interface MemberProfile {
  name: string
  mors: string
  orozneListine: License[]
  weapons: Weapon[]
}

function renderMemberCard(profile: MemberProfile, badge?: string, absent?: boolean): string {
  const badgeHtml = badge
    ? `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${badge === 'VODJA' ? '#c1372a' : absent ? '#6b7280' : '#059669'};color:#fff;margin-left:8px;">${badge}</span>`
    : absent
    ? `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#6b7280;color:#fff;margin-left:8px;">ODSOTEN</span>`
    : `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#059669;color:#fff;margin-left:8px;">PRISOTEN</span>`

  const licensesHtml = profile.orozneListine.length > 0
    ? `<div style="margin-top:6px;">
        <span style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Orožne listine</span>
        ${profile.orozneListine.map(l => `<div style="font-size:13px;color:#374151;margin-top:2px;">• ${l.vrsta || ''}${l.stevilo ? ` — ${l.stevilo}` : ''}</div>`).join('')}
      </div>`
    : ''

  const weaponsHtml = profile.weapons.length > 0
    ? `<div style="margin-top:6px;">
        <span style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Orožje</span>
        ${profile.weapons.map(w => {
          const details = [w.kaliber, w.serijska_stevilka].filter(Boolean).join(', ')
          return `<div style="font-size:13px;color:#374151;margin-top:2px;">• ${w.vrsta_orozja || ''}${w.model_orozja ? ` — ${w.model_orozja}` : ''}${details ? `<span style="color:#9ca3af"> (${details})</span>` : ''}</div>`
        }).join('')}
      </div>`
    : ''

  const noData = !licensesHtml && !weaponsHtml
    ? `<div style="font-size:12px;color:#9ca3af;margin-top:4px;">Ni podatkov o orožju</div>`
    : ''

  return `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
        <span style="font-size:15px;font-weight:700;color:#111827;">${profile.name}</span>
        ${badgeHtml}
        ${profile.mors ? `<span style="font-size:12px;color:#9ca3af;margin-left:6px;">MORS: ${profile.mors}</span>` : ''}
      </div>
      ${licensesHtml}
      ${weaponsHtml}
      ${noData}
    </div>`
}

function buildEmailHtml(data: {
  title: string
  date: string
  time: string
  location: string
  type: string
  trainerName: string
  trainerProfile: MemberProfile
  attendees: Array<{ email: string; name: string; present: boolean; profile: MemberProfile }>
  notes: string
}): string {
  const { title, date, time, location, type, trainerName, trainerProfile, attendees, notes } = data

  const presentCount = attendees.filter(a => a.present).length
  const totalCount = attendees.length

  const attendeesHtml = attendees.map(a =>
    renderMemberCard(a.profile, undefined, !a.present)
  ).join('')

  const notesHtml = notes
    ? `<div style="margin-top:28px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;margin-bottom:10px;">Opombe trenerja</div>
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:14px 16px;font-size:14px;color:#374151;line-height:1.6;">${notes}</div>
      </div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#c1372a 0%,#991b1b 100%);border-radius:14px 14px 0 0;padding:24px 28px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.7);margin-bottom:4px;">VSK Strelski klub</div>
      <div style="font-size:22px;font-weight:800;color:#fff;">${title}</div>
      <div style="margin-top:8px;">
        <span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">${typeLabel(type)}</span>
      </div>
    </div>

    <!-- Info bar -->
    <div style="background:#fff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          ${date ? `<td style="padding:14px 20px;vertical-align:top;"><span style="font-size:11px;color:#9ca3af;display:block;margin-bottom:2px;">Datum</span><span style="font-size:14px;font-weight:600;color:#111827;">${formatDate(date)}</span></td>` : ''}
          ${time ? `<td style="padding:14px 20px;vertical-align:top;"><span style="font-size:11px;color:#9ca3af;display:block;margin-bottom:2px;">Čas</span><span style="font-size:14px;font-weight:600;color:#111827;">${time}</span></td>` : ''}
          ${location ? `<td style="padding:14px 20px;vertical-align:top;"><span style="font-size:11px;color:#9ca3af;display:block;margin-bottom:2px;">Lokacija</span><span style="font-size:14px;font-weight:600;color:#111827;">${location}</span></td>` : ''}
          <td style="padding:14px 20px;vertical-align:top;"><span style="font-size:11px;color:#9ca3af;display:block;margin-bottom:2px;">Prisotnost</span><span style="font-size:14px;font-weight:600;color:#059669;">${presentCount} / ${totalCount}</span></td>
        </tr>
      </table>
    </div>

    <!-- Body -->
    <div style="background:#fff;border-radius:0 0 14px 14px;padding:24px 28px;border:1px solid #e5e7eb;border-top:none;">

      <!-- Trainer -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;margin-bottom:10px;">Vodja / Trener</div>
      ${renderMemberCard(trainerProfile, 'VODJA')}

      <!-- Participants -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;margin:24px 0 10px;">Udeleženci</div>
      ${attendeesHtml || '<div style="font-size:13px;color:#9ca3af;">Ni prijavljenih udeležencev.</div>'}

      ${notesHtml}

    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px;font-size:11px;color:#9ca3af;">
      Poročilo generirano ${new Date().toLocaleString('sl-SI', { timeZone: 'Europe/Ljubljana' })} · VSK Planner
    </div>

  </div>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { title, date, time, location, type, trainerEmail, trainerName, attendees, notes } = body

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    async function getMemberProfile(email: string): Promise<MemberProfile> {
      const [{ data: member }, { data: app }] = await Promise.all([
        supabase.from('members').select('ime, priimek, mors_stevilo, orozne_listine').eq('email', email).maybeSingle(),
        supabase.from('membership_applications').select('weapons').eq('email', email).maybeSingle(),
      ])
      const name = member
        ? `${member.ime || ''} ${member.priimek || ''}`.trim() || email
        : email
      return {
        name,
        mors: member?.mors_stevilo || '',
        orozneListine: Array.isArray(member?.orozne_listine)
          ? member.orozne_listine.filter((l: License) => l.vrsta || l.stevilo)
          : [],
        weapons: Array.isArray(app?.weapons) ? app.weapons : [],
      }
    }

    const trainerProfile = await getMemberProfile(trainerEmail)

    const attendeeProfiles = await Promise.all(
      (attendees || []).map(async (a: { email: string; name: string; present: boolean }) => ({
        ...a,
        profile: await getMemberProfile(a.email),
      }))
    )

    const html = buildEmailHtml({
      title,
      date,
      time,
      location,
      type,
      trainerName: trainerName || trainerEmail,
      trainerProfile,
      attendees: attendeeProfiles,
      notes,
    })

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [RECIPIENT],
        subject: `Poročilo treninga: ${title} — ${formatDate(date)}`,
        html,
      }),
    })

    const resendData = await resendRes.json()

    return new Response(JSON.stringify({ ok: resendRes.ok, resend: resendData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: resendRes.ok ? 200 : 500,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
