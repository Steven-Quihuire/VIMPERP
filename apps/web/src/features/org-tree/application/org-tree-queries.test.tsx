import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { orgTreeQueryKeys, useOrgTree } from './org-tree-queries';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

const wrapper = (queryClient: QueryClient) => ({ children }: { children: ReactNode }) =>
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

describe('org-tree query hooks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses a stable query key for the authorized org tree', () => {
    expect(orgTreeQueryKeys.tree('company-1')).toEqual(['org-tree', 'company-1']);
  });

  it('fetches the authorized org tree and stays idle without an active company or active scope', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        json([
          {
            ref: { scopeType: 'local', scopeId: 'local-1' },
            parentRef: { scopeType: 'division', scopeId: 'division-1' },
            companyId: 'company-1',
            name: 'Central Store',
          },
        ]),
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const active = renderHook(() => useOrgTree('company-1', 'http://api.test'), {
      wrapper: wrapper(queryClient),
    });
    const idle = renderHook(() => useOrgTree(undefined, 'http://api.test'), {
      wrapper: wrapper(queryClient),
    });
    const disabled = renderHook(
      () => useOrgTree('company-1', 'http://api.test', false),
      {
        wrapper: wrapper(queryClient),
      },
    );

    await waitFor(() => expect(active.result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/companies/company-1/org-tree',
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(active.result.current.data).toEqual([
      {
        ref: { scopeType: 'local', scopeId: 'local-1' },
        parentRef: { scopeType: 'division', scopeId: 'division-1' },
        companyId: 'company-1',
        name: 'Central Store',
      },
    ]);
    expect(idle.result.current.fetchStatus).toBe('idle');
    expect(disabled.result.current.fetchStatus).toBe('idle');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
