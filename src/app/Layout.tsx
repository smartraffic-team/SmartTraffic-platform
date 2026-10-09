import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cpu,
  FileBarChart2,
  LayoutDashboard,
  ListFilter,
  Menu,
  Moon,
  Settings,
  Sun,
  TrafficCone,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useApp } from '../stores/app';
import { can } from '../lib/permissions';
import { Button } from '../components/ui';
const nav = [
  { to: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { to: '/intersections', label: 'Cruzamentos', icon: TrafficCone },
  { to: '/devices', label: 'Dispositivos IoT', icon: Cpu },
  { to: '/traffic', label: 'Fluxo de Trânsito', icon: Activity },
  { to: '/monitoring', label: 'Monitoramento', icon: ListFilter },
  { to: '/alerts', label: 'Alertas', icon: TriangleAlert },
  { to: '/reports', label: 'Relatórios', icon: FileBarChart2 },
  { to: '/settings', label: 'Configurações', icon: Settings },
];
export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useApp((s) => s.user);
  const preferences = useApp((s) => s.preferences);
  const setPreferences = useApp((s) => s.setPreferences);
  const setUser = useApp((s) => s.setUser);
  const alerts = useApp((s) => s.alerts);
  const toast = useApp((s) => s.toast);
  const clearToast = useApp((s) => s.clearToast);
  const scenario = useApp((s) => s.scenario);
  const paused = useApp((s) => s.paused);
  const active = nav.find((item) => location.pathname.startsWith(item.to));
  const unresolved = alerts.filter((a) => a.status !== 'resolved').length;
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(clearToast, 4000);
    return () => window.clearTimeout(id);
  }, [toast, clearToast]);
  return (
    <div
      className={`app-shell ${collapsed ? 'is-collapsed' : ''}`}
      data-theme={preferences.theme}
    >
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
          <button
            className="mobile-close icon-button"
            onClick={() => setMobile(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="nav-caption">MENU PRINCIPAL</div>
        <nav aria-label="Navegação principal">
          {nav
            .filter(
              (item) =>
                item.to !== '/settings' || (user && can(user.role, 'settings')),
            )
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobile(false)}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
                title={item.label}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
                {item.to === '/alerts' && unresolved > 0 && <b>{unresolved}</b>}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-info">
            <span className="demo-pulse" />
            <span>
              Ambiente demonstrativo
              <small>Dados simulados · sem controle real</small>
            </span>
          </div>
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            <span>{collapsed ? '' : 'Recolher menu'}</span>
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobile(true)}
              aria-label="Abrir menu"
            >
              <Menu size={21} />
            </button>
            <div>
              <div className="breadcrumb">
                Plataforma <ChevronRight size={13} />{' '}
                {active?.label || 'Detalhes'}
              </div>
              <h1>{active?.label || 'SmartTraffic'}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="connection">
              <span className="connection-dot" />{' '}
              {paused
                ? 'Simulação pausada'
                : scenario === 'offline'
                  ? 'Comunicação simulada offline'
                  : 'Simulação ativa'}
            </span>
            <button
              className="icon-button"
              onClick={() =>
                setPreferences({
                  theme: preferences.theme === 'light' ? 'dark' : 'light',
                })
              }
              aria-label="Alternar tema"
            >
              {preferences.theme === 'light' ? (
                <Moon size={19} />
              ) : (
                <Sun size={19} />
              )}
            </button>
            <button
              className="icon-button bell"
              onClick={() => navigate('/alerts')}
              aria-label="Ver alertas"
            >
              <Bell size={19} />
              {preferences.notifications && unresolved > 0 && <i />}
            </button>
            <div className="user-menu">
              <button
                className="user-trigger"
                onClick={() => setUserOpen(!userOpen)}
                aria-expanded={userOpen}
              >
                <span className="avatar">{user?.name[0]}</span>
                <span className="user-label">
                  <strong>{user?.name}</strong>
                  <small>{user?.role}</small>
                </span>
                <ChevronDown size={15} />
              </button>
              {userOpen && (
                <div className="user-popover">
                  {user && can(user.role, 'settings') && (
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setUserOpen(false);
                      }}
                    >
                      <Settings size={16} /> Preferências
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setUser(null);
                      navigate('/login');
                    }}
                  >
                    <CircleHelp size={16} /> Sair da demonstração
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="content">
          <div className="demo-banner">
            <span>AMBIENTE DE DEMONSTRAÇÃO</span> Todos os dados exibidos são
            fictícios e não representam telemetria real.
          </div>
          <Outlet />
        </main>
        <footer className="footer">
          SmartTraffic · Monitoramento de infraestrutura urbana{' '}
          <span>Protótipo acadêmico · Registro, SP</span>
        </footer>
        {toast && (
          <div className="toast" role="status">
            {toast}
            <button onClick={clearToast} aria-label="Fechar mensagem">
              <X size={14} />
            </button>
          </div>
        )}
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
export function PermissionNote() {
  return (
    <div className="permission-note">
      Esta ação altera apenas os dados locais desta demonstração. Nenhum
      equipamento recebe comandos.
    </div>
  );
}
export function BackButton() {
  const navigate = useNavigate();
  return (
    <Button variant="ghost" onClick={() => navigate(-1)}>
      ← Voltar
    </Button>
  );
}
