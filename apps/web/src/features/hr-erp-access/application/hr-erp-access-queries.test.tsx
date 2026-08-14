import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  hrErpAccessQueryKeys,
  useAcceptInvitation,
  useInvitations,
} from './hr-erp-access-queries';

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('hr-erp-access query hooks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses stable query keys', () => {
    expect(hrErpAccessQueryKeys.pendingInvitations('company-1')).toEqual([
      'hr-erp-access',
      'pending-invitations',
      'company-1',
    ]);
  });

  it('lists invitations and runs create, revoke, and accept mutations with cache invalidation', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.endsWith('/companies/company-1/hr-erp-access/invitations') && !init?.method) {
        return Promise.resolve(createJsonResponse([{ id: 'invitation-1', employeeId: 'employee-1' }]));
      }

      if (url.endsWith('/companies/company-1/hr-erp-access/invitations') && init?.method === 'POST') {
        return Promise.resolve(
          createJsonResponse({ invitationId: 'invitation-2', companyId: 'company-1' }, 201),
        );
      }

      if (
        url.endsWith('/companies/company-1/hr-erp-access/employees/employee-1/revoke') &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      if (url.endsWith('/hr-erp-access/invitations/token-1/accept') && init?.method === 'POST') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const wrapper = createWrapper(queryClient);
    const invitationsHook = renderHook(() => useInvitations('company-1'), { wrapper });
    const acceptHook = renderHook(() => useAcceptInvitation(), { wrapper });

    await waitFor(() => {
      expect(invitationsHook.result.current.invitationsQuery.isSuccess).toBe(true);
    });

    expect(invitationsHook.result.current.invitationsQuery.data).toEqual([
      { id: 'invitation-1', employeeId: 'employee-1' },
    ]);

    await expect(
      invitationsHook.result.current.createInvitationMutation.mutateAsync({
        companyId: 'company-1',
        employeeId: 'employee-1',
        inviteeEmail: 'person@vimcore.test',
      }),
    ).resolves.toMatchObject({ invitationId: 'invitation-2' });

    await expect(
      invitationsHook.result.current.revokeAccessMutation.mutateAsync({
        companyId: 'company-1',
        employeeId: 'employee-1',
      }),
    ).resolves.toBeUndefined();

    await expect(
      acceptHook.result.current.mutateAsync({ token: 'token-1', password: 'secret123' }),
    ).resolves.toBeUndefined();

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: hrErpAccessQueryKeys.pendingInvitations('company-1'),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['auth', 'me'] });
    });
  });
});
