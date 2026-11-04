import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../components/ui';
import { authApi, session } from '../services/http';
export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      session.set(await authApi.login(email, senha));
      navigate('/dashboard', { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível entrar.',
      );
    } finally {
      setBusy(false);
    }
  }
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
          <p>Dados registrados pela API SmartTraffic.</p>
        </div>
        <small>Protótipo acadêmico · Registro, SP</small>
      </div>
      <div className="auth-form">
        <Card>
          <div className="auth-form-head">
            <h2>Entrar</h2>
            <p>Use a conta cadastrada na API.</p>
          </div>
          <form className="form-grid" onSubmit={submit}>
            <label className="field">
              <span>E-mail</span>
              <Input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Senha</span>
              <Input
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </label>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
