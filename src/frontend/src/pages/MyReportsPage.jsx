import { useState } from 'react';
import { loadReports, STATUS_LABELS, STATUS_CLASS, formatDate } from '../lib/data.js';

export default function MyReportsPage({ session, setPage, setSelectedId }) {
  const [reports] = useState(() => loadReports().filter(r => r.user === session.email));

  return (
    <div className="page">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Moje prijave</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {reports.length} {reports.length === 1 ? 'prijava' : 'prijava'} od tebe
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-slate-400 text-sm mb-5">Još nisi podnio/la nijednu prijavu.</p>
          <button className="btn-primary" onClick={() => setPage('report')}>Prijavi problem</button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <button key={r.id}
              onClick={() => { setSelectedId(r.id); setPage('detail'); }}
              className="card-hover p-4 w-full text-left">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm font-semibold text-slate-900 truncate flex-1">{r.title}</p>
                <span className={STATUS_CLASS[r.status]}>{STATUS_LABELS[r.status]}</span>
              </div>
              {r.photo && (
                <div className="w-full rounded-lg overflow-hidden mb-2" style={{ height: 80 }}>
                  <img src={r.photo} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-xs text-slate-400 line-clamp-2">{r.description}</p>
              <p className="text-xs text-slate-300 mt-2">{r.location || 'Bez lokacije'} · {formatDate(r.createdAt)}</p>
            </button>
          ))}
        </div>
      )}

      <div className="mt-5">
        <button className="btn-primary w-full" onClick={() => setPage('report')}>+ Nova prijava</button>
      </div>
    </div>
  );
}
