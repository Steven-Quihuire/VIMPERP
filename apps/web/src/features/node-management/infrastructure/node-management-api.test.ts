import { afterEach, describe, expect, it, vi } from 'vitest';

import { createNodeManagementApi } from './node-management-api';

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('createNodeManagementApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests responsibilities, creates invitations, and accepts them', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (
        url ===
          'https://api.vimcore.test/companies/company-1/node-management/responsibilities' &&
        init?.method === undefined
      ) {
        return Promise.resolve(createJsonResponse([{ id: 'resp-1' }]));
      }

      if (
        url ===
          'https://api.vimcore.test/companies/company-1/node-management/pending-invitations' &&
        init?.method === undefined
      ) {
        return Promise.resolve(createJsonResponse([{ id: 'inv-1' }]));
      }

      if (
        url ===
          'https://api.vimcore.test/companies/company-1/node-management/invitations' &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(
          createJsonResponse({ invitationId: 'inv-2', invitationToken: 'token-2' }, 201),
        );
      }

      if (
        url === 'https://api.vimcore.test/node-management/invitations/token-2' &&
        init?.method === undefined
      ) {
        return Promise.resolve(createJsonResponse({ id: 'inv-2', userExists: false }));
      }

      if (
        url === 'https://api.vimcore.test/node-management/invitations/token-2/accept' &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const api = createNodeManagementApi('https://api.vimcore.test');

    await expect(api.listResponsibilities('company-1')).resolves.toEqual([
      { id: 'resp-1' },
    ]);
    await expect(api.listPendingInvitations('company-1')).resolves.toEqual([
      { id: 'inv-1' },
    ]);
    await expect(
      api.createInvitation({
        companyId: 'company-1',
        scopeType: 'local',
        scopeId: 'local-1',
        inviteeEmail: 'manager@vimcore.test',
      }),
    ).resolves.toEqual({ invitationId: 'inv-2', invitationToken: 'token-2' });
    await expect(api.getInvitation('token-2')).resolves.toEqual({ id: 'inv-2', userExists: false });
    await expect(
      api.acceptInvitation({ token: 'token-2', password: 'secret123' }),
    ).resolves.toBeUndefined();
  });
});
