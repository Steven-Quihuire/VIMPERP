import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/presentation/use-auth';
import { HttpError } from '@/shared/lib/http/http-client';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

import { useAcceptInvitation } from '../../application/hr-erp-access-queries';
import {
  acceptInvitationFormSchema,
  createAcceptInvitationInput,
  type AcceptInvitationFormValues,
} from '../../domain/erp-access';

type AcceptInvitationFormInput = z.input<typeof acceptInvitationFormSchema>;

const defaultValues: AcceptInvitationFormValues = {
  password: '',
  confirmPassword: '',
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof HttpError || error instanceof Error) {
    return error.message;
  }

  return 'Unable to activate ERP access.';
};

export const AcceptErpAccessInvitationPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const auth = useAuth(apiBaseUrl);
  const acceptInvitationMutation = useAcceptInvitation(apiBaseUrl);
  const form = useForm<AcceptInvitationFormInput, unknown, AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationFormSchema),
    defaultValues,
  });

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <Card className="w-full max-w-2xl border-border/70 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
            <ShieldCheck className="size-5" />
          </div>
          <CardTitle>Activate ERP access</CardTitle>
          <CardDescription>
            Accept the employee ERP invitation and create a password only when the invited account does not exist yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              void form.handleSubmit(async (values) => {
                if (!token) {
                  form.setError('root', { message: 'Invitation token is missing.' });
                  return;
                }

                try {
                  await acceptInvitationMutation.mutateAsync(
                    createAcceptInvitationInput(token, values),
                  );
                  const nextSession = await auth.refetch();

                  if (nextSession.data?.activeCompany) {
                    navigate('/dashboard/organization', { replace: true });
                    return;
                  }

                  navigate('/dashboard', { replace: true });
                } catch (error) {
                  form.setError('root', { message: getErrorMessage(error) });
                }
              })(event);
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="erp-access-password">Password</FieldLabel>
                <FieldContent>
                  <Input
                    id="erp-access-password"
                    aria-label="Password"
                    type="password"
                    autoComplete="new-password"
                    {...form.register('password')}
                  />
                  <FieldDescription>
                    Leave this blank when the invited email already has an account.
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.password]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="erp-access-confirm-password">Confirm password</FieldLabel>
                <FieldContent>
                  <Input
                    id="erp-access-confirm-password"
                    aria-label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    {...form.register('confirmPassword')}
                  />
                  <FieldError errors={[form.formState.errors.confirmPassword]} />
                </FieldContent>
              </Field>
            </FieldGroup>

            {form.formState.errors.root ? (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={acceptInvitationMutation.isPending || auth.isLoading}>
              {acceptInvitationMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Activate ERP access
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};
