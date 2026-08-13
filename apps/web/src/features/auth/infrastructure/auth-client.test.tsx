import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAuthRepository } from './auth-client';
import { useSwitchActiveScope } from '../presentation/use-auth';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const createWrapper = (queryClient: QueryClient) =>
  ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

describe('auth client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('posts active-scope changes through the auth repository', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith('/auth/me/active-scope') && init?.method === 'POST') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
    });

    vi.stubGlobal('fetch', fetchMock);

    await createAuthRepository('http://api.test').switchActiveScope({
      scope: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/auth/me/active-scope',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          scope: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
        }),
      }),
    );
  });

  it('invalidates auth, items, categories, and org-tree after switching active scope', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith('/auth/me/active-scope') && init?.method === 'POST') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          json({
            user: { id: 'user-1', email: 'owner@vimcore.test', username: 'owner' },
            memberships: [
              { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
            ],
            activeCompany: { companyId: 'company-1', status: 'active' },
            activeScope: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
            activeLocalId: null,
            capabilities: ['catalog.read', 'catalog.write', 'catalog.delete'],
          }),
        );
      }

      throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const hook = renderHook(() => useSwitchActiveScope('http://api.test'), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      hook.result.current.mutateAsync({
        scope: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
      }),
    ).resolves.toMatchObject({
      activeScope: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['items'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['categories'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['org-tree', 'company-1'] });
    });
  });
});
