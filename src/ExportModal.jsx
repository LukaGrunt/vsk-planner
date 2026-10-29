import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Send, Upload, Check } from 'lucide-react';
import { makeExportFile, canShareFiles, shareFile, downloadFile, emailFile, preloadExportLibs, EXPORT_EMAIL_RECIPIENT } from './exports';

// Shared "Izvoz" box used for members, single-training and period exports.
// Admin/superadmin only: callers render it only for those roles.
//
// props:
//   title, subtitle
//   storageKey          – remembers the last choices per export type (this browser only)
//   scopes              – [{ value, label }] radio options (who to include)
//   fields              – [{ key, label, default }] checkboxes
//   showPeriod          – show from/to date inputs
//   periodRequiredFor   – field key that needs the period (e.g. 'prisotnost'); null = always shown when showPeriod
//   allowSignature      – PDF signature column toggle
//   buildReport(options) – async, returns a report object from exports.js
//   supabase, showToast, onClose

const readSaved = (key) => {
  try { return JSON.parse(localStorage.getItem(`vsk-export-${key}`) || 'null'); } catch (e) { return null; }
};
const writeSaved = (key, value) => {
  try { localStorage.setItem(`vsk-export-${key}`, JSON.stringify(value)); } catch (e) { /* ignore */ }
};

const thisYear = new Date().getFullYear();

const ExportModal = ({ title, subtitle, storageKey, scopes, fields, showPeriod, periodRequiredFor = null, allowSignature, buildReport, supabase, showToast, onClose }) => {
  const saved = readSaved(storageKey) || {};
  const fieldKeys = fields.map(f => f.key);
  const [scope, setScope] = useState(scopes.some(s => s.value === saved.scope) ? saved.scope : scopes[0].value);
  const [selected, setSelected] = useState(() => {
    const fromSaved = Array.isArray(saved.fields) ? saved.fields.filter(k => fieldKeys.includes(k)) : null;
    return fromSaved && fromSaved.length ? fromSaved : fields.filter(f => f.default).map(f => f.key);
  });
  const [format, setFormat] = useState(saved.format === 'xlsx' ? 'xlsx' : 'pdf');
  const [signature, setSignature] = useState(saved.signature ?? true);
  const [from, setFrom] = useState(saved.from || `${thisYear}-01-01`);
  const [to, setTo] = useState(saved.to || `${thisYear}-12-31`);
  const [busy, setBusy] = useState(null); // 'share' | 'download' | 'email'
  const shareAvailable = canShareFiles();
  // Last generated file, reused when nothing changed (lets a 2nd "Deli" tap share instantly on iOS)
  const preparedRef = useRef({ key: null, file: null, report: null });

  useEffect(() => { preloadExportLibs(); }, []);

  const allSelected = selected.length === fields.length;
  const toggleField = (key) => setSelected(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  const periodVisible = showPeriod && (!periodRequiredFor || selected.includes(periodRequiredFor));

  const run = async (action) => {
    if (selected.length === 0) {
      showToast('Izberi vsaj en podatek za izvoz', 'error');
      return;
    }
    if (periodVisible && from && to && from > to) {
      showToast('Datum "od" mora biti pred datumom "do"', 'error');
      return;
    }
    const orderedKeys = fieldKeys.filter(k => selected.includes(k));
    const useSignature = allowSignature && format === 'pdf' && signature;
    const optionsKey = JSON.stringify({ scope, orderedKeys, format, useSignature, from: periodVisible ? from : null, to: periodVisible ? to : null });

    // Already prepared with the same options: share straight away, still inside the tap
    if (action === 'share' && preparedRef.current.key === optionsKey) {
      try {
        await shareFile(preparedRef.current.file, preparedRef.current.report.title);
      } catch (e) {
        if (e?.name !== 'AbortError') downloadFile(preparedRef.current.file);
      }
      return;
    }

    setBusy(action);
    writeSaved(storageKey, { scope, fields: selected, format, signature, from, to });
    try {
      const report = await buildReport({
        scope,
        fieldKeys: orderedKeys,
        period: periodVisible ? { from, to } : null,
        signature: useSignature
      });
      const file = await makeExportFile(report, format, { signature: useSignature });
      preparedRef.current = { key: optionsKey, file, report };
      if (action === 'share') {
        try {
          await shareFile(file, report.title);
        } catch (e) {
          if (e?.name === 'NotAllowedError') {
            // Phone blocked the share because preparing took too long: file is ready now
            showToast('Datoteka je pripravljena – tapni »Deli« še enkrat', 'info');
          } else if (e?.name !== 'AbortError') {
            downloadFile(file);
          }
        }
      } else if (action === 'download') {
        downloadFile(file);
      } else if (action === 'email') {
        await emailFile(supabase, file, report);
        showToast(`Poslano na ${EXPORT_EMAIL_RECIPIENT}`, 'success');
      }
    } catch (e) {
      const msg = String(e?.message || e || '');
      if (action === 'email' && (e?.status === 404 || e?.name === 'FunctionsFetchError' || /not found|failed to send a request/i.test(msg))) {
        showToast('Pošiljanje na email še ni nastavljeno (funkcija send-export ni nameščena)', 'error');
      } else if (action === 'email' && e?.status === 403) {
        showToast('Pošiljanje izvozov je dovoljeno samo trenerjem', 'error');
      } else if (action === 'email') {
        showToast('Email ni bil poslan: ' + msg, 'error');
      } else {
        showToast('Izvoz ni uspel: ' + msg, 'error');
      }
    } finally {
      setBusy(null);
    }
  };

  const sectionTitle = { color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' };
  const chip = (active) => ({
    padding: '8px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
    border: active ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.12)',
    background: active ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
    color: active ? '#fff' : 'rgba(255,255,255,0.65)'
  });
  const dateInput = { flex: 1, minWidth: 0, padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#fff', fontSize: '16px', colorScheme: 'dark' };
  const actionBtn = (primary) => ({
    flex: 1, padding: '13px 10px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: busy ? 'wait' : 'pointer',
    border: primary ? 'none' : '1px solid rgba(255,255,255,0.15)',
    background: primary ? 'linear-gradient(135deg, #c1372a 0%, #9a2c22 100%)' : 'rgba(255,255,255,0.06)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    opacity: busy ? 0.6 : 1
  });

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px',
        background: 'rgba(28, 31, 34, 0.97)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '4px 0 0' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Zapri" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '18px 20px', display: 'grid', gap: '20px' }}>
          {scopes.length > 1 && (
            <div>
              <p style={sectionTitle}>Koga izvozim</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {scopes.map(s => <button key={s.value} onClick={() => setScope(s.value)} style={chip(scope === s.value)}>{s.label}</button>)}
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p style={{ ...sectionTitle, margin: 0 }}>Podatki</p>
              <button onClick={() => setSelected(allSelected ? [] : fieldKeys)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: '4px 0' }}>
                {allSelected ? 'Počisti' : 'Izberi vse'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '6px' }}>
              {fields.map(f => {
                const on = selected.includes(f.key);
                return (
                  <button key={f.key} onClick={() => toggleField(f.key)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                    border: on ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    background: on ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '13px'
                  }}>
                    <span style={{ width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? '#10b981' : 'rgba(255,255,255,0.1)' }}>
                      {on && <Check size={13} color="#fff" />}
                    </span>
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {periodVisible && (
            <div>
              <p style={sectionTitle}>Obdobje</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={dateInput} aria-label="Od" />
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>–</span>
                <input type="date" value={to} onChange={e => setTo(e.target.value)} style={dateInput} aria-label="Do" />
              </div>
            </div>
          )}

          <div>
            <p style={sectionTitle}>Oblika</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setFormat('pdf')} style={chip(format === 'pdf')}>PDF</button>
              <button onClick={() => setFormat('xlsx')} style={chip(format === 'xlsx')}>Excel</button>
              {allowSignature && format === 'pdf' && (
                <button onClick={() => setSignature(v => !v)} style={chip(signature)}>{signature ? '✓ ' : ''}Stolpec za podpis</button>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px 20px', display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {shareAvailable && (
              <button disabled={!!busy} onClick={() => run('share')} style={actionBtn(true)}>
                <Upload size={16} /> {busy === 'share' ? 'Pripravljam…' : 'Deli'}
              </button>
            )}
            <button disabled={!!busy} onClick={() => run('download')} style={actionBtn(!shareAvailable)}>
              <Download size={16} /> {busy === 'download' ? 'Pripravljam…' : 'Prenesi'}
            </button>
          </div>
          <button disabled={!!busy} onClick={() => run('email')} style={actionBtn(false)}>
            <Send size={16} /> {busy === 'email' ? 'Pošiljam…' : `Pošlji na ${EXPORT_EMAIL_RECIPIENT}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
