import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import type { AuthSession } from '@/features/auth/domain/auth';
import { useOrgTree } from '@/features/org-tree/application/org-tree-queries';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';

import { useApprovalPolicies } from '../../application/approval-policy-queries';
import {
  approvalPolicyFormSchema,
  approvalPolicyScopeTypes,
  toCreateApprovalPolicyInput,
  toPolicyFormValues,
  toUpdateApprovalPolicyInput,
  type ApprovalPolicy,
  type ApprovalPolicyFormValues,
} from '../../domain/approval-policy';

type ApprovalPolicyFormInput = z.input<typeof approvalPolicyFormSchema>;

export const PolicyFormPage = ({
  session,
  policy,
  apiBaseUrl,
  onSaved,
}: {
  session: AuthSession;
  policy?: ApprovalPolicy | null;
  apiBaseUrl?: string;
  onSaved?: (policyId: string) => void;
}) => {
  const companyId = session.activeCompany?.companyId;
  const { createPolicyMutation, updatePolicyMutation } = useApprovalPolicies(companyId, apiBaseUrl);
  const orgTreeQuery = useOrgTree(companyId, apiBaseUrl, policy?.scopeType !== 'company');
  const defaultValues = toPolicyFormValues(policy);
  const form = useForm<ApprovalPolicyFormInput, unknown, ApprovalPolicyFormValues>({
    resolver: zodResolver(approvalPolicyFormSchema),
    defaultValues,
  });
  const scopeType = form.watch('scopeType');
  const isEditing = Boolean(policy);
  const mutation = isEditing ? updatePolicyMutation : createPolicyMutation;

  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleccioná una compañía activa antes de gestionar las políticas de aprobación.
      </p>
    );
  }

  return (
    <Card key={policy?.id ?? 'new-policy'}>
      <CardHeader>
        <CardTitle>{isEditing ? 'Actualizar política' : 'Crear política'}</CardTitle>
        <CardDescription>
          Configurá las bases de la política de aprobación sin habilitar todavía la ejecución del flujo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            void form.handleSubmit(async (values) => {
              const savedPolicy = policy
                ? await updatePolicyMutation.mutateAsync(
                    toUpdateApprovalPolicyInput(companyId, policy.id, values),
                  )
                : await createPolicyMutation.mutateAsync(
                    toCreateApprovalPolicyInput(companyId, values),
                  );

              onSaved?.(savedPolicy.id);
            })(event);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="approval-policy-name">Nombre de la política</FieldLabel>
              <FieldContent>
                <Input
                  id="approval-policy-name"
                  aria-label="Nombre de la política"
                  {...form.register('name')}
                />
                <FieldError errors={[form.formState.errors.name]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="approval-policy-scope-type">Tipo de alcance</FieldLabel>
              <FieldContent>
                <select
                  id="approval-policy-scope-type"
                  aria-label="Tipo de alcance"
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-2 text-sm"
                  value={scopeType}
                  onChange={(event) => {
                    const nextScopeType = event.target.value as ApprovalPolicyFormValues['scopeType'];
                    form.setValue('scopeType', nextScopeType, { shouldValidate: true });
                    if (nextScopeType === 'company') {
                      form.setValue('scopeNodeId', '', { shouldValidate: true });
                    }
                  }}
                >
                  {approvalPolicyScopeTypes.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="approval-policy-scope-node-id">ID del nodo de alcance</FieldLabel>
              <FieldContent>
                <Input
                  id="approval-policy-scope-node-id"
                  aria-label="ID del nodo de alcance"
                  placeholder={orgTreeQuery.data?.[0]?.ref.scopeId ?? 'area:area-1'}
                  disabled={scopeType === 'company'}
                  {...form.register('scopeNodeId')}
                />
                <FieldDescription>
                   Usá el ID canónico del nodo de alcance para las políticas que no sean de compañía.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.scopeNodeId]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="approval-policy-definition-json">JSON de definición</FieldLabel>
              <FieldContent>
                <Input
                  id="approval-policy-definition-json"
                  aria-label="JSON de definición"
                  {...form.register('definitionJson')}
                />
                <FieldDescription>
                   Guardá el JSON sin modificar de la configuración de la política de aprobación.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.definitionJson]} />
              </FieldContent>
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="approval-policy-is-active">Activa</FieldLabel>
              <FieldContent>
                <Switch
                  id="approval-policy-is-active"
                  checked={form.watch('isActive')}
                  onCheckedChange={(value) =>
                    form.setValue('isActive', value, { shouldValidate: true })
                  }
                />
              </FieldContent>
            </Field>
          </FieldGroup>

          {mutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error instanceof Error
                ? mutation.error.message
                 : 'No se pudo guardar la política de aprobación.'}
            </p>
          ) : null}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEditing ? 'Actualizar política' : 'Crear política'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
