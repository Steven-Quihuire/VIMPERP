import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Loader2, Plus } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import type { AuthSession } from '@/features/auth/domain/auth';
import {
  useCompanyAssignments,
  useCreateAssignment,
  useEmployees,
  usePositions,
} from '@/features/hr-employees/application/hr-employees-queries';
import type { CreateAssignmentInput } from '@/features/hr-employees/domain/assignments';
import { DatePickerField } from '@/features/hr-employees/presentation/components/date-picker-field';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { HoverExpandFab } from '@/shared/ui/hover-expand-fab';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Badge } from '@/shared/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import { HttpError } from '@/shared/lib/http/http-client';

import { useCreateTimesheetPeriod, useTimesheetPeriods } from '../../application/hr-timesheets-queries';
import { getFriendlyTimesheetError } from '../../domain/friendly-timesheet-error';
import type { TimesheetPeriodStatus } from '../../domain/timesheets';

const statusLabels: Record<TimesheetPeriodStatus, string> = {
  draft: 'Borrador',
  submitted: 'Enviado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

const statusBadgeClass: Record<TimesheetPeriodStatus, string> = {
  draft: 'border-slate-200 bg-slate-50 text-slate-600 rounded-2xl',
  submitted: 'border-blue-200 bg-blue-50 text-blue-700 rounded-2xl',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700 rounded-2xl',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700 rounded-2xl',
};

const breadcrumbLinkClass =
  'text-gray-500 text-xs hover:text-gray-700 transition-all ease-in-out duration-300';

const readErrorMessage = (error: unknown) => {
  if (error instanceof HttpError) {
    return getFriendlyTimesheetError(error.code);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return getFriendlyTimesheetError();
};

type TimesheetTemplate = {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  assignmentIds: string[];
};

const templateStorageKey = (companyId: string) =>
  `vimcore:timesheet-templates:${companyId}`;

const loadTemplates = (companyId: string): TimesheetTemplate[] => {
  try {
    const raw = localStorage.getItem(templateStorageKey(companyId));
    return raw ? (JSON.parse(raw) as TimesheetTemplate[]) : [];
  } catch {
    return [];
  }
};

const persistTemplates = (
  companyId: string,
  templates: TimesheetTemplate[],
) => {
  localStorage.setItem(templateStorageKey(companyId), JSON.stringify(templates));
};

type AssignEmployeeRowProps = {
  employeeId: string;
  fullName: string;
  companyId: string;
  apiBaseUrl?: string;
};

const AssignEmployeeRow = ({
  employeeId,
  fullName,
  companyId,
  apiBaseUrl,
}: AssignEmployeeRowProps) => {
  const positionsQuery = usePositions(companyId, apiBaseUrl);
  const createAssignmentMutation = useCreateAssignment(apiBaseUrl);
  const [positionId, setPositionId] = useState('');

  const handleAssign = async () => {
    if (!positionId) {
      return;
    }

    const input: CreateAssignmentInput = {
      companyId,
      employeeId,
      scopeNodeId: `company:${companyId}`,
      positionId,
      startedAt: new Date().toISOString(),
    };
    await createAssignmentMutation.mutateAsync(input);
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {fullName}
      </span>
      <select
        className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        value={positionId}
        onChange={(event) => setPositionId(event.target.value)}
        disabled={createAssignmentMutation.isPending}
      >
        <option value="">Puesto…</option>
        {(positionsQuery.data ?? []).map((position) => (
          <option key={position.id} value={position.id}>
            {position.name}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!positionId || createAssignmentMutation.isPending}
        onClick={() => void handleAssign()}
      >
        Asignar
      </Button>
    </div>
  );
};

export const TimesheetPeriodsListPage = ({
  session,
  apiBaseUrl,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
}) => {
  const navigate = useNavigate();
  const companyId = session.activeCompany?.companyId;
  const [status, setStatus] = useState<TimesheetPeriodStatus | 'all'>('all');
  const periodsQuery = useTimesheetPeriods(
    companyId,
    status === 'all' ? undefined : status,
    apiBaseUrl,
  );
  const createMutation = useCreateTimesheetPeriod(apiBaseUrl);
  const assignmentsQuery = useCompanyAssignments(companyId, apiBaseUrl);
  const employeesQuery = useEmployees(companyId, apiBaseUrl);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [mode, setMode] = useState<'single' | 'template'>('single');
  const [newAssignmentId, setNewAssignmentId] = useState('');
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>(
    [],
  );
  const [templateName, setTemplateName] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSummary, setCreateSummary] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<TimesheetTemplate[]>([]);

  useEffect(() => {
    if (companyId) {
      setSavedTemplates(loadTemplates(companyId));
    }
  }, [companyId, isCreateOpen]);

  const assignmentNames = new Map(
    (assignmentsQuery.data ?? []).map((assignment) => [
      assignment.id,
      assignment.fullName,
    ]),
  );

  const assignmentByEmployee = new Map(
    (assignmentsQuery.data ?? []).map((assignment) => [
      assignment.employeeId,
      assignment.id,
    ]),
  );

  const employeeOptions = (employeesQuery.data ?? []).map((employee) => ({
    employeeId: employee.id,
    fullName: employee.fullName,
    assignmentId: assignmentByEmployee.get(employee.id) ?? null,
  }));

  const assignableCount = employeeOptions.filter(
    (option) => option.assignmentId,
  ).length;

  const missingAssignmentCount = employeeOptions.length - assignableCount;

  const unassignedEmployees = employeeOptions.filter(
    (option) => !option.assignmentId,
  );

  const toggleAssignment = (assignmentId: string, checked: boolean) => {
    setSelectedAssignmentIds((current) =>
      checked
        ? [...current, assignmentId]
        : current.filter((id) => id !== assignmentId),
    );
  };

  const resetForm = () => {
    setNewAssignmentId('');
    setSelectedAssignmentIds([]);
    setTemplateName('');
    setNewStart('');
    setNewEnd('');
    setCreateError(null);
    setCreateSummary(null);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    setCreateSummary(null);
    try {
      if (mode === 'single') {
        await createMutation.mutateAsync({
          companyId: companyId as string,
          employeeAssignmentId: newAssignmentId,
          periodStart: newStart as `${number}-${number}-${number}`,
          periodEnd: newEnd as `${number}-${number}-${number}`,
        });
        resetForm();
        setIsCreateOpen(false);
        return;
      }

      const targets = selectedAssignmentIds;
      const results = await Promise.allSettled(
        targets.map((assignmentId) =>
          createMutation.mutateAsync({
            companyId: companyId as string,
            employeeAssignmentId: assignmentId,
            periodStart: newStart as `${number}-${number}-${number}`,
            periodEnd: newEnd as `${number}-${number}-${number}`,
          }),
        ),
      );

      const failed = results.filter((result) => result.status === 'rejected');
      const created = results.length - failed.length;

      if (templateName.trim()) {
        const nextTemplate: TimesheetTemplate = {
          id: `template-${Date.now()}`,
          name: templateName.trim(),
          periodStart: newStart,
          periodEnd: newEnd,
          assignmentIds: targets,
        };
        const nextTemplates = [...savedTemplates, nextTemplate];
        setSavedTemplates(nextTemplates);
        persistTemplates(companyId as string, nextTemplates);
        setTemplateName('');
      }

      setCreateSummary(
        failed.length === 0
          ? `Se crearon ${created} períodos correctamente.`
          : `Se crearon ${created} períodos. ${failed.length} fallaron.`,
      );
      setSelectedAssignmentIds([]);
      setNewStart('');
      setNewEnd('');
    } catch (error) {
      setCreateError(readErrorMessage(error));
    }
  };

  const applyTemplate = (template: TimesheetTemplate) => {
    setMode('template');
    setTemplateName(template.name);
    setNewStart(template.periodStart);
    setNewEnd(template.periodEnd);
    setSelectedAssignmentIds(template.assignmentIds);
    setCreateError(null);
    setCreateSummary(null);
  };

  const deleteTemplate = (templateId: string) => {
    const nextTemplates = savedTemplates.filter(
      (template) => template.id !== templateId,
    );
    setSavedTemplates(nextTemplates);
    persistTemplates(companyId as string, nextTemplates);
  };

  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleccioná una compañía activa para consultar los períodos.
      </p>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link className={breadcrumbLinkClass} to="/dashboard">
                  Inicio
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-gray-500 text-xs" />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link className={breadcrumbLinkClass} to="/dashboard/hr/employees">
                  Recursos humanos
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-gray-500 text-xs" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-gray-800 text-xs">
                Registro de horas
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-3xl font-medium tracking-tight">Registro de horas</h1>
        <p className="text-sm text-muted-foreground">
          Revisá períodos propios o del equipo según tu alcance vigente.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2 sm:max-w-xs">
          <label className="text-sm font-medium" htmlFor="timesheet-status-filter">
            Estado
          </label>
          <select
            id="timesheet-status-filter"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as TimesheetPeriodStatus | 'all')}
          >
            <option value="all">Todos</option>
            <option value="draft">Borrador</option>
            <option value="submitted">Enviados</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">Rechazados</option>
          </select>
        </div>
      </div>

      {periodsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando períodos…</p>
      ) : null}

      {periodsQuery.isError ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {readErrorMessage(periodsQuery.error)}
        </p>
      ) : null}

      {!periodsQuery.isLoading && !periodsQuery.isError ? (
        periodsQuery.data && periodsQuery.data.length > 0 ? (
          <Table>
            <TableHeader className="bg-[#f6f6f6] rounded-2xl">
              <TableRow>
                <TableHead className="h-11 text-xs">Empleado</TableHead>
                <TableHead className="h-11 text-xs">Período</TableHead>
                <TableHead className="h-11 text-xs">Estado</TableHead>
                <TableHead className="h-11 pr-5 text-right text-xs">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodsQuery.data.map((period) => {
                const employeeName =
                  assignmentNames.get(period.employeeAssignmentId) ?? period.id;
                return (
                  <TableRow key={period.id} className="group">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {employeeName.slice(0, 1).toUpperCase()}
                        </span>
                        <span
                          className="cursor-pointer truncate font-medium hover:underline"
                          onClick={() => {
                            void navigate(`/dashboard/hr/timesheets/${period.id}`);
                          }}
                        >
                          {employeeName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {period.periodStart} → {period.periodEnd}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass[period.status]}>
                        {statusLabels[period.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void navigate(`/dashboard/hr/timesheets/${period.id}`);
                        }}
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            No hay períodos para el filtro seleccionado.
          </p>
        )
      ) : null}

      <HoverExpandFab
        label="Nuevo período"
        icon={<Plus className="size-6" />}
        ariaLabel="Nuevo período"
        onClick={() => {
          resetForm();
          setIsCreateOpen(true);
        }}
      />

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogTitle>Nuevo período</DialogTitle>

          <div className="inline-flex w-full rounded-2xl border border-border p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 transition-colors',
                mode === 'single'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Plus className="size-4" />
              Período simple
            </button>
            <button
              type="button"
              onClick={() => setMode('template')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 transition-colors',
                mode === 'template'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Layers className="size-4" />
              Plantilla (varios)
            </button>
          </div>

            {assignmentsQuery.isError ? (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                No se pudieron cargar las asignaciones: {readErrorMessage(assignmentsQuery.error)}
              </p>
            ) : null}

            {unassignedEmployees.length > 0 ? (
              <div className="space-y-2 rounded-md border border-dashed border-border p-3">
                <div>
                  <p className="text-sm font-medium">Empleados sin asignación</p>
                  <p className="text-xs text-muted-foreground">
                    Asignalos a un puesto para poder crearles períodos.
                  </p>
                </div>
                {unassignedEmployees.map((option) => (
                  <AssignEmployeeRow
                    key={option.employeeId}
                    employeeId={option.employeeId}
                    fullName={option.fullName}
                    companyId={companyId as string}
                    apiBaseUrl={apiBaseUrl}
                  />
                ))}
              </div>
            ) : null}


          <form
            className="space-y-4"
            onSubmit={(event) => {
              void handleCreate(event);
            }}
          >
            {mode === 'template' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="timesheet-template-name">
                  Nombre de la plantilla
                </label>
                <Input
                  id="timesheet-template-name"
                  placeholder="Ej.: Semana 34 – Operaciones"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                />
              </div>
            ) : null}

            {mode === 'single' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="timesheet-new-assignment">
                  Empleado
                </label>
                <select
                  id="timesheet-new-assignment"
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  value={newAssignmentId}
                  onChange={(event) => setNewAssignmentId(event.target.value)}
                >
                  <option value="" disabled>
                    Seleccioná un empleado
                  </option>
                  {employeeOptions.map((option) => (
                    <option
                      key={option.employeeId}
                      value={option.assignmentId ?? ''}
                      disabled={!option.assignmentId}
                    >
                      {option.fullName}
                      {option.assignmentId ? '' : ' (sin asignación)'}
                    </option>
                  ))}
                </select>
                {missingAssignmentCount > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {missingAssignmentCount} empleado(s) no tienen asignación primaria activa y no pueden tener períodos todavía.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Empleados ({selectedAssignmentIds.length} seleccionados)
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSelectedAssignmentIds(
                        employeeOptions
                          .filter((option) => option.assignmentId)
                          .map((option) => option.assignmentId as string),
                      )
                    }
                  >
                    Seleccionar todos
                  </Button>
                </div>
                {employeesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando empleados…</p>
                ) : (
                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                    {employeeOptions.map((option) => (
                      <label
                        key={option.employeeId}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                          !option.assignmentId && 'opacity-50',
                        )}
                      >
                        <Checkbox
                          checked={
                            option.assignmentId
                              ? selectedAssignmentIds.includes(option.assignmentId)
                              : false
                          }
                          disabled={!option.assignmentId}
                          onCheckedChange={(checked) => {
                            if (option.assignmentId) {
                              toggleAssignment(option.assignmentId, checked === true);
                            }
                          }}
                        />
                        <span className="truncate">{option.fullName}</span>
                        {!option.assignmentId ? (
                          <span className="ml-auto text-xs text-muted-foreground">
                            sin asignación
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                )}
                {missingAssignmentCount > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {missingAssignmentCount} empleado(s) no tienen asignación primaria activa y no pueden incluirse todavía.
                  </p>
                ) : null}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="timesheet-new-start">
                Inicio
              </label>
              <DatePickerField
                id="timesheet-new-start"
                value={newStart}
                onChange={setNewStart}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="timesheet-new-end">
                Fin
              </label>
              <DatePickerField
                id="timesheet-new-end"
                value={newEnd}
                onChange={setNewEnd}
              />
            </div>

            {mode === 'template' && savedTemplates.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Plantillas guardadas</p>
                <div className="space-y-1">
                  {savedTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.periodStart} → {template.periodEnd} · {template.assignmentIds.length} empleados
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyTemplate(template)}
                        >
                          Aplicar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {createError ? (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {createError}
              </p>
            ) : null}

            {createSummary ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {createSummary}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  !newStart ||
                  !newEnd ||
                  (mode === 'single'
                    ? !newAssignmentId
                    : selectedAssignmentIds.length === 0)
                }
              >
                {createMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {mode === 'template' ? 'Crear períodos' : 'Crear período'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};
