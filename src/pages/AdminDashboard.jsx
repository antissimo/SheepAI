import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { loadReports, saveReports } from '../lib/storage.js';
import { STATUS_CONFIG, CATEGORIES, timeAgo } from '../lib/constants.js';
import { StatusBadge, PriorityBadge } from '../components/Badge.jsx';

export default function AdminDashboard({ setPage, setSelectedId }) {
  const [reports, setReports] = useState(() => loadReports());
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('priority');

  const stats = useMemo(() => [
    { label: 'Ukupno',   value: reports.length,                                        color: 'text-white' },
    { label: 'Aktivne',  value: reports.filter(r => r.status !== 'done').length,        color: 'text-amber-400' },
    { label: 'Riješeno', value: reports.filter(r => r.status === 'done').length,        color: 'text-green-400' },
    { label: 'Kritično', value: reports.filter(r => r.priority === 'critical').length,  color: 'text-red-400' },
  ], [reports]);

  const filtered = useMemo(() => {
    let list = [...reports];
    if (filter === 'active')   list = list.filter(r => r.status !== 'done');
    if (filter === 'critical') list = list.filter(r => r.priority === 'critical');
    if (filter === 'done')     list = list.filter(r => r.status === 'done');
    if (search) list = list.filter(r =>
      r.location.toLowerCase().includes(search.toLowerCase()) ||
      r.categoryLabel.toLowerCase().includes(search.toLowerCase()) ||
      r.id.includes(search)
    );
    if (sortBy === 'priority') list.sort((a, b) => (b.score || 0) - (a.score || 0));
    if (sortBy === 'recent')   list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sortBy === 'conf')     list.sort((a, b) => (b.confirmations || 0) - (a.confirmations || 0));
    return list;
  }, [reports, filter, search, sortBy]);

  function updateStatus(id, status, note) {
    const now = new Date().toISOString();
    const next = reports.map(r => r.id !== id ? r : {
      ...r, status,
      timeline: [...(r.timeline || []), { status, at: now, note }],
    });
    setReports(next); saveReports(next);
  }

  const FILTERS = [
    { id: 'all', label: 'Sve' },
    { id: 'active', label: 'Aktivne' },
    { id: 'critical', label: 'Kritično' },
    { id: 'done', label: 'Riješeno' },
  ];

  return (
    <div className="p-6 min-h-screen">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Pregled i upravljanje svim prijavama</p>
        </div>
        <button className="btn-primary" onClick={() => setPage('report')}>+ Nova prijava</button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="glass-card p-4">
            <div className={clsx('text-3xl font-bold mb-1', s.color)}>{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 glass rounded-xl p-1">
          {FILTERS.map(f => (
            <button key={f.id}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filter === f.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white')}
              onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
        <input className="input flex-1 py-2 min-w-0" placeholder="Pretraži (#ID, lokacija, kategorija)…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-36 py-2" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="priority">Prioritet ↓</option>
          <option value="recent">Najnovije</option>
          <option value="conf">Potvrde</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 text-xs text-slate-400">
                {['#', 'Tip', 'Lokacija', 'Status', 'Prioritet', 'Potvrde', 'Kotar', 'Akcije'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}
                  className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer"
                  onClick={() => { setSelectedId(r.id); setPage('detail'); }}>
                  <td className="px-4 py-3 font-mono text-sky-400 font-semibold">#{r.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span>{CATEGORIES.find(c => c.id === r.categoryId)?.icon}</span>
                      <span className="text-white text-xs">{r.categoryLabel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300 max-w-[160px] truncate">{r.location}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                  <td className="px-4 py-3">
                    <span className={clsx('font-semibold', (r.confirmations || 0) >= 5 ? 'text-red-400' : 'text-slate-300')}>
                      {r.confirmations || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{r.kotar}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {r.status === 'sent' && (
                        <button className="text-xs py-1 px-2 bg-white/10 text-white border border-white/10 rounded-lg hover:bg-white/15"
                          onClick={() => updateStatus(r.id, 'taken', 'Preuzeto od admina')}>Preuzmi</button>
                      )}
                      {r.status !== 'done' && (
                        <button className="text-xs py-1 px-2 bg-green-500/15 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/25"
                          onClick={() => updateStatus(r.id, 'done', 'Označeno riješenim')}>✓</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">Nema prijava za odabrani filter.</div>
        )}
      </div>
    </div>
  );
}
