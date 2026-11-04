import type { LoginResponse, User } from '../types';

const base = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
).replace(/\/$/, '');
const key = 'st-session';
type Session = { token: string; expiresAt: number; user: User };
export const session = {
  get(): Session | null {
    try {
      const value = sessionStorage.getItem(key);
      const parsed = value ? (JSON.parse(value) as Session) : null;
      if (!parsed || parsed.expiresAt <= Date.now()) {
        sessionStorage.removeItem(key);
        return null;
      }
      return parsed;
    } catch {
      sessionStorage.removeItem(key);
      return null;
    }
  },
  set(login: LoginResponse) {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        token: login.accessToken,
        expiresAt: Date.now() + login.expiresIn * 1000,
        user: login.usuario,
      } satisfies Session),
    );
    window.dispatchEvent(new Event('st-session-change'));
  },
  clear() {
    sessionStorage.removeItem(key);
    window.dispatchEvent(new Event('st-session-change'));
  },
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = session.get()?.token;
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') session.clear();
    let message = `Erro HTTP ${response.status}`;
    try {
      const body = (await response.json()) as {
        message?: string | string[];
        error?: string;
      };
      message = Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message || body.error || message;
    } catch {
      /* resposta sem JSON */
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}
export const authApi = {
  login: (email: string, senha: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    }),
  me: () => request<User>('/auth/me'),
};
