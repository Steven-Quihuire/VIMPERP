import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type {
  AssignmentFormValues,
  CreateAssignmentInput,
} from '../domain/assignments';
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from '../domain/employees';
import type { CreatePositionInput } from '../domain/positions';
import type { EmploymentStatus } from '../domain/employees';
import { createHrEmployeesApi } from '../infrastructure/create-hr-employees-api';

export const hrEmployeesQueryKeys = {
  employees: (companyId: string) =>
    ['hr-employees', 'employees', companyId] as const,
  employeesPage: (
    companyId: string,
    page: number,
    pageSize: number,
    search: string,
    status: string,
  ) =>
    [
      'hr-employees',
      'employees',
      companyId,
      'page',
      page,
      pageSize,
      search,
      status,
    ] as const,
  employee: (companyId: string, employeeId: string) =>
    ['hr-employees', 'employee', companyId, employeeId] as const,
  positions: (companyId: string) =>
    ['hr-employees', 'positions', companyId] as const,
  manager: (companyId: string, employeeId: string) =>
    ['hr-employees', 'manager', companyId, employeeId] as const,
  directReports: (companyId: string, employeeId: string) =>
    ['hr-employees', 'direct-reports', companyId, employeeId] as const,
  assignmentHistory: (companyId: string, employeeId: string) =>
    ['hr-employees', 'assignment-history', companyId, employeeId] as const,
  assignments: (companyId: string) =>
    ['hr-employees', 'assignments', companyId] as const,
};

export const useEmployees = (
  companyId: string | undefined,
  apiBaseUrl?: string,
) => {
  const api = createHrEmployeesApi(apiBaseUrl);

  return useQuery({
    queryKey: hrEmployeesQueryKeys.employees(companyId ?? ''),
    queryFn: () => api.listEmployees(companyId as string),
    enabled: Boolean(companyId),
  });
};

export const useEmployeesPage = (
  input: {
    companyId: string | undefined;
    page: number;
    pageSize: number;
    search: string;
    status: EmploymentStatus | undefined;
  },
  apiBaseUrl?: string,
) => {
  const api = createHrEmployeesApi(apiBaseUrl);
  return useQuery({
    queryKey: hrEmployeesQueryKeys.employeesPage(
      input.companyId ?? '',
      input.page,
      input.pageSize,
      input.search,
      input.status ?? 'all',
    ),
    queryFn: () =>
      api.listEmployeesPage({
        companyId: input.companyId as string,
        page: input.page,
        pageSize: input.pageSize,
        ...(input.search ? { search: input.search } : {}),
        ...(input.status ? { status: input.status } : {}),
      }),
    placeholderData: keepPreviousData,
    enabled: Boolean(input.companyId),
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
          queryKey: hrEmployeesQueryKeys.employee(
            employee.companyId,
            employee.id,
          ),
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
          queryKey: hrEmployeesQueryKeys.employee(
            employee.companyId,
            employee.id,
          ),
        }),
      ]);
    },
  });
};

export const useDeleteEmployee = (apiBaseUrl?: string) => {
  const api = createHrEmployeesApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { companyId: string; employeeId: string }) =>
      api.deleteEmployee(variables.companyId, variables.employeeId),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: hrEmployeesQueryKeys.employees(variables.companyId),
        }),
        queryClient.invalidateQueries({
          queryKey: hrEmployeesQueryKeys.employee(
            variables.companyId,
            variables.employeeId,
          ),
        }),
      ]);
    },
  });
};

export const usePositions = (
  companyId: string | undefined,
  apiBaseUrl?: string,
) => {
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

export const useCreateAssignment = (apiBaseUrl?: string) => {
  const api = createHrEmployeesApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAssignmentInput) => api.createAssignment(input),
    onSuccess: async (assignment) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: hrEmployeesQueryKeys.assignments(assignment.companyId),
        }),
        queryClient.invalidateQueries({
          queryKey: hrEmployeesQueryKeys.employees(assignment.companyId),
        }),
      ]);
    },
  });
};

export const useCompanyAssignments = (
  companyId: string | undefined,
  apiBaseUrl?: string,
) => {
  const api = createHrEmployeesApi(apiBaseUrl);

  return useQuery({
    queryKey: hrEmployeesQueryKeys.assignments(companyId ?? ''),
    queryFn: () => api.listAssignments(companyId as string),
    enabled: Boolean(companyId),
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
    queryKey: hrEmployeesQueryKeys.directReports(
      companyId ?? '',
      employeeId ?? '',
    ),
    queryFn: () =>
      api.listDirectReports(companyId as string, employeeId as string),
    enabled: Boolean(companyId) && Boolean(employeeId),
  });

  const assignmentHistoryQuery = useQuery({
    queryKey: hrEmployeesQueryKeys.assignmentHistory(
      companyId ?? '',
      employeeId ?? '',
    ),
    queryFn: () =>
      api.listAssignmentHistory(companyId as string, employeeId as string),
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
          queryKey: hrEmployeesQueryKeys.assignmentHistory(
            companyId ?? '',
            employeeId ?? '',
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: hrEmployeesQueryKeys.manager(
            companyId ?? '',
            employeeId ?? '',
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: hrEmployeesQueryKeys.directReports(
            companyId ?? '',
            employeeId ?? '',
          ),
        }),
      ]);
    },
  });

  return {
    managerQuery,
    directReportsQuery,
    assignmentHistoryQuery,
    createAssignmentMutation,
  };
};
