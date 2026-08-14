import { describe, expect, it, vi, afterEach } from 'vitest';

import { createApprovalPolicyApi } from './create-approval-policy-api';

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('approval-policy api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('calls the approval-policy endpoints with the expected payloads', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.endsWith('/companies/company-1/approval-policies') && init?.method === undefined) {
        return Promise.resolve(createJsonResponse([{ id: 'policy-1' }]));
      }

      if (url.endsWith('/companies/company-1/approval-policies') && init?.method === 'POST') {
        return Promise.resolve(createJsonResponse({ id: 'policy-2', companyId: 'company-1' }, 201));
      }

      if (
        url.endsWith('/companies/company-1/approval-policies/policy-1') &&
        init?.method === 'PATCH'
      ) {
        return Promise.resolve(createJsonResponse({ id: 'policy-1', name: 'Updated policy' }));
      }

      if (
        url.endsWith('/companies/company-1/approval-policies/policy-1/deactivate') &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(createJsonResponse({ id: 'policy-1', isActive: false }));
      }

      throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const api = createApprovalPolicyApi('/api');

    await expect(api.listApprovalPolicies('company-1')).resolves.toEqual([{ id: 'policy-1' }]);
    await expect(
      api.createApprovalPolicy({
        companyId: 'company-1',
        scopeType: 'company',
        scopeNodeId: null,
        name: 'Company approvals',
        definition: { steps: ['manager'] },
        isActive: true,
      }),
    ).resolves.toMatchObject({ id: 'policy-2' });
    await expect(
      api.updateApprovalPolicy({
        companyId: 'company-1',
        policyId: 'policy-1',
        scopeType: 'area',
        scopeNodeId: 'area:area-1',
        name: 'Updated policy',
        definition: { steps: ['director'] },
        isActive: true,
      }),
    ).resolves.toMatchObject({ id: 'policy-1', name: 'Updated policy' });
    await expect(
      api.deactivateApprovalPolicy({ companyId: 'company-1', policyId: 'policy-1' }),
    ).resolves.toMatchObject({ id: 'policy-1', isActive: false });
  });
});
