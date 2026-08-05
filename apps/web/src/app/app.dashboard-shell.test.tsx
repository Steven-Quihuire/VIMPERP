import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { useAuthStore } from '../features/auth/infrastructure/auth-store';

const createSessionResponse = (overrides?: Record<string, unknown>) => ({
  user: {
    id: 'user-1',
    email: 'owner@vimcore.test',
    username: 'owner',
  },
  memberships: [{ companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null }],
  activeCompany: {
    companyId: 'company-1',
    status: 'active',
  },
  activeLocalId: null,
  capabilities: ['catalog.read', 'catalog.write', 'catalog.delete'],
  ...overrides,
});

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

const stripQuery = (url: string): string => url.split('?')[0] ?? url;

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
  useAuthStore.getState().clearSession();
  document.documentElement.removeAttribute('data-palette');
  document.documentElement.removeAttribute('style');
});

describe('App dashboard shell', () => {
  it('shows the provisioning runs workspace to platform admins', async () => {
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

      if (stripQuery(url).endsWith('/admin/provisioning-runs')) {
        return Promise.resolve(
          createJsonResponse(
            {
              provisioningRuns: [
                {
                  id: 'run-1',
                  correlationId: 'corr-1',
                  requestId: 'req-1',
                  actorUserId: 'admin-1',
                  process: 'company-onboarding',
                  status: 'failed',
                  attempt: 1,
                  idempotencyKey: null,
                  errorSummary: 'Company owner already exists',
                  createdAt: '2026-07-28T10:00:00.000Z',
                  updatedAt: '2026-07-28T10:01:00.000Z',
                },
              ],
              nextCursor: null,
            },
            200,
          ),
        );
      }

      if (url.endsWith('/admin/provisioning-runs/run-1')) {
        return Promise.resolve(
          createJsonResponse(
            {
              id: 'run-1',
              correlationId: 'corr-1',
              requestId: 'req-1',
              actorUserId: 'admin-1',
              process: 'company-onboarding',
              status: 'failed',
              attempt: 1,
              idempotencyKey: null,
              errorSummary: 'Company owner already exists',
              createdAt: '2026-07-28T10:00:00.000Z',
              updatedAt: '2026-07-28T10:01:00.000Z',
              steps: [
                {
                  id: 'step-1',
                  name: 'company-creation',
                  status: 'failed',
                  attempt: 1,
                  detail: { reason: 'duplicate-owner' },
                  createdAt: '2026-07-28T10:01:00.000Z',
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

    render(<App initialEntries={['/dashboard/admin/provisioning-runs']} />);

    expect(
      await screen.findByRole('heading', { name: 'Historial de creación de empresas' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Company owner already exists')).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Ver detalles' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Errores de aplicación' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Eventos de auditoría' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /retry|delete/i }),
    ).not.toBeInTheDocument();

    render(<App initialEntries={['/dashboard/admin/provisioning-runs/run-1']} />);

    expect(
      await screen.findByRole('heading', { name: 'Detalle del proceso' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('company-creation')).toBeInTheDocument();
    expect(await screen.findByText(/duplicate-owner/)).toBeInTheDocument();
  });

  it('shows application error and audit event admin screens to platform admins', async () => {
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

      if (stripQuery(url).endsWith('/admin/application-errors')) {
        return Promise.resolve(
          createJsonResponse(
            {
              applicationErrors: [
                {
                  id: 'error-1',
                  correlationId: 'corr-2',
                  requestId: 'req-2',
                  fingerprint: 'fingerprint-1',
                  status: '500',
                  code: 'INTERNAL_SERVER_ERROR',
                  message: 'Provisioning failed',
                  createdAt: '2026-07-28T11:00:00.000Z',
                },
              ],
              nextCursor: null,
            },
            200,
          ),
        );
      }

      if (url.endsWith('/admin/application-errors/error-1')) {
        return Promise.resolve(
          createJsonResponse(
            {
              id: 'error-1',
              correlationId: 'corr-2',
              requestId: 'req-2',
              fingerprint: 'fingerprint-1',
              status: '500',
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Provisioning failed',
              stack: 'stack line 1',
              context: { process: 'company-onboarding', route: '/companies' },
              createdAt: '2026-07-28T11:00:00.000Z',
            },
            200,
          ),
        );
      }

      if (stripQuery(url).endsWith('/admin/audit-events')) {
        return Promise.resolve(
          createJsonResponse(
            {
              auditEvents: [
                {
                  id: 'audit-1',
                  actorUserId: 'admin-1',
                  companyId: 'company-1',
                  type: 'company.created',
                  correlationId: 'corr-3',
                  entityType: 'company',
                  entityId: 'company-1',
                  createdAt: '2026-07-28T12:00:00.000Z',
                },
              ],
              nextCursor: null,
            },
            200,
          ),
        );
      }

      if (url.endsWith('/admin/audit-events/audit-1')) {
        return Promise.resolve(
          createJsonResponse(
            {
              id: 'audit-1',
              actorUserId: 'admin-1',
              companyId: 'company-1',
              type: 'company.created',
              correlationId: 'corr-3',
              entityType: 'company',
              entityId: 'company-1',
              createdAt: '2026-07-28T12:00:00.000Z',
              details: { source: 'admin-api' },
              oldValues: null,
              newValues: { name: 'Northwind' },
            },
            200,
          ),
        );
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard/admin/application-errors']} />);

    expect(
      await screen.findByRole('heading', { name: 'Historial de errores de aplicación' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Provisioning failed')).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Ver detalles' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry|delete/i })).not.toBeInTheDocument();

    cleanup();
    render(<App initialEntries={['/dashboard/admin/application-errors/error-1']} />);

    expect(
      await screen.findByRole('heading', { name: 'Detalle del error de aplicación' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('stack line 1')).toBeInTheDocument();
    expect(await screen.findByText(/company-onboarding/)).toBeInTheDocument();

    cleanup();
    render(<App initialEntries={['/dashboard/admin/audit-events']} />);

    expect(
      await screen.findByRole('heading', { name: 'Eventos de auditoría' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('company.created')).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Ver detalles' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry|delete/i })).not.toBeInTheDocument();

    cleanup();
    render(<App initialEntries={['/dashboard/admin/audit-events/audit-1']} />);

    expect(
      await screen.findByRole('heading', { name: 'Detalle del evento de auditoría' }),
    ).toBeInTheDocument();
    expect(
      await screen.findAllByText((_, element) =>
        element?.textContent?.includes('admin-api') ?? false,
      ),
    ).not.toHaveLength(0);
    expect(
      await screen.findAllByText((_, element) =>
        element?.textContent?.includes('Northwind') ?? false,
      ),
    ).not.toHaveLength(0);
  });

  it('redirects company-scoped users away from admin observability routes', async () => {
    setDesktopBrowser(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0',
      false,
    );

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(
            createSessionResponse(),
            200,
          ),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'forest' }, 200));
      }

      if (url.endsWith('/me/company')) {
        return Promise.resolve(
          createJsonResponse({ companyId: 'company-1', name: 'Northwind' }, 200),
        );
      }

      if (url.includes('/companies/') && url.endsWith('/locals')) {
        return Promise.resolve(createJsonResponse([], 200));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard/admin/provisioning-runs']} />);

    expect(await screen.findByRole('heading', { name: 'Bienvenido a Northwind' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Historial de creación de empresas' })).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) => readUrl(input).includes('/admin/')),
    ).toBe(false);
  });

  it('shows empty-state copy without retry or delete affordances in admin workspaces', async () => {
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

      if (stripQuery(url).endsWith('/admin/provisioning-runs')) {
        return Promise.resolve(
          createJsonResponse({ provisioningRuns: [], nextCursor: null }, 200),
        );
      }

      if (stripQuery(url).endsWith('/admin/application-errors')) {
        return Promise.resolve(
          createJsonResponse({ applicationErrors: [], nextCursor: null }, 200),
        );
      }

      if (stripQuery(url).endsWith('/admin/audit-events')) {
        return Promise.resolve(
          createJsonResponse({ auditEvents: [], nextCursor: null }, 200),
        );
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard/admin/provisioning-runs']} />);
    expect(await screen.findByText('No hay empresas registradas')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No hay registros que coincidan con los filtros actuales.',
      ),
    ).toBeInTheDocument();

    render(<App initialEntries={['/dashboard/admin/application-errors']} />);
    expect(await screen.findByText('No hay errores registrados')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No hay errores que coincidan con los filtros actuales.',
      ),
    ).toBeInTheDocument();

    render(<App initialEntries={['/dashboard/admin/audit-events']} />);
    expect(await screen.findByText('No hay eventos de auditoría')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No hay eventos que coincidan con los filtros actuales.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry|delete/i })).not.toBeInTheDocument();
  });

  it('exposes exactly 3 workspace items (Inicio, Items, Categorías) in the company-owner sidebar', async () => {
    setDesktopBrowser(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0',
      false,
    );

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(
            createSessionResponse(),
            200,
          ),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'ocean' }, 200));
      }

if (url.endsWith('/me/company')) {
        return Promise.resolve(
          createJsonResponse({ companyId: 'company-1', name: 'Northwind' }, 200),
        );
      }

      if (url.includes('/companies/') && url.endsWith('/locals')) {
        return Promise.resolve(createJsonResponse([], 200));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard']} />);

    expect(
      await screen.findByRole('heading', { name: 'Bienvenido a Northwind' }),
    ).toBeInTheDocument();

    const inicioLink = screen.getByRole('link', { name: 'Inicio' });
    expect(inicioLink).toHaveAttribute('href', '/dashboard');

    const itemsLink = screen.getByRole('link', { name: 'Items' });
    expect(itemsLink).toHaveAttribute('href', '/dashboard/items');

    const categoriesLink = screen.getByRole('link', { name: 'Categorías' });
    expect(categoriesLink).toHaveAttribute('href', '/dashboard/categories');

    expect(screen.queryByRole('link', { name: 'Sales' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Compras' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Produccion' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Finanzas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Proyectos' })).not.toBeInTheDocument();
  });

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
            createSessionResponse(),
            200,
          ),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'ocean' }, 200));
      }

      if (url.endsWith('/me/company')) {
        return Promise.resolve(
          createJsonResponse({ companyId: 'company-1', name: 'Northwind' }, 200),
        );
      }

      if (url.includes('/companies/') && url.endsWith('/locals')) {
        return Promise.resolve(createJsonResponse([], 200));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard']} />);

    expect(await screen.findByRole('heading', { name: 'Bienvenido a Northwind' })).toBeInTheDocument();
    expect(screen.getAllByText('Northwind')).not.toHaveLength(0);
    expect(
      screen.getAllByRole('link', { name: 'Inicio' }).find((element) =>
        element.getAttribute('href') === '/dashboard'
      ),
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Open CRM module' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Sales module' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Inventory module' })).toBeInTheDocument();
    expect(screen.queryByText('Bienvenido hermoso')).not.toBeInTheDocument();

    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/admin/companies/summary',
      expect.anything(),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/admin/notifications',
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

    expect(await screen.findByRole('heading', { name: 'Bienvenido hermoso' })).toBeInTheDocument();
    expect((await screen.findAllByText('Northwind registered')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Actividad operativa')).toBeInTheDocument();
  });

  it('renders the companies alias inside the dashboard shell', async () => {
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
              totalCompanies: 1,
              notificationCount: 0,
              auditEventCount: 0,
              companies: [
                {
                  id: 'company-1',
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
        return Promise.resolve(createJsonResponse({ notifications: [] }, 200));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/companies']} />);

    expect(await screen.findByRole('heading', { name: 'Empresas' })).toBeInTheDocument();
    expect((await screen.findAllByText('Northwind')).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Empresas' })).toHaveAttribute(
      'href',
      '/dashboard/admin/companies',
    );
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
            createSessionResponse(),
            200,
          ),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'forest' }, 200));
      }

      if (url.endsWith('/me/company')) {
        return Promise.resolve(
          createJsonResponse({ companyId: 'company-1', name: 'Northwind' }, 200),
        );
      }

      if (url.includes('/companies/') && url.endsWith('/locals')) {
        return Promise.resolve(createJsonResponse([], 200));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard']} />);

    expect(await screen.findByRole('heading', { name: 'Bienvenido a Northwind' })).toBeInTheDocument();

    await waitFor(() => {
      expect(document.documentElement.dataset.palette).toBe('forest');
    });

    expect(document.documentElement.style.getPropertyValue('--color-surface')).toBeTruthy();
    expect(screen.queryByRole('switch', { name: /dark/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /light/i })).not.toBeInTheDocument();
  });

  it('redirects company-scoped routes without an active company back to the dashboard selector', async () => {
    setDesktopBrowser(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0',
      false,
    );

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(
            createSessionResponse({
              memberships: [
                { companyId: 'company-1', role: 'company-owner' },
                { companyId: 'company-2', role: 'company-owner' },
              ],
              activeCompany: null,
              capabilities: [],
            }),
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

    render(<App initialEntries={['/dashboard/items']} />);

    expect(
      await screen.findByRole('heading', { name: 'Selecciona una empresa' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Items' }),
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/me/company',
      expect.anything(),
    );
  });

  it('persists a company switch across reloads and keeps blocked companies inside the dashboard shell', async () => {
    setDesktopBrowser(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0',
      false,
    );

    let activeCompanyId = 'company-1';

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(
            createSessionResponse({
              memberships: [
                { companyId: 'company-1', role: 'company-owner' },
                { companyId: 'company-2', role: 'company-owner' },
              ],
              activeCompany:
                activeCompanyId === 'company-1'
                  ? { companyId: 'company-1', status: 'active' }
                  : { companyId: 'company-2', status: 'provisioning_failed' },
              capabilities:
                activeCompanyId === 'company-1'
                  ? ['catalog.read', 'catalog.write', 'catalog.delete']
                  : ['catalog.read', 'catalog.write', 'catalog.delete'],
            }),
            200,
          ),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'forest' }, 200));
      }

      if (url.endsWith('/me/company')) {
        return Promise.resolve(
          createJsonResponse(
            activeCompanyId === 'company-1'
              ? { companyId: 'company-1', name: 'Northwind' }
              : { companyId: 'company-2', name: 'Southwind' },
            200,
          ),
        );
      }

      if (url.endsWith('/me/active-company')) {
        expect(init?.method).toBe('PATCH');
        activeCompanyId = 'company-2';
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      if (url.includes('/companies/') && url.endsWith('/locals')) {
        return Promise.resolve(createJsonResponse([], 200));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const { unmount } = render(<App initialEntries={['/dashboard']} />);

    expect(
      await screen.findByRole('heading', { name: 'Bienvenido a Northwind' }),
    ).toBeInTheDocument();

    const switcherButton = screen.getByRole('button', { name: /^Northwind/i });
    fireEvent.pointerDown(switcherButton);
    fireEvent.click(switcherButton);
    fireEvent.click(await screen.findByText(/Empresa 2/i));

    expect(
      await screen.findByRole('heading', { name: 'Estado de tu empresa' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'No podemos mostrar la información de esta empresa en este momento. Contacta a soporte para continuar.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/provisioning_failed/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/me/active-company',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    unmount();

    render(<App initialEntries={['/dashboard/items']} />);

    expect(
      await screen.findByRole('heading', { name: 'Estado de tu empresa' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Items' })).not.toBeInTheDocument();
  });
});
