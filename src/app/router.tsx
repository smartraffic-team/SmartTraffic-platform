import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { useApp } from '../stores/app';
import { can } from '../lib/permissions';
import { LoginPage, DeniedPage, NotFoundPage } from '../features/auth';
import { Skeleton } from '../components/ui';
const DashboardPage = lazy(() =>
  import('../features/dashboard').then((m) => ({ default: m.DashboardPage })),
);
const IntersectionsPage = lazy(() =>
  import('../features/intersections').then((m) => ({
    default: m.IntersectionsPage,
  })),
);
const IntersectionDetailPage = lazy(() =>
  import('../features/intersections').then((m) => ({
    default: m.IntersectionDetailPage,
  })),
);
const DevicesPage = lazy(() =>
  import('../features/devices').then((m) => ({ default: m.DevicesPage })),
);
const DeviceDetailPage = lazy(() =>
  import('../features/devices').then((m) => ({ default: m.DeviceDetailPage })),
);
const TrafficPage = lazy(() =>
  import('../features/traffic').then((m) => ({ default: m.TrafficPage })),
);
const MonitoringPage = lazy(() =>
  import('../features/monitoring').then((m) => ({ default: m.MonitoringPage })),
);
const AlertsPage = lazy(() =>
  import('../features/alerts').then((m) => ({ default: m.AlertsPage })),
);
const ReportsPage = lazy(() =>
  import('../features/reports').then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazy(() =>
  import('../features/settings').then((m) => ({ default: m.SettingsPage })),
);
function Guard({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: 'manageDevices' | 'manageAlerts' | 'settings';
}) {
  const user = useApp((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (action && !can(user.role, action))
    return <Navigate to="/denied" replace />;
  return children;
}
export function AppRouter() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/denied" element={<DeniedPage />} />
        <Route
          element={
            <Guard>
              <Layout />
            </Guard>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/intersections" element={<IntersectionsPage />} />
          <Route
            path="/intersections/:id"
            element={<IntersectionDetailPage />}
          />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/devices/:id" element={<DeviceDetailPage />} />
          <Route path="/traffic" element={<TrafficPage />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route
            path="/settings"
            element={
              <Guard action="settings">
                <SettingsPage />
              </Guard>
            }
          />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
