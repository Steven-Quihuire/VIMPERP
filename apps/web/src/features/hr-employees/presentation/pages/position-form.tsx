import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import type { AuthSession } from '@/features/auth/domain/auth';
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
import { Switch } from '@/shared/ui/switch';

import {
  useCreatePosition,
  usePositions,
} from '../../application/hr-employees-queries';
import {
  positionFormSchema,
  toCreatePositionInput,
  type PositionFormValues,
} from '../../domain/positions';

type PositionFormInput = z.input<typeof positionFormSchema>;

const defaultValues: PositionFormValues = {
  name: '',
  reportsToPositionId: '',
  headcount: 1,
  isActive: true,
};

export const PositionFormPage = ({
  session,
  apiBaseUrl,
  onCreated,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
  onCreated?: (positionId: string) => void;
}) => {
  const companyId = session.activeCompany?.companyId;
  const createPositionMutation = useCreatePosition(apiBaseUrl);
  const positionsQuery = usePositions(companyId, apiBaseUrl);
  const form = useForm<PositionFormInput, unknown, PositionFormValues>({
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
    <Card>
      <CardHeader>
        <CardTitle>Crear puesto</CardTitle>
        <CardDescription>
          Un puesto define una función laboral. Después podés asignarlo a una
          persona dentro de un nodo organizacional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
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
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="position-name">Nombre del puesto</FieldLabel>
              <FieldContent>
                <Input
                  id="position-name"
                  aria-label="Nombre del puesto"
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
                <Input
                  id="position-headcount"
                  aria-label="¿Cuántas personas puede tener?"
                  placeholder="Ej.: 3"
                  type="number"
                  min={0}
                  {...form.register('headcount', { valueAsNumber: true })}
                />
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

          {createPositionMutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {createPositionMutation.error instanceof Error
                ? createPositionMutation.error.message
                : 'No se pudo crear el puesto.'}
            </p>
          ) : null}

          <Button type="submit" disabled={createPositionMutation.isPending}>
            {createPositionMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Crear puesto
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
