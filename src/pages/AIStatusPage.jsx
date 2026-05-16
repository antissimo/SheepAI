import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { loadReports } from '../lib/storage.js';
import { CATEGORIES, PRIORITY_CONFIG, timeAgo } from '../lib/constants.js';
import { PriorityBadge } from '../components/Badge.jsx';

const PIPELINE = [
  { id: 'upload',    label: 'Upload slike',        icon: '📷', desc: 'Prihvaćena fotografija i metapodaci' },
  { id: 'ocr',       label: 'OCR / prepoznavanje', icon: '🔍', desc: 'Analiza sadržaja slike (Computer Vision)' },
  { id: 'classify',  label: 'Klasifikacija',       icon: '🏷️', desc: 'Kategorija, kotar, nadležna služba' },
  { id: 'duplicate', label: 'Duplikat detekcija',  icon: '🔗', desc: 'Provjera sličnih prijava u radijusu 100m' },
  { id: 'priority',  label: 'Prioritizacija',      icon: '⚡', desc: 'Skor 0–100 na temelju lokacije, tipa, potvrda' },
  { id: 'route',     label: 'Routing',             icon: '📨', desc: 'Automatski odabir službe i kotara' },
];

function Pipeline() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (step < PIPELINE.length) {
      const t = setTimeout(() => setStep(s => s + 1), 900);
      return () => clearTimeout(t);
    } else { setDone(true); }
  }, [step]);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-sky-400 text-sm font-semibold">⚡ AI Pipeline — live simulacija</span>
        {done && <span className="badge bg-green-500/20 text-green-400 border border-green-500/20">Završeno</span>}
      </div>
      <div className="space-y-2">
        {PIPELINE.map((p, i) => {
          const state = i < step ? 'done' : i === step && !done ? 'run' : 'idle';
          return (
            <div key={p.id} className={clsx('flex items-center gap-4 p-3 rounded-xl transition-all',
              state === 'done' ? 'bg-green-500/8 border border-green-500/15' :
              state === 'run'  ? 'bg-sky-400/8 border border-sky-400/20' :
              'bg-white/3 border border-white/5')}>
              <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0',
                state === 'done' ? 'bg-green-500/20' : state === 'run' ? 'bg-sky-400/20' : 'bg-white/5')}>
                {state === 'done' ? '✓' : state === 'run' ? (
                  <span className="w-3 h-3 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin block" />
                ) : p.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className={clsx('text-sm font-medium',
                  state === 'done' ? 'text-green-400' : state === 'run' ? 'text-sky-400' : 'text-slate-400')}>{p.label}</div>
                <div className="text-xs text-slate-500 truncate">{p.desc}</div>
              </div>
              {state === 'done' && <span className="text-xs text-green-400 font-mono">OK</span>}
              {state === 'run'  && <span className="text-xs text-sky-400 font-mono animate-pulse">…</span>}
            </div>
          );
        })}
      </div>
      {done && (
        <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-sm text-green-400">
          ✓ AI analiza završena — prijava proslijeđena nadležnoj službi
        </div>
      )}
      <button className="btn-secondary mt-4 text-xs w-full"
        onClick={() => { setStep(0); setDone(false); }}>↺ Ponovi simulaciju</button>
    </div>
  );
}

export default function AIStatusPage({ setPage, setSelectedId }) {
  const reports = loadReports();

  const catDist = CATEGORIES.map(cat => ({
    ...cat, count: reports.filter(r => r.categoryId === cat.id).length,
  })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...catDist.map(c => c.count), 1);

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">AI obrada</h1>
        <p className="text-slate-400 text-sm mt-1">Status AI pipeline-a i statistike klasifikacije</p>
      </div>
      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 280px' }}>
        <div className="space-y-5 min-w-0">
          <Pipeline />
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4">Nedavne AI odluke</h3>
            <div className="space-y-2">
              {reports.slice(0, 6).map(r => (
                <button key={r.id} className="w-full flex items-center gap-3 p-3 bg-white/3 hover:bg-white/6 rounded-xl transition-colors text-left"
                  onClick={() => { setSelectedId(r.id); setPage('detail'); }}>
                  <span className="text-lg">{CATEGORIES.find(c => c.id === r.categoryId)?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{r.categoryLabel} · {r.location}</div>
                    <div className="text-xs text-slate-400">{timeAgo(r.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono text-slate-400">{r.score || 50}/100</span>
                    <PriorityBadge priority={r.priority} />
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4">Model metrike</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                ['Preciznost klasifikacije', '91.4%', 'text-green-400'],
                ['Duplikat detekcija', '87.2%', 'text-sky-400'],
                ['Routing točnost', '94.8%', 'text-purple-400'],
              ].map(([k, v, c]) => (
                <div key={k} className="bg-white/5 rounded-xl p-4 text-center">
                  <div className={clsx('text-2xl font-bold mb-1', c)}>{v}</div>
                  <div className="text-xs text-slate-400">{k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div className="glass-card p-5">
            <h3 className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-4">Kategorije</h3>
            <div className="space-y-3">
              {catDist.map(cat => (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className="text-base w-6 flex-shrink-0">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-300 truncate mb-1">{cat.label}</div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-400/60 rounded-full" style={{ width: `${(cat.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 w-4 text-right">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Status sustava</h3>
            <div className="space-y-2">
              {[
                ['AI model', 'Online', 'text-green-400'],
                ['Vision API', 'Online', 'text-green-400'],
                ['Routing DB', 'Online', 'text-green-400'],
                ['Notifikacije', 'Degradirano', 'text-amber-400'],
              ].map(([name, status, color]) => (
                <div key={name} className="flex justify-between text-xs">
                  <span className="text-slate-400">{name}</span>
                  <span className={clsx('font-medium', color)}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
