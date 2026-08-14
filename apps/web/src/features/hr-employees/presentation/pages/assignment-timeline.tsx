import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import type { AuthSession } from '@/features/auth/domain/auth';
import { useOrgTree } from '@/features/org-tree/application/org-tree-queries';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

import { useAssignments, usePositions } from '../../application/hr-employees-queries';
import {
  assignmentFormSchema,
  buildAssignmentTimelineEntries,
  toCreateAssignmentInput,
  type AssignmentFormValues,
} from '../../domain/assignments';

const defaultValues: AssignmentFormValues = {
  scopeNodeId: '',
  positionId: '',
  startedAt: '2026-08-13T12:30',
};

export const AssignmentTimelinePage = ({
  session,
  employeeId,
  apiBaseUrl,
}: {
  session: AuthSession;
  employeeId: string | null;
  apiBaseUrl?: string;
}) => {
  const companyId = session.activeCompany?.companyId;
  const positionsQuery = usePositions(companyId, apiBaseUrl);
  const orgTreeQuery = useOrgTree(companyId, apiBaseUrl);
  const assignments = useAssignments(
    { companyId, employeeId: employeeId ?? undefined },
    apiBaseUrl,
  );
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues,
  });

  if (!companyId) {
    return <p className="text-sm text-muted-foreground">Select an active company before managing assignments.</p>;
  }

  if (!employeeId) {
    return <p className="text-sm text-muted-foreground">Choose an employee before creating assignments.</p>;
  }

  const manager = assignments.managerQuery.data ?? null;
  const directReports = assignments.directReportsQuery.data ?? [];
  const timelineEntries = buildAssignmentTimelineEntries({ manager, directReports });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment timeline</CardTitle>
        <CardDescription>Create primary assignments and inspect the current reporting line.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-5"
          onSubmit={(event) => {
            void form.handleSubmit(async (values) => {
              const payload = toCreateAssignmentInput(companyId, employeeId, values);
              await assignments.createAssignmentMutation.mutateAsync(
                {
                  scopeNodeId: payload.scopeNodeId,
                  positionId: payload.positionId,
                  startedAt: payload.startedAt,
                },
              );
              form.reset(defaultValues);
            })(event);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="assignment-scope-node">Scope node</FieldLabel>
              <FieldContent>
                <Input
                  id="assignment-scope-node"
                  aria-label="Scope node"
                  placeholder={orgTreeQuery.data?.[0]?.ref.scopeId ?? 'company:company-1'}
                  {...form.register('scopeNodeId')}
                />
                <FieldError errors={[form.formState.errors.scopeNodeId]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="assignment-position-id">Position</FieldLabel>
              <FieldContent>
                <Input
                  id="assignment-position-id"
                  aria-label="Position"
                  placeholder={positionsQuery.data?.[0]?.id ?? 'position-1'}
                  {...form.register('positionId')}
                />
                <FieldError errors={[form.formState.errors.positionId]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="assignment-start-date">Start date</FieldLabel>
              <FieldContent>
                <Input
                  id="assignment-start-date"
                  aria-label="Start date"
                  type="datetime-local"
                  {...form.register('startedAt')}
                />
                <FieldError errors={[form.formState.errors.startedAt]} />
              </FieldContent>
            </Field>
          </FieldGroup>

          {assignments.createAssignmentMutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {assignments.createAssignmentMutation.error instanceof Error
                ? assignments.createAssignmentMutation.error.message
                : 'Unable to create the assignment.'}
            </p>
          ) : null}

          <Button type="submit" disabled={assignments.createAssignmentMutation.isPending}>
            {assignments.createAssignmentMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Create assignment
          </Button>
        </form>

        <div className="space-y-3">
          {timelineEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reporting-line entries are available yet.</p>
          ) : (
            timelineEntries.map((entry) => (
              <div key={entry.id} className="rounded-lg border px-4 py-3">
                <p className="font-medium">{entry.title}</p>
                <p className="text-sm text-muted-foreground">{entry.description}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
