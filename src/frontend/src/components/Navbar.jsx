import { logout, isAdmin } from '../lib/auth.js';

export default function Navbar({ session, setPage, page }) {
  const admin = isAdmin(session);

  const userLinks  = [{ id: 'report', label: 'Prijavi' }, { id: 'my-reports', label: 'Moje prijave' }];
  const adminLinks = [{ id: 'admin',  label: 'Pregled' }, { id: 'reports', label: 'Sve prijave' }];
  const links = admin ? adminLinks : userLinks;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => setPage(admin ? 'admin' : 'report')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img src="/logo.png" alt="AI Prijavi" className="h-16 w-auto" style={{ mixBlendMode: 'multiply' }} />
        </button>

        {/* Nav links */}
        <nav className="flex items-center gap-5">
          {links.map(l => (
            <button
              key={l.id}
              onClick={() => setPage(l.id)}
              className={`nav-link ${page === l.id ? 'nav-link-active' : ''}`}
            >
              {l.label}
              {page === l.id && (
                <span className="block h-0.5 rounded-full mt-0.5" style={{ background: '#1a2e5a' }} />
              )}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                 style={{ background: '#1a2e5a' }}>
              {session.name[0]}
            </div>
            <span className="text-xs text-slate-600 font-medium">{session.name}</span>
          </div>
          <button onClick={() => { logout(); window.location.reload(); }}
                  className="btn-ghost btn-sm text-xs">
            Odjava
          </button>
        </div>
      </div>
    </header>
  );
}
