import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Loader2,
  Network,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';
import { toast } from 'sonner';

import type { AuthSession } from '@/features/auth/domain/auth';
import { useOrgTree } from '@/features/org-tree/application/org-tree-queries';
import { Button } from '@/shared/ui/button';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

import {
  useCreateEmployee,
  useEmployees,
  usePositions,
} from '../../application/hr-employees-queries';
import {
  employeeFormSchema,
  getDocumentFieldState,
  toCreateEmployeeInput,
  type Employee,
  type EmployeeFormValues,
} from '../../domain/employees';
import { DatePickerField } from '../components/date-picker-field';
import { DocumentDetectionBadge } from '../components/document-detection-badge';
import { getScopeOptions } from './assignment-timeline.shared';
import { AssignmentFields } from '../components/assignment-fields';

const defaultValues: EmployeeFormValues = {
  fullName: '',
  documentType: '',
  documentNumber: '',
  email: '',
  employmentStatus: 'active',
  hiredAt: '',
  positionId: '',
  scopeNodeId: '',
  managerId: '',
};

const sectionClassName = 'rounded-2xl p-4';
const sectionHeaderClassName = '-mt-4 flex items-center gap-3';
const sectionIconClassName =
  'flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted';
const selectItemClassName =
  'focus:bg-foreground focus:text-background data-[highlighted]:bg-foreground data-[highlighted]:text-background';

const formatDateLabel = (value: string | null | undefined) =>
  value
    ? format(parseISO(value.slice(0, 10)), "d 'de' MMMM 'de' yyyy", {
        locale: es,
      })
    : 'No informada';

export type EmployeeCreatedData = {
  employee: Employee;
  positionId: string;
  scopeNodeId: string;
  managerId: string;
};

export const EmployeeFormPage = ({
  session,
  apiBaseUrl,
  onSelectEmployee,
  onCancel,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
  onSelectEmployee?: (employeeId: string) => void;
  onCancel?: () => void;
}) => {
  const companyId = session.activeCompany?.companyId;
  const createEmployeeMutation = useCreateEmployee(apiBaseUrl);
  const employeesQuery = useEmployees(companyId, apiBaseUrl);
  const positionsQuery = usePositions(companyId, apiBaseUrl);
  const orgTreeQuery = useOrgTree(companyId, apiBaseUrl);
  const form = useForm<
    z.input<typeof employeeFormSchema>,
    unknown,
    EmployeeFormValues
  >({
    resolver: zodResolver(employeeFormSchema),
    defaultValues,
  });
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [created, setCreated] = useState<EmployeeCreatedData | null>(null);
  const watchedValues = useWatch({ control: form.control });
  const documentState = getDocumentFieldState(
    watchedValues.documentNumber ?? '',
  );

  const goToNextStep = async () => {
    const isValid = await form.trigger([
      'fullName',
      'email',
      'documentNumber',
      'documentType',
    ]);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const handleCreate = form.handleSubmit(async (values) => {
    if (!companyId) {
      return;
    }

    const employee = await createEmployeeMutation.mutateAsync(
      toCreateEmployeeInput(companyId, values),
    );
    toast.success('Empleado creado', {
      description: employee.fullName || employee.id,
    });
    setCreated({
      employee,
      positionId: values.positionId,
      scopeNodeId: values.scopeNodeId,
      managerId: values.managerId,
    });
  });

  if (!companyId) {
    return (
      <p className="text-sm">
        Seleccioná una compañía activa antes de crear empleados.
      </p>
    );
  }

  const activePositions = (positionsQuery.data ?? []).filter(
    (position) => position.isActive,
  );
  const scopeOptions = getScopeOptions(orgTreeQuery.data ?? []);

  if (created) {
    const createdPosition = activePositions.find(
      (position) => position.id === created.positionId,
    );
    const createdManager = (employeesQuery.data ?? []).find(
      (employee) => employee.id === created.managerId,
    );
    const createdScopeNode = scopeOptions.find(
      ({ node }) =>
        `${node.ref.scopeType}:${node.ref.scopeId}` === created.scopeNodeId,
    );

    return (
      <div className="grid p-4 sm:p-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-8 text-emerald-600" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Empleado creado
              </h2>
              <p className="mt-1 text-sm">
                El registro y la asignación inicial se guardaron correctamente.
              </p>
            </div>
          </div>
          <div className={sectionClassName}>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide">Nombre</dt>
                <dd className="mt-1 font-medium">
                  {created.employee.fullName || created.employee.id}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Documento</dt>
                <dd className="mt-1 font-medium">
                  {created.employee.documentNumber ?? 'Sin documento'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Puesto</dt>
                <dd className="mt-1 font-medium">
                  {createdPosition?.name ?? 'Sin asignar'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Encargado</dt>
                <dd className="mt-1 font-medium">
                  {createdManager?.fullName ?? 'Sin encargado'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Alcance</dt>
                <dd className="mt-1 font-medium">
                  {createdScopeNode?.node.name ?? 'Sin asignar'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">
                  Fecha de alta
                </dt>
                <dd className="mt-1 font-medium">
                  {formatDateLabel(created.employee.hiredAt)}
                </dd>
              </div>
            </dl>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {onSelectEmployee ? (
              <Button
                type="button"
                onClick={() => onSelectEmployee(created.employee.id)}
              >
                Ver detalles
              </Button>
            ) : null}
            {onCancel ? (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid p-4">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-medium tracking-tight">
            Agregar nuevo empleado
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-xs font-medium">
            Paso {currentStep} de 3
          </span>
        </div>
        <form
          className="space-y-6"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="min-h-[20rem]">
            {currentStep === 1 ? (
              <section className={sectionClassName}>
                <div className={sectionHeaderClassName}>
                  <span className={sectionIconClassName}>
                    <UserRound className="size-6" />
                  </span>
                  <div>
                    <h1 className="text-xl font-medium tracking-tight">
                      Identificación
                    </h1>
                    <p className="text-xs text-gray-600">
                      Datos personales y documento de identidad.
                    </p>
                  </div>
                </div>
                <FieldGroup className="mt-8 grid gap-8 sm:grid-cols-2">
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="employee-full-name">
                      Nombre completo
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="employee-full-name"
                        aria-label="Nombre completo"
                        placeholder="Ej.: Ana García"
                        {...form.register('fullName')}
                      />
                      <FieldError errors={[form.formState.errors.fullName]} />
                    </FieldContent>
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="employee-document-number">
                      Número de documento
                    </FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <Input
                          id="employee-document-number"
                          aria-label="Número de documento"
                          placeholder="Ej.: 30123456"
                          autoComplete="off"
                          {...form.register('documentNumber')}
                        />
                        <DocumentDetectionBadge
                          state={documentState}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        />
                      </div>
                      <FieldError
                        errors={[form.formState.errors.documentNumber]}
                      />
                    </FieldContent>
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="employee-email">
                      Correo electrónico
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="employee-email"
                        aria-label="Correo electrónico"
                        type="email"
                        placeholder="Ej.: ana@empresa.com"
                        {...form.register('email')}
                      />
                      <FieldError errors={[form.formState.errors.email]} />
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </section>
            ) : currentStep === 2 ? (
              <section className={sectionClassName}>
                <div className={sectionHeaderClassName}>
                  <span className={sectionIconClassName}>
                    <BriefcaseBusiness className="size-6" />
                  </span>
                  <div>
                    <h1 className="text-xl font-medium tracking-tight">
                      Datos laborales
                    </h1>
                    <p className="text-xs text-gray-600">
                      Fecha de alta y estado laboral.
                    </p>
                  </div>
                </div>
                <FieldGroup className="mt-6 grid gap-8 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="employee-hired-at">
                      Fecha de alta
                    </FieldLabel>
                    <FieldContent>
                      <DatePickerField
                        id="employee-hired-at"
                        value={watchedValues.hiredAt ?? ''}
                        onChange={(value) =>
                          form.setValue('hiredAt', value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      />
                      <FieldError errors={[form.formState.errors.hiredAt]} />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="employee-employment-status">
                      Estado laboral
                    </FieldLabel>
                    <FieldContent>
                      <Select
                        value={watchedValues.employmentStatus ?? 'active'}
                        onValueChange={(value) =>
                          form.setValue(
                            'employmentStatus',
                            value as EmployeeFormValues['employmentStatus'],
                            { shouldDirty: true, shouldValidate: true },
                          )
                        }
                      >
                        <SelectTrigger
                          id="employee-employment-status"
                          aria-label="Estado laboral"
                          className="cursor-pointer"
                        >
                          <SelectValue placeholder="Estado laboral" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            className={selectItemClassName}
                            value="active"
                          >
                            Activo
                          </SelectItem>
                          <SelectItem
                            className={selectItemClassName}
                            value="suspended"
                          >
                            Suspendido
                          </SelectItem>
                          <SelectItem
                            className={selectItemClassName}
                            value="separated"
                          >
                            Desvinculado
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError
                        errors={[form.formState.errors.employmentStatus]}
                      />
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </section>
            ) : (
              <section className={sectionClassName}>
                <div className={sectionHeaderClassName}>
                  <span className={sectionIconClassName}>
                    <Network className="size-6" />
                  </span>
                  <div>
                    <h1 className="text-xl font-medium tracking-tight">
                      Asignación inicial
                    </h1>
                    <p className="text-xs text-gray-600">
                      Puesto, encargado y ubicación desde el primer día.
                    </p>
                  </div>
                </div>
                <AssignmentFields
                  positions={positionsQuery.data ?? []}
                  managers={employeesQuery.data ?? []}
                  scopeOptions={scopeOptions}
                  scopeLoading={orgTreeQuery.isLoading}
                  values={{
                    positionId: watchedValues.positionId || '',
                    managerId: watchedValues.managerId || '',
                    scopeNodeId: watchedValues.scopeNodeId || '',
                  }}
                  onPositionChange={(value) =>
                    form.setValue('positionId', value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  onManagerChange={(value) =>
                    form.setValue('managerId', value, {
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
                    managerId: form.formState.errors.managerId?.message,
                    scopeNodeId: form.formState.errors.scopeNodeId?.message,
                  }}
                />
              </section>
            )}
          </div>

          {createEmployeeMutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {createEmployeeMutation.error instanceof Error
                ? createEmployeeMutation.error.message
                : 'No se pudo crear el registro del empleado.'}
            </p>
          ) : null}
          {currentStep === 1 ? (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {onCancel ? (
                <Button type="button" variant="ghost" onClick={onCancel}>
                  Cancelar
                </Button>
              ) : null}
              <button
                className="hover:bg-black hover:px-7 hover:text-white cursor-pointer transition-all ease-in-out duration-400 border text-sm h-10 px-5 flex items-center justify-center gap-2 rounded-2xl"
                type="button"
                onClick={() => void goToNextStep()}
              >
                Siguiente
                <ArrowRight className="size-4" />
              </button>
            </div>
          ) : currentStep === 2 ? (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                className="hover:bg-black hover:px-8 hover:text-white cursor-pointer transition-all ease-in-out duration-400 border text-sm h-10 px-5 flex items-center justify-center gap-2 rounded-2xl"
                type="button"
                onClick={() => setCurrentStep(1)}
              >
                <ArrowLeft className="size-4" />
                Anterior
              </button>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                  {onCancel ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onCancel}
                    >
                      Cerrar
                    </Button>
                  ) : null}
                <button
                  className="hover:bg-black hover:px-7 hover:text-white cursor-pointer transition-all ease-in-out duration-400 border text-sm h-10 px-5 flex items-center justify-center gap-2 rounded-2xl"
                  type="button"
                  onClick={() => setCurrentStep(3)}
                >
                  Siguiente
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                className="hover:bg-black hover:px-7 hover:text-white cursor-pointer transition-all ease-in-out duration-400 border text-sm h-10 px-5 flex items-center justify-center gap-2 rounded-2xl"
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={createEmployeeMutation.isPending}
              >
                <ArrowLeft className="size-4" />
                Anterior
              </button>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                    {onCancel ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={onCancel}
                        disabled={createEmployeeMutation.isPending}
                      >
                        Cerrar
                      </Button>
                    ) : null}
                <button
                  className="hover:bg-black hover:px-7 hover:text-white cursor-pointer transition-all ease-in-out duration-400 border text-sm h-10 px-5 flex items-center justify-center gap-2 rounded-2xl"
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={createEmployeeMutation.isPending}
                >
                  {createEmployeeMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Crear empleado
                </button>
              </div>
            </div>
          )}
          </form>
      </div>
    </div>
  );
};
