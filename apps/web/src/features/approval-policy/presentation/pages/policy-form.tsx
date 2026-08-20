import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Network,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import type { AuthSession } from '@/features/auth/domain/auth';
import { useOrgTree } from '@/features/org-tree/application/org-tree-queries';
import { Button } from '@/shared/ui/button';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';

import { useApprovalPolicies } from '../../application/approval-policy-queries';
import {
  approvalPolicyFormSchema,
  approvalPolicyScopeTypes,
  getApprovalPolicySteps,
  toCreateApprovalPolicyInput,
  toPolicyFormValues,
  toApprovalPolicyDefinition,
  toUpdateApprovalPolicyInput,
  type ApprovalPolicy,
  type ApprovalPolicyFormValues,
} from '../../domain/approval-policy';

type ApprovalPolicyFormInput = z.input<typeof approvalPolicyFormSchema>;

const scopeTypeLabels: Record<(typeof approvalPolicyScopeTypes)[number], string> = {
  company: 'Toda la empresa',
  division: 'Una división',
  local: 'Un local',
  area: 'Un área',
  warehouse: 'Un depósito',
  'point-of-sale': 'Un punto de venta',
};

const sectionClassName = 'rounded-2xl p-4';
const sectionHeaderClassName = '-mt-4 flex items-center gap-3';
const sectionIconClassName =
  'flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted';

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
  const [approvalSteps, setApprovalSteps] = useState(() => getApprovalPolicySteps(policy?.definition));
  const [newStep, setNewStep] = useState('');
  const form = useForm<ApprovalPolicyFormInput, unknown, ApprovalPolicyFormValues>({
    resolver: zodResolver(approvalPolicyFormSchema),
    defaultValues,
  });
  const scopeType = form.watch('scopeType');
  const scopeNodeId = form.watch('scopeNodeId');
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
    <div className="grid p-4">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-medium tracking-tight">
            {isEditing ? 'Actualizar política' : 'Crear política'}
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-xs font-medium">
            3 secciones
          </span>
        </div>
        <form
          className="space-y-6"
          onSubmit={(event) => {
            void form.handleSubmit(async (values) => {
              const valuesWithSteps = {
                ...values,
                definitionJson: JSON.stringify(toApprovalPolicyDefinition(approvalSteps)),
              };
              const savedPolicy = policy
                ? await updatePolicyMutation.mutateAsync(
                    toUpdateApprovalPolicyInput(companyId, policy.id, valuesWithSteps),
                  )
                : await createPolicyMutation.mutateAsync(
                    toCreateApprovalPolicyInput(companyId, valuesWithSteps),
                  );

              onSaved?.(savedPolicy.id);
            })(event);
          }}
        >
          <section className={sectionClassName}>
            <div className={sectionHeaderClassName}>
              <span className={sectionIconClassName}>
                <UserRound className="size-6" />
              </span>
              <div>
                <h2 className="text-xl font-medium tracking-tight">
                  Identificación
                </h2>
                <p className="text-xs text-gray-600">
                  Nombre interno de la política de aprobación.
                </p>
              </div>
            </div>
            <FieldGroup className="mt-6">
              <Field>
                <FieldLabel htmlFor="approval-policy-name">
                  Nombre de la política
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="approval-policy-name"
                    aria-label="Nombre de la política"
                    placeholder="Ej.: Vacaciones del equipo"
                    {...form.register('name')}
                  />
                  <FieldError errors={[form.formState.errors.name]} />
                </FieldContent>
              </Field>
            </FieldGroup>
          </section>

          <section className={sectionClassName}>
            <div className={sectionHeaderClassName}>
              <span className={sectionIconClassName}>
                <Network className="size-6" />
              </span>
              <div>
                <h2 className="text-xl font-medium tracking-tight">
                  Alcance
                </h2>
                <p className="text-xs text-gray-600">
                  Dónde de la organización se aplica esta política.
                </p>
              </div>
            </div>
            <FieldGroup className="mt-6 grid gap-8 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="approval-policy-scope-type">
                  ¿Dónde se aplica?
                </FieldLabel>
                <FieldContent>
                  <select
                    id="approval-policy-scope-type"
                    aria-label="¿Dónde se aplica?"
                    className="border-input bg-background flex h-9 w-full cursor-pointer rounded-md border px-3 py-2 text-sm"
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
                        {scopeTypeLabels[value]}
                      </option>
                    ))}
                  </select>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="approval-policy-scope-node-id">
                  ¿A qué lugar aplica?
                </FieldLabel>
                <FieldContent>
                  <select
                    id="approval-policy-scope-node-id"
                    aria-label="¿A qué lugar aplica?"
                    disabled={scopeType === 'company'}
                    className="border-input bg-background flex h-9 w-full cursor-pointer rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    value={scopeNodeId}
                    onChange={(event) =>
                      form.setValue('scopeNodeId', event.target.value, { shouldValidate: true })
                    }
                  >
                    <option value="">Elegí una división, local o área</option>
                    {(orgTreeQuery.data ?? [])
                      .filter((node) => node.ref.scopeType === scopeType)
                      .map((node) => (
                        <option key={node.ref.scopeId} value={node.ref.scopeId}>
                          {node.name}
                        </option>
                      ))}
                  </select>
                  <FieldError errors={[form.formState.errors.scopeNodeId]} />
                </FieldContent>
              </Field>
            </FieldGroup>
          </section>

          <section className={sectionClassName}>
            <div className={sectionHeaderClassName}>
              <span className={sectionIconClassName}>
                <Users className="size-6" />
              </span>
              <div>
                <h2 className="text-xl font-medium tracking-tight">
                  Aprobadores
                </h2>
                <p className="text-xs text-gray-600">
                  Orden en que las personas o roles deben aprobar.
                </p>
              </div>
            </div>
            <FieldGroup className="mt-6 space-y-6">
              <input type="hidden" {...form.register('definitionJson')} />

              <Field>
                <FieldLabel htmlFor="approval-policy-new-step">
                  ¿Quién debe aprobar?
                </FieldLabel>
                <FieldContent>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="approval-policy-new-step"
                      aria-label="¿Quién debe aprobar?"
                      placeholder="Ej.: Jefe directo o responsable de RRHH"
                      value={newStep}
                      onChange={(event) => setNewStep(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          const step = newStep.trim();
                          if (step) {
                            setApprovalSteps((current) => [...current, step]);
                            setNewStep('');
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      disabled={!newStep.trim()}
                      onClick={() => {
                        const step = newStep.trim();
                        if (step) {
                          setApprovalSteps((current) => [...current, step]);
                          setNewStep('');
                        }
                      }}
                    >
                      Agregar aprobador
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Agregá las personas o roles en el orden en que deben aprobar.
                  </p>
                  {approvalSteps.length > 0 ? (
                    <ol className="space-y-2" aria-label="Pasos de aprobación">
                      {approvalSteps.map((step, index) => (
                        <li
                          key={`${step}-${index}`}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          <span>
                            <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                            {step}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 cursor-pointer rounded-full"
                              aria-label={`Subir aprobador ${step}`}
                              disabled={index === 0}
                              onClick={() => {
                                setApprovalSteps((current) => {
                                  const next = [...current];
                                  const previous = next[index - 1];
                                  const currentStep = next[index];
                                  if (previous !== undefined && currentStep !== undefined) {
                                    next[index - 1] = currentStep;
                                    next[index] = previous;
                                  }
                                  return next;
                                });
                              }}
                            >
                              <ChevronUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 cursor-pointer rounded-full"
                              aria-label={`Bajar aprobador ${step}`}
                              disabled={index === approvalSteps.length - 1}
                              onClick={() => {
                                setApprovalSteps((current) => {
                                  const next = [...current];
                                  const currentStep = next[index];
                                  const following = next[index + 1];
                                  if (currentStep !== undefined && following !== undefined) {
                                    next[index] = following;
                                    next[index + 1] = currentStep;
                                  }
                                  return next;
                                });
                              }}
                            >
                              <ChevronDown className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 cursor-pointer rounded-full text-red-600 hover:bg-red-500/10 hover:text-red-700"
                              aria-label={`Quitar aprobador ${step}`}
                              onClick={() => {
                                setApprovalSteps((current) => current.filter((_, stepIndex) => stepIndex !== index));
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Todavía no agregaste ningún aprobador.
                    </p>
                  )}
                </FieldContent>
              </Field>

              <Field orientation="horizontal" className="rounded-xl bg-muted/30 px-3 py-2">
                <FieldLabel htmlFor="approval-policy-is-active">
                  Política activa
                </FieldLabel>
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
          </section>

          {mutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'No se pudo guardar la política de aprobación.'}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditing ? 'Actualizar política' : 'Crear política'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
