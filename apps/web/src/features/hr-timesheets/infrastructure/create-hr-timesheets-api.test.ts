import { afterEach, describe, expect, it, vi } from 'vitest';

import { createHrTimesheetsApi } from './create-hr-timesheets-api';

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const basePeriod = {
  id: 'period-1',
  companyId: 'company-1',
  employeeAssignmentId: 'assignment-1',
  periodStart: '2026-08-10',
  periodEnd: '2026-08-16',
  status: 'draft',
  submittedAt: null,
  submittedByUserId: null,
  approvedAt: null,
  approvedByUserId: null,
  rejectionReason: null,
  approvalPolicyId: null,
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

const baseEntry = {
  id: 'entry-1',
  companyId: 'company-1',
  periodId: 'period-1',
  entryDate: '2026-08-11',
  hours: 8,
  projectId: null,
  taskLabel: 'Payroll review',
  note: 'Updated payroll incidents',
  createdAt: '2026-08-11T10:00:00.000Z',
  updatedAt: '2026-08-11T10:00:00.000Z',
};

describe('createHrTimesheetsApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('calls every timesheet endpoint with the expected payloads', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (
        url === 'https://api.vimcore.test/companies/company-1/timesheets?status=draft' &&
        init?.method === undefined
      ) {
        return Promise.resolve(createJsonResponse([basePeriod]));
      }

      if (
        url === 'https://api.vimcore.test/companies/company-1/timesheets' &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(createJsonResponse(basePeriod, 201));
      }

      if (
        url === 'https://api.vimcore.test/companies/company-1/timesheets/period-1' &&
        init?.method === undefined
      ) {
        return Promise.resolve(createJsonResponse(basePeriod));
      }

      if (
        url === 'https://api.vimcore.test/companies/company-1/timesheets/period-1/entries' &&
        init?.method === undefined
      ) {
        return Promise.resolve(createJsonResponse([baseEntry]));
      }

      if (
        url === 'https://api.vimcore.test/companies/company-1/timesheets/period-1/entries' &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(createJsonResponse(baseEntry, 201));
      }

      if (
        url ===
          'https://api.vimcore.test/companies/company-1/timesheets/period-1/entries/entry-1' &&
        init?.method === 'PATCH'
      ) {
        return Promise.resolve(createJsonResponse({ ...baseEntry, hours: 6 }));
      }

      if (
        url ===
          'https://api.vimcore.test/companies/company-1/timesheets/period-1/entries/entry-1' &&
        init?.method === 'DELETE'
      ) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      if (
        url === 'https://api.vimcore.test/companies/company-1/timesheets/period-1/submit' &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(
          createJsonResponse({
            ...basePeriod,
            status: 'submitted',
            submittedAt: '2026-08-17T10:00:00.000Z',
            submittedByUserId: 'user-1',
          }),
        );
      }

      if (
        url === 'https://api.vimcore.test/companies/company-1/timesheets/period-1/approve' &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(
          createJsonResponse({
            ...basePeriod,
            status: 'approved',
            approvedAt: '2026-08-17T11:00:00.000Z',
            approvedByUserId: 'manager-1',
          }),
        );
      }

      if (
        url === 'https://api.vimcore.test/companies/company-1/timesheets/period-1/reject' &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(
          createJsonResponse({
            ...basePeriod,
            status: 'rejected',
            rejectionReason: 'Faltan comprobantes',
          }),
        );
      }

      if (
        url === 'https://api.vimcore.test/companies/company-1/timesheets/period-1/reopen' &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(createJsonResponse(basePeriod));
      }

      if (
        url === 'https://api.vimcore.test/companies/company-1/timesheets/period-code' &&
        init?.method === undefined
      ) {
        return Promise.resolve(
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
      }

      throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const api = createHrTimesheetsApi('https://api.vimcore.test');

    await expect(api.listPeriods('company-1', 'draft')).resolves.toEqual([basePeriod]);
    await expect(
      api.createPeriod({
        companyId: 'company-1',
        employeeAssignmentId: 'assignment-1',
        periodStart: '2026-08-10',
        periodEnd: '2026-08-16',
      }),
    ).resolves.toEqual(basePeriod);
    await expect(api.getPeriod('company-1', 'period-1')).resolves.toEqual(basePeriod);
    await expect(api.listEntries('company-1', 'period-1')).resolves.toEqual([baseEntry]);
    await expect(
      api.createEntry({
        companyId: 'company-1',
        periodId: 'period-1',
        entryDate: '2026-08-11',
        hours: 8,
        projectId: null,
        taskLabel: 'Payroll review',
        note: 'Updated payroll incidents',
      }),
    ).resolves.toEqual(baseEntry);
    await expect(
      api.updateEntry({
        companyId: 'company-1',
        periodId: 'period-1',
        entryId: 'entry-1',
        entryDate: '2026-08-11',
        hours: 6,
        projectId: null,
        taskLabel: 'Payroll review',
        note: 'Adjusted workload',
      }),
    ).resolves.toMatchObject({ id: 'entry-1', hours: 6 });
    await expect(
      api.deleteEntry({
        companyId: 'company-1',
        periodId: 'period-1',
        entryId: 'entry-1',
      }),
    ).resolves.toBeUndefined();
    await expect(
      api.submitPeriod({ companyId: 'company-1', periodId: 'period-1' }),
    ).resolves.toMatchObject({ status: 'submitted' });
    await expect(
      api.approvePeriod({ companyId: 'company-1', periodId: 'period-1' }),
    ).resolves.toMatchObject({ status: 'approved' });
    await expect(
      api.rejectPeriod({
        companyId: 'company-1',
        periodId: 'period-1',
        rejectionReason: 'Faltan comprobantes',
      }),
    ).resolves.toMatchObject({ status: 'rejected' });
    await expect(
      api.reopenPeriod({ companyId: 'company-1', periodId: 'period-1' }),
    ).resolves.toEqual(basePeriod);

    await expect(api.getPeriod('company-1', 'period-code')).rejects.toMatchObject({
      status: 409,
      code: 'TIMESHEET_LOCKED',
    });
  });
});
