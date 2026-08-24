import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import type {
  CreateTimesheetEntryInput,
  CreateTimesheetPeriodInput,
  DeleteTimesheetEntryInput,
  PatchTimesheetPeriodInput,
  RejectTimesheetPeriodInput,
  TimesheetPeriod,
  TimesheetPeriodActionInput,
  TimesheetPeriodStatus,
  UpdateTimesheetEntryInput,
} from '../domain/timesheets';
import { createHrTimesheetsApi } from '../infrastructure/create-hr-timesheets-api';

export const hrTimesheetsQueryKeys = {
  periodsListScope: (companyId: string) =>
    ['hr-timesheets', 'periods-list', companyId] as const,
  periodsList: (companyId: string, status: TimesheetPeriodStatus | 'all' = 'all') =>
    [...hrTimesheetsQueryKeys.periodsListScope(companyId), status] as const,
  period: (companyId: string, periodId: string) =>
    ['hr-timesheets', 'period', companyId, periodId] as const,
  periodEntries: (companyId: string, periodId: string) =>
    ['hr-timesheets', 'period-entries', companyId, periodId] as const,
};

const invalidatePeriodResources = async (
  queryClient: QueryClient,
  companyId: string,
  periodId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: hrTimesheetsQueryKeys.periodsListScope(companyId),
    }),
    queryClient.invalidateQueries({
      queryKey: hrTimesheetsQueryKeys.period(companyId, periodId),
    }),
    queryClient.invalidateQueries({
      queryKey: hrTimesheetsQueryKeys.periodEntries(companyId, periodId),
    }),
  ]);
};

export const useTimesheetPeriods = (
  companyId: string | undefined,
  status?: TimesheetPeriodStatus,
  apiBaseUrl?: string,
) => {
  const api = createHrTimesheetsApi(apiBaseUrl);

  return useQuery({
    queryKey: hrTimesheetsQueryKeys.periodsList(companyId ?? '', status ?? 'all'),
    queryFn: () => api.listPeriods(companyId as string, status),
    enabled: Boolean(companyId),
  });
};

export const useTimesheetPeriod = (
  companyId: string | undefined,
  periodId: string | undefined,
  apiBaseUrl?: string,
) => {
  const api = createHrTimesheetsApi(apiBaseUrl);

  return useQuery({
    queryKey: hrTimesheetsQueryKeys.period(companyId ?? '', periodId ?? ''),
    queryFn: () => api.getPeriod(companyId as string, periodId as string),
    enabled: Boolean(companyId) && Boolean(periodId),
  });
};

export const useTimesheetPeriodEntries = (
  companyId: string | undefined,
  periodId: string | undefined,
  apiBaseUrl?: string,
) => {
  const api = createHrTimesheetsApi(apiBaseUrl);

  return useQuery({
    queryKey: hrTimesheetsQueryKeys.periodEntries(companyId ?? '', periodId ?? ''),
    queryFn: () => api.listEntries(companyId as string, periodId as string),
    enabled: Boolean(companyId) && Boolean(periodId),
  });
};

export const useCreateTimesheetPeriod = (apiBaseUrl?: string) => {
  const api = createHrTimesheetsApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTimesheetPeriodInput) => api.createPeriod(input),
    onSuccess: async (period) => {
      await queryClient.invalidateQueries({
        queryKey: hrTimesheetsQueryKeys.periodsListScope(period.companyId),
      });
    },
  });
};

export const useCreateTimesheetEntry = (apiBaseUrl?: string) => {
  const api = createHrTimesheetsApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTimesheetEntryInput) => api.createEntry(input),
    onSuccess: async (_entry, input) => {
      await invalidatePeriodResources(queryClient, input.companyId, input.periodId);
    },
  });
};

export const useUpdateTimesheetEntry = (apiBaseUrl?: string) => {
  const api = createHrTimesheetsApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTimesheetEntryInput) => api.updateEntry(input),
    onSuccess: async (_entry, input) => {
      await invalidatePeriodResources(queryClient, input.companyId, input.periodId);
    },
  });
};

export const useDeleteTimesheetEntry = (apiBaseUrl?: string) => {
  const api = createHrTimesheetsApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteTimesheetEntryInput) => api.deleteEntry(input),
    onSuccess: async (_result, input) => {
      await invalidatePeriodResources(queryClient, input.companyId, input.periodId);
    },
  });
};

const useTimesheetPeriodActionMutation = <I extends TimesheetPeriodActionInput>(
  handler: (
    api: ReturnType<typeof createHrTimesheetsApi>,
  ) => (input: I) => Promise<TimesheetPeriod>,
  apiBaseUrl?: string,
) => {
  const api = createHrTimesheetsApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: handler(api),
    onSuccess: async (_period, input) => {
      await invalidatePeriodResources(queryClient, input.companyId, input.periodId);
    },
  });
};

export const useSubmitTimesheetPeriod = (apiBaseUrl?: string) =>
  useTimesheetPeriodActionMutation(
    (api) => (input: TimesheetPeriodActionInput) => api.submitPeriod(input),
    apiBaseUrl,
  );

export const useApproveTimesheetPeriod = (apiBaseUrl?: string) =>
  useTimesheetPeriodActionMutation(
    (api) => (input: TimesheetPeriodActionInput) => api.approvePeriod(input),
    apiBaseUrl,
  );

export const useRejectTimesheetPeriod = (apiBaseUrl?: string) => {
  const api = createHrTimesheetsApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RejectTimesheetPeriodInput) => api.rejectPeriod(input),
    onSuccess: async (_period, input) => {
      await invalidatePeriodResources(queryClient, input.companyId, input.periodId);
    },
  });
};

export const useReopenTimesheetPeriod = (apiBaseUrl?: string) =>
  useTimesheetPeriodActionMutation(
    (api) => (input: TimesheetPeriodActionInput) => api.reopenPeriod(input),
    apiBaseUrl,
  );

export const usePatchTimesheetPeriod = (apiBaseUrl?: string) => {
  const api = createHrTimesheetsApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PatchTimesheetPeriodInput) => api.patchPeriod(input),
    onSuccess: async (_period, input) => {
      await invalidatePeriodResources(queryClient, input.companyId, input.periodId);
    },
  });
};
