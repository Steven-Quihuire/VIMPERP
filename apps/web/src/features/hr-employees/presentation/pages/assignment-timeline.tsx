import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, CalendarClock, Loader2, MapPin, Network } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';

import type { AuthSession } from '@/features/auth/domain/auth';
import { useOrgTree } from '@/features/org-tree/application/org-tree-queries';
import type { OrgTreeNode } from '@/features/org-tree/domain/org-tree';
import { Button } from '@/shared/ui/button';
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

  const selectedPosition = (positionsQuery.data ?? []).find(
    (position) => position.id === watchedValues.positionId,
  );
  const selectedScope = scopeOptions.find(
    (option) =>
      `${option.node.ref.scopeType}:${option.node.ref.scopeId}` ===
      watchedValues.scopeNodeId,
  );
  const formatAssignmentDate = (value: string | undefined) => {
    if (!value) return 'Por definir';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[18px] border border-black/10 bg-[#fbfbfa]">
        <div className="flex items-center gap-4 p-6">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Network className="size-6" />
          </span>
          <div>
            <h2 className="text-xl font-medium tracking-tight">Asignación</h2>
            <p className="text-sm text-muted-foreground">
              Elegí el puesto, dónde trabaja y desde cuándo.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <form
          className="space-y-5 rounded-[18px] border border-black/10 bg-white p-6"
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

        <aside className="space-y-4 rounded-[18px] border border-black/10 bg-[#fbfbfa] p-6 lg:sticky lg:top-6 lg:self-start">
          <p className="text-xs font-medium uppercase tracking-wide text-black/40">
            Vista previa
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Briefcase className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-black/40">Puesto</p>
                <p className="truncate text-sm font-medium">
                  {selectedPosition?.name ?? 'Por elegir'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-black/40">Ubicación</p>
                <p className="truncate text-sm font-medium">
                  {selectedScope
                    ? `${selectedScope.node.name} · ${scopeTypeLabels[selectedScope.node.ref.scopeType]}`
                    : 'Por elegir'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarClock className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-black/40">Desde</p>
                <p className="truncate text-sm font-medium">
                  {formatAssignmentDate(watchedValues.startedAt)}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="rounded-[18px] border border-black/10 bg-[#fbfbfa] p-6">
        <div className="mb-4">
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
          <div className="space-y-3">
            {timelineEntries.map((entry) => (
              <div key={entry.id} className="rounded-lg border px-4 py-3">
                <p className="font-medium">{entry.title}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
