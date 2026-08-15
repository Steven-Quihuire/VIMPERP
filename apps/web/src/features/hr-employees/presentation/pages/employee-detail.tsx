import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import type { AuthSession } from '@/features/auth/domain/auth';
import { Button } from '@/shared/ui/button';
import { Field, FieldContent, FieldError, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

import {
  useAssignments,
  useEmployee,
  useEmployees,
  usePositions,
  useUpdateEmployee,
} from '../../application/hr-employees-queries';
import {
  employeeDocumentTypeValues,
  employeeFormSchema,
  toEmployeeFormValues,
  toUpdateEmployeeInput,
  type EmployeeFormValues,
} from '../../domain/employees';

const documentTypeLabels = {
  cedula: 'Cédula',
  ruc: 'RUC',
  pasaporte: 'Pasaporte',
} as const;

const fallbackImage =
  'https://i.ibb.co/Pzv53qFM/Whats-App-Image-2026-08-15-at-13-57-12.jpg';

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('es-AR') : 'No informado';

export const EmployeeDetailPage = ({
  session,
  employeeId,
  apiBaseUrl,
}: {
  session: AuthSession;
  employeeId: string | null;
  apiBaseUrl?: string;
  onSelectEmployee?: (employeeId: string) => void;
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
  const [isEditing, setIsEditing] = useState(false);
  const assignments = useAssignments(
    { companyId, employeeId: employeeId ?? undefined },
    apiBaseUrl,
  );
  const form = useForm<
    z.input<typeof employeeFormSchema>,
    unknown,
    EmployeeFormValues
  >({
    resolver: zodResolver(employeeFormSchema),
    values: toEmployeeFormValues(employeeQuery.data),
  });

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

  const inputClassName = `h-auto border-0 border-b-0 px-0 py-0 text-sm leading-5 shadow-none focus-visible:ring-0 disabled:cursor-default disabled:opacity-100 ${isEditing ? 'text-[#074446]' : 'text-black/80'}`;

  return (
    <section>
      {/* detalles del empleado */}
      <form
        className="overflow-hidden rounded-[18px] border border-black/10 bg-[#fbfbfa]"
        onSubmit={(event) => {
          void form.handleSubmit(async (values) => {
            await updateEmployeeMutation.mutateAsync(
              toUpdateEmployeeInput(companyId, employee.id, values),
            );
            setIsEditing(false);
          })(event);
        }}
      >
        <div className="grid lg:grid-cols-[minmax(260px,0.72fr)_1.28fr]">
          <div className="relative bg-[#e9e9e6] h-full">
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

          <div className="relative p-9 ">
            <Button
              type="button"
              size="icon"
              aria-label="Editar datos del empleado"
              aria-pressed={isEditing}
              className="absolute right-5 top-5 cursor-pointer"
              onClick={() => setIsEditing(true)}
              disabled={isEditing}
            >
              <Pencil className="size-4" />
            </Button>

            <div className="grid gap-x-8 sm:grid-cols-2">
              <Field
                className={`py-4 transition-colors ${isEditing ? 'text-[#074446]' : ''}`}
              >
                <FieldLabel htmlFor="edit-employee-full-name">
                  Nombre completo
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="edit-employee-full-name"
                    aria-label="Editar nombre completo"
                    placeholder={employee.fullName || 'No informado'}
                    className={inputClassName}
                    disabled={!isEditing}
                    {...form.register('fullName')}
                  />
                  <FieldError errors={[form.formState.errors.fullName]} />
                </FieldContent>
              </Field>
              <Field
                className={`py-4 transition-colors ${isEditing ? 'text-[#074446]' : ''}`}
              >
                <FieldLabel htmlFor="edit-employee-email">
                  Correo electrónico
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="edit-employee-email"
                    aria-label="Editar correo electrónico"
                    type="email"
                    placeholder={employee.email || 'No informado'}
                    className={inputClassName}
                    disabled={!isEditing}
                    {...form.register('email')}
                  />
                  <FieldError errors={[form.formState.errors.email]} />
                </FieldContent>
              </Field>
              <Field
                className={`py-4 transition-colors ${isEditing ? 'text-[#074446]' : ''}`}
              >
                <FieldLabel htmlFor="edit-employee-document-type">
                  Tipo de documento
                </FieldLabel>
                <FieldContent>
                  <select
                    id="edit-employee-document-type"
                    aria-label="Editar tipo de documento"
                    className={`${inputClassName} w-full appearance-none bg-transparent outline-none`}
                    disabled={!isEditing}
                    {...form.register('documentType')}
                  >
                    <option value="">Sin documento</option>
                    {employeeDocumentTypeValues.map((type) => (
                      <option key={type} value={type}>
                        {documentTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                  <FieldError errors={[form.formState.errors.documentType]} />
                </FieldContent>
              </Field>
              <Field
                className={`py-4 transition-colors ${isEditing ? 'text-[#074446]' : ''}`}
              >
                <FieldLabel htmlFor="edit-employee-document-number">
                  Número de documento
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="edit-employee-document-number"
                    aria-label="Editar número de documento"
                    placeholder={employee.documentNumber || 'No informado'}
                    className={inputClassName}
                    disabled={!isEditing}
                    {...form.register('documentNumber')}
                  />
                  <FieldError errors={[form.formState.errors.documentNumber]} />
                </FieldContent>
              </Field>
              <Field
                className={`py-4 transition-colors ${isEditing ? 'text-[#074446]' : ''}`}
              >
                <FieldLabel htmlFor="edit-employee-employment-status">
                  Estado laboral
                </FieldLabel>
                <FieldContent>
                  <select
                    id="edit-employee-employment-status"
                    aria-label="Editar estado laboral"
                    className={`${inputClassName} w-full appearance-none bg-transparent outline-none`}
                    disabled={!isEditing}
                    {...form.register('employmentStatus')}
                  >
                    <option value="active">Activo</option>
                    <option value="suspended">Suspendido</option>
                    <option value="separated">Desvinculado</option>
                  </select>
                </FieldContent>
              </Field>
              <Field
                className={`py-4 transition-colors ${isEditing ? 'text-[#074446]' : ''}`}
              >
                <FieldLabel htmlFor="edit-employee-hired-at">
                  Fecha de contratación
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="edit-employee-hired-at"
                    aria-label="Editar fecha de contratación"
                    type={isEditing ? 'datetime-local' : 'text'}
                    placeholder={formatDate(employee.hiredAt)}
                    className={inputClassName}
                    disabled={!isEditing}
                    {...form.register('hiredAt')}
                  />
                  <FieldError errors={[form.formState.errors.hiredAt]} />
                </FieldContent>
              </Field>
              <div className="py-4">
                <p className="text-xs text-black/45">ID del empleado</p>
                <p className="mt-1 wrap-break-words text-sm leading-5 text-black/80">
                  {employee.id}
                </p>
              </div>
              <div className="py-4">
                <p className="text-xs text-black/45">Fecha de registro</p>
                <p className="mt-1 text-sm leading-5 text-black/80">
                  {formatDate(employee.createdAt)}
                </p>
              </div>
              <div className="py-4">
                <p className="text-xs text-black/45">Jefe directo</p>
                <p className="mt-1 wrap-break-words text-sm leading-5 text-black/80">
                  {managerName}
                </p>
              </div>
              <div className="py-4 sm:col-span-2">
                <p className="text-xs text-black/45">Reportes directos</p>
                <p className="mt-1 wrap-break-words text-sm leading-5 text-black/80">
                  {directReportsName}
                </p>
              </div>
            </div>

            {updateEmployeeMutation.error ? (
              <p role="alert" className="mt-5 text-sm text-destructive">
                {updateEmployeeMutation.error instanceof Error
                  ? updateEmployeeMutation.error.message
                  : 'No se pudo actualizar el empleado.'}
              </p>
            ) : null}
            {isEditing ? (
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    form.reset(toEmployeeFormValues(employee));
                    updateEmployeeMutation.reset();
                    setIsEditing(false);
                  }}
                >
                  <X className="size-4" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="vimcore"
                  disabled={updateEmployeeMutation.isPending}
                  className="sm:w-auto"
                >
                  Guardar cambios
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </form>
    </section>
  );
};
