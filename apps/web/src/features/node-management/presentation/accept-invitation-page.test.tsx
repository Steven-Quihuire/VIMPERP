import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AcceptInvitationPage } from './accept-invitation-page';

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const createWrapper = (initialEntries: string[]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/accept-invitation/:token" element={children} />
          <Route path="/dashboard" element={<div>Dashboard home</div>} />
          <Route path="/dashboard/organization" element={<div>Organization landing</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AcceptInvitationPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('accepts an invitation for an existing user and lands in the organization page', async () => {
    let authCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

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
            createJsonResponse({
              user: { id: 'user-1', email: 'manager@vimcore.test', username: 'manager' },
              memberships: [{ companyId: 'company-1', role: 'company-user', divisionId: null, localId: null }],
              activeCompany: { companyId: 'company-1', status: 'active' },
              activeScope: null,
              activeLocalId: null,
              capabilities: [],
            }),
          );
        }

        if (url.endsWith('/node-management/invitations/token-existing') && !init?.method) {
          return Promise.resolve(
            createJsonResponse({
              id: 'inv-1',
              companyId: 'company-1',
              companyName: 'Vimcore Labs',
              scopeNodeId: 'scope-node-1',
              scopeType: 'local',
              scopeId: 'local-1',
              scopeName: 'Main Local',
              inviteeEmail: 'manager@vimcore.test',
              managedRoleKey: 'node-manager',
              baseMembershipRole: 'company-user',
              expiresAt: '2026-08-20T10:00:00.000Z',
              status: 'pending',
              userExists: true,
            }),
          );
        }

        if (url.endsWith('/node-management/invitations/token-existing/accept') && init?.method === 'POST') {
          return Promise.resolve(new Response(null, { status: 204 }));
        }

        throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
      }),
    );

    render(<AcceptInvitationPage />, {
      wrapper: createWrapper(['/accept-invitation/token-existing']),
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar invitación' }));

    expect(await screen.findByText('Organization landing')).toBeInTheDocument();
  });

  it('requires password setup when the invited user does not exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.endsWith('/auth/me')) {
          return Promise.resolve(
            createJsonResponse(
              { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } },
              401,
            ),
          );
        }

        if (url.endsWith('/node-management/invitations/token-new') && !init?.method) {
          return Promise.resolve(
            createJsonResponse({
              id: 'inv-1',
              companyId: 'company-1',
              companyName: 'Vimcore Labs',
              scopeNodeId: 'scope-node-1',
              scopeType: 'local',
              scopeId: 'local-1',
              scopeName: 'Main Local',
              inviteeEmail: 'manager@vimcore.test',
              managedRoleKey: 'node-manager',
              baseMembershipRole: 'company-user',
              expiresAt: '2026-08-20T10:00:00.000Z',
              status: 'pending',
              userExists: false,
            }),
          );
        }

        throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
      }),
    );

    render(<AcceptInvitationPage />, {
      wrapper: createWrapper(['/accept-invitation/token-new']),
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar invitación' }));

    expect(
      await screen.findByText('La contraseña debe tener al menos 8 caracteres.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña para la invitación')).toBeInTheDocument();
  });
});
