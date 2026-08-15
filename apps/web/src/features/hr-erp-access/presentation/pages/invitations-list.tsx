import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import type { AuthSession } from '@/features/auth/domain/auth';
import { useEmployees } from '@/features/hr-employees/application/hr-employees-queries';
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
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

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
  const { invitationsQuery, createInvitationMutation, revokeAccessMutation } =
    useInvitations(companyId, apiBaseUrl);
  const employeesQuery = useEmployees(companyId, apiBaseUrl);
  const form = useForm<InvitationFormInput, unknown, InvitationFormValues>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues,
  });

  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleccioná una compañía activa para gestionar el acceso al ERP.
      </p>
    );
  }

  const invitations = sortInvitationsByExpiresAt(invitationsQuery.data ?? []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invitar al acceso ERP</CardTitle>
          <CardDescription>
            Elegí un empleado y mandale un correo para que pueda entrar al
            sistema.
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
                <FieldLabel htmlFor="erp-access-employee-id">
                  ¿Qué empleado va a usar el sistema?
                </FieldLabel>
                <FieldContent>
                  <select
                    id="erp-access-employee-id"
                    aria-label="¿Qué empleado va a usar el sistema?"
                    className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-2 text-sm"
                    {...form.register('employeeId')}
                  >
                    <option value="">Elegí un empleado</option>
                    {(employeesQuery.data ?? []).map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName || 'Sin nombre'}
                        {employee.email ? ` · ${employee.email}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-muted-foreground">
                    El sistema guarda el empleado correcto automáticamente.
                  </p>
                  <FieldError errors={[form.formState.errors.employeeId]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="erp-access-invitee-email">
                  Correo de quien va a entrar
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="erp-access-invitee-email"
                    aria-label="Correo de la persona invitada"
                    type="email"
                    placeholder="Ej.: ana@empresa.com"
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
                  : 'No se pudo crear la invitación de acceso al ERP.'}
              </p>
            ) : null}

            <Button type="submit" disabled={createInvitationMutation.isPending}>
              {createInvitationMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Invitar al acceso ERP
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitaciones pendientes</CardTitle>
          <CardDescription>
            Consultá las invitaciones que todavía deben aceptarse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitationsQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : null}

          {invitationsQuery.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {invitationsQuery.error instanceof Error
                ? invitationsQuery.error.message
                : 'No se pudieron cargar las invitaciones de acceso al ERP.'}
            </p>
          ) : null}

          {!invitationsQuery.isLoading &&
          !invitationsQuery.isError &&
          invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay invitaciones pendientes de acceso al ERP.
            </p>
          ) : null}

          {!invitationsQuery.isLoading &&
          !invitationsQuery.isError &&
          invitations.length > 0 ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Correo electrónico</TableHead>
                    <TableHead>Vence el</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">
                        {invitation.employeeId}
                      </TableCell>
                      <TableCell>{invitation.inviteeEmail}</TableCell>
                      <TableCell>
                        {new Date(invitation.expiresAt).toLocaleString('es-AR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label={`Revocar acceso ERP para ${invitation.employeeId}`}
                          disabled={revokeAccessMutation.isPending}
                          onClick={() => {
                            void revokeAccessMutation.mutateAsync({
                              companyId,
                              employeeId: invitation.employeeId,
                            });
                          }}
                        >
                          Revocar acceso
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
                : 'No se pudo revocar el acceso al ERP.'}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
