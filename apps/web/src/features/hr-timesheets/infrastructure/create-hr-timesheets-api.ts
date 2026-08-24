import { getApiBaseUrl } from '@/shared/lib/http/api-base-url';
import { createHttpClient } from '@/shared/lib/http/http-client';

import type {
  CreateTimesheetEntryInput,
  CreateTimesheetPeriodInput,
  DeleteTimesheetEntryInput,
  PatchTimesheetPeriodInput,
  RejectTimesheetPeriodInput,
  TimesheetEntry,
  TimesheetPeriod,
  TimesheetPeriodActionInput,
  TimesheetPeriodStatus,
  UpdateTimesheetEntryInput,
} from '../domain/timesheets';
import {
  timesheetEntriesSchema,
  timesheetEntrySchema,
  timesheetPeriodSchema,
  timesheetPeriodsSchema,
} from '../domain/timesheets';

export type HrTimesheetsApi = {
  listPeriods: (
    companyId: string,
    status?: TimesheetPeriodStatus,
  ) => Promise<TimesheetPeriod[]>;
  createPeriod: (input: CreateTimesheetPeriodInput) => Promise<TimesheetPeriod>;
  getPeriod: (companyId: string, periodId: string) => Promise<TimesheetPeriod>;
  listEntries: (companyId: string, periodId: string) => Promise<TimesheetEntry[]>;
  createEntry: (input: CreateTimesheetEntryInput) => Promise<TimesheetEntry>;
  updateEntry: (input: UpdateTimesheetEntryInput) => Promise<TimesheetEntry>;
  deleteEntry: (input: DeleteTimesheetEntryInput) => Promise<void>;
  submitPeriod: (input: TimesheetPeriodActionInput) => Promise<TimesheetPeriod>;
  approvePeriod: (input: TimesheetPeriodActionInput) => Promise<TimesheetPeriod>;
  rejectPeriod: (input: RejectTimesheetPeriodInput) => Promise<TimesheetPeriod>;
  reopenPeriod: (input: TimesheetPeriodActionInput) => Promise<TimesheetPeriod>;
  patchPeriod: (input: PatchTimesheetPeriodInput) => Promise<TimesheetPeriod>;
};

export const createHrTimesheetsApi = (
  apiBaseUrl = getApiBaseUrl(),
): HrTimesheetsApi => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    listPeriods: async (companyId, status) => {
      const params = new URLSearchParams();
      if (status) {
        params.set('status', status);
      }

      const path = `/companies/${companyId}/timesheets${params.size > 0 ? `?${params.toString()}` : ''}`;

      return timesheetPeriodsSchema.parse(
        await httpClient.get<unknown>(path),
      );
    },
    createPeriod: async (input) => {
      const response = await httpClient.post(
        `/companies/${input.companyId}/timesheets`,
        {
          employeeAssignmentId: input.employeeAssignmentId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        },
      );

      return timesheetPeriodSchema.parse(await response.json());
    },
    getPeriod: async (companyId, periodId) =>
      timesheetPeriodSchema.parse(
        await httpClient.get<unknown>(`/companies/${companyId}/timesheets/${periodId}`),
      ),
    listEntries: async (companyId, periodId) =>
      timesheetEntriesSchema.parse(
        await httpClient.get<unknown>(
          `/companies/${companyId}/timesheets/${periodId}/entries`,
        ),
      ),
    createEntry: async (input) => {
      const response = await httpClient.post(
        `/companies/${input.companyId}/timesheets/${input.periodId}/entries`,
        {
          entryDate: input.entryDate,
          hours: input.hours,
          projectId: input.projectId,
          taskLabel: input.taskLabel,
          note: input.note,
        },
      );

      return timesheetEntrySchema.parse(await response.json());
    },
    updateEntry: async (input) => {
      const response = await httpClient.patch(
        `/companies/${input.companyId}/timesheets/${input.periodId}/entries/${input.entryId}`,
        {
          entryDate: input.entryDate,
          hours: input.hours,
          projectId: input.projectId,
          taskLabel: input.taskLabel,
          note: input.note,
        },
      );

      return timesheetEntrySchema.parse(await response.json());
    },
    deleteEntry: async (input) => {
      await httpClient.delete(
        `/companies/${input.companyId}/timesheets/${input.periodId}/entries/${input.entryId}`,
      );
    },
    submitPeriod: async (input) => {
      const response = await httpClient.post(
        `/companies/${input.companyId}/timesheets/${input.periodId}/submit`,
      );

      return timesheetPeriodSchema.parse(await response.json());
    },
    approvePeriod: async (input) => {
      const response = await httpClient.post(
        `/companies/${input.companyId}/timesheets/${input.periodId}/approve`,
      );

      return timesheetPeriodSchema.parse(await response.json());
    },
    rejectPeriod: async (input) => {
      const response = await httpClient.post(
        `/companies/${input.companyId}/timesheets/${input.periodId}/reject`,
        { rejectionReason: input.rejectionReason },
      );

      return timesheetPeriodSchema.parse(await response.json());
    },
    reopenPeriod: async (input) => {
      const response = await httpClient.post(
        `/companies/${input.companyId}/timesheets/${input.periodId}/reopen`,
      );

      return timesheetPeriodSchema.parse(await response.json());
    },
    patchPeriod: async (input) => {
      const response = await httpClient.patch(
        `/companies/${input.companyId}/timesheets/${input.periodId}`,
        {
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        },
      );

      return timesheetPeriodSchema.parse(await response.json());
    },
  };
};
