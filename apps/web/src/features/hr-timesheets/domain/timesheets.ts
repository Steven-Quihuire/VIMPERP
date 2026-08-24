import { z } from 'zod';

export const timesheetPeriodStatusValues = [
  'draft',
  'submitted',
  'approved',
  'rejected',
] as const;

export type TimesheetPeriodStatus = (typeof timesheetPeriodStatusValues)[number];
export type IsoDate = `${number}-${number}-${number}`;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTimeSchema = z.string().datetime({ offset: true });

export const timesheetPeriodSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  employeeAssignmentId: z.string().min(1),
  periodStart: isoDateSchema,
  periodEnd: isoDateSchema,
  status: z.enum(timesheetPeriodStatusValues),
  submittedAt: isoDateTimeSchema.nullable(),
  submittedByUserId: z.string().nullable(),
  approvedAt: isoDateTimeSchema.nullable(),
  approvedByUserId: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  approvalPolicyId: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const timesheetEntrySchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  periodId: z.string().min(1),
  entryDate: isoDateSchema,
  hours: z.number().gt(0).max(24),
  projectId: z.string().nullable(),
  taskLabel: z.string().min(1),
  note: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const timesheetPeriodsSchema = z.array(timesheetPeriodSchema);
export const timesheetEntriesSchema = z.array(timesheetEntrySchema);

export type TimesheetPeriod = z.output<typeof timesheetPeriodSchema>;
export type TimesheetEntry = z.output<typeof timesheetEntrySchema>;

export type CreateTimesheetPeriodInput = {
  companyId: string;
  employeeAssignmentId: string;
  periodStart: IsoDate;
  periodEnd: IsoDate;
};

export type PatchTimesheetPeriodInput = {
  companyId: string;
  periodId: string;
  periodStart: IsoDate;
  periodEnd: IsoDate;
};

export type CreateTimesheetEntryInput = {
  companyId: string;
  periodId: string;
  entryDate: IsoDate;
  hours: number;
  projectId: string | null;
  taskLabel: string;
  note: string | null;
};

export type UpdateTimesheetEntryInput = CreateTimesheetEntryInput & {
  entryId: string;
};

export type DeleteTimesheetEntryInput = {
  companyId: string;
  periodId: string;
  entryId: string;
};

export type TimesheetPeriodActionInput = {
  companyId: string;
  periodId: string;
};

export type RejectTimesheetPeriodInput = TimesheetPeriodActionInput & {
  rejectionReason: string;
};

export type WeeklyEntryDraft = {
  entryId: string | null;
  entryDate: string;
  hours: string;
  projectId: string;
  taskLabel: string;
  note: string;
};

export const canEditTimesheetEntries = (period: TimesheetPeriod) =>
  period.status === 'draft';

export const canSubmitTimesheetPeriod = (period: TimesheetPeriod) =>
  period.status === 'draft';

export const canApproveTimesheetPeriod = (
  period: TimesheetPeriod,
  currentUserId: string,
) => period.status === 'submitted' && period.submittedByUserId !== currentUserId;

export const canRejectTimesheetPeriod = (
  period: TimesheetPeriod,
  currentUserId: string,
) => period.status === 'submitted' && period.submittedByUserId !== currentUserId;

export const canReopenTimesheetPeriod = (period: TimesheetPeriod) =>
  period.status === 'rejected';
