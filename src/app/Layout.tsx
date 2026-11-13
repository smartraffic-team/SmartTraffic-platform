import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  Camera,
  Cpu,
  FileBarChart2,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Moon,
  Settings,
  Sun,
  TrafficCone,
  TriangleAlert,
} from 'lucide-react';
import { useSummary } from '../hooks/useData';
import { can } from '../lib/permissions';
import { session } from '../services/http';
import type { User } from '../types';
const nav = [
  { to: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/camera', label: 'Câmera e detecções', icon: Camera },
  { to: '/intersections', label: 'Cruzamento', icon: TrafficCone },
  { to: '/devices', label: 'Dispositivos', icon: Cpu },
  { to: '/traffic', label: 'Fluxo', icon: Activity },
  { to: '/monitoring', label: 'Monitoramento', icon: ListFilter },
  { to: '/alerts', label: 'Alertas', icon: TriangleAlert },
  { to: '/reports', label: 'Relatórios', icon: FileBarChart2 },
  { to: '/settings', label: 'Configurações', icon: Settings },
];
export function Layout({ user }: { user: User }) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(
    localStorage.getItem('st-theme') || 'light',
  );
  const [mobile, setMobile] = useState(false);
  const summary = useSummary();
  const active = summary.data?.alertasAtivos || 0;
  return (
    <div className="app-shell" data-theme={theme}>
      <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
        <div className="sidebar-top">
          <NavLink
            to="/dashboard"
            className="brand"
            onClick={() => setMobile(false)}
          >
            <div className="brand-mark">
              <img src="/LOGOTIPO.png" alt="SmartTraffic" />
            </div>
            <span>
              <strong>SmartTraffic</strong>
              <small>PAINEL OPERACIONAL</small>
            </span>
          </NavLink>
        </div>
        <div className="nav-caption">MENU PRINCIPAL</div>
        <nav aria-label="Navegação principal">
          {nav
            .filter(
              (item) =>
                item.to !== '/settings' || can(user.nivelAcesso, 'settings'),
            )
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobile(false)}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <item.icon size={19} />
                <span>{item.label}</span>
                {item.to === '/alerts' && active > 0 && <b>{active}</b>}
              </NavLink>
            ))}
        </nav>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobile(!mobile)}
            >
              ☰
            </button>
            <div>
              <div className="breadcrumb">SmartTraffic</div>
              <h1>Painel operacional</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button"
              aria-label="Alternar tema"
              onClick={() => {
                const next = theme === 'light' ? 'dark' : 'light';
                setTheme(next);
                localStorage.setItem('st-theme', next);
              }}
            >
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <button
              className="icon-button bell"
              aria-label="Ver alertas"
              onClick={() => navigate('/alerts')}
            >
              <Bell size={19} />
            </button>
            <span className="user-label">
              <strong>{user.nome}</strong>
              <small>{user.nivelAcesso}</small>
            </span>
            <button
              className="icon-button"
              aria-label="Sair"
              onClick={() => {
                session.clear();
                navigate('/login');
              }}
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
        <footer className="footer">
          SmartTraffic · Monitoramento de infraestrutura urbana{' '}
          <span>Protótipo acadêmico · Registro, SP</span>
        </footer>
      </div>
    </div>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-actions">{action}</div>}
    </div>
  );
}
