import { useState } from 'react';
import Layout from './components/Layout.jsx';
import ReportPage from './pages/ReportPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import DetailPage from './pages/DetailPage.jsx';
import AIStatusPage from './pages/AIStatusPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';

export default function App() {
  const [page, setPage] = useState('admin');
  const [selectedId, setSelectedId] = useState(null);
  const nav = { setPage, setSelectedId };

  const pages = {
    report:    <ReportPage {...nav} />,
    admin:     <AdminDashboard {...nav} />,
    detail:    <DetailPage selectedId={selectedId} {...nav} />,
    ai:        <AIStatusPage {...nav} />,
    analytics: <AnalyticsPage {...nav} />,
  };

  return (
    <Layout page={page} setPage={setPage}>
      {pages[page] || <AdminDashboard {...nav} />}
    </Layout>
  );
}
