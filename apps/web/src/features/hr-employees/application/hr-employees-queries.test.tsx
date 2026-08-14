import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  hrEmployeesQueryKeys,
  useAssignments,
  useCreateEmployee,
  useCreatePosition,
  useEmployees,
  usePositions,
} from './hr-employees-queries';

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

describe('hr-employees query hooks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses stable query keys for employees, positions, and reporting line reads', () => {
    expect(hrEmployeesQueryKeys.employees('company-1')).toEqual([
      'hr-employees',
      'employees',
      'company-1',
    ]);
    expect(hrEmployeesQueryKeys.positions('company-1')).toEqual([
      'hr-employees',
      'positions',
      'company-1',
    ]);
    expect(hrEmployeesQueryKeys.manager('company-1', 'employee-1')).toEqual([
      'hr-employees',
      'manager',
      'company-1',
      'employee-1',
    ]);
    expect(hrEmployeesQueryKeys.directReports('company-1', 'employee-1')).toEqual([
      'hr-employees',
      'direct-reports',
      'company-1',
      'employee-1',
    ]);
  });

  it('fetches employees and positions through TanStack Query', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.endsWith('/companies/company-1/hr-employees')) {
        return Promise.resolve(createJsonResponse([{ id: 'employee-1' }]));
      }

      if (url.endsWith('/companies/company-1/hr-employees/positions')) {
        return Promise.resolve(createJsonResponse([{ id: 'position-1' }]));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const wrapper = createWrapper(queryClient);
    const employeesHook = renderHook(() => useEmployees('company-1'), { wrapper });
    const positionsHook = renderHook(() => usePositions('company-1'), { wrapper });

    await waitFor(() => expect(employeesHook.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(positionsHook.result.current.isSuccess).toBe(true));

    expect(employeesHook.result.current.data).toEqual([{ id: 'employee-1' }]);
    expect(positionsHook.result.current.data).toEqual([{ id: 'position-1' }]);
  });

  it('creates employees and positions, then invalidates reporting-line reads after assignment creation', async () => {
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

      if (url.endsWith('/companies/company-1/hr-employees') && init?.method === undefined) {
        return Promise.resolve(createJsonResponse([{ id: 'employee-1' }]));
      }

      if (url.endsWith('/companies/company-1/hr-employees/positions') && init?.method === undefined) {
        return Promise.resolve(createJsonResponse([{ id: 'position-1' }]));
      }

      if (url.endsWith('/companies/company-1/hr-employees/employee-1/reports/manager')) {
        return Promise.resolve(createJsonResponse({ employeeId: 'employee-9' }));
      }

      if (url.endsWith('/companies/company-1/hr-employees/employee-1/reports/direct')) {
        return Promise.resolve(createJsonResponse([{ employeeId: 'employee-2' }]));
      }

      if (url.endsWith('/companies/company-1/hr-employees') && init?.method === 'POST') {
        return Promise.resolve(createJsonResponse({ id: 'employee-3', companyId: 'company-1' }, 201));
      }

      if (url.endsWith('/companies/company-1/hr-employees/positions') && init?.method === 'POST') {
        return Promise.resolve(createJsonResponse({ id: 'position-2', companyId: 'company-1' }, 201));
      }

      if (
        url.endsWith('/companies/company-1/hr-employees/employee-1/assignments') &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(createJsonResponse({ id: 'assignment-1' }, 201));
      }

      throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const wrapper = createWrapper(queryClient);
    const createEmployeeHook = renderHook(() => useCreateEmployee(), { wrapper });
    const createPositionHook = renderHook(() => useCreatePosition(), { wrapper });
    const assignmentsHook = renderHook(
      () => useAssignments({ companyId: 'company-1', employeeId: 'employee-1' }),
      { wrapper },
    );

    await waitFor(() => expect(assignmentsHook.result.current.managerQuery.isSuccess).toBe(true));
    await waitFor(() => expect(assignmentsHook.result.current.directReportsQuery.isSuccess).toBe(true));

    await expect(createEmployeeHook.result.current.mutateAsync({
      companyId: 'company-1',
      fullName: 'New Employee',
      documentType: null,
      documentNumber: null,
      email: null,
      employmentStatus: 'active',
      hiredAt: null,
    })).resolves.toMatchObject({
      id: 'employee-3',
    });
    await expect(
      createPositionHook.result.current.mutateAsync({
        companyId: 'company-1',
        name: 'People Lead',
        reportsToPositionId: null,
        headcount: 1,
        isActive: true,
      }),
    ).resolves.toMatchObject({ id: 'position-2' });
    await expect(
      assignmentsHook.result.current.createAssignmentMutation.mutateAsync({
        scopeNodeId: 'company:company-1',
        positionId: 'position-1',
        startedAt: '2026-08-13T12:30:00.000Z',
      }),
    ).resolves.toMatchObject({ id: 'assignment-1' });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: hrEmployeesQueryKeys.employees('company-1'),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: hrEmployeesQueryKeys.positions('company-1'),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: hrEmployeesQueryKeys.manager('company-1', 'employee-1'),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: hrEmployeesQueryKeys.directReports('company-1', 'employee-1'),
      });
    });
  });
});
