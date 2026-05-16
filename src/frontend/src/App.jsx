import { useState, useEffect } from 'react';
import { getSession, isAdmin } from './lib/auth.js';
import { pullFromCloud, cloudEnabled } from './lib/cloud.js';
import { injectReports } from './lib/data.js';
import LoginPage from './pages/LoginPage.jsx';
import Navbar from './components/Navbar.jsx';
import ReportPage from './pages/ReportPage.jsx';
import MyReportsPage from './pages/MyReportsPage.jsx';
import ReportDetailPage from './pages/ReportDetailPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AllReportsPage from './pages/AllReportsPage.jsx';

export default function App() {
  const [session, setSession]   = useState(() => getSession());
  const [page, setPage]         = useState(() => {
    const s = getSession();
    return s ? (isAdmin(s) ? 'admin' : 'report') : 'login';
  });
  const [selectedId, setSelectedId] = useState(null);
  const [synced, setSynced]         = useState(!cloudEnabled);

  // On load, pull latest data from cloud (if configured)
  useEffect(() => {
    if (!cloudEnabled) return;
    pullFromCloud().then(reports => {
      if (reports) injectReports(reports);
      setSynced(true);
    });
  }, []);

  function handleLogin(s) {
    setSession(s);
    setPage(isAdmin(s) ? 'admin' : 'report');
  }

  if (!session) return <LoginPage onLogin={handleLogin} />;

  // Show brief loading state only when cloud is enabled and hasn't synced yet
  if (!synced) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f4f6fb' }}>
        <div className="text-center">
          <img src="/logo.png" alt="AI Prijavi" className="h-16 w-auto mx-auto mb-4 opacity-70" style={{ mixBlendMode: 'multiply' }} />
          <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  const admin = isAdmin(session);

  const adminRoutes = ['admin', 'reports'];
  const userRoutes  = ['report', 'my-reports'];

  let safePage = page;
  if (!admin && adminRoutes.includes(page)) safePage = 'report';
  if (admin  && userRoutes.includes(page))  safePage = 'admin';

  const nav = { session, setPage: p => setPage(p), setSelectedId };

  const pages = {
    report:        <ReportPage {...nav} />,
    'my-reports':  <MyReportsPage {...nav} />,
    detail:        <ReportDetailPage selectedId={selectedId} {...nav} />,
    admin:         <AdminDashboard {...nav} />,
    reports:       <AllReportsPage {...nav} />,
  };

  return (
    <div className="min-h-screen" style={{ background: '#f4f6fb' }}>
      <Navbar session={session} setPage={setPage} page={safePage} />
      {pages[safePage] || (admin ? <AdminDashboard {...nav} /> : <ReportPage {...nav} />)}
    </div>
  );
}
