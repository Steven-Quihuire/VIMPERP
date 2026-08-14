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
        Select an active company before managing approval policies.
      </p>
    );
  }

  return (
    <Card key={policy?.id ?? 'new-policy'}>
      <CardHeader>
        <CardTitle>{isEditing ? 'Update policy' : 'Create policy'}</CardTitle>
        <CardDescription>
          Configure approval-policy groundwork without enabling workflow execution yet.
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
              <FieldLabel htmlFor="approval-policy-name">Policy name</FieldLabel>
              <FieldContent>
                <Input
                  id="approval-policy-name"
                  aria-label="Policy name"
                  {...form.register('name')}
                />
                <FieldError errors={[form.formState.errors.name]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="approval-policy-scope-type">Scope type</FieldLabel>
              <FieldContent>
                <select
                  id="approval-policy-scope-type"
                  aria-label="Scope type"
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
              <FieldLabel htmlFor="approval-policy-scope-node-id">Scope node id</FieldLabel>
              <FieldContent>
                <Input
                  id="approval-policy-scope-node-id"
                  aria-label="Scope node id"
                  placeholder={orgTreeQuery.data?.[0]?.ref.scopeId ?? 'area:area-1'}
                  disabled={scopeType === 'company'}
                  {...form.register('scopeNodeId')}
                />
                <FieldDescription>
                  Use the canonical scope-node id for non-company policies.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.scopeNodeId]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="approval-policy-definition-json">Definition JSON</FieldLabel>
              <FieldContent>
                <Input
                  id="approval-policy-definition-json"
                  aria-label="Definition JSON"
                  {...form.register('definitionJson')}
                />
                <FieldDescription>
                  Store the raw approval-policy configuration JSON.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.definitionJson]} />
              </FieldContent>
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="approval-policy-is-active">Active</FieldLabel>
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
                : 'Unable to save the approval policy.'}
            </p>
          ) : null}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEditing ? 'Update policy' : 'Create policy'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
