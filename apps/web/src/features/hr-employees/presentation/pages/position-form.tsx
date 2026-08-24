import { zodResolver } from '@hookform/resolvers/zod';
import { BriefcaseBusiness, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import type { AuthSession } from '@/features/auth/domain/auth';
import { Button } from '@/shared/ui/button';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';

import { useCreatePosition, usePositions } from '../../application/hr-employees-queries';
import {
  positionFormSchema,
  toCreatePositionInput,
  type PositionFormValues,
} from '../../domain/positions';

const defaultValues: PositionFormValues = {
  name: '',
  reportsToPositionId: '',
  headcount: 1,
  isActive: true,
};

const sectionClassName = 'rounded-2xl p-4';
const sectionHeaderClassName = '-mt-4 flex items-center gap-3';
const sectionIconClassName =
  'flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted';
const navButtonClassName =
  'hover:bg-black hover:px-7 hover:text-white cursor-pointer transition-all ease-in-out duration-400 border text-sm h-10 px-5 flex items-center justify-center gap-2 rounded-2xl';

export const PositionFormPage = ({
  session,
  apiBaseUrl,
  onCreated,
  onCancel,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
  onCreated?: (positionId: string) => void;
  onCancel?: () => void;
}) => {
  const companyId = session.activeCompany?.companyId;
  const createPositionMutation = useCreatePosition(apiBaseUrl);
  const positionsQuery = usePositions(companyId, apiBaseUrl);
  const form = useForm<z.input<typeof positionFormSchema>, unknown, PositionFormValues>({
    resolver: zodResolver(positionFormSchema),
    defaultValues,
  });

  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleccioná una compañía activa antes de crear puestos.
      </p>
    );
  }

  return (
    <div className="grid p-4">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-medium tracking-tight">Crear puesto</h1>
        </div>
        <form
          className="space-y-6"
          onSubmit={(event) => {
            void form.handleSubmit(async (values) => {
              const position = await createPositionMutation.mutateAsync(
                toCreatePositionInput(companyId, values),
              );
              form.reset(defaultValues);
              onCreated?.(position.id);
            })(event);
          }}
        >
          <section className={sectionClassName}>
            <div className={sectionHeaderClassName}>
              <span className={sectionIconClassName}>
                <BriefcaseBusiness className="size-6" />
              </span>
              <div>
                <h1 className="text-xl font-medium tracking-tight">
                  Detalles del puesto
                </h1>
                <p className="text-xs text-gray-600">
                  Nombre, jerarquía y dotación.
                </p>
              </div>
            </div>
            <FieldGroup className="mt-8 grid gap-8 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="position-name">Nombre del puesto</FieldLabel>
                <FieldContent>
                  <Input
                    id="position-name"
                    aria-label="Nombre del puesto"
                    placeholder="Ej.: Cajero"
                    {...form.register('name')}
                  />
                  <FieldError errors={[form.formState.errors.name]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="reports-to-position-id">
                  ¿A quién le reporta?
                </FieldLabel>
                <FieldContent>
                  <select
                    id="reports-to-position-id"
                    aria-label="¿A quién le reporta?"
                    className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-2 text-sm"
                    {...form.register('reportsToPositionId')}
                  >
                    <option value="">No reporta a otro puesto</option>
                    {(positionsQuery.data ?? []).map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="position-headcount">
                  ¿Cuántas personas puede tener?
                </FieldLabel>
                <FieldContent>
                  {(() => {
                    const headcountField = form.register('headcount', {
                      setValueAs: (value) => (value === '' ? '' : Number(value)),
                    });
                    return (
                      <Input
                        id="position-headcount"
                        aria-label="¿Cuántas personas puede tener?"
                        placeholder="Ej.: 3"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        {...headcountField}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, '');
                          if (digits !== event.target.value) {
                            event.target.value = digits;
                          }
                          void headcountField.onChange(event);
                        }}
                      />
                    );
                  })()}
                  <FieldError errors={[form.formState.errors.headcount]} />
                </FieldContent>
              </Field>

              <Field orientation="horizontal">
                <FieldLabel htmlFor="position-is-active">Activo</FieldLabel>
                <FieldContent>
                  <Switch
                    id="position-is-active"
                    checked={form.watch('isActive')}
                    onCheckedChange={(value) =>
                      form.setValue('isActive', value, { shouldValidate: true })
                    }
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          </section>

          {createPositionMutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {createPositionMutation.error instanceof Error
                ? createPositionMutation.error.message
                : 'No se pudo crear el puesto.'}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {onCancel ? (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancelar
              </Button>
            ) : null}
            <button
              type="submit"
              className={navButtonClassName}
              disabled={createPositionMutation.isPending}
            >
              {createPositionMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Crear puesto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
