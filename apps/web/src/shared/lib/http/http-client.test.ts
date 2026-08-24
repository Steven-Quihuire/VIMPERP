import { afterEach, describe, expect, it, vi } from 'vitest';

import { createHttpClient } from './http-client';

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('http client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('propagates typed error codes from JSON responses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: {
              message: 'Entry conflict',
              code: 'TIMESHEET_ENTRY_CONFLICT',
            },
          },
          409,
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: {
              message: 'Locked period',
              code: 'TIMESHEET_LOCKED',
            },
          },
          409,
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const client = createHttpClient('https://api.vimcore.test');

    await expect(client.get('/companies/company-1/timesheets')).rejects.toMatchObject({
      message: 'Entry conflict',
      status: 409,
      code: 'TIMESHEET_ENTRY_CONFLICT',
    });

    await expect(
      client.patch('/companies/company-1/timesheets/period-1', {
        periodStart: '2026-08-10',
        periodEnd: '2026-08-16',
      }),
    ).rejects.toMatchObject({
      message: 'Locked period',
      status: 409,
      code: 'TIMESHEET_LOCKED',
    });
  });
});
