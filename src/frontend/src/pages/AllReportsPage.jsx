import { useState } from 'react';
import { loadReports, updateStatus, STATUS_LABELS, STATUS_CLASS, formatDate } from '../lib/data.js';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved'];

export default function AllReportsPage({ setPage, setSelectedId }) {
  const [reports, setReports] = useState(() => loadReports());
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');

  const filtered = reports
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.location || '').toLowerCase().includes(search.toLowerCase())
    );

  function handleStatus(id, status, e) {
    e.stopPropagation();
    setReports(updateStatus(id, status));
  }

  const FILTERS = [
    { id: 'all',         label: 'Sve' },
    { id: 'open',        label: 'Otvoreno' },
    { id: 'in_progress', label: 'U tijeku' },
    { id: 'resolved',    label: 'Riješeno' },
  ];

  return (
    <div className="page-wide">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">Sve prijave</h1>
        <p className="text-sm text-slate-400 mt-0.5">{filtered.length} od {reports.length} prijava</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 self-start">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${filter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <input className="input flex-1 py-2" placeholder="Pretraži po naslovu ili lokaciji…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Cards (mobile-first) */}
      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.id} className="card p-4"
               onClick={() => { setSelectedId(r.id); setPage('detail'); }}>
            <div className="flex items-start justify-between gap-3 mb-3 cursor-pointer">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{r.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {r.kotar || r.location || 'Bez lokacije'} · {r.sluzba || ''} · {formatDate(r.createdAt)}
                </p>
              </div>
              <span className={STATUS_CLASS[r.status]}>{STATUS_LABELS[r.status]}</span>
            </div>

            {/* Status changer */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100"
                 onClick={e => e.stopPropagation()}>
              <span className="text-xs text-slate-400">Status:</span>
              <div className="flex gap-1.5 flex-wrap">
                {STATUS_OPTIONS.map(s => (
                  <button key={s}
                    onClick={e => handleStatus(r.id, s, e)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-all ${r.status === s ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                    style={r.status === s ? { background: '#1a2e5a' } : {}}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card p-10 text-center text-slate-400 text-sm">Nema prijava za odabrani filter.</div>
      )}
    </div>
  );
}
