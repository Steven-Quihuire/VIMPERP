import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import type { AuthSession } from '@/features/auth/domain/auth';
import { useOrgTree } from '@/features/org-tree/application/org-tree-queries';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

import { useAssignments, usePositions } from '../../application/hr-employees-queries';
import {
  assignmentFormSchema,
  buildAssignmentTimelineEntries,
  toCreateAssignmentInput,
  type AssignmentFormValues,
} from '../../domain/assignments';

const defaultValues: AssignmentFormValues = {
  scopeNodeId: '',
  positionId: '',
  startedAt: '2026-08-13T12:30',
};

export const AssignmentTimelinePage = ({
  session,
  employeeId,
  apiBaseUrl,
}: {
  session: AuthSession;
  employeeId: string | null;
  apiBaseUrl?: string;
}) => {
  const companyId = session.activeCompany?.companyId;
  const positionsQuery = usePositions(companyId, apiBaseUrl);
  const orgTreeQuery = useOrgTree(companyId, apiBaseUrl);
  const assignments = useAssignments(
    { companyId, employeeId: employeeId ?? undefined },
    apiBaseUrl,
  );
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues,
  });

  if (!companyId) {
    return <p className="text-sm text-muted-foreground">Seleccioná una compañía activa antes de gestionar asignaciones.</p>;
  }

  if (!employeeId) {
    return <p className="text-sm text-muted-foreground">Elegí un empleado antes de crear asignaciones.</p>;
  }

  if (assignments.assignmentHistoryQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando el historial de asignaciones...</p>;
  }

  const timelineEntries = buildAssignmentTimelineEntries({
    assignments: assignments.assignmentHistoryQuery.data ?? [],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Línea de tiempo de asignaciones</CardTitle>
        <CardDescription>Creá asignaciones principales y consultá la línea de reporte actual.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-5"
          onSubmit={(event) => {
            void form.handleSubmit(async (values) => {
              const payload = toCreateAssignmentInput(companyId, employeeId, values);
              await assignments.createAssignmentMutation.mutateAsync(
                {
                  scopeNodeId: payload.scopeNodeId,
                  positionId: payload.positionId,
                  startedAt: payload.startedAt,
                },
              );
              form.reset(defaultValues);
            })(event);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="assignment-scope-node">Nodo de alcance</FieldLabel>
              <FieldContent>
                <Input
                  id="assignment-scope-node"
                  aria-label="Nodo de alcance"
                  placeholder={orgTreeQuery.data?.[0]?.ref.scopeId ?? 'company:company-1'}
                  {...form.register('scopeNodeId')}
                />
                <FieldError errors={[form.formState.errors.scopeNodeId]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="assignment-position-id">Puesto</FieldLabel>
              <FieldContent>
                <Input
                  id="assignment-position-id"
                   aria-label="Puesto"
                  placeholder={positionsQuery.data?.[0]?.id ?? 'position-1'}
                  {...form.register('positionId')}
                />
                <FieldError errors={[form.formState.errors.positionId]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="assignment-start-date">Fecha de inicio</FieldLabel>
              <FieldContent>
                <Input
                  id="assignment-start-date"
                  aria-label="Fecha de inicio"
                  type="datetime-local"
                  {...form.register('startedAt')}
                />
                <FieldError errors={[form.formState.errors.startedAt]} />
              </FieldContent>
            </Field>
          </FieldGroup>

          {assignments.createAssignmentMutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {assignments.createAssignmentMutation.error instanceof Error
                ? assignments.createAssignmentMutation.error.message
                : 'No se pudo crear la asignación.'}
            </p>
          ) : null}

          <Button type="submit" disabled={assignments.createAssignmentMutation.isPending}>
            {assignments.createAssignmentMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Crear asignación
          </Button>
        </form>

        <div className="space-y-3">
          {timelineEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay asignaciones disponibles.</p>
          ) : (
            timelineEntries.map((entry) => (
              <div key={entry.id} className="rounded-lg border px-4 py-3">
                <p className="font-medium">{entry.title}</p>
                <p className="text-sm text-muted-foreground">{entry.description}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
