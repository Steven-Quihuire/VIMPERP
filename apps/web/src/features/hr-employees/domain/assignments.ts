import { z } from 'zod';

export type EmployeeAssignment = {
  id: string;
  companyId: string;
  employeeId: string;
  scopeNodeId: string;
  positionId: string;
  startedAt: string;
  endedAt: string | null;
  isPrimary: boolean;
  createdAt: string;
};

export type ReportingLineRecord = {
  employeeId: string;
  positionId: string;
  assignmentId: string;
};

export const assignmentFormSchema = z.object({
  scopeNodeId: z.string().trim().min(1, 'Scope node is required.'),
  positionId: z.string().trim().min(1, 'Position is required.'),
  startedAt: z.string().trim().min(1, 'Start date is required.'),
});

export type AssignmentFormValues = z.output<typeof assignmentFormSchema>;

export type CreateAssignmentInput = {
  companyId: string;
  employeeId: string;
  scopeNodeId: string;
  positionId: string;
  startedAt: string;
};

export const toCreateAssignmentInput = (
  companyId: string,
  employeeId: string,
  values: AssignmentFormValues,
): CreateAssignmentInput => {
  const normalizedStartedAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(values.startedAt)
    ? `${values.startedAt}:00.000Z`
    : new Date(values.startedAt).toISOString();

  return {
    companyId,
    employeeId,
    scopeNodeId: values.scopeNodeId.trim(),
    positionId: values.positionId.trim(),
    startedAt: normalizedStartedAt,
  };
};

export const buildAssignmentTimelineEntries = ({
  manager,
  directReports,
}: {
  manager: ReportingLineRecord | null;
  directReports: ReportingLineRecord[];
}) => {
  const entries: Array<{ id: string; title: string; description: string }> = [];

  if (manager) {
    entries.push({
      id: `manager-${manager.assignmentId}`,
      title: `Manager · ${manager.employeeId}`,
      description: `Position ${manager.positionId}`,
    });
  }

  for (const directReport of directReports) {
    entries.push({
      id: `direct-report-${directReport.assignmentId}`,
      title: `Direct report · ${directReport.employeeId}`,
      description: `Position ${directReport.positionId}`,
    });
  }

  return entries;
};
