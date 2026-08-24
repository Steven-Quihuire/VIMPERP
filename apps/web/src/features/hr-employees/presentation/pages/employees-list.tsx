import type { AuthSession } from '@/features/auth/domain/auth';
import {
  ChevronLeft,
  ChevronsLeft,
  CheckCheck,
  CircleAlert,
  Copy,
  Download,
  Loader,
  Plus,
  Search,
  Trash2,
  Users,
  UserX,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

import {
  useDeleteEmployee,
  useEmployees,
  useEmployeesPage,
  usePositions,
  useUpdateEmployee,
} from '../../application/hr-employees-queries';
import {
  toEmployeeFormValues,
  toUpdateEmployeeInput,
  type Employee,
  type EmploymentStatus,
} from '../../domain/employees';
import { EmployeeFilters } from '../components/employee-filters';
import type { EmployeeFiltersValue } from '../components/employee-filters';
import { EmployeeRowActions } from '../components/employee-row-actions';
import { EmployeeFormPage } from './employee-form';
import {
  defaultPageSizeOptions,
  TablePageSize,
} from '@/shared/ui/table-page-size';
import { HoverExpandFab } from '@/shared/ui/hover-expand-fab';

const employeeMonthLabels = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'agos',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

const formatEmployeeDate = (value: string) => {
  const date = new Date(value);

  return `${date.getDate()} de ${employeeMonthLabels[date.getMonth()]} del ${date.getFullYear()}`;
};

const emptyFilters: EmployeeFiltersValue = {
  status: new Set(),
  withEmailOnly: false,
};

export const EmployeesListPage = ({
  session,
  apiBaseUrl,
  selectedEmployeeId,
  onSelectEmployee,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
  selectedEmployeeId?: string | null;
  onSelectEmployee?: (employeeId: string) => void;
}) => {
  const companyId = session.activeCompany?.companyId;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<EmployeeFiltersValue>(emptyFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Employee | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const employeesQuery = useEmployeesPage(
    {
      companyId,
      page,
      pageSize,
      search: debouncedSearch,
      status: undefined,
    },
    apiBaseUrl,
  );
  const allEmployeesQuery = useEmployees(companyId, apiBaseUrl);
  const positionsQuery = usePositions(companyId, apiBaseUrl);
  const deleteEmployeeMutation = useDeleteEmployee(apiBaseUrl);
  const updateEmployeeMutation = useUpdateEmployee(apiBaseUrl);

  const allEmployees = allEmployeesQuery.data ?? [];
  const positions = positionsQuery.data ?? [];

  const employees = useMemo(() => {
    const base = employeesQuery.data?.items ?? [];
    return base.filter((employee) => {
      if (filters.status.size > 0 && !filters.status.has(employee.employmentStatus)) {
        return false;
      }
      if (filters.withEmailOnly && !employee.email) {
        return false;
      }
      return true;
    });
  }, [employeesQuery.data, filters]);

  const totalEmployees = employeesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / pageSize));

  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleccioná una compañía activa para consultar los empleados.
      </p>
    );
  }

  if (employeesQuery.isLoading) {
    return (
      <div className="space-y-3" aria-label="Cargando empleados">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (employeesQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {employeesQuery.error instanceof Error
          ? employeesQuery.error.message
          : 'No se pudieron cargar los empleados.'}
      </p>
    );
  }

  const allOnPageSelected =
    employees.length > 0 && employees.every((employee) => selectedIds.has(employee.id));
  const someOnPageSelected = employees.some((employee) =>
    selectedIds.has(employee.id),
  );

  const toggleId = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(employees.map((employee) => employee.id)));
  };

  const copyEmployeeEmail = async (
    email: string | null | undefined,
    employeeId: string,
  ) => {
    if (!email || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmailId(employeeId);
      toast.success('Correo copiado', {
        icon: <CheckCheck color="#26a269" />,
      });
      window.setTimeout(
        () =>
          setCopiedEmailId((current) => (current === employeeId ? null : current)),
        1500,
      );
    } catch {
      // Clipboard permissions can be denied by the browser; keep the table usable.
    }
  };

  const exportCsv = () => {
    const rows = [...selectedIds]
      .map((id) => allEmployees.find((employee) => employee.id === id))
      .filter((employee): employee is Employee => Boolean(employee));
    const header = 'nombre,correo,documento,estado,alta\n';
    const body = rows
      .map((employee) =>
        [
          employee.fullName,
          employee.email ?? '',
          employee.documentNumber ?? '',
          employee.employmentStatus,
          employee.hiredAt ?? employee.createdAt,
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    const blob = new Blob([`${header}${body}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'empleados.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo exportado', {
      description: `${rows.length} empleados en empleados.csv`,
    });
  };

  const bulkChangeStatus = async (employmentStatus: EmploymentStatus) => {
    const ids = [...selectedIds];
    try {
      for (const id of ids) {
        const employee = allEmployees.find((item) => item.id === id);
        if (!employee) continue;
        const values = toEmployeeFormValues(employee);
        await updateEmployeeMutation.mutateAsync(
          toUpdateEmployeeInput(companyId, id, {
            ...values,
            employmentStatus,
          }),
        );
      }
      toast.success(
        employmentStatus === 'suspended'
          ? 'Empleados suspendidos'
          : 'Empleados desvinculados',
        { description: `${ids.length} registros actualizados` },
      );
      setSelectedIds(new Set());
    } catch {
      // Mantener la selección para reintentar.
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !companyId) return;
    try {
      await deleteEmployeeMutation.mutateAsync({
        companyId,
        employeeId: pendingDelete.id,
      });
      toast.success('Empleado eliminado', {
        description: pendingDelete.fullName || pendingDelete.id,
      });
      setPendingDelete(null);
    } catch {
      // El error se refleja en el mutation.
    }
  };

  return (
    <section className="space-y-6">

      <div className="mt-0 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-medium tracking-tight">
            Gestionar Empleados
          </h2>
          <span
            role="status"
            aria-live="polite"
            className="flex size-9 shrink-0 items-center justify-center"
          >
            {employeesQuery.isFetching ? (
              <Loader
                color="#000"
                className="size-4 animate-spin"
                aria-label="Buscando empleados"
              />
            ) : null}
          </span>
        </div>
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="h-10 w-full border px-4 rounded-2xl justify-start flex items-center">
              <Search size={18} color="#000" />
              <Input
                aria-label="Buscar empleados"
                className="h-10 placeholder:truncate placeholder:text-xs border-none text-sm focus-visible:border-none focus-visible:outline-none"
                placeholder="Buscar por nombre, correo o documento"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <EmployeeFilters
            value={filters}
            onChange={setFilters}
            onClear={() => setFilters(emptyFilters)}
          />
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent
          hideCloseButton
          className="gap-0 overflow-hidden border-0 p-0 sm:max-w-4xl"
        >
          <DialogTitle className="sr-only">Agregar empleado</DialogTitle>
          <div className="grid sm:grid-cols-[2fr_3fr]">
            <div className="relative hidden overflow-hidden sm:block">
              <img
                src="/bg__employees-bw.svg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="max-h-[90vh] overflow-y-auto">
              <EmployeeFormPage
                key={isCreateDialogOpen ? 'open' : 'closed'}
                session={session}
                {...(apiBaseUrl ? { apiBaseUrl } : {})}
                onSelectEmployee={(employeeId) => {
                  setIsCreateDialogOpen(false);
                  onSelectEmployee?.(employeeId);
                }}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {totalEmployees === 0 && !debouncedSearch && filters.status.size === 0 && !filters.withEmailOnly ? (
        <div className="border-t px-5 py-12 text-center">
          <Users className="mx-auto size-8 text-muted-foreground/50" />
          <h2 className="text-xl font-medium tracking-tight">
            Todavía no se crearon empleados
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            Creá el primer registro con el botón “Agregar empleado”.
          </p>
        </div>
      ) : employees.length === 0 ? (
        <div className="border-t px-5 py-12 text-center">
          <h2 className="text-xl flex items-center justify-center gap-2 font-medium tracking-tight">
            <CircleAlert size={18} color="#000" /> No encontramos empleados
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            Probá con otro nombre o cambiá los filtros.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader className="bg-[#f6f6f6] rounded-2xl">
            <TableRow className="">
              <TableHead className="h-11 w-10 pl-5">
                <Checkbox
                  aria-label="Seleccionar página"
                  checked={allOnPageSelected}
                  onCheckedChange={toggleAllOnPage}
                />
              </TableHead>
              <TableHead className="h-11 text-xs">Empleado</TableHead>
              <TableHead className="h-11 text-xs">Documento</TableHead>
              <TableHead className="h-11 text-xs">Estado</TableHead>
              <TableHead className="h-11 text-xs">Alta</TableHead>
              <TableHead className="h-11 pr-5 text-right text-xs"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow
                key={employee.id}
                data-state={
                  selectedEmployeeId === employee.id ? 'selected' : undefined
                }
                className="group"
              >
                <TableCell className="pl-5">
                  <Checkbox
                    aria-label={`Seleccionar ${employee.fullName || employee.id}`}
                    checked={selectedIds.has(employee.id)}
                    onCheckedChange={() => toggleId(employee.id)}
                  />
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {(employee.fullName || employee.id)
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div
                        className="cursor-pointer truncate font-medium hover:underline"
                        onClick={() => onSelectEmployee?.(employee.id)}
                      >
                        {employee.fullName || employee.id}
                      </div>
                      <button
                        type="button"
                        disabled={!employee.email}
                        className="group/email block max-w-full cursor-pointer truncate text-left text-xs text-gray-600 hover:text-black disabled:cursor-default disabled:hover:text-gray-600"
                        onClick={() => void copyEmployeeEmail(employee.email, employee.id)}
                        aria-label={
                          employee.email
                            ? `Copiar correo ${employee.email}`
                            : 'Sin correo informado'
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          <span className="truncate">
                            {employee.email ?? 'Sin correo informado'}
                          </span>
                          {employee.email ? (
                            copiedEmailId === employee.id ? (
                              <CheckCheck
                                color="#26a269"
                                className="size-3.5 shrink-0"
                              />
                            ) : (
                              <Copy
                                color="#000"
                                className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/email:opacity-100"
                              />
                            )
                          ) : null}
                        </span>
                      </button>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {employee.documentNumber ?? 'Sin documento'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      employee.employmentStatus === 'separated'
                        ? 'destructive'
                        : 'outline'
                    }
                    className={
                      employee.employmentStatus === 'active'
                        ? 'border-emerald-200 rounded-2xl bg-emerald-50 text-emerald-700'
                        : employee.employmentStatus === 'suspended'
                          ? 'border-amber-200 bg-amber-50 rounded-2xl text-amber-700'
                          : undefined
                    }
                  >
                    {employee.employmentStatus === 'active'
                      ? 'Activo'
                      : employee.employmentStatus === 'suspended'
                        ? 'Suspendido'
                        : 'Desvinculado'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatEmployeeDate(employee.hiredAt ?? employee.createdAt)}
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <EmployeeRowActions
                    employee={employee}
                    companyId={companyId}
                    {...(apiBaseUrl ? { apiBaseUrl } : {})}
                    onView={(employeeId) => onSelectEmployee?.(employeeId)}
                    onRequestDelete={(target) => setPendingDelete(target)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <footer className="flex min-h-16 flex-wrap items-center justify-between gap-4 border-t bg-muted/10 px-4 py-3 text-xs sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            Mostrando{' '}
            <strong className="font-semibold text-foreground">
              {employees.length}
            </strong>{' '}
            empleados de{' '}
            <strong className="font-semibold text-foreground">
              {totalEmployees}
            </strong>
          </span>
          <span aria-hidden className="h-4 w-px bg-border" />
          <span>Filas por página</span>
          <TablePageSize
            value={pageSize}
            options={defaultPageSizeOptions}
            onChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </div>
        <nav
          aria-label="Paginación de empleados"
          className="flex items-center gap-1"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Ir a la primera página"
            disabled={page === 1 || employeesQuery.isFetching}
            onClick={() => setPage(1)}
            className="size-8 rounded-md"
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Volver al inicio"
            disabled={page === 1 || employeesQuery.isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="size-8 rounded-md"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="mx-1 h-5 w-px bg-border" />
          {page < totalPages ? (
            <Button
              type="button"
              variant="ghost"
              aria-label="Ver más empleados"
              disabled={employeesQuery.isFetching}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="inline-flex text-xs cursor-pointer h-8 items-center gap-1 rounded-md px-2 font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              Siguiente
            </Button>
          ) : (
            <span className="px-2 text-muted-foreground/60">
              Última página
            </span>
          )}
        </nav>
      </footer>

      {selectedIds.size > 0 ? (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-xl">
            <span className="text-sm font-medium">
              {selectedIds.size} seleccionados
            </span>
            <span aria-hidden className="h-5 w-px bg-border" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-2xl"
              onClick={() => void bulkChangeStatus('suspended')}
              disabled={updateEmployeeMutation.isPending}
            >
              <UserX className="size-4" />
              Suspender
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-2xl"
              onClick={exportCsv}
            >
              <Download className="size-4" />
              Exportar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-2xl"
              onClick={() => setSelectedIds(new Set())}
            >
              Limpiar
            </Button>
          </div>
        </div>
      ) : null}

      <HoverExpandFab
        label="Agregar empleado"
        icon={<Plus className="size-6" />}
        ariaLabel="Nuevo empleado"
        onClick={() => setIsCreateDialogOpen(true)}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este empleado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción elimina el registro de{' '}
              <span className="font-medium text-foreground">
                {pendingDelete?.fullName || pendingDelete?.id}
              </span>{' '}
              y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-2xl"
              disabled={deleteEmployeeMutation.isPending}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              className="rounded-2xl bg-red-500 text-white hover:bg-red-700"
              disabled={deleteEmployeeMutation.isPending}
            >
              {deleteEmployeeMutation.isPending ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
