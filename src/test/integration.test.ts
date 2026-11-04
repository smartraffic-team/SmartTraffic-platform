import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../services/provider';
import { ApiError, authApi, request, session } from '../services/http';
import { can } from '../lib/permissions';
import { dateTime } from '../lib/utils';
import type { LoginResponse } from '../types';

const login: LoginResponse = {
  accessToken: 'jwt-teste',
  tokenType: 'Bearer',
  expiresIn: 3600,
  usuario: {
    id: '1',
    nome: 'Operadora',
    email: 'operadora@teste.com',
    nivelAcesso: 'OPERADOR',
    ativo: true,
  },
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('contrato HTTP e sessão', () => {
  it('envia credenciais para login e token nas consultas paginadas, sem chave de ingestão', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(login))
      .mockResolvedValueOnce(
        response({ dados: [], total: 0, pagina: 2, limite: 50 }),
      );
    vi.stubGlobal('fetch', fetcher);
    session.set(await authApi.login('operadora@teste.com', 'senha-valida'));
    expect(session.get()?.user.nivelAcesso).toBe('OPERADOR');
    await api.readings({
      pagina: 2,
      limite: 50,
      tipoLeitura: 'AGREGADA',
      via: 'A',
      inicio: '2026-11-01T00:00:00.000Z',
    });
    expect(fetcher.mock.calls[0][1].body).toBe(
      JSON.stringify({ email: 'operadora@teste.com', senha: 'senha-valida' }),
    );
    const url = new URL(fetcher.mock.calls[1][0]);
    expect(url.pathname).toBe('/api/v1/leituras');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      pagina: '2',
      limite: '50',
      inicio: '2026-11-01T00:00:00.000Z',
      via: 'A',
      tipoLeitura: 'AGREGADA',
    });
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe(
      'Bearer jwt-teste',
    );
    expect(fetcher.mock.calls[1][1].headers['x-ingestion-key']).toBeUndefined();
  });
  it('invalida token expirado e remove a sessão ao receber 401', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T12:00:00Z'));
    session.set({ ...login, expiresIn: 1 });
    vi.advanceTimersByTime(1001);
    expect(session.get()).toBeNull();
    session.set(login);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response({ error: 'Unauthorized' }, 401)),
    );
    await expect(request('/cruzamento')).rejects.toMatchObject({ status: 401 });
    expect(session.get()).toBeNull();
  });
  it('preserva a sessão em falha de rede ou erro do servidor', async () => {
    session.set(login);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(
          response({ error: 'Internal Server Error' }, 500),
        ),
    );
    await expect(request('/cruzamento')).rejects.toBeInstanceOf(TypeError);
    await expect(request('/cruzamento')).rejects.toBeInstanceOf(ApiError);
    expect(session.get()?.token).toBe('jwt-teste');
  });
  it('lida com login inválido, respostas vazias e erros 403/429', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        response({ message: 'Credenciais inválidas' }, 401),
      )
      .mockResolvedValueOnce(
        response({ dados: [], total: 0, pagina: 1, limite: 20 }),
      )
      .mockResolvedValueOnce(response({ error: 'Forbidden' }, 403))
      .mockResolvedValueOnce(response({ error: 'Too Many Requests' }, 429));
    vi.stubGlobal('fetch', fetcher);
    await expect(
      authApi.login('errado@teste.com', 'errada'),
    ).rejects.toMatchObject({ status: 401 });
    session.set(login);
    expect((await api.alerts({ pagina: 1, limite: 20 })).dados).toEqual([]);
    await expect(api.transitionAlert('1', 'resolver')).rejects.toMatchObject({
      status: 403,
    });
    await expect(api.alerts()).rejects.toMatchObject({ status: 429 });
    expect(dateTime(null)).toBe('Indisponível');
    session.clear();
    expect(session.get()).toBeNull();
  });
  it('aplica os três perfis reais da API', () => {
    expect(can('ADMINISTRADOR', 'manageDevices')).toBe(true);
    expect(can('ADMINISTRADOR', 'settings')).toBe(true);
    expect(can('OPERADOR', 'manageDevices')).toBe(true);
    expect(can('OPERADOR', 'manageAlerts')).toBe(true);
    expect(can('OPERADOR', 'settings')).toBe(false);
    expect(can('VISUALIZADOR', 'manageAlerts')).toBe(false);
  });
});
