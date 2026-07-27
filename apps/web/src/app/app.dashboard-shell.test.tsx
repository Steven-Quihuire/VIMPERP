import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

const setDesktopBrowser = (userAgent: string, coarsePointer: boolean) => {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  });

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(pointer: coarse)' ? coarsePointer : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('data-palette');
  document.documentElement.removeAttribute('style');
});

describe('App dashboard shell', () => {
  it('shows company-owner dashboard modules without requesting admin endpoints', async () => {
    setDesktopBrowser(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0',
      false,
    );

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
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

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard']} />);

    expect(await screen.findByRole('heading', { name: 'ERP dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CRM' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sales' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inventory' })).toBeInTheDocument();
    expect(screen.queryByText('Platform overview')).not.toBeInTheDocument();

    expect(fetchMock).not.toHaveBeenCalledWith(
      'http://localhost:3000/admin/companies/summary',
      expect.anything(),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      'http://localhost:3000/admin/notifications',
      expect.anything(),
    );
  });

  it('shows admin operational cards and notifications for platform admins', async () => {
    setDesktopBrowser(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0',
      false,
    );

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(
            {
              user: {
                id: 'admin-1',
                email: 'admin@vimcore.test',
                username: 'admin',
              },
              memberships: [{ companyId: null, role: 'platform-admin' }],
            },
            200,
          ),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'violet' }, 200));
      }

      if (url.endsWith('/admin/companies/summary')) {
        return Promise.resolve(
          createJsonResponse(
            {
              totalCompanies: 2,
              notificationCount: 1,
              auditEventCount: 3,
              companies: [
                {
                  id: 'company-2',
                  name: 'Northwind',
                  createdAt: '2026-07-27T10:00:00.000Z',
                },
              ],
            },
            200,
          ),
        );
      }

      if (url.endsWith('/admin/notifications')) {
        return Promise.resolve(
          createJsonResponse(
            {
              notifications: [
                {
                  id: 'notification-1',
                  companyId: 'company-2',
                  targetRole: 'platform-admin',
                  type: 'company.registered',
                  message: 'Northwind registered',
                  createdAt: '2026-07-27T10:01:00.000Z',
                },
              ],
            },
            200,
          ),
        );
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard']} />);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) =>
          readUrl(input).endsWith('/admin/companies/summary'),
        ),
      ).toBe(true);
    });

    expect(await screen.findByRole('heading', { name: 'Platform overview' })).toBeInTheDocument();
    expect(await screen.findByText('Northwind registered')).toBeInTheDocument();
    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  it('blocks mobile browsers with desktop guidance', async () => {
    setDesktopBrowser(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      true,
    );

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard']} />);

    expect(await screen.findByRole('heading', { name: 'Desktop browser required' })).toBeInTheDocument();
    expect(screen.getByText('Please continue from a desktop or laptop browser to use Vimcore ERP.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('applies the saved palette to the html element and does not render a dark mode toggle', async () => {
    setDesktopBrowser(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0',
      false,
    );

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
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
        return Promise.resolve(createJsonResponse({ paletteId: 'forest' }, 200));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard']} />);

    expect(await screen.findByRole('heading', { name: 'ERP dashboard' })).toBeInTheDocument();

    await waitFor(() => {
      expect(document.documentElement.dataset.palette).toBe('forest');
    });

    expect(document.documentElement.style.getPropertyValue('--color-surface')).toBeTruthy();
    expect(screen.queryByRole('switch', { name: /dark/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /light/i })).not.toBeInTheDocument();
  });
});
