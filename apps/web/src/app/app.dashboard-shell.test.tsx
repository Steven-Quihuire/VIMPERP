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

      if (url.endsWith('/admin/provisioning-runs')) {
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
      await screen.findByRole('heading', { name: 'Provisioning runs' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Company owner already exists')).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Open provisioning run run-1' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Application errors' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Audit events' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /retry|delete/i }),
    ).not.toBeInTheDocument();

    render(<App initialEntries={['/dashboard/admin/provisioning-runs/run-1']} />);

    expect(
      await screen.findByRole('heading', { name: 'Provisioning run detail' }),
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

      if (url.endsWith('/admin/application-errors')) {
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

      if (url.endsWith('/admin/audit-events')) {
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
      await screen.findByRole('heading', { name: 'Application errors' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Provisioning failed')).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Open application error error-1' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry|delete/i })).not.toBeInTheDocument();

    render(<App initialEntries={['/dashboard/admin/application-errors/error-1']} />);

    expect(
      await screen.findByRole('heading', { name: 'Application error detail' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('stack line 1')).toBeInTheDocument();
    expect(await screen.findByText(/company-onboarding/)).toBeInTheDocument();

    render(<App initialEntries={['/dashboard/admin/audit-events']} />);

    expect(
      await screen.findByRole('heading', { name: 'Audit events' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('company.created')).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Open audit event audit-1' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry|delete/i })).not.toBeInTheDocument();

    render(<App initialEntries={['/dashboard/admin/audit-events/audit-1']} />);

    expect(
      await screen.findByRole('heading', { name: 'Audit event detail' }),
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

    render(<App initialEntries={['/dashboard/admin/provisioning-runs']} />);

    expect(await screen.findByRole('heading', { name: 'ERP dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Provisioning runs' })).not.toBeInTheDocument();
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

      if (url.endsWith('/admin/provisioning-runs')) {
        return Promise.resolve(
          createJsonResponse({ provisioningRuns: [], nextCursor: null }, 200),
        );
      }

      if (url.endsWith('/admin/application-errors')) {
        return Promise.resolve(
          createJsonResponse({ applicationErrors: [], nextCursor: null }, 200),
        );
      }

      if (url.endsWith('/admin/audit-events')) {
        return Promise.resolve(
          createJsonResponse({ auditEvents: [], nextCursor: null }, 200),
        );
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard/admin/provisioning-runs']} />);
    expect(await screen.findByText('No provisioning runs found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No provisioning runs match the current filters. Retry and delete actions are not available in the MVP.',
      ),
    ).toBeInTheDocument();

    render(<App initialEntries={['/dashboard/admin/application-errors']} />);
    expect(await screen.findByText('No application errors found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No application errors match the current filters. Retry and delete actions are not available in the MVP.',
      ),
    ).toBeInTheDocument();

    render(<App initialEntries={['/dashboard/admin/audit-events']} />);
    expect(await screen.findByText('No audit events found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No audit events match the current filters. Retry and delete actions are not available in the MVP.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry|delete/i })).not.toBeInTheDocument();
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
