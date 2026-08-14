import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import type { AuthSession } from '@/features/auth/domain/auth';
import { Badge } from '@/shared/ui/badge';
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
  FieldGroup,
  FieldLabel,
} from '@/shared/ui/field';
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
  employeeFormSchema,
  toEmployeeFormValues,
  toUpdateEmployeeInput,
  type EmployeeFormValues,
} from '../../domain/employees';

export const EmployeeDetailPage = ({
  session,
  employeeId,
  apiBaseUrl,
}: {
  session: AuthSession;
  employeeId: string | null;
  apiBaseUrl?: string;
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

  const manager = assignments.managerQuery.data;
  const directReports = assignments.directReportsQuery.data ?? [];
  const employeesById = new Map(
    (employeesQuery.data ?? []).map((item) => [item.id, item]),
  );
  const positionsById = new Map(
    (positionsQuery.data ?? []).map((item) => [item.id, item]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{employee.fullName || employee.id}</CardTitle>
        <CardDescription>
          Creado el {new Date(employee.createdAt).toLocaleString('es-AR')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="font-medium">ID del empleado:</span> {employee.id}
          </p>
          <p>
            <span className="font-medium">Correo electrónico:</span>{' '}
            {employee.email ?? 'No informado'}
          </p>
          <p>
            <span className="font-medium">Documento:</span>{' '}
            {employee.documentNumber ?? 'No informado'}
          </p>
          <p>
            <span className="font-medium">Fecha de contratación:</span>{' '}
            {employee.hiredAt
              ? new Date(employee.hiredAt).toLocaleDateString('es-AR')
              : 'No informada'}
          </p>
          <p className="flex items-center gap-2">
            <span className="font-medium">Estado:</span>{' '}
            <Badge
              variant={
                employee.employmentStatus === 'active' ? 'secondary' : 'outline'
              }
            >
              {employee.employmentStatus === 'active'
                ? 'Activo'
                : employee.employmentStatus === 'suspended'
                  ? 'Suspendido'
                  : 'Desvinculado'}
            </Badge>
          </p>
        </div>

        <form
          className="space-y-4 border-t pt-4"
          onSubmit={(event) => {
            void form.handleSubmit(async (values) => {
              await updateEmployeeMutation.mutateAsync(
                toUpdateEmployeeInput(companyId, employee.id, values),
              );
            })(event);
          }}
        >
          <h3 className="font-medium">Editar empleado</h3>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-employee-full-name">
                Nombre completo
              </FieldLabel>
              <FieldContent>
                <Input
                  id="edit-employee-full-name"
                  aria-label="Editar nombre completo"
                  {...form.register('fullName')}
                />
                <FieldError errors={[form.formState.errors.fullName]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-employee-document-type">
                Tipo de documento
              </FieldLabel>
              <FieldContent>
                <Input
                  id="edit-employee-document-type"
                  aria-label="Editar tipo de documento"
                  {...form.register('documentType')}
                />
                <FieldError errors={[form.formState.errors.documentType]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-employee-document-number">
                Número de documento
              </FieldLabel>
              <FieldContent>
                <Input
                  id="edit-employee-document-number"
                  aria-label="Editar número de documento"
                  {...form.register('documentNumber')}
                />
                <FieldError errors={[form.formState.errors.documentNumber]} />
              </FieldContent>
            </Field>
            <Field>
                <FieldLabel htmlFor="edit-employee-email">Correo electrónico</FieldLabel>
              <FieldContent>
                <Input
                  id="edit-employee-email"
                  aria-label="Editar correo electrónico"
                  type="email"
                  {...form.register('email')}
                />
                <FieldError errors={[form.formState.errors.email]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-employee-employment-status">
                Estado laboral
              </FieldLabel>
              <FieldContent>
                <select
                  id="edit-employee-employment-status"
                  aria-label="Editar estado laboral"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2"
                  {...form.register('employmentStatus')}
                >
                  <option value="active">Activo</option>
                  <option value="suspended">Suspendido</option>
                  <option value="separated">Desvinculado</option>
                </select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-employee-hired-at">
                Fecha de contratación
              </FieldLabel>
              <FieldContent>
                <Input
                  id="edit-employee-hired-at"
                  aria-label="Editar fecha de contratación"
                  type="datetime-local"
                  {...form.register('hiredAt')}
                />
                <FieldError errors={[form.formState.errors.hiredAt]} />
              </FieldContent>
            </Field>
          </FieldGroup>
          {updateEmployeeMutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {updateEmployeeMutation.error instanceof Error
                ? updateEmployeeMutation.error.message
                : 'No se pudo actualizar el empleado.'}
            </p>
          ) : null}
          <Button type="submit" disabled={updateEmployeeMutation.isPending}>
            Guardar cambios del empleado
          </Button>
        </form>

        <div className="border-t pt-4">
          <p className="text-sm font-medium">Jefe directo</p>
          <p className="text-xs text-muted-foreground">
            Reporting line laboral; no es el responsable del nodo
            organizacional.
          </p>
          <p className="text-sm text-muted-foreground">
            {manager
              ? `${employeesById.get(manager.employeeId)?.fullName ?? manager.employeeId} · ${positionsById.get(manager.positionId)?.name ?? manager.positionId}`
              : 'No hay un jefe directo asignado.'}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium">Reportes directos</p>
          {directReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay reportes directos para este empleado.
            </p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {directReports.map((directReport) => (
                <li key={directReport.assignmentId}>
                  {employeesById.get(directReport.employeeId)?.fullName ??
                    directReport.employeeId}
                  <span className="text-xs">
                    {' '}
                    ·{' '}
                    {positionsById.get(directReport.positionId)?.name ??
                      directReport.positionId}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
