import { useState } from 'react';
import { clsx } from 'clsx';
import { loadReports, saveReports, getUserId } from '../lib/storage.js';
import { STATUS_CONFIG, CATEGORIES, formatDate, timeAgo } from '../lib/constants.js';
import { StatusBadge, PriorityBadge } from '../components/Badge.jsx';

export default function DetailPage({ selectedId, setPage, setSelectedId }) {
  const [reports, setReports] = useState(() => loadReports());
  const [note, setNote] = useState('');
  const uid = getUserId();
  const report = reports.find(r => r.id === selectedId);

  if (!report) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Detalj prijave</h1>
        <p className="text-slate-400 mb-4 text-sm">Odaberi prijavu:</p>
        <div className="grid gap-3 max-w-lg">
          {reports.slice(0, 6).map(r => (
            <button key={r.id} className="glass-card p-4 text-left hover:border-sky-400/30 transition-all border border-transparent"
              onClick={() => setSelectedId(r.id)}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sky-400 font-semibold">#{r.id}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-sm text-slate-300">{r.categoryLabel}</div>
              <div className="text-xs text-slate-500">{r.location}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const cat = CATEGORIES.find(c => c.id === report.categoryId);
  const alreadyConfirmed = (report.confirmedBy || []).includes(uid);

  function updateStatus(status, statusNote) {
    const now = new Date().toISOString();
    const next = reports.map(r => r.id !== report.id ? r : {
      ...r, status,
      timeline: [...(r.timeline || []), { status, at: now, note: statusNote }],
    });
    setReports(next); saveReports(next);
  }

  function addNote() {
    if (!note.trim()) return;
    const now = new Date().toISOString();
    const next = reports.map(r => r.id !== report.id ? r : {
      ...r,
      timeline: [...(r.timeline || []), { status: r.status, at: now, note: note.trim(), isComment: true }],
    });
    setReports(next); saveReports(next);
    setNote('');
  }

  function confirm() {
    if (alreadyConfirmed) return;
    const next = reports.map(r => r.id !== report.id ? r : {
      ...r,
      confirmations: (r.confirmations || 0) + 1,
      confirmedBy: [...(r.confirmedBy || []), uid],
      score: Math.min(100, (r.score || 50) + 5),
    });
    setReports(next); saveReports(next);
  }

  const timeline = report.timeline || [];

  return (
    <div className="p-6 min-h-screen">
      <button className="btn-ghost mb-4 -ml-2" onClick={() => setPage('admin')}>← Admin dashboard</button>
      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 280px' }}>
        {/* Main */}
        <div className="space-y-5 min-w-0">
          <div className="glass-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{cat?.icon}</span>
                  <span className="font-mono text-sky-400 text-sm font-semibold">#{report.id}</span>
                </div>
                <h1 className="text-xl font-bold">{report.categoryLabel}</h1>
                <p className="text-slate-400 text-sm mt-0.5">{report.location} · {report.kotar}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={report.status} />
                <PriorityBadge priority={report.priority} />
              </div>
            </div>
            {report.description && (
              <p className="text-slate-300 text-sm bg-white/5 rounded-xl p-3">{report.description}</p>
            )}
            {report.photoPreview && (
              <img src={report.photoPreview} alt="" className="w-full rounded-xl mt-4 max-h-64 object-cover border border-white/5" />
            )}
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm mb-4">⚡ AI analiza</div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                ['AI skor', report.score || 50, 'text-white'],
                ['Rok', `${report.estimatedDays || 7}d`, 'text-amber-400'],
                ['Potvrde', report.confirmations || 0, 'text-purple-400'],
              ].map(([k, v, c]) => (
                <div key={k} className="bg-white/5 rounded-xl p-3 text-center">
                  <div className={clsx('text-2xl font-bold', c)}>{v}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{k}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-400 bg-white/3 rounded-lg p-2.5">
              <span className="text-sky-400">Nadležna služba:</span> {report.agency}
            </div>
          </div>

          <div className="glass-card overflow-hidden flex items-center justify-center flex-col gap-2 text-slate-500"
               style={{ height: 180, background: 'rgba(15,25,45,0.5)' }}>
            <div className="text-4xl">📍</div>
            <p className="text-sm">{report.location}</p>
            <p className="text-xs text-slate-600">Interaktivna mapa — produkcijska verzija</p>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-3">Bilješka</h3>
            <div className="flex gap-2">
              <input className="input flex-1 py-2" placeholder="Npr. Ekipa izlazi sutra…"
                value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} />
              <button className="btn-primary py-2" onClick={addNote}>Dodaj</button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="glass-card p-5">
            <h3 className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wide">Akcije</h3>
            <div className="space-y-2">
              {report.status === 'sent' && (
                <button className="btn-secondary w-full text-sm" onClick={() => updateStatus('taken', 'Preuzeto od službenika')}>Preuzmi prijavu</button>
              )}
              {(report.status === 'sent' || report.status === 'taken') && (
                <button className="btn-secondary w-full text-sm" onClick={() => updateStatus('progress', 'Ekipa na terenu')}>Postavi u tijeku</button>
              )}
              {report.status !== 'done' && (
                <button className="w-full text-sm py-2.5 px-4 rounded-xl font-semibold bg-green-500/15 text-green-400 border border-green-500/20 hover:bg-green-500/25 transition-colors"
                  onClick={() => updateStatus('done', 'Označeno kao riješeno')}>✓ Označi riješeno</button>
              )}
              {report.userId !== uid && (
                <button className={clsx('btn-secondary w-full text-sm', alreadyConfirmed && 'opacity-40 cursor-not-allowed')}
                  disabled={alreadyConfirmed} onClick={confirm}>
                  {alreadyConfirmed ? 'Već potvrđeno' : 'I ja vidim ovo'}
                </button>
              )}
            </div>
          </div>

          <div className="glass-card p-5 text-xs space-y-3">
            <h3 className="text-slate-400 font-medium uppercase tracking-wide">Info</h3>
            {[
              ['Prijavljeno', timeAgo(report.createdAt)],
              ['Kotar', report.kotar],
              ['Nadležnost', report.agency],
              ['ID', '#' + report.id],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-200 font-medium">{v}</span>
              </div>
            ))}
          </div>

          <div className="glass-card p-5">
            <h3 className="text-xs text-slate-400 font-medium mb-4 uppercase tracking-wide">Timeline</h3>
            <div className="space-y-3">
              {timeline.map((t, i) => {
                const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.sent;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={clsx('w-2 h-2 rounded-full mt-1 flex-shrink-0', t.isComment ? 'bg-slate-500' : cfg.dot)} />
                      {i < timeline.length - 1 && <div className="w-px flex-1 bg-white/5 mt-1" />}
                    </div>
                    <div className="pb-3 min-w-0">
                      <p className="text-xs text-slate-200 leading-snug">{t.note}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(t.at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
