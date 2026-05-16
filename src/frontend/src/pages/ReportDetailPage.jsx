import { useState } from 'react';
import { getReportById, updateStatus, STATUS_LABELS, STATUS_CLASS, formatDate } from '../lib/data.js';
import { HITNOST_LABELS, HITNOST_CLASS } from '../lib/api.js';
import { isAdmin } from '../lib/auth.js';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved'];

export default function ReportDetailPage({ selectedId, session, setPage }) {
  const admin = isAdmin(session);
  const [report, setReport] = useState(() => getReportById(selectedId));

  if (!report) {
    return (
      <div className="page">
        <div className="card p-8 text-center">
          <p className="text-stone-400 text-sm mb-4">Report not found.</p>
          <button className="btn-secondary" onClick={() => setPage(admin ? 'reports' : 'my-reports')}>← Back</button>
        </div>
      </div>
    );
  }

  function handleStatusChange(newStatus) {
    const next = updateStatus(report.id, newStatus);
    setReport(next.find(r => r.id === report.id));
  }

  return (
    <div className="page">
      {/* Back */}
      <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-5"
              onClick={() => setPage(admin ? 'reports' : 'my-reports')}>
        ← Natrag
      </button>

      <div className="card p-5 space-y-5 shadow-sm">
        {/* Title + badges */}
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-bold text-slate-900 leading-snug">{report.title}</h1>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={STATUS_CLASS[report.status]}>{STATUS_LABELS[report.status]}</span>
            {report.hitnost && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${HITNOST_CLASS[report.hitnost] || HITNOST_CLASS.SREDNJA}`}>
                🤖 {HITNOST_LABELS[report.hitnost] || report.hitnost}
              </span>
            )}
          </div>
        </div>

        <div className="divider" />

        {/* Photo */}
        {report.photo && (
          <div className="rounded-xl overflow-hidden border border-slate-200" style={{ maxHeight: 240 }}>
            <img src={report.photo} alt="Report photo" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Description */}
        <div>
          <p className="section-title">Opis</p>
          <p className="text-sm text-slate-600 leading-relaxed">{report.description}</p>
        </div>

        {/* AI summary */}
        {report.aiOpis && (
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5">
            <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-1">🤖 AI sažetak</p>
            <p className="text-sm text-slate-700 leading-relaxed">{report.aiOpis}</p>
          </div>
        )}

        {/* Meta */}
        <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-y-4 gap-x-3">
          {[
            ['Kotar',        report.kotar || '—'],
            ['Služba',       report.sluzba || '—'],
            ['Lokacija',     report.location || '—'],
            ['GPS',          report.coords ? `${report.coords.lat.toFixed(4)}, ${report.coords.lng.toFixed(4)}` : null],
            ['Prijavio',     report.user],
            ['Datum',        formatDate(report.createdAt)],
            ['ID prijave',   `#${report.id}`],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k}>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">{k}</p>
              <p className="text-sm text-slate-700 font-medium truncate">{v}</p>
            </div>
          ))}
        </div>

        {/* Admin: change status */}
        {admin && (
          <>
            <div className="divider" />
            <div>
              <p className="section-title">Promijeni status</p>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map(s => (
                  <button key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      report.status === s
                        ? 'text-white border-transparent'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    }`}
                    style={report.status === s ? { background: '#1a2e5a', borderColor: '#1a2e5a' } : {}}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
