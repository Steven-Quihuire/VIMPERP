import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { useAuthStore } from '../features/auth/infrastructure/auth-store';

afterEach(() => {
  useAuthStore.getState().clearSession();
  vi.unstubAllGlobals();
});

const createSessionResponse = () => ({
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
  activeScope: null,
  capabilities: ['catalog.read', 'catalog.write'],
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

const setDesktopBrowser = () => {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0',
  });

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(pointer: coarse)' ? false : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe('App HR routes', () => {
  it('registers the HR employee, position, ERP access, and approval-policy routes', async () => {
    setDesktopBrowser();

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = readUrl(input);

        if (url.endsWith('/auth/me')) {
          return Promise.resolve(createJsonResponse(createSessionResponse(), 200));
        }

        if (url.endsWith('/me/preferences')) {
          return Promise.resolve(createJsonResponse({ paletteId: 'ocean' }, 200));
        }

        if (url.endsWith('/me/company')) {
          return Promise.resolve(
            createJsonResponse({ companyId: 'company-1', name: 'Northwind' }, 200),
          );
        }

        if (url.endsWith('/companies/company-1/hr-employees')) {
          return Promise.resolve(createJsonResponse([], 200));
        }

        if (url.endsWith('/companies/company-1/hr-employees/positions')) {
          return Promise.resolve(createJsonResponse([], 200));
        }

        if (url.endsWith('/companies/company-1/hr-erp-access/invitations')) {
          return Promise.resolve(createJsonResponse([], 200));
        }

        if (url.endsWith('/companies/company-1/approval-policies')) {
          return Promise.resolve(createJsonResponse([], 200));
        }

        if (url.endsWith('/companies/company-1/timesheets')) {
          return Promise.resolve(createJsonResponse([], 200));
        }

        if (url.endsWith('/companies/company-1/timesheets/period-1')) {
          return Promise.resolve(
            createJsonResponse({
              id: 'period-1',
              companyId: 'company-1',
              employeeAssignmentId: 'assignment-1',
              periodStart: '2026-08-11',
              periodEnd: '2026-08-17',
              status: 'draft',
              submittedAt: null,
              submittedByUserId: null,
              approvedAt: null,
              approvedByUserId: null,
              rejectionReason: null,
              approvalPolicyId: null,
              createdAt: '2026-08-11T00:00:00.000Z',
              updatedAt: '2026-08-11T00:00:00.000Z',
            }, 200),
          );
        }

        if (url.endsWith('/companies/company-1/timesheets/period-1/entries')) {
          return Promise.resolve(createJsonResponse([], 200));
        }

        if (url.endsWith('/companies/company-1/hr-responsibility')) {
          return Promise.resolve(
            createJsonResponse(
              {
                companyId: 'company-1',
                hasResponsibles: false,
                responsibles: [],
                availableUsers: [],
                pendingInvitations: [],
              },
              200,
            ),
          );
        }

        if (url.endsWith('/companies/company-1/org-tree')) {
          return Promise.resolve(
            createJsonResponse(
              [
                {
                  ref: { scopeType: 'company', scopeId: 'company-1' },
                  parentRef: null,
                  companyId: 'company-1',
                  name: 'Northwind',
                },
              ],
              200,
            ),
          );
        }

        throw new Error(`unexpected request: ${url}`);
      }),
    );

    render(<App initialEntries={['/dashboard/hr/employees']} />);
    expect(await screen.findByRole('heading', { name: 'Empleados' })).toBeInTheDocument();

    cleanup();
    render(<App initialEntries={['/dashboard/hr/positions']} />);
    expect(await screen.findByRole('heading', { name: 'Gestionar puestos' })).toBeInTheDocument();

    cleanup();
    render(<App initialEntries={['/dashboard/hr/erp-access']} />);
    expect(await screen.findByRole('heading', { name: 'Invitaciones pendientes' })).toBeInTheDocument();

    cleanup();
    render(<App initialEntries={['/dashboard/hr/timesheets']} />);
    expect(await screen.findByRole('heading', { name: 'Registro de horas' })).toBeInTheDocument();

      cleanup();
      render(<App initialEntries={['/dashboard/hr/timesheets/period-1']} />);
      expect(await screen.findByRole('heading', { name: 'Detalle del período' })).toBeInTheDocument();
  });
});
