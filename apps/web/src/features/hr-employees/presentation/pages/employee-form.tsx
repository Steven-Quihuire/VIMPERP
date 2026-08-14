import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import type { AuthSession } from '@/features/auth/domain/auth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

import { useCreateEmployee } from '../../application/hr-employees-queries';
import {
  employeeFormSchema,
  toCreateEmployeeInput,
  type EmployeeFormValues,
} from '../../domain/employees';

const defaultValues: EmployeeFormValues = {
  fullName: '',
  documentType: '',
  documentNumber: '',
  email: '',
  employmentStatus: 'active',
  hiredAt: '',
};

export const EmployeeFormPage = ({
  session,
  apiBaseUrl,
  onCreated,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
  onCreated?: (employeeId: string) => void;
}) => {
  const companyId = session.activeCompany?.companyId;
  const createEmployeeMutation = useCreateEmployee(apiBaseUrl);
  const form = useForm<z.input<typeof employeeFormSchema>, unknown, EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues,
  });

  if (!companyId) {
    return <p className="text-sm text-muted-foreground">Seleccioná una compañía activa antes de crear empleados.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear empleado</CardTitle>
        <CardDescription>Los registros de empleados son independientes del acceso de usuarios al ERP.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            void form.handleSubmit(async (values) => {
              const employee = await createEmployeeMutation.mutateAsync(
                toCreateEmployeeInput(companyId, values),
              );
              onCreated?.(employee.id);
              form.reset(defaultValues);
            })(event);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="employee-full-name">Nombre completo</FieldLabel>
              <FieldContent>
                <Input id="employee-full-name" aria-label="Nombre completo" {...form.register('fullName')} />
                <FieldError errors={[form.formState.errors.fullName]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="employee-document-type">Tipo de documento</FieldLabel>
              <FieldContent>
                <Input id="employee-document-type" aria-label="Tipo de documento" {...form.register('documentType')} />
                <FieldError errors={[form.formState.errors.documentType]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="employee-document-number">Número de documento</FieldLabel>
              <FieldContent>
                <Input id="employee-document-number" aria-label="Número de documento" {...form.register('documentNumber')} />
                <FieldError errors={[form.formState.errors.documentNumber]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="employee-email">Correo electrónico</FieldLabel>
              <FieldContent>
                <Input id="employee-email" aria-label="Correo electrónico" type="email" {...form.register('email')} />
                <FieldError errors={[form.formState.errors.email]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="employee-employment-status">Estado laboral</FieldLabel>
              <FieldContent>
                <select
                  id="employee-employment-status"
                  aria-label="Estado laboral"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2"
                  {...form.register('employmentStatus')}
                >
                  <option value="active">Activo</option>
                  <option value="suspended">Suspendido</option>
                  <option value="separated">Desvinculado</option>
                </select>
                <FieldError errors={[form.formState.errors.employmentStatus]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="employee-hired-at">Fecha de contratación</FieldLabel>
              <FieldContent>
                <Input id="employee-hired-at" aria-label="Fecha de contratación" type="datetime-local" {...form.register('hiredAt')} />
                <FieldError errors={[form.formState.errors.hiredAt]} />
              </FieldContent>
            </Field>
          </FieldGroup>
          {createEmployeeMutation.error ? (
            <p role="alert" className="mb-4 text-sm text-destructive">
              {createEmployeeMutation.error instanceof Error
                ? createEmployeeMutation.error.message
                : 'No se pudo crear el registro del empleado.'}
            </p>
          ) : null}

          <Button type="submit" disabled={createEmployeeMutation.isPending}>
            {createEmployeeMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Crear registro de empleado
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
