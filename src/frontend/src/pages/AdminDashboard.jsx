import { useState } from 'react';
import { loadReports, STATUS_LABELS, STATUS_CLASS, formatDate } from '../lib/data.js';

export default function AdminDashboard({ setPage, setSelectedId }) {
  const [reports] = useState(() => loadReports());

  const counts = {
    total:       reports.length,
    open:        reports.filter(r => r.status === 'open').length,
    in_progress: reports.filter(r => r.status === 'in_progress').length,
    resolved:    reports.filter(r => r.status === 'resolved').length,
  };

  const STATS = [
    { label: 'Ukupno',      value: counts.total,       accent: false },
    { label: 'Otvoreno',    value: counts.open,        accent: true },
    { label: 'U tijeku',    value: counts.in_progress, amber: true },
    { label: 'Riješeno',    value: counts.resolved,    green: true },
  ];

  return (
    <div className="page-wide">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Pregled prijava</h1>
        <p className="text-sm text-slate-400 mt-0.5">Pregled svih prijava u gradu</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {STATS.map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-3xl font-bold mb-1 ${s.accent ? 'text-blue-900' : s.amber ? 'text-amber-600' : s.green ? 'text-emerald-600' : 'text-slate-900'}`}>
              {s.value}
            </div>
            <div className="text-xs text-slate-400 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent reports */}
      <div className="flex items-center justify-between mb-3">
        <p className="section-title mb-0">Nedavne prijave</p>
        <button className="text-xs font-medium hover:text-slate-900 transition-colors"
                style={{ color: '#1a2e5a' }}
                onClick={() => setPage('reports')}>
          Sve prijave →
        </button>
      </div>

      <div className="space-y-2">
        {reports.slice(0, 5).map(r => (
          <button key={r.id}
            className="card-hover p-4 w-full text-left flex items-center justify-between gap-4"
            onClick={() => { setSelectedId(r.id); setPage('detail'); }}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{r.kotar || 'Bez kotara'} · {r.sluzba || ''} · {formatDate(r.createdAt)}</p>
            </div>
            <span className={STATUS_CLASS[r.status]}>{STATUS_LABELS[r.status]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
