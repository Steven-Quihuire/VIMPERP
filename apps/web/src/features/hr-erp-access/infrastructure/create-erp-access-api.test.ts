import { afterEach, describe, expect, it, vi } from 'vitest';

import { createErpAccessApi } from './create-erp-access-api';

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('createErpAccessApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests invitation lifecycle actions through the HR ERP access endpoints', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (
        url === 'https://api.vimcore.test/companies/company-1/hr-erp-access/invitations' &&
        init?.method === undefined
      ) {
        return Promise.resolve(createJsonResponse([{ id: 'invitation-1' }]));
      }

      if (
        url === 'https://api.vimcore.test/companies/company-1/hr-erp-access/invitations' &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(createJsonResponse({ invitationId: 'invitation-2' }, 201));
      }

      if (
        url ===
          'https://api.vimcore.test/companies/company-1/hr-erp-access/employees/employee-1/revoke' &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      if (
        url === 'https://api.vimcore.test/hr-erp-access/invitations/token-1/accept' &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const api = createErpAccessApi('https://api.vimcore.test');

    await expect(api.listInvitations('company-1')).resolves.toEqual([{ id: 'invitation-1' }]);
    await expect(
      api.createInvitation({
        companyId: 'company-1',
        employeeId: 'employee-1',
        inviteeEmail: 'person@vimcore.test',
      }),
    ).resolves.toEqual({ invitationId: 'invitation-2' });
    await expect(
      api.revokeAccess({ companyId: 'company-1', employeeId: 'employee-1' }),
    ).resolves.toBeUndefined();
    await expect(
      api.acceptInvitation({ token: 'token-1', password: 'secret123' }),
    ).resolves.toBeUndefined();
  });
});
