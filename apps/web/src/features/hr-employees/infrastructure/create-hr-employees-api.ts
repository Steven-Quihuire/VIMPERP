import { getApiBaseUrl } from '@/shared/lib/http/api-base-url';
import { createHttpClient } from '@/shared/lib/http/http-client';

import type { CreateAssignmentInput, EmployeeAssignment, ReportingLineRecord } from '../domain/assignments';
import type {
  CreateEmployeeInput,
  Employee,
  UpdateEmployeeInput,
} from '../domain/employees';
import type { CreatePositionInput, Position } from '../domain/positions';

export type HrEmployeesApi = {
  listEmployees: (companyId: string) => Promise<Employee[]>;
  getEmployee: (companyId: string, employeeId: string) => Promise<Employee | null>;
  createEmployee: (input: CreateEmployeeInput) => Promise<Employee>;
  updateEmployee: (input: UpdateEmployeeInput) => Promise<Employee>;
  listPositions: (companyId: string) => Promise<Position[]>;
  createPosition: (input: CreatePositionInput) => Promise<Position>;
  createAssignment: (input: CreateAssignmentInput) => Promise<EmployeeAssignment>;
  getManager: (companyId: string, employeeId: string) => Promise<ReportingLineRecord | null>;
  listDirectReports: (companyId: string, employeeId: string) => Promise<ReportingLineRecord[]>;
};

export const createHrEmployeesApi = (
  apiBaseUrl = getApiBaseUrl(),
): HrEmployeesApi => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    listEmployees: (companyId) => httpClient.get<Employee[]>(`/companies/${companyId}/hr-employees`),
    getEmployee: (companyId, employeeId) =>
      httpClient.get<Employee | null>(`/companies/${companyId}/hr-employees/${employeeId}`),
    createEmployee: async (input) => {
      const response = await httpClient.post(`/companies/${input.companyId}/hr-employees`, {
        fullName: input.fullName,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        email: input.email,
        employmentStatus: input.employmentStatus,
        hiredAt: input.hiredAt,
      });
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
      httpClient.get<Position[]>(`/companies/${companyId}/hr-employees/positions`),
    createPosition: async (input) => {
      const response = await httpClient.post(`/companies/${input.companyId}/hr-employees/positions`, {
        name: input.name,
        reportsToPositionId: input.reportsToPositionId,
        headcount: input.headcount,
        isActive: input.isActive,
      });
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
    getManager: (companyId, employeeId) =>
      httpClient.get<ReportingLineRecord | null>(
        `/companies/${companyId}/hr-employees/${employeeId}/reports/manager`,
      ),
    listDirectReports: (companyId, employeeId) =>
      httpClient.get<ReportingLineRecord[]>(
        `/companies/${companyId}/hr-employees/${employeeId}/reports/direct`,
      ),
  };
};
