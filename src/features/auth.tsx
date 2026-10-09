import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { users } from '../mocks/fixtures';
import { useApp } from '../stores/app';
import { Button, Card } from '../components/ui';
export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useApp((s) => s.setUser);
  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-brand">
          <div className="brand-mark">
            <img src="/LOGOTIPO.png" alt="SmartTraffic" />
          </div>
          <span>SmartTraffic</span>
        </div>
        <div>
          <span className="eyebrow">PLATAFORMA DE MONITORAMENTO</span>
          <h1>Mobilidade urbana com mais clareza.</h1>
          <p>
            Acompanhe cruzamentos, dispositivos e fluxo veicular em um só lugar.
          </p>
        </div>
        <small>Protótipo acadêmico · Registro, SP</small>
      </div>
      <div className="auth-form">
        <Card>
          <div className="auth-form-head">
            <ShieldCheck size={28} />
            <h2>Entrar na demonstração</h2>
            <p>
              Escolha um perfil fictício para explorar o painel. Não há
              autenticação real.
            </p>
          </div>
          <div className="profile-list">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  setUser(user);
                  navigate('/dashboard');
                }}
              >
                <span className="avatar">{user.name[0]}</span>
                <span>
                  <strong>{user.name}</strong>
                  <small>
                    {user.role === 'ADMIN'
                      ? 'Administrador · acesso completo'
                      : user.role === 'OPERATOR'
                        ? 'Operador · monitoramento e alertas'
                        : 'Visualizador · consulta e relatórios'}
                  </small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
export function DeniedPage() {
  return (
    <div className="center-page">
      <ShieldCheck size={42} />
      <h1>Acesso negado</h1>
      <p>Seu perfil demonstrativo não tem permissão para esta ação.</p>
      <Link to="/dashboard">
        <Button>Voltar à visão geral</Button>
      </Link>
    </div>
  );
}
export function NotFoundPage() {
  return (
    <div className="center-page">
      <h1>Página não encontrada</h1>
      <p>Confira o endereço ou retorne ao painel.</p>
      <Link to="/dashboard">
        <Button>Ir para a visão geral</Button>
      </Link>
    </div>
  );
}
