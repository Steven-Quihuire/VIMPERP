import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AssignmentFormValues } from '../domain/assignments';
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from '../domain/employees';
import type { CreatePositionInput } from '../domain/positions';
import { createHrEmployeesApi } from '../infrastructure/create-hr-employees-api';

export const hrEmployeesQueryKeys = {
  employees: (companyId: string) => ['hr-employees', 'employees', companyId] as const,
  employee: (companyId: string, employeeId: string) =>
    ['hr-employees', 'employee', companyId, employeeId] as const,
  positions: (companyId: string) => ['hr-employees', 'positions', companyId] as const,
  manager: (companyId: string, employeeId: string) =>
    ['hr-employees', 'manager', companyId, employeeId] as const,
  directReports: (companyId: string, employeeId: string) =>
    ['hr-employees', 'direct-reports', companyId, employeeId] as const,
};

export const useEmployees = (companyId: string | undefined, apiBaseUrl?: string) => {
  const api = createHrEmployeesApi(apiBaseUrl);

  return useQuery({
    queryKey: hrEmployeesQueryKeys.employees(companyId ?? ''),
    queryFn: () => api.listEmployees(companyId as string),
    enabled: Boolean(companyId),
  });
};

export const useEmployee = (
  companyId: string | undefined,
  employeeId: string | undefined,
  apiBaseUrl?: string,
) => {
  const api = createHrEmployeesApi(apiBaseUrl);

  return useQuery({
    queryKey: hrEmployeesQueryKeys.employee(companyId ?? '', employeeId ?? ''),
    queryFn: () => api.getEmployee(companyId as string, employeeId as string),
    enabled: Boolean(companyId) && Boolean(employeeId),
  });
};

export const useCreateEmployee = (apiBaseUrl?: string) => {
  const api = createHrEmployeesApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => api.createEmployee(input),
    onSuccess: async (employee) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: hrEmployeesQueryKeys.employees(employee.companyId),
        }),
        queryClient.invalidateQueries({
          queryKey: hrEmployeesQueryKeys.employee(employee.companyId, employee.id),
        }),
      ]);
    },
  });
};

export const useUpdateEmployee = (apiBaseUrl?: string) => {
  const api = createHrEmployeesApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateEmployeeInput) => api.updateEmployee(input),
    onSuccess: async (employee) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: hrEmployeesQueryKeys.employees(employee.companyId),
        }),
        queryClient.invalidateQueries({
          queryKey: hrEmployeesQueryKeys.employee(employee.companyId, employee.id),
        }),
      ]);
    },
  });
};

export const usePositions = (companyId: string | undefined, apiBaseUrl?: string) => {
  const api = createHrEmployeesApi(apiBaseUrl);

  return useQuery({
    queryKey: hrEmployeesQueryKeys.positions(companyId ?? ''),
    queryFn: () => api.listPositions(companyId as string),
    enabled: Boolean(companyId),
  });
};

export const useCreatePosition = (apiBaseUrl?: string) => {
  const api = createHrEmployeesApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePositionInput) => api.createPosition(input),
    onSuccess: async (position) => {
      await queryClient.invalidateQueries({
        queryKey: hrEmployeesQueryKeys.positions(position.companyId),
      });
    },
  });
};

export const useAssignments = (
  {
    companyId,
    employeeId,
  }: {
    companyId: string | undefined;
    employeeId: string | undefined;
  },
  apiBaseUrl?: string,
) => {
  const api = createHrEmployeesApi(apiBaseUrl);
  const queryClient = useQueryClient();

  const managerQuery = useQuery({
    queryKey: hrEmployeesQueryKeys.manager(companyId ?? '', employeeId ?? ''),
    queryFn: () => api.getManager(companyId as string, employeeId as string),
    enabled: Boolean(companyId) && Boolean(employeeId),
  });

  const directReportsQuery = useQuery({
    queryKey: hrEmployeesQueryKeys.directReports(companyId ?? '', employeeId ?? ''),
    queryFn: () => api.listDirectReports(companyId as string, employeeId as string),
    enabled: Boolean(companyId) && Boolean(employeeId),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (input: Omit<AssignmentFormValues, never>) =>
      api.createAssignment({
        companyId: companyId as string,
        employeeId: employeeId as string,
        scopeNodeId: input.scopeNodeId,
        positionId: input.positionId,
        startedAt: input.startedAt,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: hrEmployeesQueryKeys.manager(companyId ?? '', employeeId ?? ''),
        }),
        queryClient.invalidateQueries({
          queryKey: hrEmployeesQueryKeys.directReports(companyId ?? '', employeeId ?? ''),
        }),
      ]);
    },
  });

  return {
    managerQuery,
    directReportsQuery,
    createAssignmentMutation,
  };
};
