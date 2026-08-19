import {
  FileText,
  History,
  MoreHorizontal,
  Network,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { AuthSession } from '@/features/auth/domain/auth';
import {
  useAssignments,
  useDeleteEmployee,
  useEmployee,
  useEmployees,
  usePositions,
  useUpdateEmployee,
} from '@/features/hr-employees/application/hr-employees-queries';
import {
  toEmployeeFormValues,
  toUpdateEmployeeInput,
  type Employee,
  type EmploymentStatus,
} from '@/features/hr-employees/domain/employees';
import { EmployeeEditDrawer } from '../components/employee-edit-drawer';
import { AssignmentTimelinePage } from './assignment-timeline';
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
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Skeleton } from '@/shared/ui/skeleton';

const fallbackImage =
  'https://i.ibb.co/Pzv53qFM/Whats-App-Image-2026-08-15-at-13-57-12.jpg';

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('es-AR') : 'No informado';

type DetailTab = 'info' | 'assignment' | 'documents' | 'history';

const tabItems: { id: DetailTab; label: string }[] = [
  { id: 'info', label: 'Información' },
  { id: 'assignment', label: 'Asignación' },
  { id: 'documents', label: 'Documentos' },
  { id: 'history', label: 'Historial' },
];

export const EmployeeDetailPage = ({
  session,
  employeeId,
  apiBaseUrl,
  onDeleted,
}: {
  session: AuthSession;
  employeeId: string | null;
  apiBaseUrl?: string;
  onDeleted?: (deleted: Employee) => void;
}) => {
  const companyId = session.activeCompany?.companyId;
  const employeeQuery = useEmployee(
    companyId,
    employeeId ?? undefined,
    apiBaseUrl,
  );
  const employeesQuery = useEmployees(companyId, apiBaseUrl);
  const positionsQuery = usePositions(companyId, apiBaseUrl);
  const updateEmployeeMutation = useUpdateEmployee(apiBaseUrl);
  const deleteEmployeeMutation = useDeleteEmployee(apiBaseUrl);
  const assignments = useAssignments(
    { companyId, employeeId: employeeId ?? undefined },
    apiBaseUrl,
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('info');

  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleccioná una compañía activa para consultar los detalles del empleado.
      </p>
    );
  }

  if (!employeeId) {
    return (
      <p className="text-sm text-muted-foreground">
        Elegí un empleado de la lista para consultar sus detalles.
      </p>
    );
  }

  if (
    employeeQuery.isLoading ||
    employeesQuery.isLoading ||
    positionsQuery.isLoading ||
    assignments.managerQuery.isLoading ||
    assignments.directReportsQuery.isLoading
  ) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (employeeQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {employeeQuery.error instanceof Error
          ? employeeQuery.error.message
          : 'No se pudieron cargar los detalles del empleado.'}
      </p>
    );
  }

  const employee = employeeQuery.data;

  if (!employee) {
    return (
      <p className="text-sm text-muted-foreground">
        El empleado seleccionado ya no existe.
      </p>
    );
  }

  const allEmployees = employeesQuery.data ?? [];
  const employeesById = new Map(allEmployees.map((item) => [item.id, item]));
  const positionsById = new Map(
    (positionsQuery.data ?? []).map((item) => [item.id, item]),
  );
  const manager = assignments.managerQuery.data;
  const directReports = assignments.directReportsQuery.data ?? [];
  const displayName = employee.fullName || employee.id;
  const managerName = manager
    ? `${employeesById.get(manager.employeeId)?.fullName ?? manager.employeeId} · ${positionsById.get(manager.positionId)?.name ?? manager.positionId}`
    : 'No asignado';
  const directReportsName = directReports.length
    ? directReports
        .map(
          (report) =>
            employeesById.get(report.employeeId)?.fullName ?? report.employeeId,
        )
        .join(', ')
    : 'Ninguno';

  const changeStatus = async (employmentStatus: EmploymentStatus) => {
    try {
      const values = toEmployeeFormValues(employee);
      await updateEmployeeMutation.mutateAsync(
        toUpdateEmployeeInput(companyId, employee.id, {
          ...values,
          employmentStatus,
        }),
      );
      toast.success(
        employmentStatus === 'active'
          ? 'Empleado activado'
          : employmentStatus === 'suspended'
            ? 'Empleado suspendido'
            : 'Empleado desvinculado',
        { description: displayName },
      );
    } catch {
      // El error se refleja en el mutation.
    }
  };

  const handleConfirmDelete = async () => {
    if (!employee || !companyId) return;
    try {
      await deleteEmployeeMutation.mutateAsync({
        companyId,
        employeeId: employee.id,
      });
      setIsDeleteOpen(false);
      onDeleted?.(employee);
    } catch {
      // Mantener el diálogo abierto para mostrar el error.
    }
  };

  const readOnlyField = (label: string, value: string) => (
    <div className="py-4">
      <p className="text-xs text-black/45">{label}</p>
      <p className="mt-1 wrap-break-words text-sm leading-5 text-black/80">
        {value}
      </p>
    </div>
  );

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[18px] border border-black/10 bg-[#fbfbfa]">
        <div className="grid lg:grid-cols-[minmax(260px,0.72fr)_1.28fr]">
          <div className="relative h-56 lg:h-full">
            <img
              src={employee.avatarUrl || fallbackImage}
              alt={`Foto de ${displayName}`}
              className="absolute inset-0 size-full object-cover grayscale"
              onError={(event) => {
                event.currentTarget.src = fallbackImage;
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
            <div className="absolute inset-x-4 bottom-4 z-10 p-4">
              <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {displayName}
              </h2>
              <p className="mt-2 text-sm text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                {employee.email || 'Sin correo informado'}
              </p>
            </div>
          </div>

          <div className="relative p-9">
            <div className="absolute right-5 top-5 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="shrink-0 cursor-pointer rounded-2xl"
                onClick={() => setIsEditOpen(true)}
                disabled={updateEmployeeMutation.isPending}
              >
                <Pencil className="size-4" />
                Editar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Más acciones"
                    className="shrink-0 cursor-pointer rounded-2xl"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  {employee.employmentStatus === 'active' ? (
                    <DropdownMenuItem onClick={() => void changeStatus('suspended')}>
                      Suspender
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => void changeStatus('active')}>
                      Activar
                    </DropdownMenuItem>
                  )}
                  {employee.employmentStatus !== 'separated' ? (
                    <DropdownMenuItem onClick={() => void changeStatus('separated')}>
                      Desvincular
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  employee.employmentStatus === 'separated'
                    ? 'rounded-2xl border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700'
                    : employee.employmentStatus === 'suspended'
                      ? 'rounded-2xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700'
                      : 'rounded-2xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'
                }
              >
                {employee.employmentStatus === 'active'
                  ? 'Activo'
                  : employee.employmentStatus === 'suspended'
                    ? 'Suspendido'
                    : 'Desvinculado'}
              </span>
            </div>

            <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
              {readOnlyField('Nombre completo', employee.fullName || 'No informado')}
              {readOnlyField('Correo electrónico', employee.email || 'No informado')}
              {readOnlyField(
                'Tipo de documento',
                employee.documentType
                  ? employee.documentType.toUpperCase()
                  : 'No informado',
              )}
              {readOnlyField(
                'Número de documento',
                employee.documentNumber || 'No informado',
              )}
              {readOnlyField(
                'Fecha de contratación',
                formatDate(employee.hiredAt),
              )}
              {readOnlyField('Fecha de registro', formatDate(employee.createdAt))}
              {readOnlyField('ID del empleado', employee.id)}
              {readOnlyField('Jefe directo', managerName)}
              <div className="py-4 sm:col-span-2">
                <p className="text-xs text-black/45">Reportes directos</p>
                <p className="mt-1 wrap-break-words text-sm leading-5 text-black/80">
                  {directReportsName}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav aria-label="Secciones del empleado" className="overflow-x-auto">
        <ul className="flex min-w-max gap-6 text-sm">
          {tabItems.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                aria-pressed={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex h-8 items-center whitespace-nowrap border-b-2 px-1 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {activeTab === 'assignment' ? (
        <AssignmentTimelinePage
          session={session}
          {...(apiBaseUrl ? { apiBaseUrl } : {})}
          employeeId={employeeId}
        />
      ) : null}

      {activeTab === 'documents' ? (
        <div className="rounded-[18px] border border-black/10 bg-[#fbfbfa] p-9">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
              <FileText className="size-5" />
            </span>
            <div>
              <h3 className="text-lg font-medium tracking-tight">Documentos</h3>
              <p className="text-xs text-gray-600">
                Contratos, DNI y certificaciones del empleado.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center">
            <Upload className="size-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Todavía no hay documentos cargados.
            </p>
            <Button type="button" variant="outline" className="rounded-2xl">
              Subir documento
            </Button>
          </div>
        </div>
      ) : null}

      {activeTab === 'history' ? (
        <div className="rounded-[18px] border border-black/10 bg-[#fbfbfa] p-9">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
              <History className="size-5" />
            </span>
            <div>
              <h3 className="text-lg font-medium tracking-tight">Historial</h3>
              <p className="text-xs text-gray-600">
                Cambios de estado y movimientos del empleado.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center">
            <Network className="size-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              El historial detallado estará disponible próximamente.
            </p>
          </div>
        </div>
      ) : null}

      <EmployeeEditDrawer
        employee={employee}
        session={session}
        {...(apiBaseUrl ? { apiBaseUrl } : {})}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este empleado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción elimina el registro de{' '}
              <span className="font-medium text-foreground">
                {displayName}
              </span>{' '}
              y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteEmployeeMutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {deleteEmployeeMutation.error instanceof Error
                ? deleteEmployeeMutation.error.message
                : 'No se pudo eliminar el empleado.'}
            </p>
          ) : null}
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
                void handleConfirmDelete();
              }}
              className="rounded-2xl bg-red-500 text-white hover:bg-red-700"
              disabled={deleteEmployeeMutation.isPending}
            >
              {deleteEmployeeMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Eliminando…
                </span>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
