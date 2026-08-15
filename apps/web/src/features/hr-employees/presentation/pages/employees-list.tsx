import type { AuthSession } from '@/features/auth/domain/auth';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  CircleAlert,
  Funnel,
  Loader,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

import { useEmployeesPage } from '../../application/hr-employees-queries';
import type { EmploymentStatus } from '../../domain/employees';
import { EmployeeFormPage } from './employee-form';

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
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
      search: debouncedSearch,
      status:
        statusFilter === 'all' ? undefined : (statusFilter as EmploymentStatus),
    },
    apiBaseUrl,
  );

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

  const employees = employeesQuery.data?.items ?? [];
  const totalEmployees = employeesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / 10));

  const copyEmployeeEmail = async (email: string | null | undefined) => {
    if (!email || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(email);
      toast.success('Correo copiado');
    } catch {
      // Clipboard permissions can be denied by the browser; keep the table usable.
    }
  };

  return (
    <section className="">
      <div className="">
        <div className="">
          <div className="-mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* headers: SubTitle - Search input - filter*/}
            {/* Subtitle */}
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-medium tracking-tight">
                Gestionar Empleados
              </h2>
              <Button
                type="button"
                variant="outline"
                className="shrink-0 cursor-pointer rounded-2xl"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="size-4" color="#000" />
                Agregar empleado
              </Button>
            </div>
            {/* Search input */}
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
                <span
                  role="status"
                  aria-live="polite"
                  className="flex size-10 shrink-0 items-center justify-center"
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
              {/* filter */}
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  aria-label="Filtrar por estado"
                  className="h-10 flex items-center justify-center w-32 cursor-pointer rounded-2xl bg-background px-2.5"
                >
                  <Funnel className="size-4" />
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Estado</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="suspended">Suspendidos</SelectItem>
                  <SelectItem value="separated">Desvinculados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-5xl">
              <DialogTitle className="sr-only">Agregar empleado</DialogTitle>
              <EmployeeFormPage
                key={isCreateDialogOpen ? 'open' : 'closed'}
                session={session}
                {...(apiBaseUrl ? { apiBaseUrl } : {})}
                onCreated={() => setIsCreateDialogOpen(false)}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          {totalEmployees === 0 &&
          !debouncedSearch &&
          statusFilter === 'all' ? (
            <div className="border-t px-5 py-12 text-center">
              <Users className="mx-auto size-8 text-muted-foreground/50" />
              <h2 className="text-xl font-medium tracking-tight">
                Todavía no se crearon empleados
              </h2>
              <p className="mt-1 text-xs text-gray-600">
                Creá el primer registro desde el panel lateral.
              </p>
            </div>
          ) : totalEmployees === 0 ? (
            <div className="border-t px-5 py-12 text-center">
              <h2 className="text-xl flex items-center justify-center gap-2 font-medium tracking-tight">
                <CircleAlert size={18} color="#000" /> No encontramos empleados
              </h2>
              <p className="mt-1 text-xs text-gray-600">
                Probá con otro nombre o cambiá el estado.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#f6f6f6] rounded-2xl">
                <TableRow className="">
                  <TableHead className="h-11 pl-5 text-xs">Empleado</TableHead>
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
                      selectedEmployeeId === employee.id
                        ? 'selected'
                        : undefined
                    }
                    className="group"
                  >
                    <TableCell className="py-4 pl-5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {(employee.fullName || employee.id)
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {employee.fullName || employee.id}
                          </div>
                          <button
                            type="button"
                            disabled={!employee.email}
                            className="block cursor-pointer max-w-full truncate text-left text-xs text-gray-600 hover:text-black disabled:cursor-default disabled:hover:text-gray-600"
                            onClick={() =>
                              void copyEmployeeEmail(employee.email)
                            }
                            aria-label={
                              employee.email
                                ? `Copiar correo ${employee.email}`
                                : 'Sin correo informado'
                            }
                          >
                            {employee.email ?? 'Sin correo informado'}
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
                      {formatEmployeeDate(
                        employee.hiredAt ?? employee.createdAt,
                      )}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <button
                        className="text-xs border hover:bg-black hover:text-white hover:border-black transition-all cursor-pointer ease-in-out duration-400 py-1.5 px-2.5 rounded-2xl"
                        onClick={() => onSelectEmployee?.(employee.id)}
                        aria-label={`Abrir empleado ${employee.id}`}
                      >
                        Ver detalles
                      </button>
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
                </strong>
                {' empleados de '}
                <strong className="font-semibold text-foreground">
                  {totalEmployees}
                </strong>
              </span>
              <span aria-hidden className="h-4 w-px bg-border" />
              <span>Filas por página</span>
              <strong className="font-semibold text-foreground">10</strong>
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
                  <ChevronRight className="size-4" />
                </Button>
              ) : (
                <span className="px-2 text-muted-foreground/60">
                  Última página
                </span>
              )}
            </nav>
          </footer>
        </div>
      </div>
    </section>
  );
};
