import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChevronLeft,
  ChevronsLeft,
  Copy,
  Loader2,
  Mail,
  MailPlus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import type { AuthSession } from '@/features/auth/domain/auth';
import { useEmployees } from '@/features/hr-employees/application/hr-employees-queries';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import {
  defaultPageSizeOptions,
  TablePageSize,
} from '@/shared/ui/table-page-size';

import { useInvitations } from '../../application/hr-erp-access-queries';
import type { PendingErpAccessInvitation } from '../../domain/erp-access';
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

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-AR');

const getEmployeeName = (
  employeeId: string,
  employees: { id: string; fullName: string | null; email: string | null }[],
) => employees.find((employee) => employee.id === employeeId)?.fullName ?? employeeId;

const InvitationRowActions = ({
  invitation,
  employeeName,
  onRequestRevoke,
}: {
  invitation: PendingErpAccessInvitation;
  employeeName: string;
  onRequestRevoke: (invitation: PendingErpAccessInvitation) => void;
}) => {
  const copyEmail = async () => {
    if (!navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(invitation.inviteeEmail);
      toast.success('Correo copiado');
    } catch {
      // El portapapeles puede estar bloqueado por el navegador.
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Copiar correo de la invitación de ${employeeName}`}
        className="size-8 rounded-full"
        onClick={() => void copyEmail()}
      >
        <Copy className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Revocar acceso de la invitación de ${employeeName}`}
        className="size-8 rounded-full text-red-600 hover:bg-red-500/10 hover:text-red-700"
        onClick={() => onRequestRevoke(invitation)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingRevoke, setPendingRevoke] =
    useState<PendingErpAccessInvitation | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
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
  const employees = employeesQuery.data ?? [];
  const now = Date.now();
  const totalInvitations = invitations.length;
  const totalPages = Math.max(1, Math.ceil(totalInvitations / pageSize));
  const paginatedInvitations = invitations.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const openCreateDialog = () => {
    form.reset(defaultValues);
    setIsCreateOpen(true);
  };

  const confirmRevoke = async () => {
    if (!pendingRevoke) return;
    try {
      await revokeAccessMutation.mutateAsync({
        companyId,
        employeeId: pendingRevoke.employeeId,
      });
      toast.success('Acceso revocado', {
        description: pendingRevoke.inviteeEmail,
      });
      setPendingRevoke(null);
    } catch {
      // El error se refleja en el mutation.
    }
  };

  return (
    <section className="space-y-6">
      <div className="-mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-xl font-medium tracking-tight">
          Invitaciones pendientes
        </h2>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 cursor-pointer rounded-2xl"
          onClick={openCreateDialog}
        >
          <MailPlus className="size-4" color="#000" />
          Invitar al ERP
        </Button>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent
          hideCloseButton
          className="gap-0 overflow-hidden border-0 p-0 sm:max-w-4xl"
        >
          <DialogTitle className="sr-only">Invitar al ERP</DialogTitle>
          <div className="grid sm:grid-cols-[2fr_3fr]">
            <div className="relative hidden overflow-hidden sm:block">
              <img
                src="/bg__employees-bw.svg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="max-h-[90vh] overflow-y-auto p-6">
              <div className="mb-6 space-y-1.5">
                <h2 className="text-lg font-semibold leading-none">
                  Invitar al acceso ERP
                </h2>
                <p className="text-sm text-muted-foreground">
                  Elegí un empleado y mandale un correo para que pueda entrar al
                  sistema.
                </p>
              </div>
              <form
                className="space-y-5"
                onSubmit={(event) => {
                  void form.handleSubmit(async (values) => {
                    try {
                      await createInvitationMutation.mutateAsync(
                        toCreateErpAccessInvitationInput(companyId, values),
                      );
                      toast.success('Invitación enviada', {
                        description: values.inviteeEmail,
                      });
                      form.reset(defaultValues);
                      setIsCreateOpen(false);
                    } catch {
                      // El error se refleja en el mutation.
                    }
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
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                        {...form.register('employeeId')}
                      >
                        <option value="">Elegí un empleado</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.fullName || 'Sin nombre'}
                            {employee.email ? ` · ${employee.email}` : ''}
                          </option>
                        ))}
                      </select>
                      <FieldError
                        errors={[form.formState.errors.employeeId]}
                      />
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
                      <FieldError
                        errors={[form.formState.errors.inviteeEmail]}
                      />
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

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={createInvitationMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createInvitationMutation.isPending}
                  >
                    {createInvitationMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Enviar invitación
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {invitationsQuery.isLoading ? (
        <div className="space-y-3" aria-label="Cargando invitaciones">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-14 w-full animate-pulse rounded-xl bg-muted/40"
            />
          ))}
        </div>
      ) : null}

      {invitationsQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {invitationsQuery.error instanceof Error
            ? invitationsQuery.error.message
            : 'No se pudieron cargar las invitaciones de acceso al ERP.'}
        </p>
      ) : null}

      {!invitationsQuery.isLoading && !invitationsQuery.isError && totalInvitations === 0 ? (
        <div className="border-t px-5 py-12 text-center">
          <Mail className="mx-auto size-8 text-muted-foreground/50" />
          <h2 className="text-xl font-medium tracking-tight">
            No hay invitaciones pendientes
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            Invitá a un empleado con el botón “Invitar al ERP”.
          </p>
        </div>
      ) : null}

      {!invitationsQuery.isLoading && !invitationsQuery.isError && totalInvitations > 0 ? (
        <Table>
          <TableHeader className="bg-[#f6f6f6] rounded-2xl">
            <TableRow>
              <TableHead className="h-11 pl-5 text-xs">Empleado</TableHead>
              <TableHead className="h-11 text-xs">Correo invitado</TableHead>
              <TableHead className="h-11 text-xs">Vence</TableHead>
              <TableHead className="h-11 text-xs">Estado</TableHead>
              <TableHead className="h-11 pr-5 text-right text-xs"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedInvitations.map((invitation) => {
              const employeeName = getEmployeeName(invitation.employeeId, employees);
              const expiresAtMs = new Date(invitation.expiresAt).getTime();
              const isExpired = expiresAtMs < now;
              const isExpiringSoon =
                expiresAtMs >= now && expiresAtMs - now < 7 * 24 * 60 * 60 * 1000;
              return (
                <TableRow key={invitation.id}>
                  <TableCell className="py-4 pl-5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {employeeName.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {employeeName}
                        </div>
                        <div className="truncate text-xs text-gray-600">
                          {invitation.employeeId}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {invitation.inviteeEmail}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(invitation.expiresAt)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        isExpired
                          ? 'rounded-2xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700'
                          : isExpiringSoon
                            ? 'rounded-2xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700'
                            : 'rounded-2xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'
                      }
                    >
                      {isExpired
                        ? 'Vencida'
                        : isExpiringSoon
                          ? 'Por vencer'
                          : 'Activa'}
                    </span>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <InvitationRowActions
                      invitation={invitation}
                      employeeName={employeeName}
                      onRequestRevoke={setPendingRevoke}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}

      {totalInvitations > 0 ? (
        <footer className="flex min-h-16 flex-wrap items-center justify-between gap-4 border-t bg-muted/10 px-4 py-3 text-xs sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Mostrando{' '}
              <strong className="font-semibold text-foreground">
                {paginatedInvitations.length}
              </strong>{' '}
              invitaciones de{' '}
              <strong className="font-semibold text-foreground">
                {totalInvitations}
              </strong>
            </span>
            <span aria-hidden className="h-4 w-px bg-border" />
            <span>Filas por página</span>
            <TablePageSize
              value={pageSize}
              options={defaultPageSizeOptions}
              onChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
            />
          </div>
          <nav
            aria-label="Paginación de invitaciones"
            className="flex items-center gap-1"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Ir a la primera página"
              disabled={page === 1}
              onClick={() => setPage(1)}
              className="size-8 rounded-md"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Volver al inicio"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="size-8 rounded-md"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="mx-1 h-5 w-px bg-border" />
            {page < totalPages ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                Siguiente
              </Button>
            ) : (
              <span className="px-2 text-muted-foreground/60">
                Última página
              </span>
            )}
          </nav>
        </footer>
      ) : null}

      <button
        type="button"
        aria-label="Nueva invitación"
        className="fixed bottom-6 right-6 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-primary/90 hover:scale-105"
        onClick={openCreateDialog}
      >
        <MailPlus className="size-6" />
      </button>

      <AlertDialog
        open={pendingRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRevoke(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar el acceso al ERP?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción elimina la invitación pendiente de{' '}
              <span className="font-medium text-foreground">
                {pendingRevoke?.inviteeEmail}
              </span>{' '}
              y ya no podrá aceptar el acceso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {revokeAccessMutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {revokeAccessMutation.error instanceof Error
                ? revokeAccessMutation.error.message
                : 'No se pudo revocar el acceso al ERP.'}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-2xl"
              disabled={revokeAccessMutation.isPending}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmRevoke();
              }}
              className="rounded-2xl bg-red-500 text-white hover:bg-red-700"
              disabled={revokeAccessMutation.isPending}
            >
              {revokeAccessMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Revocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
