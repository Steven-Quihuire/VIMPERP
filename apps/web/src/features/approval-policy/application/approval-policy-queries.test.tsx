import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  approvalPolicyQueryKeys,
  useApprovalPolicies,
} from './approval-policy-queries';

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

describe('approval-policy query hooks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses a stable query key', () => {
    expect(approvalPolicyQueryKeys.policies('company-1')).toEqual([
      'approval-policy',
      'policies',
      'company-1',
    ]);
  });

  it('lists, creates, updates, and deactivates policies with cache invalidation', async () => {
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

      if (url.endsWith('/companies/company-1/approval-policies') && init?.method === undefined) {
        return Promise.resolve(createJsonResponse([{ id: 'policy-1', companyId: 'company-1' }]));
      }

      if (url.endsWith('/companies/company-1/approval-policies') && init?.method === 'POST') {
        return Promise.resolve(createJsonResponse({ id: 'policy-2', companyId: 'company-1' }, 201));
      }

      if (
        url.endsWith('/companies/company-1/approval-policies/policy-1') &&
        init?.method === 'PATCH'
      ) {
        return Promise.resolve(createJsonResponse({ id: 'policy-1', companyId: 'company-1' }));
      }

      if (
        url.endsWith('/companies/company-1/approval-policies/policy-1/deactivate') &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(createJsonResponse({ id: 'policy-1', companyId: 'company-1', isActive: false }));
      }

      throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const wrapper = createWrapper(queryClient);
    const policiesHook = renderHook(() => useApprovalPolicies('company-1'), { wrapper });

    await waitFor(() => {
      expect(policiesHook.result.current.policiesQuery.isSuccess).toBe(true);
    });

    await expect(
      policiesHook.result.current.createPolicyMutation.mutateAsync({
        companyId: 'company-1',
        scopeType: 'company',
        scopeNodeId: null,
        name: 'Company approvals',
        definition: { steps: ['manager'] },
        isActive: true,
      }),
    ).resolves.toMatchObject({ id: 'policy-2' });

    await expect(
      policiesHook.result.current.updatePolicyMutation.mutateAsync({
        companyId: 'company-1',
        policyId: 'policy-1',
        scopeType: 'area',
        scopeNodeId: 'area:area-1',
        name: 'Area approvals',
        definition: { steps: ['director'] },
        isActive: true,
      }),
    ).resolves.toMatchObject({ id: 'policy-1' });

    await expect(
      policiesHook.result.current.deactivatePolicyMutation.mutateAsync({
        companyId: 'company-1',
        policyId: 'policy-1',
      }),
    ).resolves.toMatchObject({ id: 'policy-1', isActive: false });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: approvalPolicyQueryKeys.policies('company-1'),
      });
    });
  });
});
