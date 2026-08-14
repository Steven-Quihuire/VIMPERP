import { Loader2, Mail } from 'lucide-react';
import { useState } from 'react';

import type { AuthSession } from '@/features/auth/domain/auth';
import { Button } from '@/shared/ui/button';

import { useHrResponsibility } from '../application/hr-responsibility-queries';

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
  const [selectedUserId, setSelectedUserId] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

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

  return (
    <section
      className="max-w-3xl space-y-8"
      aria-labelledby="hr-responsibility-title"
    >
      <div>
        <h1 id="hr-responsibility-title" className="text-2xl font-semibold">
          Responsables de RRHH
        </h1>
        <p className="text-sm text-muted-foreground">
          Asigná usuarios ERP existentes o invitá por correo a una persona
          externa. El acceso HR se habilita recién al aceptar.
        </p>
      </div>

      <section
        className="space-y-3 border-b pb-6"
        aria-labelledby="current-hr-responsibles-title"
      >
        <h2 id="current-hr-responsibles-title" className="font-medium">
          Responsables actuales
        </h2>
        {state?.responsibles.length ? (
          <ul className="divide-y rounded-md border">
            {state.responsibles.map((user) => (
              <li
                key={user.userId}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="font-medium">{user.username}</span>
                <span className="text-muted-foreground">{user.email}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavía no hay responsables asignados.
          </p>
        )}
      </section>

      {canConfigure ? (
        <section
          className="space-y-3"
          aria-labelledby="add-hr-responsible-title"
        >
          <h2 id="add-hr-responsible-title" className="font-medium">
            Agregar responsable
          </h2>
          {state?.availableUsers.length ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="hr-responsible-user">
                Usuario ERP
              </label>
              <select
                id="hr-responsible-user"
                className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                <option value="" disabled>
                  Seleccioná una persona
                </option>
                {state.availableUsers.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.username} · {user.email}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                disabled={assignMutation.isPending}
                onClick={() => {
                  if (selectedUserId) {
                    void assignMutation.mutateAsync({
                      targetCompanyId: companyId,
                      userId: selectedUserId,
                    });
                    setSelectedUserId('');
                  }
                }}
              >
                {assignMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Asignar responsable
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay otros usuarios ERP de esta compañía para asignar.
            </p>
          )}
          {assignMutation.isError ? (
            <p role="alert" className="text-sm text-destructive">
              No se pudo asignar el responsable.
            </p>
          ) : null}
        </section>
      ) : null}

      {canConfigure ? (
        <section
          className="space-y-4 border-t pt-6"
          aria-labelledby="invite-hr-responsible-title"
        >
          <div className="flex items-start gap-3">
            <Mail
              className="mt-0.5 size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <h2 id="invite-hr-responsible-title" className="font-medium">
                Invitar responsable por correo
              </h2>
              <p className="text-sm text-muted-foreground">
                La persona recibirá un enlace para crear o reutilizar su cuenta
                y aceptar el rol de responsable de RRHH.
              </p>
            </div>
          </div>
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              setInviteMessage(null);
              void inviteMutation
                .mutateAsync({ targetCompanyId: companyId, inviteeEmail })
                .then((invitation) => {
                  setInviteeEmail('');
                  setInviteMessage(
                    invitation.delivery?.status === 'sent'
                      ? 'Invitación enviada. La lista se actualizó.'
                      : 'Invitación creada. Revisá la configuración de correo para confirmar la entrega.',
                  );
                })
                .catch(() => undefined);
            }}
          >
            <label className="sr-only" htmlFor="hr-responsible-email">
              Correo electrónico
            </label>
            <input
              id="hr-responsible-email"
              className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
              type="email"
              required
              value={inviteeEmail}
              onChange={(event) => setInviteeEmail(event.target.value)}
              placeholder="persona@ejemplo.com"
            />
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Enviar invitación
            </Button>
          </form>
          {inviteMessage ? (
            <p role="status" className="text-sm text-emerald-700">
              {inviteMessage}
            </p>
          ) : null}
          {inviteMutation.isError ? (
            <p role="alert" className="text-sm text-destructive">
              No se pudo enviar la invitación. Verificá el correo y que no
              exista una invitación activa.
            </p>
          ) : null}
          {state?.pendingInvitations?.length ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Invitaciones pendientes</h3>
              <ul className="divide-y rounded-md border text-sm">
                {state.pendingInvitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="px-4 py-3 text-muted-foreground"
                  >
                    {invitation.inviteeEmail}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
};
