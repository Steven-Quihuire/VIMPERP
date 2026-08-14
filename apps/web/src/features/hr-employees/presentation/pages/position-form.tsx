import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import type { AuthSession } from '@/features/auth/domain/auth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';

import { useCreatePosition } from '../../application/hr-employees-queries';
import { positionFormSchema, toCreatePositionInput, type PositionFormValues } from '../../domain/positions';

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
  const form = useForm<PositionFormInput, unknown, PositionFormValues>({
    resolver: zodResolver(positionFormSchema),
    defaultValues,
  });

  if (!companyId) {
    return <p className="text-sm text-muted-foreground">Select an active company before creating positions.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create position</CardTitle>
        <CardDescription>Positions define the reporting hierarchy and staffing capacity.</CardDescription>
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
              <FieldLabel htmlFor="position-name">Position name</FieldLabel>
              <FieldContent>
                <Input id="position-name" aria-label="Position name" {...form.register('name')} />
                <FieldError errors={[form.formState.errors.name]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="reports-to-position-id">Reports to position</FieldLabel>
              <FieldContent>
                <Input
                  id="reports-to-position-id"
                  aria-label="Reports to position"
                  placeholder="position-1"
                  {...form.register('reportsToPositionId')}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="position-headcount">Headcount</FieldLabel>
              <FieldContent>
                <Input
                  id="position-headcount"
                  aria-label="Headcount"
                  type="number"
                  min={0}
                  {...form.register('headcount', { valueAsNumber: true })}
                />
                <FieldError errors={[form.formState.errors.headcount]} />
              </FieldContent>
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="position-is-active">Active</FieldLabel>
              <FieldContent>
                <Switch
                  id="position-is-active"
                  checked={form.watch('isActive')}
                  onCheckedChange={(value) => form.setValue('isActive', value, { shouldValidate: true })}
                />
              </FieldContent>
            </Field>
          </FieldGroup>

          {createPositionMutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {createPositionMutation.error instanceof Error
                ? createPositionMutation.error.message
                : 'Unable to create the position.'}
            </p>
          ) : null}

          <Button type="submit" disabled={createPositionMutation.isPending}>
            {createPositionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Create position
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
