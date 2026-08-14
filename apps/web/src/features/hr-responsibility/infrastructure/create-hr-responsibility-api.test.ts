import { afterEach, describe, expect, it, vi } from 'vitest';

import { createHrResponsibilityApi } from './create-hr-responsibility-api';

describe('createHrResponsibilityApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps invitation requests scoped to the selected company and HR purpose endpoint', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (
        init?.method === 'POST' &&
        url.endsWith('/companies/company-1/hr-responsibility/invitations')
      ) {
        expect(JSON.parse(String(init.body))).toEqual({
          inviteeEmail: 'external@example.com',
        });
        return Promise.resolve(
          new Response(JSON.stringify({ invitationId: 'inv-1' }), {
            status: 201,
          }),
        );
      }
      if (
        init?.method === 'POST' &&
        url.endsWith('/hr-responsibility/invitations/token-1/accept')
      ) {
        expect(JSON.parse(String(init.body))).toEqual({
          password: 'secret123',
        });
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      throw new Error(`unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const api = createHrResponsibilityApi('https://api.vimcore.test');
    await expect(
      api.createInvitation('company-1', 'external@example.com'),
    ).resolves.toEqual({ invitationId: 'inv-1' });
    await expect(
      api.acceptInvitation('token-1', 'secret123'),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
