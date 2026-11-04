import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from './Layout';
import { LoginPage } from '../features/auth';
import {
  AlertsPage,
  DashboardPage,
  DevicesPage,
  DeviceDetailPage,
  IntersectionsPage,
  IntersectionDetailPage,
  MonitoringPage,
  ReportsPage,
  SettingsPage,
  TrafficPage,
} from '../features/live';
import { ApiError, authApi, session } from '../services/http';
import { can } from '../lib/permissions';
import { Card } from '../components/ui';
import type { User } from '../types';
export function AppRouter() {
  const client = useQueryClient();
  const [user, setUser] = useState<User | null>(session.get()?.user ?? null);
  const [checking, setChecking] = useState(!!session.get());
  useEffect(() => {
    let alive = true;
    const sync = () => {
      const current = session.get();
      setUser(current?.user ?? null);
      if (!current) client.clear();
    };
    window.addEventListener('st-session-change', sync);
    const current = session.get();
    if (current)
      authApi
        .me()
        .then((verified) => {
          if (alive) setUser(verified);
        })
        .catch((error: unknown) => {
          if (alive && error instanceof ApiError && error.status === 401)
            session.clear();
        })
        .finally(() => {
          if (alive) setChecking(false);
        });
    const timer = window.setInterval(sync, 1000);
    return () => {
      alive = false;
      window.removeEventListener('st-session-change', sync);
      window.clearInterval(timer);
    };
  }, [client]);
  if (checking) return <div className="center-page">Validando sessão…</div>;
  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        element={
          user ? <Layout user={user} /> : <Navigate to="/login" replace />
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/intersections" element={<IntersectionsPage />} />
        <Route path="/intersections/:id" element={<IntersectionDetailPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/devices/:id" element={<DeviceDetailPage />} />
        <Route path="/traffic" element={<TrafficPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route
          path="/settings"
          element={
            user && can(user.nivelAcesso, 'settings') ? (
              <SettingsPage />
            ) : (
              <Card className="empty">Acesso negado.</Card>
            )
          }
        />
      </Route>
      <Route
        path="*"
        element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
}
