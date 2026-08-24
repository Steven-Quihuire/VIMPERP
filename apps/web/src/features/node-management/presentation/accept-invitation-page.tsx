import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { HttpError } from '@/shared/lib/http/http-client';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

import {
  useAcceptNodeManagementInvitation,
  useNodeManagementInvitation,
} from '../application/node-management-queries';
import { useAuth } from '../../auth/presentation/use-auth';

const scopeLabels: Record<string, string> = {
  company: 'Empresa',
  division: 'División',
  local: 'Local',
  area: 'Área',
  warehouse: 'Almacén',
  'point-of-sale': 'Punto de venta',
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof HttpError || error instanceof Error) {
    return error.message;
  }

  return 'No se pudo procesar la invitación.';
};

export const AcceptInvitationPage = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const auth = useAuth(apiBaseUrl);
  const invitationQuery = useNodeManagementInvitation(token, apiBaseUrl);
  const acceptMutation = useAcceptNodeManagementInvitation(apiBaseUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const invitation = invitationQuery.data;
  const requiresPassword = invitation ? !invitation.userExists : false;

  const handleAccept = async () => {
    if (!token) {
      setFormError('Falta el token de invitación.');
      return;
    }

    if (requiresPassword) {
      if (password.length < 8) {
        setFormError('La contraseña debe tener al menos 8 caracteres.');
        return;
      }

      if (password !== confirmPassword) {
        setFormError('Las contraseñas no coinciden.');
        return;
      }
    }

    try {
      await acceptMutation.mutateAsync(
        requiresPassword ? { token, password } : { token },
      );
      const nextSession = await auth.refetch();
      if (nextSession.data?.activeCompany) {
        void navigate('/dashboard/organization', { replace: true });
        return;
      }

      void navigate('/dashboard', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  if (invitationQuery.isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando invitación...
        </div>
      </main>
    );
  }

  if (invitationQuery.isError || !invitation) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Invitación no disponible</CardTitle>
            <CardDescription>
              {getErrorMessage(invitationQuery.error)}
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <Card className="w-full max-w-2xl border-border/70 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
            <ShieldCheck className="size-5" />
          </div>
          <CardTitle role="heading" aria-level={1}>Aceptar invitación</CardTitle>
          <CardDescription>
            Vas a obtener acceso como responsable sobre un nodo operativo dentro de {invitation.companyName}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Empresa</p>
              <p className="mt-1 text-sm font-medium">{invitation.companyName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Alcance</p>
              <p className="mt-1 text-sm font-medium">
                {scopeLabels[invitation.scopeType] ?? invitation.scopeType} · {invitation.scopeName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Correo invitado</p>
              <p className="mt-1 text-sm font-medium">{invitation.inviteeEmail}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Acceso base</p>
              <p className="mt-1 text-sm font-medium">company-user + node-manager</p>
            </div>
          </div>

          {requiresPassword ? (
            <div className="space-y-4">
              <Field>
                <FieldLabel htmlFor="invitation-password">Contraseña</FieldLabel>
                <FieldContent>
                  <Input
                    id="invitation-password"
                    aria-label="Contraseña para la invitación"
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setFormError(null);
                    }}
                  />
                </FieldContent>
                <FieldDescription>
                  Esta cuenta todavía no existe. Definí una contraseña para activar el acceso.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="invitation-confirm-password">Confirmar contraseña</FieldLabel>
                <FieldContent>
                  <Input
                    id="invitation-confirm-password"
                    aria-label="Confirmar contraseña para la invitación"
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setFormError(null);
                    }}
                  />
                </FieldContent>
              </Field>
            </div>
          ) : (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Ya existe una cuenta para este correo. Al aceptar, se activa el acceso y se inicia sesión automáticamente.
            </p>
          )}

          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <Button
            type="button"
            className="w-full"
            disabled={acceptMutation.isPending || auth.isLoading}
            onClick={() => void handleAccept()}
          >
            {acceptMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Aceptar invitación
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};
