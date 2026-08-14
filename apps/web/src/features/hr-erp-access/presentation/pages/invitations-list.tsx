import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import type { AuthSession } from '@/features/auth/domain/auth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

import { useInvitations } from '../../application/hr-erp-access-queries';
import {
  invitationFormSchema,
  sortInvitationsByExpiresAt,
  toCreateErpAccessInvitationInput,
  type InvitationFormValues,
} from '../../domain/erp-access';

type InvitationFormInput = z.input<typeof invitationFormSchema>;

const defaultValues: InvitationFormValues = {
  employeeId: '',
  inviteeEmail: '',
};

export const InvitationsListPage = ({
  session,
  apiBaseUrl,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
}) => {
  const companyId = session.activeCompany?.companyId;
  const { invitationsQuery, createInvitationMutation, revokeAccessMutation } = useInvitations(
    companyId,
    apiBaseUrl,
  );
  const form = useForm<InvitationFormInput, unknown, InvitationFormValues>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues,
  });

  if (!companyId) {
    return <p className="text-sm text-muted-foreground">Select an active company to manage ERP access.</p>;
  }

  const invitations = sortInvitationsByExpiresAt(invitationsQuery.data ?? []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite ERP access</CardTitle>
          <CardDescription>
            Create an ERP activation invitation for an existing employee record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              void form.handleSubmit(async (values) => {
                await createInvitationMutation.mutateAsync(
                  toCreateErpAccessInvitationInput(companyId, values),
                );
                form.reset(defaultValues);
              })(event);
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="erp-access-employee-id">Employee id</FieldLabel>
                <FieldContent>
                  <Input
                    id="erp-access-employee-id"
                    aria-label="Employee id"
                    placeholder="employee-1"
                    {...form.register('employeeId')}
                  />
                  <FieldError errors={[form.formState.errors.employeeId]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="erp-access-invitee-email">Invitee email</FieldLabel>
                <FieldContent>
                  <Input
                    id="erp-access-invitee-email"
                    aria-label="Invitee email"
                    type="email"
                    placeholder="person@vimcore.test"
                    {...form.register('inviteeEmail')}
                  />
                  <FieldError errors={[form.formState.errors.inviteeEmail]} />
                </FieldContent>
              </Field>
            </FieldGroup>

            {createInvitationMutation.error ? (
              <p role="alert" className="text-sm text-destructive">
                {createInvitationMutation.error instanceof Error
                  ? createInvitationMutation.error.message
                  : 'Unable to create the ERP access invitation.'}
              </p>
            ) : null}

            <Button type="submit" disabled={createInvitationMutation.isPending}>
              {createInvitationMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Invite ERP access
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
          <CardDescription>Review invitations that still need to be accepted.</CardDescription>
        </CardHeader>
        <CardContent>
          {invitationsQuery.isLoading ? <Skeleton className="h-32 w-full" /> : null}

          {invitationsQuery.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {invitationsQuery.error instanceof Error
                ? invitationsQuery.error.message
                : 'Unable to load ERP access invitations.'}
            </p>
          ) : null}

          {!invitationsQuery.isLoading && !invitationsQuery.isError && invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending ERP access invitations.</p>
          ) : null}

          {!invitationsQuery.isLoading && !invitationsQuery.isError && invitations.length > 0 ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Expires at</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.employeeId}</TableCell>
                      <TableCell>{invitation.inviteeEmail}</TableCell>
                      <TableCell>{new Date(invitation.expiresAt).toLocaleString('en-US')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label={`Revoke ERP access for ${invitation.employeeId}`}
                          disabled={revokeAccessMutation.isPending}
                          onClick={() => {
                            void revokeAccessMutation.mutateAsync({
                              companyId,
                              employeeId: invitation.employeeId,
                            });
                          }}
                        >
                          Revoke access
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}

          {revokeAccessMutation.error ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {revokeAccessMutation.error instanceof Error
                ? revokeAccessMutation.error.message
                : 'Unable to revoke ERP access.'}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
