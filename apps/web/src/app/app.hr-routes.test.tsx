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

describe('App HR routes', () => {
  it('registers the HR employee, position, ERP access, and approval-policy routes', async () => {
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
    expect(await screen.findByRole('heading', { name: 'Empleados de Recursos Humanos' })).toBeInTheDocument();

    cleanup();
    render(<App initialEntries={['/dashboard/hr/positions']} />);
    expect(await screen.findByRole('heading', { name: 'Puestos de Recursos Humanos' })).toBeInTheDocument();

    cleanup();
    render(<App initialEntries={['/dashboard/hr/erp-access']} />);
    expect(await screen.findByRole('heading', { name: 'Invitaciones de acceso al ERP' })).toBeInTheDocument();

    cleanup();
    render(<App initialEntries={['/dashboard/hr/approval-policies']} />);
    expect(await screen.findByRole('heading', { name: 'Políticas de aprobación' })).toBeInTheDocument();

    cleanup();
    render(<App initialEntries={['/dashboard/hr/responsibility']} />);
    expect(await screen.findByRole('heading', { name: 'Responsables de RRHH' })).toBeInTheDocument();

    cleanup();
    render(<App initialEntries={['/hr/responsibility']} />);
    expect(await screen.findByRole('heading', { name: 'Responsables de RRHH' })).toBeInTheDocument();
  });
});
