import { clsx } from 'clsx';

const NAV = [
  { id: 'report',    label: 'Prijavi problem', icon: '+' },
  { id: 'admin',     label: 'Admin dashboard', icon: '⊞' },
  { id: 'detail',    label: 'Detalj prijave',  icon: '◎' },
  { id: 'ai',        label: 'AI obrada',       icon: '⚡' },
  { id: 'analytics', label: 'Analitika',       icon: '▦' },
];

export default function Layout({ page, setPage, children }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'radial-gradient(ellipse at 20% 0%, #0f2040 0%, #060c16 60%)' }}>
      <aside className="w-56 flex-shrink-0 flex flex-col py-6 px-3 glass border-r border-white/5">
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-slate-900"
               style={{ background: 'linear-gradient(135deg, #38bdf8, #6366f1)' }}>SP</div>
          <div>
            <div className="text-sm font-bold text-white">SplitPrior</div>
            <div className="text-[10px] text-slate-500">Prijave problema</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              className={clsx('nav-item', page === n.id && 'nav-active')}>
              <span className="text-base leading-none opacity-70 w-5 text-center">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 px-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white">A</div>
            <div>
              <div className="text-xs font-medium text-white">Admin</div>
              <div className="text-[10px] text-slate-500">Komunalno Split</div>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
