import { useState, useRef } from 'react';
import { clsx } from 'clsx';
import { CATEGORIES, mockAiAnalysis, PRIORITY_CONFIG } from '../lib/constants.js';
import { getUserId, loadReports, saveReports, nextId } from '../lib/storage.js';
import { PriorityBadge } from '../components/Badge.jsx';

const STEPS = ['Tip', 'Lokacija', 'Detalji', 'Pregled'];

export default function ReportPage({ setPage, setSelectedId }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ categoryId: '', location: '', description: '', photoPreview: null });
  const [submitted, setSubmitted] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef();

  const canNext = [form.categoryId !== '', form.location.trim() !== '', true, true];

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, photoPreview: reader.result }));
    reader.readAsDataURL(file);
  }

  function goNext() {
    if (step === 2 && !aiResult) {
      setAnalyzing(true);
      setTimeout(() => {
        setAiResult(mockAiAnalysis(form.categoryId, form.description));
        setAnalyzing(false);
        setStep(3);
      }, 1800);
      return;
    }
    if (step < 3) setStep(s => s + 1);
  }

  function submit() {
    const reports = loadReports();
    const id = nextId(reports);
    const now = new Date().toISOString();
    const report = {
      id, userId: getUserId(),
      categoryId: form.categoryId,
      categoryLabel: CATEGORIES.find(c => c.id === form.categoryId)?.label || '',
      location: form.location.trim(),
      kotar: 'Centar',
      description: form.description.trim(),
      photoPreview: form.photoPreview,
      status: 'sent',
      priority: aiResult.priority,
      score: aiResult.score,
      agency: aiResult.agency,
      estimatedDays: aiResult.estimatedDays,
      confirmations: 0, confirmedBy: [],
      createdAt: now,
      timeline: [{ status: 'sent', at: now, note: 'Prijava zaprimljena' }],
    };
    saveReports([report, ...reports]);
    setSubmitted(report);
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="glass-card p-8 max-w-md w-full text-center glow-blue" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <h2 className="text-xl font-bold mb-1">Prijava zaprimljena</h2>
          <p className="text-slate-400 text-sm mb-5">Poslano nadležnoj službi</p>
          <div className="text-3xl font-bold text-sky-400 mb-5">#{submitted.id}</div>
          <div className="bg-white/5 rounded-xl p-4 text-left space-y-2.5 mb-5 text-sm">
            {[
              ['Kategorija', submitted.categoryLabel],
              ['Prioritet', <PriorityBadge key="p" priority={submitted.priority} />],
              ['Nadležnost', submitted.agency],
              ['Rok', `${submitted.estimatedDays} dana`],
              ['AI skor', `${submitted.score}/100`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-400">{k}</span><span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
          {aiResult?.isDuplicate && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400 mb-4">
              AI detektirao {aiResult.similarCount} sličnih prijava — spojeno u jedan tiket.
            </div>
          )}
          <div className="flex gap-3">
            <button className="btn-primary flex-1" onClick={() => { setSelectedId(submitted.id); setPage('detail'); }}>Prati status</button>
            <button className="btn-secondary flex-1" onClick={() => { setSubmitted(null); setStep(0); setForm({ categoryId: '', location: '', description: '', photoPreview: null }); setAiResult(null); }}>Nova prijava</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Prijavi problem</h1>
        <p className="text-slate-400 text-sm mt-1">AI automatski kategorizira i šalje nadležnoj službi</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              i < step ? 'bg-green-500 text-white' : i === step ? 'bg-sky-400 text-slate-900' : 'bg-white/10 text-slate-400')}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={clsx('text-sm', i === step ? 'text-white font-medium' : 'text-slate-500')}>{s}</span>
            {i < STEPS.length - 1 && <div className={clsx('h-px w-6', i < step ? 'bg-green-500/40' : 'bg-white/10')} />}
          </div>
        ))}
      </div>

      <div className="flex-1 max-w-xl">
        {step === 0 && (
          <div>
            <h2 className="text-base font-semibold mb-4 text-slate-200">Odaberi tip problema</h2>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setForm(f => ({ ...f, categoryId: cat.id }))}
                  className={clsx('glass-card p-4 text-left transition-all hover:border-sky-400/40 border',
                    form.categoryId === cat.id ? 'border-sky-400/60 bg-sky-400/5' : 'border-transparent')}>
                  <div className="text-2xl mb-2">{cat.icon}</div>
                  <div className="text-sm font-medium text-white">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold mb-4 text-slate-200">Gdje se problem nalazi?</h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Adresa / kvart *</label>
              <input className="input" placeholder="Npr. Varoš, Ul. Petra Kružića 5" value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))} autoFocus />
            </div>
            <div className="rounded-xl overflow-hidden border border-white/8 flex items-center justify-center flex-col gap-2 text-slate-500 text-sm"
                 style={{ height: 180, background: 'rgba(15,25,45,0.5)' }}>
              <div className="text-3xl">📍</div>
              <p>{form.location || 'Unesite adresu gore'}</p>
              <p className="text-xs text-slate-600">Mapa u produkcijskoj verziji</p>
            </div>
            <button className="btn-secondary text-xs" onClick={() => setForm(f => ({ ...f, location: 'Moja lokacija (GPS)' }))}>
              📍 Koristi moju lokaciju
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold mb-4 text-slate-200">Dodaj detalje</h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Fotografija</label>
              {form.photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ height: 180 }}>
                  <img src={form.photoPreview} alt="" className="w-full h-full object-cover" />
                  <button className="absolute top-2 right-2 bg-black/60 rounded-lg px-2 py-1 text-xs text-white"
                    onClick={() => setForm(f => ({ ...f, photoPreview: null }))}>Ukloni</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 bg-white/3 cursor-pointer hover:border-sky-400/40 transition-colors"
                  style={{ height: 140 }} onClick={() => fileRef.current?.click()}>
                  <div className="text-3xl">📷</div>
                  <span className="text-sm text-slate-400">Dodaj fotografiju</span>
                  <span className="text-xs text-slate-600">Klikni za upload</span>
                </label>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Opis problema</label>
              <textarea className="input resize-none" style={{ minHeight: 90 }} placeholder="Npr. Kontejner prepun već 3 dana..."
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
        )}

        {step === 3 && aiResult && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold mb-4 text-slate-200">Pregled prijave</h2>
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-sky-400 mb-2">
                ⚡ AI analiza ({aiResult.aiConfidence}% pouzdanost)
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Prioritet', <PriorityBadge key="p" priority={aiResult.priority} />],
                  ['AI skor', <span key="s" className="font-bold text-white">{aiResult.score}/100</span>],
                  ['Nadležnost', <span key="a" className="text-xs text-white font-medium">{aiResult.agency}</span>],
                  ['Rok', <span key="d" className="font-bold text-white">{aiResult.estimatedDays}d</span>],
                ].map(([k, v]) => (
                  <div key={k} className="bg-white/5 rounded-xl p-3">
                    <div className="text-slate-400 text-xs mb-1">{k}</div>
                    {v}
                  </div>
                ))}
              </div>
              {aiResult.isDuplicate && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
                  Detektiran duplikat — {aiResult.similarCount} sličnih prijava u blizini. Bit ce spojeno.
                </div>
              )}
            </div>
            <div className="glass-card p-4 text-sm space-y-2">
              {[
                ['Tip', CATEGORIES.find(c => c.id === form.categoryId)?.label],
                ['Lokacija', form.location],
                ['Opis', form.description || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-slate-400 w-20 flex-shrink-0">{k}</span>
                  <span className="text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          {step > 0 && <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>← Natrag</button>}
          {step < 3 && (
            <button
              className={clsx('btn-primary flex-1', !canNext[step] && !analyzing && 'opacity-40 cursor-not-allowed')}
              disabled={!canNext[step] && !analyzing}
              onClick={goNext}
            >
              {analyzing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  AI analizira…
                </span>
              ) : step === 2 ? 'Analiziraj s AI →' : 'Nastavi →'}
            </button>
          )}
          {step === 3 && <button className="btn-primary flex-1" onClick={submit}>Pošalji prijavu</button>}
        </div>
      </div>
    </div>
  );
}
