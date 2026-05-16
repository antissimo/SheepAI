import { useState, useRef } from 'react';
import { addReport, KOTARI } from '../lib/data.js';
import { aiClassify, HITNOST_LABELS, HITNOST_CLASS } from '../lib/api.js';
import { isAdmin } from '../lib/auth.js';


export default function ReportPage({ session, setPage, setSelectedId }) {
  const admin = isAdmin(session);
  const [form, setForm]           = useState({
    title: '', description: '', location: '',
    kotar: admin ? 'Plokite' : '',
    sluzba: ''
  });
  const [photo, setPhoto]         = useState(null);
  const [coords, setCoords]       = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError]   = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [errors, setErrors]       = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult]   = useState(null);
  const [aiError, setAiError]     = useState('');
  const cameraRef                 = useRef();
  const galleryRef                = useRef();

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhoto(null);
    if (cameraRef.current)  cameraRef.current.value  = '';
    if (galleryRef.current) galleryRef.current.value = '';
  }

  function getGPS() {
    if (!navigator.geolocation) { setGpsError('Geolocation nije podržan.'); return; }
    setGpsLoading(true);
    setGpsError('');

    let done = false;

    function applyLocation(lat, lng) {
      if (done) return;
      done = true;
      setCoords({ lat, lng });
      setForm(f => ({ ...f, location: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }));
      setGpsLoading(false);
    }

    // Hard fallback after 3s — Split city center
    const fallback = setTimeout(() => applyLocation(43.5081, 16.4402), 3000);

    navigator.geolocation.getCurrentPosition(
      pos => {
        clearTimeout(fallback);
        applyLocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        clearTimeout(fallback);
        applyLocation(43.5081, 16.4402);
      },
      { enableHighAccuracy: false, maximumAge: Infinity }
    );
  }

  function validate() {
    const e = {};
    if (!form.title.trim())       e.title       = 'Title is required.';
    if (!form.description.trim()) e.description = 'Description is required.';
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const report = addReport({
      ...form,
      user: session.email,
      photo,
      coords,
      hitnost: aiResult?.hitnost || null,
      aiOpis:  aiResult?.opis    || null,
    });
    setSubmitted(report);
  }

  async function runAI() {
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    const combined = [form.title, form.description].filter(Boolean).join('. ');
    const res = await aiClassify({
      text:     combined,
      photo,
      coords,
      district: form.kotar,
    });
    setAiLoading(false);
    if (!res.ok) { setAiError('AI nedostupan. Pokreni backend (docker compose up).'); return; }
    setAiResult(res);
    setForm(f => ({
      ...f,
      sluzba: res.sluzba || f.sluzba,
      kotar:  f.kotar || res.kotar || '',
      title:  f.title || res.naslov || '',
    }));
  }

  if (submitted) {
    return (
      <div className="page">
        <div className="card p-8 text-center shadow-md">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
               style={{ background: '#e8edf8', border: '2px solid #93aad4' }}>✓</div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Prijava poslana!</h2>
          <p className="text-sm text-slate-500 mb-1">Tvoja prijava je zabilježena.</p>
          <p className="text-xs font-mono text-slate-400 bg-slate-50 rounded-lg px-3 py-1 inline-block mb-6">
            Prijava #{submitted.id}
          </p>
          <div className="flex flex-col gap-2">
            <button className="btn-primary w-full"
              onClick={() => { setSelectedId(submitted.id); setPage('detail'); }}>
              Pogledaj prijavu
            </button>
            <button className="btn-secondary w-full"
              onClick={() => { setSubmitted(null); setForm({ title: '', description: '', location: '', kotar: admin ? 'Plokite' : '', sluzba: '' }); setPhoto(null); setCoords(null); setAiResult(null); setAiError(''); }}>
              Nova prijava
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Prijavi problem</h1>
        <p className="text-sm text-slate-400 mt-1">Pomozi gradu — opiši što si vidio/la.</p>
      </div>

      <div className="card p-5 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Title */}
          <div>
            <label className="label">Naslov *</label>
            <input className={`input ${errors.title ? 'border-red-300' : ''}`}
              placeholder="npr. Pokvarena rasvjeta na Rivi"
              value={form.title}
              onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(ev => ({ ...ev, title: '' })); }}
              autoFocus />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="label">Opis *</label>
            <textarea
              className={`input resize-none ${errors.description ? 'border-red-300' : ''}`}
              style={{ minHeight: 100 }}
              placeholder="Opiši problem — koliko dugo traje, koliko je opasno…"
              value={form.description}
              onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setErrors(ev => ({ ...ev, description: '' })); }}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>

          {/* Photo upload */}
          <div>
            <label className="label">Foto <span className="font-normal text-slate-400">(opcionalno)</span></label>
            {photo ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200" style={{ height: 200 }}>
                <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                <button type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-white text-slate-700 text-xs px-3 py-1.5 rounded-lg shadow border border-slate-200 font-medium hover:bg-slate-50">
                  ✕ Ukloni
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors py-5">
                  <span className="text-2xl">📷</span>
                  <span className="text-xs font-medium text-slate-600">Fotografiraj</span>
                </button>
                <button type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors py-5">
                  <span className="text-2xl">🖼️</span>
                  <span className="text-xs font-medium text-slate-600">Iz galerije</span>
                </button>
              </div>
            )}
            {/* Camera: opens rear camera directly */}
            <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            {/* Gallery: opens file picker without camera */}
            <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          {/* Kotar (samo za građane) */}
          {!admin && (
            <div>
              <label className="label">Kotar *</label>
              <select className="input"
                value={form.kotar}
                onChange={e => setForm(f => ({ ...f, kotar: e.target.value }))}>
                <option value="">Odaberi kotar</option>
                {KOTARI.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          )}

          {/* Location + GPS */}
          <div>
            <label className="label">Lokacija <span className="font-normal text-slate-400">(opcionalno)</span></label>
            <div className="flex gap-2">
              <input className="input flex-1"
                placeholder="npr. Riva, Split"
                value={form.location}
                onChange={e => { setForm(f => ({ ...f, location: e.target.value })); setCoords(null); }} />
              <button type="button"
                onClick={getGPS}
                disabled={gpsLoading}
                className="btn-secondary px-3 flex-shrink-0 text-lg"
                title="Koristi moju lokaciju">
                {gpsLoading ? (
                  <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin block" />
                ) : '📍'}
              </button>
            </div>
            {coords && (
              <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                ✓ GPS lokacija zabilježena ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
              </p>
            )}
            {gpsError && <p className="text-xs text-red-500 mt-1">{gpsError}</p>}
          </div>

          {/* AI klasifikacija */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50/60 to-slate-50 p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="text-2xl">🤖</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">AI klasifikacija</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automatski odredi službu i hitnost na temelju opisa i slike.
                </p>
              </div>
            </div>

            <button type="button"
              onClick={runAI}
              disabled={aiLoading || (!form.title && !form.description && !photo)}
              className="btn-secondary w-full">
              {aiLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                  Analiziram…
                </>
              ) : aiResult ? 'Ponovno klasificiraj' : 'Klasificiraj pomoću AI'}
            </button>

            {aiError && (
              <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-lg px-2 py-1.5 border border-red-100">
                {aiError}
              </p>
            )}

            {aiResult && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${HITNOST_CLASS[aiResult.hitnost] || HITNOST_CLASS.SREDNJA}`}>
                    Hitnost: {HITNOST_LABELS[aiResult.hitnost] || aiResult.hitnost}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-700">
                    {aiResult.sluzba}
                  </span>
                </div>
                {aiResult.opis && (
                  <p className="text-xs text-slate-600 leading-relaxed bg-white rounded-lg p-2.5 border border-slate-100">
                    {aiResult.opis}
                  </p>
                )}
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary w-full py-3 text-base">
            Pošalji prijavu
          </button>
        </form>
      </div>

      <p className="text-xs text-slate-400 text-center mt-4">
        Prijavljuješ kao <span className="font-medium text-slate-600">{session.email}</span>
      </p>
    </div>
  );
}
