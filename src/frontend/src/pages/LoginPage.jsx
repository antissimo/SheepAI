import { useState } from 'react';
import { login } from '../lib/auth.js';

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const session = login(email, password);
      setLoading(false);
      if (!session) setError('Pogrešan email ili lozinka.');
      else onLogin(session);
    }, 400);
  }

  function fillDemo(role) {
    if (role === 'user') { setEmail('user@demo.com');  setPassword('Gradjanin#2026!'); }
    else                  { setEmail('admin@demo.com'); setPassword('KotarPlokite#2026!'); }
    setError('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: 'linear-gradient(160deg, #e8edf8 0%, #f4f6fb 60%)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="AI Prijavi" className="w-full max-w-xs mx-auto mb-3" style={{ mixBlendMode: 'multiply' }} />
          <p className="text-base font-medium text-slate-600 mt-1">Prijavi problem u svom gradu.</p>
        </div>

        {/* Card */}
        <div className="card p-6 shadow-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label">Lozinka</label>
              <input className="input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Prijava…' : 'Prijavi se'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center mb-3">Demo računi</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => fillDemo('user')}
                      className="btn-secondary btn-sm flex-col gap-0.5 py-2 h-auto">
                <span className="font-semibold">Građanin</span>
                <span className="text-[10px] text-slate-400 font-normal">user@demo.com</span>
              </button>
              <button onClick={() => fillDemo('admin')}
                      className="btn-secondary btn-sm flex-col gap-0.5 py-2 h-auto">
                <span className="font-semibold">Kotar Plokite</span>
                <span className="text-[10px] text-slate-400 font-normal">admin@demo.com</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">Split · AI Prijavi Demo 2026</p>
      </div>
    </div>
  );
}
