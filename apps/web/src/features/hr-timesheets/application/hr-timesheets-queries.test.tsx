import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  hrTimesheetsQueryKeys,
  useApproveTimesheetPeriod,
  useCreateTimesheetEntry,
  useDeleteTimesheetEntry,
  useRejectTimesheetPeriod,
  useReopenTimesheetPeriod,
  useSubmitTimesheetPeriod,
  useTimesheetPeriod,
  useTimesheetPeriodEntries,
  useTimesheetPeriods,
  useUpdateTimesheetEntry,
} from './hr-timesheets-queries';

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

describe('hr-timesheets query hooks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses stable query keys for periods, period detail, and period entries', () => {
    expect(hrTimesheetsQueryKeys.periodsList('company-1', 'draft')).toEqual([
      'hr-timesheets',
      'periods-list',
      'company-1',
      'draft',
    ]);
    expect(hrTimesheetsQueryKeys.periodsListScope('company-1')).toEqual([
      'hr-timesheets',
      'periods-list',
      'company-1',
    ]);
    expect(hrTimesheetsQueryKeys.period('company-1', 'period-1')).toEqual([
      'hr-timesheets',
      'period',
      'company-1',
      'period-1',
    ]);
    expect(hrTimesheetsQueryKeys.periodEntries('company-1', 'period-1')).toEqual([
      'hr-timesheets',
      'period-entries',
      'company-1',
      'period-1',
    ]);
  });

  it('loads periods and invalidates periods, period detail, and period entries after mutations', async () => {
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

      if (
        url === 'https://api.vimcore.test/companies/company-1/timesheets?status=draft' &&
        init?.method === undefined
      ) {
        return Promise.resolve(createJsonResponse([basePeriod]));
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

      throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const wrapper = createWrapper(queryClient);
    const periodsHook = renderHook(() => useTimesheetPeriods('company-1', 'draft', 'https://api.vimcore.test'), {
      wrapper,
    });
    const periodHook = renderHook(() => useTimesheetPeriod('company-1', 'period-1', 'https://api.vimcore.test'), {
      wrapper,
    });
    const entriesHook = renderHook(
      () => useTimesheetPeriodEntries('company-1', 'period-1', 'https://api.vimcore.test'),
      { wrapper },
    );
    const createEntryHook = renderHook(() => useCreateTimesheetEntry('https://api.vimcore.test'), {
      wrapper,
    });
    const updateEntryHook = renderHook(() => useUpdateTimesheetEntry('https://api.vimcore.test'), {
      wrapper,
    });
    const deleteEntryHook = renderHook(() => useDeleteTimesheetEntry('https://api.vimcore.test'), {
      wrapper,
    });
    const submitHook = renderHook(() => useSubmitTimesheetPeriod('https://api.vimcore.test'), {
      wrapper,
    });
    const approveHook = renderHook(() => useApproveTimesheetPeriod('https://api.vimcore.test'), {
      wrapper,
    });
    const rejectHook = renderHook(() => useRejectTimesheetPeriod('https://api.vimcore.test'), {
      wrapper,
    });
    const reopenHook = renderHook(() => useReopenTimesheetPeriod('https://api.vimcore.test'), {
      wrapper,
    });

    await waitFor(() => expect(periodsHook.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(periodHook.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(entriesHook.result.current.isSuccess).toBe(true));

    await createEntryHook.result.current.mutateAsync({
      companyId: 'company-1',
      periodId: 'period-1',
      entryDate: '2026-08-11',
      hours: 8,
      projectId: null,
      taskLabel: 'Payroll review',
      note: 'Updated payroll incidents',
    });
    await updateEntryHook.result.current.mutateAsync({
      companyId: 'company-1',
      periodId: 'period-1',
      entryId: 'entry-1',
      entryDate: '2026-08-11',
      hours: 6,
      projectId: null,
      taskLabel: 'Payroll review',
      note: 'Adjusted workload',
    });
    await deleteEntryHook.result.current.mutateAsync({
      companyId: 'company-1',
      periodId: 'period-1',
      entryId: 'entry-1',
    });
    await submitHook.result.current.mutateAsync({ companyId: 'company-1', periodId: 'period-1' });
    await approveHook.result.current.mutateAsync({ companyId: 'company-1', periodId: 'period-1' });
    await rejectHook.result.current.mutateAsync({
      companyId: 'company-1',
      periodId: 'period-1',
      rejectionReason: 'Faltan comprobantes',
    });
    await reopenHook.result.current.mutateAsync({ companyId: 'company-1', periodId: 'period-1' });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: hrTimesheetsQueryKeys.periodsListScope('company-1'),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: hrTimesheetsQueryKeys.period('company-1', 'period-1'),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: hrTimesheetsQueryKeys.periodEntries('company-1', 'period-1'),
      });
    });
  });
});
