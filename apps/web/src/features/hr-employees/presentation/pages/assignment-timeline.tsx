import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Network } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';

import type { AuthSession } from '@/features/auth/domain/auth';
import { useOrgTree } from '@/features/org-tree/application/org-tree-queries';
import type { OrgTreeNode } from '@/features/org-tree/domain/org-tree';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

import { AssignmentFields } from '../components/assignment-fields';
import {
  useAssignments,
  usePositions,
} from '../../application/hr-employees-queries';
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

export const scopeTypeLabels = {
  company: 'Empresa',
  division: 'División',
  local: 'Local',
  area: 'Área',
  warehouse: 'Almacén',
  'point-of-sale': 'Punto de venta',
} as const;

const scopeKey = (node: { ref: { scopeType: string; scopeId: string } }) =>
  `${node.ref.scopeType}:${node.ref.scopeId}`;

export const getScopeOptions = (nodes: OrgTreeNode[]) => {
  const nodeKeys = new Set(nodes.map(scopeKey));
  const children = new Map<string, typeof nodes>();
  for (const node of nodes) {
    if (!node.parentRef) continue;
    const parentKey = `${node.parentRef.scopeType}:${node.parentRef.scopeId}`;
    children.set(parentKey, [...(children.get(parentKey) ?? []), node]);
  }
  const visit = (
    node: (typeof nodes)[number],
    depth: number,
  ): { node: (typeof nodes)[number]; depth: number }[] => [
    { node, depth },
    ...(children.get(scopeKey(node)) ?? []).flatMap((child) =>
      visit(child, depth + 1),
    ),
  ];
  return nodes
    .filter(
      (node) =>
        !node.parentRef ||
        !nodeKeys.has(`${node.parentRef.scopeType}:${node.parentRef.scopeId}`),
    )
    .flatMap((node) => visit(node, 0));
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
  const watchedValues = useWatch({ control: form.control });

  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleccioná una compañía activa antes de gestionar asignaciones.
      </p>
    );
  }

  if (!employeeId) {
    return (
      <p className="text-sm text-muted-foreground">
        Elegí un empleado antes de crear asignaciones.
      </p>
    );
  }

  if (assignments.assignmentHistoryQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Cargando el historial de asignaciones...
      </p>
    );
  }

  const timelineEntries = buildAssignmentTimelineEntries({
    assignments: assignments.assignmentHistoryQuery.data ?? [],
  });
  const scopeOptions = getScopeOptions(orgTreeQuery.data ?? []);

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="border-b bg-muted/15 px-5 py-5">
        <div className="-mt-4 flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Network className="size-6" />
          </span>
          <div>
            <CardTitle className="text-xl font-medium tracking-tight">
              Asignación inicial
            </CardTitle>
            <CardDescription>
              Puesto, ubicación y desde cuándo.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-5 py-5">
        <form
          className="space-y-5 rounded-xl border bg-muted/10 p-5"
          onSubmit={(event) => {
            void form.handleSubmit(async (values) => {
              const payload = toCreateAssignmentInput(
                companyId,
                employeeId,
                values,
              );
              await assignments.createAssignmentMutation.mutateAsync({
                scopeNodeId: payload.scopeNodeId,
                positionId: payload.positionId,
                startedAt: payload.startedAt,
              });
              form.reset(defaultValues);
            })(event);
          }}
        >
          <AssignmentFields
            showManager={false}
            positions={positionsQuery.data ?? []}
            scopeOptions={scopeOptions}
            scopeLoading={orgTreeQuery.isLoading}
            scopeError={orgTreeQuery.isError}
            values={{
              positionId: watchedValues.positionId || '',
              scopeNodeId: watchedValues.scopeNodeId || '',
            }}
            onPositionChange={(value) =>
              form.setValue('positionId', value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            onScopeChange={(value) =>
              form.setValue('scopeNodeId', value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            errors={{
              positionId: form.formState.errors.positionId?.message,
              scopeNodeId: form.formState.errors.scopeNodeId?.message,
            }}
          />
          <Field>
            <FieldLabel htmlFor="assignment-start-date">
              ¿Desde cuándo?
            </FieldLabel>
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

          {assignments.createAssignmentMutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {assignments.createAssignmentMutation.error instanceof Error
                ? assignments.createAssignmentMutation.error.message
                : 'No se pudo crear la asignación.'}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="vimcore"
              disabled={assignments.createAssignmentMutation.isPending}
              className="sm:w-auto"
            >
              {assignments.createAssignmentMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Crear asignación
            </Button>
          </div>
        </form>

        <div className="space-y-3">
          <div>
            <h3 className="font-medium">Historial de asignaciones</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Una vista cronológica de los puestos y ubicaciones.
            </p>
          </div>
          {timelineEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay asignaciones disponibles.
            </p>
          ) : (
            timelineEntries.map((entry) => (
              <div key={entry.id} className="rounded-lg border px-4 py-3">
                <p className="font-medium">{entry.title}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.description}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
