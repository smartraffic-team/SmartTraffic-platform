import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../features/auth';
import { session } from '../services/http';

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.unstubAllGlobals());

it('entra com usuário da API e navega para o painel', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            accessToken: 'abc',
            tokenType: 'Bearer',
            expiresIn: 3600,
            usuario: {
              id: '1',
              nome: 'Ana',
              email: 'ana@teste.com',
              nivelAcesso: 'ADMINISTRADOR',
              ativo: true,
            },
          }),
          { status: 200 },
        ),
      ),
  );
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>Painel autenticado</p>} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'ana@teste.com' },
  });
  fireEvent.change(screen.getByLabelText('Senha'), {
    target: { value: 'senha-correta' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByText('Painel autenticado');
  expect(session.get()?.user.nome).toBe('Ana');
});

it('mostra erro e não cria sessão quando a API rejeita as credenciais', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ message: 'Credenciais inválidas' }), {
          status: 401,
        }),
      ),
  );
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'ana@teste.com' },
  });
  fireEvent.change(screen.getByLabelText('Senha'), {
    target: { value: 'errada' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Credenciais inválidas',
    ),
  );
  expect(session.get()).toBeNull();
});
