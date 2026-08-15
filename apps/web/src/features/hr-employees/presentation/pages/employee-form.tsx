import { zodResolver } from '@hookform/resolvers/zod';
import { BriefcaseBusiness, Loader2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import type { AuthSession } from '@/features/auth/domain/auth';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

import { useCreateEmployee } from '../../application/hr-employees-queries';
import {
  employeeDocumentTypeValues,
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

const documentTypeLabels = {
  cedula: 'Cédula',
  ruc: 'RUC',
  pasaporte: 'Pasaporte',
} as const;

export const EmployeeFormPage = ({
  session,
  apiBaseUrl,
  onCreated,
  onCancel,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
  onCreated?: (employeeId: string) => void;
  onCancel?: () => void;
}) => {
  const companyId = session.activeCompany?.companyId;
  const createEmployeeMutation = useCreateEmployee(apiBaseUrl);
  const form = useForm<
    z.input<typeof employeeFormSchema>,
    unknown,
    EmployeeFormValues
  >({
    resolver: zodResolver(employeeFormSchema),
    defaultValues,
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const watchedValues = useWatch({ control: form.control });
  const selectedDocumentType = employeeDocumentTypeValues.find(
    (type) => type === watchedValues.documentType,
  );

  const labelFloats = (fieldName: keyof EmployeeFormValues) =>
    focusedField === fieldName || Boolean(watchedValues[fieldName]);

  const selectDocumentType = (
    documentType: EmployeeFormValues['documentType'],
  ) => {
    form.setValue('documentType', documentType, { shouldValidate: true });
    form.setValue('documentNumber', '', { shouldValidate: true });
  };

  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleccioná una compañía activa antes de crear empleados.
      </p>
    );
  }

  return (
    <div className="grid p-4">
      <div className="">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Alta de empleado
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Nuevo empleado
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Completá la información para crear su registro laboral.
          </p>
        </div>
        <form
          className="space-y-8"
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
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <UserRound className="size-4 text-muted-foreground" />
              Identificación
            </div>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldContent>
                  <div className="relative">
                    <Input
                      id="employee-full-name"
                      aria-label="Nombre completo"
                      className="auth-autofill-input text-sm caret-transparent transition-[caret-color] duration-300 ease-in-out focus:caret-current"
                      {...form.register('fullName')}
                      onFocus={() => setFocusedField('fullName')}
                      onBlur={(event) => {
                        void form.register('fullName').onBlur(event);
                        setFocusedField(null);
                      }}
                    />
                    <FieldLabel
                      htmlFor="employee-full-name"
                      className={cn(
                        'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 ease-in-out',
                        labelFloats('fullName') &&
                          'translate-y-[-200%] text-xs',
                      )}
                    >
                      Nombre completo
                    </FieldLabel>
                  </div>
                  <FieldError errors={[form.formState.errors.fullName]} />
                </FieldContent>
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel>Documento</FieldLabel>
                <FieldContent>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] sm:items-end">
                    <div
                      role="group"
                      aria-label="Tipo de documento"
                      className="grid grid-cols-2 gap-2"
                    >
                      {employeeDocumentTypeValues.map((type) => (
                        <button
                          key={type}
                          type="button"
                          aria-pressed={selectedDocumentType === type}
                          className={cn(
                            'h-10 rounded-xl border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            selectedDocumentType === type
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-input hover:border-foreground hover:bg-muted/50',
                          )}
                          onClick={() => selectDocumentType(type)}
                        >
                          {documentTypeLabels[type]}
                        </button>
                      ))}
                      <button
                        type="button"
                        aria-pressed={!selectedDocumentType}
                        className={cn(
                          'col-span-2 h-10 rounded-xl border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          !selectedDocumentType
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-input hover:border-foreground hover:bg-muted/50',
                        )}
                        onClick={() => selectDocumentType('')}
                      >
                        Sin documento
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="employee-document-number"
                        aria-label={
                          selectedDocumentType
                            ? `Número de ${documentTypeLabels[selectedDocumentType]}`
                            : 'Número de documento'
                        }
                        disabled={!selectedDocumentType}
                        className="auth-autofill-input text-sm caret-transparent transition-[caret-color] duration-300 ease-in-out focus:caret-current disabled:cursor-not-allowed disabled:opacity-50"
                        {...form.register('documentNumber')}
                        onFocus={() => setFocusedField('documentNumber')}
                        onBlur={(event) => {
                          void form.register('documentNumber').onBlur(event);
                          setFocusedField(null);
                        }}
                      />
                      <FieldLabel
                        htmlFor="employee-document-number"
                        className={cn(
                          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 ease-in-out',
                          labelFloats('documentNumber') &&
                            'translate-y-[-200%] text-xs',
                        )}
                      >
                        {selectedDocumentType
                          ? documentTypeLabels[selectedDocumentType]
                          : 'Número de documento'}
                      </FieldLabel>
                    </div>
                  </div>
                  <FieldError errors={[form.formState.errors.documentType]} />
                  <FieldError errors={[form.formState.errors.documentNumber]} />
                </FieldContent>
              </Field>
            </FieldGroup>
          </section>

          <section className="space-y-3 border-t pt-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BriefcaseBusiness className="size-4 text-muted-foreground" />
              Información laboral
            </div>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldContent>
                  <div className="relative">
                    <Input
                      id="employee-email"
                      aria-label="Correo electrónico"
                      type="email"
                      className="auth-autofill-input text-sm caret-transparent transition-[caret-color] duration-300 ease-in-out focus:caret-current"
                      {...form.register('email')}
                      onFocus={() => setFocusedField('email')}
                      onBlur={(event) => {
                        void form.register('email').onBlur(event);
                        setFocusedField(null);
                      }}
                    />
                    <FieldLabel
                      htmlFor="employee-email"
                      className={cn(
                        'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 ease-in-out',
                        labelFloats('email') && 'translate-y-[-200%] text-xs',
                      )}
                    >
                      Correo electrónico
                    </FieldLabel>
                  </div>
                  <FieldError errors={[form.formState.errors.email]} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="employee-employment-status">
                  Estado laboral
                </FieldLabel>
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
                  <FieldError
                    errors={[form.formState.errors.employmentStatus]}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldContent>
                  <div className="relative">
                    <Input
                      id="employee-hired-at"
                      aria-label="Fecha de contratación"
                      type="datetime-local"
                      className="auth-autofill-input text-sm caret-transparent transition-[caret-color] duration-300 ease-in-out focus:caret-current"
                      {...form.register('hiredAt')}
                      onFocus={() => setFocusedField('hiredAt')}
                      onBlur={(event) => {
                        void form.register('hiredAt').onBlur(event);
                        setFocusedField(null);
                      }}
                    />
                    <FieldLabel
                      htmlFor="employee-hired-at"
                      className={cn(
                        'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 ease-in-out',
                        labelFloats('hiredAt') && 'translate-y-[-200%] text-xs',
                      )}
                    >
                      Fecha de contratación
                    </FieldLabel>
                  </div>
                  <FieldError errors={[form.formState.errors.hiredAt]} />
                </FieldContent>
              </Field>
            </FieldGroup>
          </section>
          {createEmployeeMutation.error ? (
            <p role="alert" className="mb-4 text-sm text-destructive">
              {createEmployeeMutation.error instanceof Error
                ? createEmployeeMutation.error.message
                : 'No se pudo crear el registro del empleado.'}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            ) : null}
            <Button
              type="submit"
              className="sm:min-w-44"
              disabled={createEmployeeMutation.isPending}
            >
              {createEmployeeMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Crear empleado
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
