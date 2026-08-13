import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  nodeManagementQueryKeys,
  useAcceptNodeManagementInvitation,
  useCreateNodeManagementInvitation,
  useNodeManagementInvitation,
  useNodeManagementPendingInvitations,
  useNodeManagementResponsibilities,
} from './node-management-queries';

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

describe('node management query hooks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses stable query keys', () => {
    expect(nodeManagementQueryKeys.responsibilities('company-1')).toEqual([
      'node-management',
      'responsibilities',
      'company-1',
    ]);
    expect(nodeManagementQueryKeys.pendingInvitations('company-1')).toEqual([
      'node-management',
      'pending-invitations',
      'company-1',
    ]);
    expect(nodeManagementQueryKeys.invitation('token-1')).toEqual([
      'node-management',
      'invitation',
      'token-1',
    ]);
  });

  it('fetches responsibilities and pending invitations through TanStack Query', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.endsWith('/node-management/responsibilities')) {
        return Promise.resolve(
          createJsonResponse([{ id: 'resp-1', scopeType: 'local', scopeId: 'local-1' }]),
        );
      }

      if (url.endsWith('/node-management/pending-invitations')) {
        return Promise.resolve(
          createJsonResponse([{ id: 'inv-1', scopeType: 'area', scopeId: 'area-1' }]),
        );
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const wrapper = createWrapper(queryClient);
    const responsibilitiesHook = renderHook(
      () => useNodeManagementResponsibilities('company-1'),
      { wrapper },
    );
    const pendingHook = renderHook(
      () => useNodeManagementPendingInvitations('company-1'),
      { wrapper },
    );

    await waitFor(() =>
      expect(responsibilitiesHook.result.current.isSuccess).toBe(true),
    );
    await waitFor(() => expect(pendingHook.result.current.isSuccess).toBe(true));

    expect(responsibilitiesHook.result.current.data).toEqual([
      { id: 'resp-1', scopeType: 'local', scopeId: 'local-1' },
    ]);
    expect(pendingHook.result.current.data).toEqual([
      { id: 'inv-1', scopeType: 'area', scopeId: 'area-1' },
    ]);
  });

  it('creates invitations, reads invitation metadata, and accepts them through TanStack Query mutations', async () => {
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

      if (url.endsWith('/companies/company-1/node-management/invitations')) {
        return Promise.resolve(
          createJsonResponse({
            invitationId: 'inv-2',
            invitationToken: 'token-2',
            companyId: 'company-1',
          }, 201),
        );
      }

      if (url.endsWith('/node-management/invitations/token-2/accept')) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      if (url.endsWith('/node-management/invitations/token-2')) {
        return Promise.resolve(
          createJsonResponse({
            id: 'inv-2',
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
    });

    vi.stubGlobal('fetch', fetchMock);

    const wrapper = createWrapper(queryClient);
    const createHook = renderHook(() => useCreateNodeManagementInvitation(), { wrapper });
    const invitationHook = renderHook(() => useNodeManagementInvitation('token-2'), { wrapper });
    const acceptHook = renderHook(() => useAcceptNodeManagementInvitation(), { wrapper });

    await expect(
      createHook.result.current.mutateAsync({
        companyId: 'company-1',
        scopeType: 'local',
        scopeId: 'local-1',
        inviteeEmail: 'manager@vimcore.test',
      }),
    ).resolves.toMatchObject({ invitationId: 'inv-2' });

    await waitFor(() => expect(invitationHook.result.current.isSuccess).toBe(true));
    expect(invitationHook.result.current.data).toMatchObject({ id: 'inv-2', userExists: false });

    await expect(
      acceptHook.result.current.mutateAsync({ token: 'token-2', password: 'secret123' }),
    ).resolves.toBeUndefined();

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: nodeManagementQueryKeys.pendingInvitations('company-1'),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: nodeManagementQueryKeys.responsibilities('company-1'),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['auth', 'me'] });
    });
  });
});
