import { afterEach, describe, expect, it, vi } from 'vitest';

import { createHrEmployeesApi } from './create-hr-employees-api';

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('createHrEmployeesApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests employees, positions, manager/direct reports, and mutations through the HR endpoints', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (
        url === 'https://api.vimcore.test/companies/company-1/hr-employees' &&
        init?.method === undefined
      ) {
        return Promise.resolve(createJsonResponse([{ id: 'employee-1' }]));
      }

      if (
        url === 'https://api.vimcore.test/companies/company-1/hr-employees/employee-1' &&
        init?.method === undefined
      ) {
        return Promise.resolve(createJsonResponse({ id: 'employee-1', companyId: 'company-1' }));
      }

      if (
        url === 'https://api.vimcore.test/companies/company-1/hr-employees/positions' &&
        init?.method === undefined
      ) {
        return Promise.resolve(createJsonResponse([{ id: 'position-1' }]));
      }

      if (
        url ===
          'https://api.vimcore.test/companies/company-1/hr-employees/employee-1/reports/manager' &&
        init?.method === undefined
      ) {
        return Promise.resolve(createJsonResponse({ employeeId: 'employee-9' }));
      }

      if (
        url ===
          'https://api.vimcore.test/companies/company-1/hr-employees/employee-1/reports/direct' &&
        init?.method === undefined
      ) {
        return Promise.resolve(createJsonResponse([{ employeeId: 'employee-2' }]));
      }

      if (
        url ===
          'https://api.vimcore.test/companies/company-1/hr-employees/employee-1/assignments' &&
        init?.method === undefined
      ) {
        return Promise.resolve(createJsonResponse([{ id: 'assignment-1', isPrimary: true }]));
      }

      if (
        url === 'https://api.vimcore.test/companies/company-1/hr-employees' &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(createJsonResponse({ id: 'employee-2' }, 201));
      }

      if (
        url === 'https://api.vimcore.test/companies/company-1/hr-employees/positions' &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(createJsonResponse({ id: 'position-2' }, 201));
      }

      if (
        url ===
          'https://api.vimcore.test/companies/company-1/hr-employees/employee-1/assignments' &&
        init?.method === 'POST'
      ) {
        return Promise.resolve(createJsonResponse({ id: 'assignment-1' }, 201));
      }

      throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const api = createHrEmployeesApi('https://api.vimcore.test');

    await expect(api.listEmployees('company-1')).resolves.toEqual([{ id: 'employee-1' }]);
    await expect(api.getEmployee('company-1', 'employee-1')).resolves.toEqual({
      id: 'employee-1',
      companyId: 'company-1',
    });
    await expect(api.listPositions('company-1')).resolves.toEqual([{ id: 'position-1' }]);
    await expect(api.getManager('company-1', 'employee-1')).resolves.toEqual({
      employeeId: 'employee-9',
    });
    await expect(api.listDirectReports('company-1', 'employee-1')).resolves.toEqual([
      { employeeId: 'employee-2' },
    ]);
    await expect(api.listAssignmentHistory('company-1', 'employee-1')).resolves.toEqual([
      { id: 'assignment-1', isPrimary: true },
    ]);
    await expect(api.createEmployee({
      companyId: 'company-1',
      fullName: 'New Employee',
      documentType: null,
      documentNumber: null,
      email: null,
      employmentStatus: 'active',
      hiredAt: null,
    })).resolves.toEqual({ id: 'employee-2' });
    await expect(
      api.createPosition({
        companyId: 'company-1',
        name: 'People Lead',
        reportsToPositionId: null,
        headcount: 2,
        isActive: true,
      }),
    ).resolves.toEqual({ id: 'position-2' });
    await expect(
      api.createAssignment({
        companyId: 'company-1',
        employeeId: 'employee-1',
        scopeNodeId: 'company:company-1',
        positionId: 'position-1',
        startedAt: '2026-08-13T12:30:00.000Z',
      }),
    ).resolves.toEqual({ id: 'assignment-1' });
  });
});
