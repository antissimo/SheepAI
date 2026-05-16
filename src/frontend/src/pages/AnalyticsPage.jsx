import { useMemo } from 'react';
import { clsx } from 'clsx';
import { loadReports } from '../lib/storage.js';
import { KOTARI, CATEGORIES, STATUS_CONFIG, PRIORITY_CONFIG } from '../lib/constants.js';
import { StatusBadge, PriorityBadge } from '../components/Badge.jsx';

export default function AnalyticsPage({ setPage, setSelectedId }) {
  const reports = loadReports();

  const stats = useMemo(() => {
    const total = reports.length;
    const done  = reports.filter(r => r.status === 'done').length;
    const crit  = reports.filter(r => r.priority === 'critical').length;
    const avgScore = total ? Math.round(reports.reduce((s, r) => s + (r.score || 50), 0) / total) : 0;
    const rate = total ? Math.round((done / total) * 100) : 0;
    const totalConf = reports.reduce((s, r) => s + (r.confirmations || 0), 0);
    return { total, done, crit, avgScore, rate, totalConf };
  }, [reports]);

  const kotarData = useMemo(() =>
    KOTARI.map(k => ({
      name: k,
      total:    reports.filter(r => r.kotar === k).length,
      done:     reports.filter(r => r.kotar === k && r.status === 'done').length,
      critical: reports.filter(r => r.kotar === k && r.priority === 'critical').length,
    })).sort((a, b) => b.total - a.total),
  [reports]);
  const maxKotar = Math.max(...kotarData.map(k => k.total), 1);

  const catData = useMemo(() =>
    CATEGORIES.map(cat => ({
      ...cat,
      total: reports.filter(r => r.categoryId === cat.id).length,
      done:  reports.filter(r => r.categoryId === cat.id && r.status === 'done').length,
    })).sort((a, b) => b.total - a.total),
  [reports]);
  const maxCat = Math.max(...catData.map(c => c.total), 1);

  const topOpen = reports.filter(r => r.status !== 'done').sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);

  return (
    <div className="p-6 min-h-screen">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Analitika kotara</h1>
          <p className="text-slate-400 text-sm mt-1">Prijave po kotarima, kategorijama i prioritetima</p>
        </div>
        <div className="text-xs text-slate-500 bg-white/5 rounded-lg px-3 py-1.5">{stats.total} prijava ukupno</div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Ukupno prijava',   value: stats.total,          color: 'text-white' },
          { label: 'Stopa rješavanja', value: `${stats.rate}%`,     color: 'text-green-400', sub: `${stats.done} od ${stats.total}` },
          { label: 'Kritične prijave', value: stats.crit,           color: 'text-red-400' },
          { label: 'Prosj. AI skor',   value: stats.avgScore,       color: 'text-sky-400', sub: 'od 100' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <div className={clsx('text-3xl font-bold mb-1', s.color)}>{s.value}</div>
            <div className="text-sm text-slate-300 font-medium">{s.label}</div>
            {s.sub && <div className="text-xs text-slate-500 mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 280px' }}>
        <div className="space-y-5 min-w-0">
          {/* Kotar bars */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-1">Prijave po kotaru</h3>
            <p className="text-xs text-slate-400 mb-5">Riješeno vs. u obradi</p>
            <div className="space-y-4">
              {kotarData.map(k => (
                <div key={k.name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-200 font-medium">{k.name}</span>
                    <div className="flex items-center gap-3">
                      {k.critical > 0 && <span className="text-red-400 text-[10px]">⚠ {k.critical} kritično</span>}
                      <span className="text-slate-400">{k.done}/{k.total}</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-white/5 rounded-full overflow-hidden flex">
                    {k.total > 0 && (
                      <>
                        <div className="h-full bg-green-500/60 rounded-l-full" style={{ width: `${(k.done / maxKotar) * 100}%` }} />
                        <div className="h-full bg-sky-400/30" style={{ width: `${((k.total - k.done) / maxKotar) * 100}%` }} />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500/60" /> Riješeno</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-400/30" /> U obradi</div>
            </div>
          </div>

          {/* Category bars */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-5">Kategorije prijava</h3>
            <div className="space-y-3">
              {catData.filter(c => c.total > 0).map(cat => (
                <div key={cat.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{cat.icon} {cat.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{cat.done} riješeno</span>
                      <span className="text-white font-semibold">{cat.total}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-400/60 rounded-full" style={{ width: `${(cat.total / maxCat) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top open */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4">Otvorene visoko-prioritetne prijave</h3>
            {topOpen.length === 0 ? (
              <p className="text-slate-500 text-sm">Sve prijave su riješene ✓</p>
            ) : (
              <div className="space-y-2">
                {topOpen.map(r => (
                  <button key={r.id} className="w-full flex items-center gap-3 p-3 bg-white/3 hover:bg-white/6 rounded-xl text-left transition-colors"
                    onClick={() => { setSelectedId(r.id); setPage('detail'); }}>
                    <span className="text-lg flex-shrink-0">{CATEGORIES.find(c => c.id === r.categoryId)?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{r.categoryLabel}</div>
                      <div className="text-xs text-slate-400 truncate">{r.location}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-mono text-slate-500">{r.score}/100</span>
                      <PriorityBadge priority={r.priority} />
                      <StatusBadge status={r.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-xs text-slate-400 font-medium uppercase tracking-wide">KPI-ji</h3>
            {[
              ['Stopa rješavanja', `${stats.rate}%`],
              ['Ukupne potvrde', stats.totalConf],
              ['Kritične otvorene', reports.filter(r => r.priority === 'critical' && r.status !== 'done').length],
              ['AI prosj. skor', `${stats.avgScore}/100`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-400 text-xs">{k}</span>
                <span className="text-white font-semibold">{v}</span>
              </div>
            ))}
          </div>

          <div className="glass-card p-5">
            <h3 className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-4">Status</h3>
            <div className="space-y-2">
              {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <StatusBadge status={s} />
                  <span className="text-white font-semibold">{reports.filter(r => r.status === s).length}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-4">Prioriteti</h3>
            <div className="space-y-2">
              {Object.entries(PRIORITY_CONFIG).map(([p, cfg]) => {
                const count = reports.filter(r => r.priority === p).length;
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={p}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className={cfg.text}>{cfg.label}</span>
                      <span className="text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full', cfg.bg)} style={{ width: `${pct}%` }} />
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
