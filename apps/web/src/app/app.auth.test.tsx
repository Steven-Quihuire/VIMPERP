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

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /github/i })).not.toBeInTheDocument();
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
          return Promise.resolve(createJsonResponse(
            { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } },
            401,
          ));
        }

        return Promise.resolve(createJsonResponse(
          {
            user: {
              id: 'user-1',
              email: 'owner@vimcore.test',
              username: 'owner',
            },
            memberships: [{ companyId: 'company-1', role: 'company-owner' }],
          },
          200,
        ));
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'ocean' }, 200));
      }

      if (url.endsWith('/auth/login')) {
        expect(init?.method).toBe('POST');
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/login']} />);

    fireEvent.change(screen.getByLabelText('Email or username'), {
      target: { value: 'owner@vimcore.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'ERP dashboard' })).toBeInTheDocument();
    expect(screen.getByText('owner@vimcore.test')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/auth/login',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
