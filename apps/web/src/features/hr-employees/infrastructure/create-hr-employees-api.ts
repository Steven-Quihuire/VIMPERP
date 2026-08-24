import { getApiBaseUrl } from '@/shared/lib/http/api-base-url';
import { createHttpClient } from '@/shared/lib/http/http-client';

import type {
  CreateAssignmentInput,
  EmployeeAssignment,
  EmployeeAssignmentWithEmployee,
  ReportingLineRecord,
} from '../domain/assignments';
import type {
  CreateEmployeeInput,
  Employee,
  EmploymentStatus,
  UpdateEmployeeInput,
} from '../domain/employees';
import type { CreatePositionInput, Position } from '../domain/positions';

export type HrEmployeesApi = {
  listEmployees: (companyId: string) => Promise<Employee[]>;
  listEmployeesPage: (input: {
    companyId: string;
    page: number;
    pageSize: number;
    search?: string;
    status?: EmploymentStatus;
  }) => Promise<{
    items: Employee[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  getEmployee: (
    companyId: string,
    employeeId: string,
  ) => Promise<Employee | null>;
  createEmployee: (input: CreateEmployeeInput) => Promise<Employee>;
  updateEmployee: (input: UpdateEmployeeInput) => Promise<Employee>;
  deleteEmployee: (
    companyId: string,
    employeeId: string,
  ) => Promise<Employee | null>;
  listPositions: (companyId: string) => Promise<Position[]>;
  createPosition: (input: CreatePositionInput) => Promise<Position>;
  createAssignment: (
    input: CreateAssignmentInput,
  ) => Promise<EmployeeAssignment>;
  listAssignmentHistory: (
    companyId: string,
    employeeId: string,
  ) => Promise<EmployeeAssignment[]>;
  listAssignments: (
    companyId: string,
  ) => Promise<EmployeeAssignmentWithEmployee[]>;
  getManager: (
    companyId: string,
    employeeId: string,
  ) => Promise<ReportingLineRecord | null>;
  listDirectReports: (
    companyId: string,
    employeeId: string,
  ) => Promise<ReportingLineRecord[]>;
};

export const createHrEmployeesApi = (
  apiBaseUrl = getApiBaseUrl(),
): HrEmployeesApi => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    listEmployees: (companyId) =>
      httpClient.get<Employee[]>(`/companies/${companyId}/hr-employees`),
    listEmployeesPage: async ({
      companyId,
      page,
      pageSize,
      search,
      status,
    }) => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      return httpClient.get<{
        items: Employee[];
        total: number;
        page: number;
        pageSize: number;
      }>(`/companies/${companyId}/hr-employees?${params.toString()}`);
    },
    getEmployee: (companyId, employeeId) =>
      httpClient.get<Employee | null>(
        `/companies/${companyId}/hr-employees/${employeeId}`,
      ),
    createEmployee: async (input) => {
      const response = await httpClient.post(
        `/companies/${input.companyId}/hr-employees`,
        {
          fullName: input.fullName,
          documentType: input.documentType,
          documentNumber: input.documentNumber,
          email: input.email,
          employmentStatus: input.employmentStatus,
          hiredAt: input.hiredAt,
          positionId: input.positionId,
          scopeNodeId: input.scopeNodeId,
          managerId: input.managerId,
        },
      );
      return (await response.json()) as Employee;
    },
    updateEmployee: async (input) => {
      const response = await httpClient.patch(
        `/companies/${input.companyId}/hr-employees/${input.employeeId}`,
        {
          fullName: input.fullName,
          documentType: input.documentType,
          documentNumber: input.documentNumber,
          email: input.email,
          employmentStatus: input.employmentStatus,
          hiredAt: input.hiredAt,
        },
      );
      return (await response.json()) as Employee;
    },
    listPositions: (companyId) =>
      httpClient.get<Position[]>(
        `/companies/${companyId}/hr-employees/positions`,
      ),
    createPosition: async (input) => {
      const response = await httpClient.post(
        `/companies/${input.companyId}/hr-employees/positions`,
        {
          name: input.name,
          reportsToPositionId: input.reportsToPositionId,
          headcount: input.headcount,
          isActive: input.isActive,
        },
      );
      return (await response.json()) as Position;
    },
    createAssignment: async (input) => {
      const response = await httpClient.post(
        `/companies/${input.companyId}/hr-employees/${input.employeeId}/assignments`,
        {
          scopeNodeId: input.scopeNodeId,
          positionId: input.positionId,
          startedAt: input.startedAt,
        },
      );
      return (await response.json()) as EmployeeAssignment;
    },
    listAssignmentHistory: (companyId, employeeId) =>
      httpClient.get<EmployeeAssignment[]>(
        `/companies/${companyId}/hr-employees/${employeeId}/assignments`,
      ),
    listAssignments: (companyId) =>
      httpClient.get<EmployeeAssignmentWithEmployee[]>(
        `/companies/${companyId}/hr-employees/assignments`,
      ),
    getManager: (companyId, employeeId) =>
      httpClient.get<ReportingLineRecord | null>(
        `/companies/${companyId}/hr-employees/${employeeId}/reports/manager`,
      ),
    listDirectReports: (companyId, employeeId) =>
      httpClient.get<ReportingLineRecord[]>(
        `/companies/${companyId}/hr-employees/${employeeId}/reports/direct`,
      ),
    deleteEmployee: (companyId, employeeId) =>
      httpClient
        .delete(`/companies/${companyId}/hr-employees/${employeeId}`)
        .then((response) => response.json() as Promise<Employee | null>),
  };
};
