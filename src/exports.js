// ============================================
// EXPORTS: members, single training, period report
// PDF (pdfmake, Roboto supports č/š/ž) and Excel (write-excel-file).
// Both libraries are loaded on demand so the main app bundle stays small.
// ============================================

const lower = (s) => String(s || '').trim().toLowerCase();

export const formatSiDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).slice(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : String(dateStr);
};

const formatSiDateTime = (value) => {
  if (!value) return '';
  const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ROLE_LABELS = { user: 'Član', admin: 'Trener', superadmin: 'Super admin' };

const fullName = (m) => `${m?.ime || ''} ${m?.priimek || ''}`.trim();

const licensesText = (list) => (Array.isArray(list) ? list : [])
  .filter(l => l && (l.vrsta || l.stevilo))
  .map(l => [l.vrsta, l.stevilo].filter(Boolean).join(': '))
  .join('\n');

const weaponsText = (list) => (Array.isArray(list) ? list : [])
  .filter(w => w && (w.vrsta_orozja || w.model_orozja || w.kaliber || w.serijska_stevilka))
  .map(w => [w.vrsta_orozja, w.model_orozja, w.kaliber, w.serijska_stevilka ? `št. ${w.serijska_stevilka}` : ''].filter(Boolean).join(', '))
  .join('\n');

// --------------------------------------------
// Field catalog (what an admin can tick in the export box).
// get(member, ctx) receives the member row (UI shape) and shared context.
// --------------------------------------------
export const MEMBER_FIELDS = [
  { key: 'ime', label: 'Ime in priimek', width: 24, default: true, get: (m) => fullName(m) || m?.email || '' },
  { key: 'email', label: 'Email', width: 28, get: (m) => m?.email || '' },
  { key: 'telefon', label: 'Telefon', width: 15, get: (m) => m?.telefon || '' },
  { key: 'mors', label: 'MORS št.', width: 12, default: true, get: (m) => m?.morsStevilo || m?.mors_stevilo || '' },
  { key: 'majica', label: 'Velikost majice', width: 10, get: (m) => m?.konfekcijska_stevilka || '' },
  { key: 'clanarina', label: 'Članarina', width: 12, get: (m) => (m ? (m.membershipPaid ? 'Plačano' : 'Ni plačano') : '') },
  { key: 'vloga', label: 'Vloga', width: 11, get: (m) => (m ? ROLE_LABELS[m.role || 'user'] || m.role : '') },
  { key: 'zadnja', label: 'Zadnja prijava', width: 17, get: (m) => formatSiDateTime(m?.lastLoginAt) },
  { key: 'listine', label: 'Orožne listine', width: 26, get: (m) => licensesText(m?.orozneListine) },
  { key: 'orozje', label: 'Orožje', width: 36, get: (m, ctx) => weaponsText(ctx?.weaponsByEmail?.[lower(m?.email)]) }
];

export const fieldsNeedWeapons = (fieldKeys) => fieldKeys.includes('orozje');

// Loads weapons from membership applications (if this account is allowed to read them).
export const loadWeaponsByEmail = async (supabase) => {
  try {
    const { data, error } = await supabase.from('membership_applications').select('email, weapons');
    if (error || !Array.isArray(data)) return {};
    const map = {};
    data.forEach(a => { if (a?.email && Array.isArray(a.weapons)) map[lower(a.email)] = a.weapons; });
    return map;
  } catch (e) {
    return {};
  }
};

const pickFields = (keys) => MEMBER_FIELDS.filter(f => keys.includes(f.key));

const leaderName = (tr) => tr.trener || (tr.attendance || []).find(a => a.role === 'vodja')?.name || '';
const statusLabel = (p) => (p.role === 'vodja' ? (p.present ? 'Vodja' : 'Vodja (odsoten)') : p.present ? 'Prisoten' : 'Odsoten');
// Leader first, then alphabetical
const byLeaderThenName = (a, b) => (b.role === 'vodja') - (a.role === 'vodja') || String(a.name || '').localeCompare(String(b.name || ''), 'sl');

const findMember = (members, person) => {
  const email = lower(person?.email);
  return (members || []).find(m => (email && lower(m.email) === email) || (person?.userId && m.user_id === person.userId)) || null;
};

const inPeriod = (dateStr, from, to) => {
  const d = String(dateStr || '').slice(0, 10);
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
};

const completedTrainingsIn = (posts, from, to) => (posts || [])
  .filter(p => (p.type === 'training' || p.type === 'competition') && p.completed && Array.isArray(p.attendance) && inPeriod(p.date, from, to))
  .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time || '').localeCompare(String(b.time || '')));

const periodLabel = (from, to) => {
  if (from && to) return `${formatSiDate(from)} – ${formatSiDate(to)}`;
  if (from) return `od ${formatSiDate(from)}`;
  if (to) return `do ${formatSiDate(to)}`;
  return 'vse obdobje';
};

// --------------------------------------------
// Report builders → { title, meta: [string], columns: [{label,width}], rows: [[string]], filenameBase }
// --------------------------------------------

export const buildMembersReport = ({ members, posts, fieldKeys, scope, period, ctx, filterLabel }) => {
  const fields = pickFields(fieldKeys);
  const withAttendance = fieldKeys.includes('prisotnost');
  let list = [...(members || [])];
  if (scope === 'paid') list = list.filter(m => m.membershipPaid);
  if (scope === 'unpaid') list = list.filter(m => !m.membershipPaid);
  list.sort((a, b) => fullName(a).localeCompare(fullName(b), 'sl'));

  let counts = {};
  let trainingsCount = 0;
  if (withAttendance) {
    const trainings = completedTrainingsIn(posts, period?.from, period?.to);
    trainingsCount = trainings.length;
    trainings.forEach(tr => tr.attendance.forEach(a => {
      if (!a.present) return;
      const key = lower(a.email) || lower(a.name);
      counts[key] = (counts[key] || 0) + 1;
    }));
  }

  const columns = fields.map(f => ({ label: f.label, width: f.width }));
  if (withAttendance) columns.push({ label: 'Prisotnost', width: 11 });

  const rows = list.map(m => {
    const row = fields.map(f => f.get(m, ctx));
    if (withAttendance) row.push(`${counts[lower(m.email)] || counts[lower(fullName(m))] || 0}/${trainingsCount}`);
    return row;
  });

  const scopeLabel = { all: 'Vsi člani', paid: 'Plačana članarina', unpaid: 'Neplačana članarina', filtered: filterLabel || 'Trenutni filter' }[scope] || 'Vsi člani';
  const meta = [`${scopeLabel} · število članov: ${rows.length}`, `Izvoženo: ${formatSiDateTime(new Date())}`];
  if (withAttendance) meta.splice(1, 0, `Prisotnost: ${periodLabel(period?.from, period?.to)} · zaključeni treningi: ${trainingsCount}`);

  return { title: 'VSK – Seznam članov', meta, columns, rows, filenameBase: `VSK_clani_${todayIso()}` };
};

export const buildTrainingReport = ({ post, members, fieldKeys, scope, signature, ctx }) => {
  const fields = pickFields(fieldKeys);
  let people = [...(post.attendance || [])];
  if (scope === 'present') people = people.filter(p => p.present);
  people.sort(byLeaderThenName);

  const columns = [{ label: '#', width: 4 }, ...fields.map(f => ({ label: f.label, width: f.width }))];
  if (scope === 'all') columns.push({ label: 'Status', width: 10 });
  if (signature) columns.push({ label: 'Podpis', width: 20 });

  const rows = people.map((p, i) => {
    const m = findMember(members, p) || { ime: p.name || '', priimek: '', email: p.email };
    const row = [String(i + 1), ...fields.map(f => (f.key === 'ime' ? (fullName(m) || p.name || p.email || '') : f.get(m, ctx)))];
    if (scope === 'all') row.push(statusLabel(p));
    else if (p.role === 'vodja' && fields[0]?.key === 'ime') row[1] = `${row[1]} (vodja)`;
    if (signature) row.push('');
    return row;
  });

  const presentCount = (post.attendance || []).filter(p => p.present).length;
  const meta = [
    [formatSiDate(post.date), post.time, post.location].filter(Boolean).join(' · '),
    leaderName(post) ? `Trener: ${leaderName(post)}` : null,
    `Prisotni: ${presentCount}/${(post.attendance || []).length}`,
    post.trainerNotes ? `Opombe: ${post.trainerNotes}` : null
  ].filter(Boolean);

  const safeTitle = String(post.title || 'trening').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  return { title: post.title || 'Trening', meta, columns, rows, filenameBase: `VSK_${safeTitle}_${post.date || todayIso()}` };
};

export const buildPeriodReport = ({ posts, members, fieldKeys, scope, period, ctx }) => {
  const fields = pickFields(fieldKeys);
  const trainings = completedTrainingsIn(posts, period?.from, period?.to);
  const columns = [
    { label: 'Datum', width: 11 },
    { label: 'Trening', width: 24 },
    { label: 'Trener', width: 16 },
    ...fields.map(f => ({ label: f.label, width: f.width }))
  ];
  if (scope === 'all') columns.push({ label: 'Status', width: 10 });

  const rows = [];
  trainings.forEach(tr => {
    [...tr.attendance]
      .filter(p => scope === 'all' || p.present)
      .sort(byLeaderThenName)
      .forEach(p => {
        const m = findMember(members, p) || { ime: p.name || '', priimek: '', email: p.email };
        const row = [formatSiDate(tr.date), tr.title || '', leaderName(tr), ...fields.map(f => (f.key === 'ime' ? (fullName(m) || p.name || p.email || '') : f.get(m, ctx)))];
        if (scope === 'all') row.push(statusLabel(p));
        rows.push(row);
      });
  });

  const meta = [
    `Obdobje: ${periodLabel(period?.from, period?.to)}`,
    `Zaključeni treningi: ${trainings.length} · vpisov: ${rows.length}`,
    `Izvoženo: ${formatSiDateTime(new Date())}`
  ];
  const suffix = period?.from || period?.to ? `${period?.from || 'zacetek'}_${period?.to || todayIso()}` : todayIso();
  return { title: 'VSK – Poročilo prisotnosti', meta, columns, rows, filenameBase: `VSK_prisotnost_${suffix}` };
};

// --------------------------------------------
// File generation
// --------------------------------------------

let pdfMakePromise = null;
const loadPdfMake = () => {
  if (!pdfMakePromise) {
    pdfMakePromise = Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts')
    ]).then(([pdfMod, fontsMod]) => {
      const pdfMake = pdfMod.default || pdfMod;
      const vfs = fontsMod.default || fontsMod;
      pdfMake.addVirtualFileSystem(vfs);
      return pdfMake;
    }).catch(err => { pdfMakePromise = null; throw err; });
  }
  return pdfMakePromise;
};

export const buildPdfDefinition = (report, { signature } = {}) => {
  const totalWidth = report.columns.reduce((s, c) => s + (c.width || 12), 0);
  const landscape = totalWidth > 90 || report.columns.length > 6;
  // Size columns by their real content: longest word must fit, long text gets more room
  const usable = (landscape ? 842 : 595) - 64;
  const fontSize = report.columns.length > 9 ? 7.5 : 9;
  const charPt = fontSize * 0.55;
  const longestWord = (text) => String(text || '').split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
  const longestLine = (text) => String(text || '').split('\n').reduce((m, l) => Math.max(m, l.length), 0);
  const stats = report.columns.map((c, i) => {
    const cells = report.rows.map(r => r[i]);
    const minChars = Math.max(longestWord(c.label), ...cells.map(longestWord), 2);
    const wantChars = Math.max(c.label.length, ...cells.map(longestLine), 2);
    return { min: minChars * charPt + 10, want: Math.min(wantChars, 40) * charPt + 10, fixed: c.label === 'Podpis' ? 90 : null };
  });
  const fixedTotal = stats.reduce((s, x) => s + (x.fixed || 0), 0);
  const minTotal = stats.reduce((s, x) => s + (x.fixed ? 0 : x.min), 0);
  const wantExtra = stats.reduce((s, x) => s + (x.fixed ? 0 : Math.max(0, x.want - x.min)), 0);
  const spare = Math.max(0, usable - fixedTotal - minTotal - report.columns.length * 9);
  const widths = stats.map(x => {
    if (x.fixed) return x.fixed - 9;
    const extra = wantExtra > 0 ? Math.min(x.want - x.min, (Math.max(0, x.want - x.min) / wantExtra) * spare) : 0;
    return Math.floor(x.min + Math.max(0, extra));
  });
  // Leftover space goes to the widest text columns so the table fills the page
  const used = widths.reduce((s, w) => s + w, 0) + report.columns.length * 9;
  if (used < usable) {
    const flex = stats.map((x, i) => (x.fixed ? 0 : x.want)).reduce((s, w) => s + w, 0) || 1;
    stats.forEach((x, i) => { if (!x.fixed) widths[i] += Math.floor(((usable - used) * x.want) / flex); });
  }
  const body = [
    report.columns.map(c => ({ text: c.label, style: 'th' })),
    ...report.rows.map(r => r.map(cell => ({ text: cell == null ? '' : String(cell) })))
  ];
  return {
    pageSize: 'A4',
    pageOrientation: landscape ? 'landscape' : 'portrait',
    pageMargins: [32, 36, 32, 40],
    info: { title: report.title, author: 'VSK Planner' },
    content: [
      { text: report.title, style: 'title' },
      ...report.meta.map(line => ({ text: line, style: 'meta' })),
      { text: ' ', margin: [0, 2] },
      report.rows.length === 0
        ? { text: 'Ni podatkov za izbrane nastavitve.', italics: true, color: '#666' }
        : {
            table: { headerRows: 1, widths, body, dontBreakRows: true },
            layout: {
              fillColor: (rowIndex) => (rowIndex === 0 ? '#c1372a' : rowIndex % 2 === 0 ? '#f4f4f5' : null),
              hLineColor: () => '#d4d4d8',
              vLineColor: () => '#d4d4d8',
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              paddingTop: () => (signature ? 9 : 4),
              paddingBottom: () => (signature ? 9 : 4)
            }
          }
    ],
    footer: (current, total) => ({
      columns: [
        { text: 'VSK Planner · planner.vsk.si', fontSize: 7, color: '#888' },
        { text: `${current}/${total}`, alignment: 'right', fontSize: 7, color: '#888' }
      ],
      margin: [32, 12, 32, 0]
    }),
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
      meta: { fontSize: 9, color: '#444', margin: [0, 1, 0, 0] },
      th: { bold: true, color: '#ffffff', fontSize }
    },
    defaultStyle: { font: 'Roboto', fontSize }
  };
};

// Warm up the PDF library when an export box opens, so the share sheet opens fast on phones
export const preloadExportLibs = () => { loadPdfMake().catch(() => {}); };

export const reportToPdfBlob = async (report, options) => {
  const pdfMake = await loadPdfMake();
  return pdfMake.createPdf(buildPdfDefinition(report, options)).getBlob();
};

export const buildSheetData = (report) => {
  const bold = (value) => ({ value, fontWeight: 'bold' });
  return [
    [bold(report.title)],
    ...report.meta.map(line => [{ value: line }]),
    [],
    report.columns.map(c => ({ value: c.label, fontWeight: 'bold', backgroundColor: '#c1372a', color: '#ffffff' })),
    ...report.rows.map(r => r.map(cell => ({ value: cell == null ? '' : String(cell), wrap: String(cell || '').includes('\n') })))
  ].map(row => (row.length ? row : [null]));
};

export const reportToXlsxBlob = async (report) => {
  const mod = await import('write-excel-file/universal');
  const writeExcelFile = mod.default || mod;
  return writeExcelFile(buildSheetData(report), {
    columns: report.columns.map(c => ({ width: Math.max(8, c.width || 12) })),
    sheet: 'Izvoz'
  }).toBlob();
};

export const makeExportFile = async (report, format, options = {}) => {
  if (format === 'xlsx') {
    const blob = await reportToXlsxBlob(report);
    return { blob, filename: `${report.filenameBase}.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }
  const blob = await reportToPdfBlob(report, options);
  return { blob, filename: `${report.filenameBase}.pdf`, mime: 'application/pdf' };
};

// --------------------------------------------
// Delivery: share sheet (phone), download, email (via edge function)
// --------------------------------------------

export const canShareFiles = () => {
  try {
    if (!navigator.canShare || !navigator.share) return false;
    const probe = new File(['x'], 'probe.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [probe] });
  } catch (e) {
    return false;
  }
};

export const shareFile = async ({ blob, filename, mime }, title) => {
  const file = new File([blob], filename, { type: mime });
  await navigator.share({ files: [file], title });
};

export const downloadFile = ({ blob, filename }) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

export const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export const EXPORT_EMAIL_RECIPIENT = 'strelskiklubvsk@gmail.com';

export const emailFile = async (supabase, { blob, filename }, report) => {
  const content = await blobToBase64(blob);
  const { data, error } = await supabase.functions.invoke('send-export', {
    body: { filename, content, subject: `${report.title} – ${formatSiDate(todayIso())}`, lines: report.meta }
  });
  if (error) {
    // Pull the function's own error message and status (e.g. 403 = not a coach, 404 = not deployed)
    let body = null;
    try { body = await error.context?.json?.(); } catch (e) { /* not JSON */ }
    const err = new Error(body?.error || error.message || 'Email ni bil poslan');
    err.status = error.context?.status;
    err.name = error.name;
    throw err;
  }
  if (data && data.ok === false) throw new Error(data.error || 'Email ni bil poslan');
  return data;
};
