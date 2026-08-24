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
  positionName?: string;
  scopeNodeName?: string;
};

export type EmployeeAssignmentWithEmployee = EmployeeAssignment & {
  fullName: string;
};

export type ReportingLineRecord = {
  employeeId: string;
  positionId: string;
  assignmentId: string;
};

export const assignmentFormSchema = z.object({
  scopeNodeId: z.string().trim().min(1, 'El nodo de alcance es obligatorio.'),
  positionId: z.string().trim().min(1, 'El puesto es obligatorio.'),
  startedAt: z.string().trim().min(1, 'La fecha de inicio es obligatoria.'),
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
  assignments,
}: {
  assignments: EmployeeAssignment[];
}) => {
  return [...assignments]
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())
    .map((assignment) => ({
      id: assignment.id,
       title: assignment.positionName ?? `Puesto ${assignment.positionId}`,
      description: [
        assignment.scopeNodeName ?? assignment.scopeNodeId,
        `${new Date(assignment.startedAt).toLocaleDateString('es-AR')} - ${assignment.endedAt ? new Date(assignment.endedAt).toLocaleDateString('es-AR') : 'Actual'}`,
        assignment.isPrimary ? 'Principal' : 'Secundaria',
      ].join(' · '),
    }));
};
