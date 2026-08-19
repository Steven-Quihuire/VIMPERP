import { Loader2, Mail, MailPlus, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { AuthSession } from '@/features/auth/domain/auth';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

import { useHrResponsibility } from '../application/hr-responsibility-queries';

type DialogKind = 'assign' | 'invite' | null;

export const HrResponsibilityPage = ({
  session,
  apiBaseUrl,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
}) => {
  const companyId = session.activeCompany?.companyId;
  const activeRole = session.memberships.find(
    (membership) => membership.companyId === companyId,
  )?.role;
  const canConfigure =
    activeRole === 'company-owner' ||
    session.memberships.some(
      (membership) => membership.role === 'platform-admin',
    );
  const { stateQuery, assignMutation, inviteMutation } = useHrResponsibility(
    companyId,
    apiBaseUrl,
  );
  const [openDialog, setOpenDialog] = useState<DialogKind>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');

  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleccioná una compañía activa para configurar responsables.
      </p>
    );
  }

  if (stateQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando responsables...</p>
    );
  }

  if (stateQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        No se pudieron cargar los responsables de RRHH.
      </p>
    );
  }

  const state = stateQuery.data;

  const handleAssign = async () => {
    if (!selectedUserId) return;
    try {
      await assignMutation.mutateAsync({
        targetCompanyId: companyId,
        userId: selectedUserId,
      });
      toast.success('Responsable asignado');
      setSelectedUserId('');
      setOpenDialog(null);
    } catch {
      // El error se refleja en el mutation.
    }
  };

  const handleInvite = async () => {
    if (!inviteeEmail.trim()) return;
    try {
      await inviteMutation.mutateAsync({
        targetCompanyId: companyId,
        inviteeEmail: inviteeEmail.trim(),
      });
      toast.success('Invitación enviada', { description: inviteeEmail });
      setInviteeEmail('');
      setOpenDialog(null);
    } catch {
      // El error se refleja en el mutation.
    }
  };

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-card p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
            <Users className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-black/45">Responsables actuales</p>
            <p className="text-xl font-semibold tracking-tight">
              {state?.responsibles.length ?? 0}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-card p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <UserPlus className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-black/45">Usuarios disponibles</p>
            <p className="text-xl font-semibold tracking-tight">
              {state?.availableUsers.length ?? 0}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-card p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Mail className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-black/45">Invitaciones pendientes</p>
            <p className="text-xl font-semibold tracking-tight">
              {state?.pendingInvitations?.length ?? 0}
            </p>
          </div>
        </div>
      </div>

      <div className="-mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-xl font-medium tracking-tight">
          Responsables actuales
        </h2>
        {canConfigure ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="shrink-0 cursor-pointer rounded-2xl"
              onClick={() => setOpenDialog('assign')}
              disabled={!state?.availableUsers.length}
            >
              <UserPlus className="size-4" color="#000" />
              Asignar responsable
            </Button>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 cursor-pointer rounded-2xl"
              onClick={() => setOpenDialog('invite')}
            >
              <MailPlus className="size-4" color="#000" />
              Invitar por correo
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border">
        {state?.responsibles.length ? (
          <Table>
            <TableHeader className="bg-[#f6f6f6] rounded-2xl">
              <TableRow>
                <TableHead className="h-11 pl-5 text-xs">Usuario</TableHead>
                <TableHead className="h-11 text-xs">Correo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.responsibles.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell className="py-4 pl-5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {user.username.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="truncate font-medium">
                        {user.username}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.email}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="px-5 py-12 text-center">
            <Users className="mx-auto size-8 text-muted-foreground/50" />
            <h3 className="text-xl font-medium tracking-tight">
              Todavía no hay responsables asignados
            </h3>
            <p className="mt-1 text-xs text-gray-600">
              Asigná un usuario ERP existente o invitá a una persona externa.
            </p>
          </div>
        )}
      </div>

      {state?.pendingInvitations?.length ? (
        <div className="space-y-3">
          <h2 className="text-xl font-medium tracking-tight">
            Invitaciones pendientes
          </h2>
          <div className="rounded-2xl border">
            <Table>
              <TableHeader className="bg-[#f6f6f6] rounded-2xl">
                <TableRow>
                  <TableHead className="h-11 pl-5 text-xs">
                    Correo invitado
                  </TableHead>
                  <TableHead className="h-11 text-xs">Vence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="py-4 pl-5 font-medium">
                      {invitation.inviteeEmail}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invitation.expiresAt).toLocaleString('es-AR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      <Dialog
        open={openDialog === 'assign'}
        onOpenChange={(open) => {
          if (!open) setOpenDialog(null);
        }}
      >
        <DialogContent hideCloseButton className="sm:max-w-md">
          <DialogTitle className="sr-only">Asignar responsable</DialogTitle>
          <div className="space-y-5 p-6">
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold leading-none">
                Asignar responsable
              </h2>
              <p className="text-sm text-muted-foreground">
                Elegí un usuario ERP existente para darle acceso de responsable de
                RRHH.
              </p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="hr-responsible-user"
                className="text-xs font-medium text-black/45"
              >
                Usuario ERP
              </label>
              <select
                id="hr-responsible-user"
                aria-label="Usuario ERP"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                <option value="" disabled>
                  Seleccioná una persona
                </option>
                {state?.availableUsers.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.username} · {user.email}
                  </option>
                ))}
              </select>
              {assignMutation.error ? (
                <p role="alert" className="text-sm text-destructive">
                  No se pudo asignar el responsable.
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenDialog(null)}
                disabled={assignMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleAssign()}
                disabled={!selectedUserId || assignMutation.isPending}
              >
                {assignMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Asignar responsable
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openDialog === 'invite'}
        onOpenChange={(open) => {
          if (!open) setOpenDialog(null);
        }}
      >
        <DialogContent hideCloseButton className="sm:max-w-md">
          <DialogTitle className="sr-only">Invitar responsable</DialogTitle>
          <div className="space-y-5 p-6">
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold leading-none">
                Invitar responsable por correo
              </h2>
              <p className="text-sm text-muted-foreground">
                La persona recibirá un enlace para crear o reutilizar su cuenta
                y aceptar el rol de responsable de RRHH.
              </p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="hr-responsible-email"
                className="text-xs font-medium text-black/45"
              >
                Correo electrónico
              </label>
              <Input
                id="hr-responsible-email"
                aria-label="Correo electrónico"
                type="email"
                required
                value={inviteeEmail}
                onChange={(event) => setInviteeEmail(event.target.value)}
                placeholder="persona@ejemplo.com"
              />
              {inviteMutation.error ? (
                <p role="alert" className="text-sm text-destructive">
                  No se pudo enviar la invitación. Verificá el correo y que no
                  exista una invitación activa.
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenDialog(null)}
                disabled={inviteMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleInvite()}
                disabled={!inviteeEmail.trim() || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Enviar invitación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
