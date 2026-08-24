import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/presentation/use-auth';
import { HttpError } from '@/shared/lib/http/http-client';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';

import { useHrResponsibilityInvitation } from '../application/hr-responsibility-queries';

export const AcceptHrResponsibilityInvitationPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const auth = useAuth(apiBaseUrl);
  const { invitationQuery, acceptMutation } = useHrResponsibilityInvitation(
    token,
    apiBaseUrl,
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const invitation = invitationQuery.data;
  const message = (value: unknown) =>
    value instanceof HttpError || value instanceof Error
      ? value.message
      : 'No se pudo procesar la invitación.';

  if (invitationQuery.isLoading)
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-5 animate-spin" />
      </main>
    );
  if (!invitation || invitationQuery.isError)
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Invitación no disponible</CardTitle>
            <CardDescription>{message(invitationQuery.error)}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );

  const requiresPassword = !invitation.userExists;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
            <ShieldCheck className="size-5" />
          </div>
          <CardTitle>Activar responsabilidad de RRHH</CardTitle>
          <CardDescription>
            Te invitaron a gestionar Recursos Humanos en{' '}
            {invitation.companyName}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Correo invitado: {invitation.inviteeEmail}
          </p>
          {requiresPassword ? (
            <>
              <Input
                aria-label="Contraseña"
                type="password"
                minLength={8}
                placeholder="Contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Input
                aria-label="Confirmar contraseña"
                type="password"
                minLength={8}
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            className="w-full"
            disabled={acceptMutation.isPending}
            onClick={() => {
              if (!token) return setError('Falta el token de invitación.');
              if (
                requiresPassword &&
                (password.length < 8 || password !== confirmPassword)
              )
                return setError(
                  password !== confirmPassword
                    ? 'Las contraseñas no coinciden.'
                    : 'La contraseña debe tener al menos 8 caracteres.',
                );
              void acceptMutation
                .mutateAsync({
                  invitationToken: token,
                  ...(requiresPassword ? { password } : {}),
                })
                .then(async () => {
                  await auth.refetch();
                  void navigate('/dashboard/hr/responsibility', { replace: true });
                })
                .catch((reason) => setError(message(reason)));
            }}
          >
            {acceptMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Aceptar responsabilidad HR
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};
