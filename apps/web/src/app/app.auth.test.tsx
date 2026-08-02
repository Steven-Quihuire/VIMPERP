import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from './app';

const createJsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const readUrl = (input: RequestInfo | URL) =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

describe('App auth flow', () => {
  it('redirects unauthenticated dashboard requests to /login without social auth options', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = readUrl(input);

        if (url.endsWith('/auth/me')) {
          return Promise.resolve(
            createJsonResponse(
              { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } },
              401,
            ),
          );
        }

        throw new Error(`unexpected request: ${url}`);
      }),
    );

    render(<App initialEntries={['/dashboard']} />);

    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /google/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /github/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the public register route and links back to login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = readUrl(input);

        if (url.endsWith('/auth/me')) {
          return Promise.resolve(
            createJsonResponse(
              { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } },
              401,
            ),
          );
        }

        throw new Error(`unexpected request: ${url}`);
      }),
    );

    render(<App initialEntries={['/register']} />);

    expect(
      await screen.findByRole('heading', {
        name: 'Crea tu cuenta administrativa',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inicia sesión' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('links from login to public company registration', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = readUrl(input);

        if (url.endsWith('/auth/me')) {
          return Promise.resolve(
            createJsonResponse(
              { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } },
              401,
            ),
          );
        }

        throw new Error(`unexpected request: ${url}`);
      }),
    );

    render(<App initialEntries={['/login']} />);

    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Registra tu empresa' }),
    ).toHaveAttribute('href', '/register');
  });

  it('registers a public user and redirects to onboarding when no company membership exists', async () => {
    let authCalls = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        authCalls += 1;

        if (authCalls === 1) {
          return Promise.resolve(
            createJsonResponse(
              { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } },
              401,
            ),
          );
        }

        return Promise.resolve(
          createJsonResponse(
            {
              user: {
                id: 'user-1',
                email: 'owner@vimcore.test',
                username: 'owner',
              },
              memberships: [],
            },
            200,
          ),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'ocean' }, 200));
      }

      if (url.endsWith('/auth/register')) {
        expect(init?.method).toBe('POST');
        return Promise.resolve(new Response(null, { status: 201 }));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/register']} />);

    fireEvent.change(await screen.findByLabelText('Correo corporativo'), {
      target: { value: 'owner@vimcore.test' },
    });
    fireEvent.change(screen.getByLabelText('Usuario'), {
      target: { value: 'owner' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    fireEvent.change(await screen.findByLabelText('Contraseña'), {
      target: { value: 'secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Registro de información de a la empresa',
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('logs in and renders the protected dashboard shell', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        if (
          fetchMock.mock.calls.filter(([value]) =>
            readUrl(value).endsWith('/auth/me'),
          ).length === 1
        ) {
          return Promise.resolve(
            createJsonResponse(
              { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } },
              401,
            ),
          );
        }

        return Promise.resolve(
          createJsonResponse(
            {
              user: {
                id: 'user-1',
                email: 'owner@vimcore.test',
                username: 'owner',
              },
              memberships: [{ companyId: 'company-1', role: 'company-owner' }],
            },
            200,
          ),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'ocean' }, 200));
      }

      if (url.endsWith('/me/company')) {
        return Promise.resolve(
          createJsonResponse(
            { companyId: 'company-1', name: 'Northwind' },
            200,
          ),
        );
      }

      if (url.endsWith('/auth/login')) {
        expect(init?.method).toBe('POST');
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/login']} />);

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'owner@vimcore.test' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(
      await screen.findByRole('heading', { name: 'ERP dashboard' }),
    ).toBeInTheDocument();
    expect(screen.getByText('owner@vimcore.test')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
