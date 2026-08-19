import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { toast } from 'sonner';

import type { AuthSession } from '@/features/auth/domain/auth';
import { Button } from '@/shared/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/ui/drawer';
import { Field, FieldContent, FieldError, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

import { useUpdateEmployee } from '../../application/hr-employees-queries';
import {
  employeeDocumentTypeValues,
  employeeFormSchema,
  toEmployeeFormValues,
  toUpdateEmployeeInput,
  type Employee,
  type EmployeeFormValues,
} from '../../domain/employees';

const documentTypeLabels = {
  cedula: 'Cédula',
  ruc: 'RUC',
  pasaporte: 'Pasaporte',
} as const;

export const EmployeeEditDrawer = ({
  employee,
  session,
  apiBaseUrl,
  open,
  onOpenChange,
  onSaved,
}: {
  employee: Employee;
  session: AuthSession;
  apiBaseUrl?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) => {
  const companyId = session.activeCompany?.companyId;
  const updateEmployeeMutation = useUpdateEmployee(apiBaseUrl);
  const form = useForm<
    z.input<typeof employeeFormSchema>,
    unknown,
    EmployeeFormValues
  >({
    resolver: zodResolver(employeeFormSchema),
    values: toEmployeeFormValues(employee),
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!companyId) return;
    try {
      await updateEmployeeMutation.mutateAsync(
        toUpdateEmployeeInput(companyId, employee.id, values),
      );
      toast.success('Empleado actualizado', {
        description: employee.fullName || employee.id,
      });
      onOpenChange(false);
      onSaved?.();
    } catch {
      // El error se refleja en el mutation.
    }
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="gap-0 p-0">
        <DrawerHeader className="border-b p-5">
          <DrawerTitle className="text-lg font-medium tracking-tight">
            Editar empleado
          </DrawerTitle>
          <DrawerClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cerrar edición"
              className="absolute right-4 top-4 rounded-full"
            >
              <X className="size-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <form
          className="space-y-5 overflow-y-auto p-5"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <Field>
            <FieldLabel htmlFor="edit-drawer-full-name">
              Nombre completo
            </FieldLabel>
            <FieldContent>
              <Input
                id="edit-drawer-full-name"
                aria-label="Editar nombre completo"
                placeholder={employee.fullName || 'No informado'}
                {...form.register('fullName')}
              />
              <FieldError errors={[form.formState.errors.fullName]} />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-drawer-email">Correo electrónico</FieldLabel>
            <FieldContent>
              <Input
                id="edit-drawer-email"
                aria-label="Editar correo electrónico"
                type="email"
                placeholder={employee.email || 'Cargando…'}
                {...form.register('email')}
              />
              <FieldError errors={[form.formState.errors.email]} />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-drawer-document-type">
              Tipo de documento
            </FieldLabel>
            <FieldContent>
              <select
                id="edit-drawer-document-type"
                aria-label="Editar tipo de documento"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
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
          <Field>
            <FieldLabel htmlFor="edit-drawer-document-number">
              Número de documento
            </FieldLabel>
            <FieldContent>
              <Input
                id="edit-drawer-document-number"
                aria-label="Editar número de documento"
                placeholder={employee.documentNumber || 'No informado'}
                {...form.register('documentNumber')}
              />
              <FieldError errors={[form.formState.errors.documentNumber]} />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-drawer-employment-status">
              Estado laboral
            </FieldLabel>
            <FieldContent>
              <select
                id="edit-drawer-employment-status"
                aria-label="Editar estado laboral"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                {...form.register('employmentStatus')}
              >
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
                <option value="separated">Desvinculado</option>
              </select>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-drawer-hired-at">
              Fecha de contratación
            </FieldLabel>
            <FieldContent>
              <Input
                id="edit-drawer-hired-at"
                aria-label="Editar fecha de contratación"
                type="date"
                placeholder={employee.hiredAt ?? 'No informada'}
                {...form.register('hiredAt')}
              />
              <FieldError errors={[form.formState.errors.hiredAt]} />
            </FieldContent>
          </Field>

          {updateEmployeeMutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {updateEmployeeMutation.error instanceof Error
                ? updateEmployeeMutation.error.message
                : 'No se pudo actualizar el empleado.'}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <DrawerClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DrawerClose>
            <Button
              type="submit"
              variant="vimcore"
              disabled={updateEmployeeMutation.isPending}
            >
              {updateEmployeeMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Guardar cambios
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
};
