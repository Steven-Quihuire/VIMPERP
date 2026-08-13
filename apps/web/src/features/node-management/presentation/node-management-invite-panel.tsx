import { useMemo, useState } from 'react';
import { Loader2, MailPlus } from 'lucide-react';
import { sileo } from 'sileo';

import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

import { useCreateNodeManagementInvitation } from '../application/node-management-queries';
import type {
  NodeManagementScopeType,
  NodeResponsibilitySummary,
} from '../domain/node-management';

type InviteTarget = {
  scopeType: NodeManagementScopeType;
  scopeId: string;
  scopeName: string;
  responsibility: NodeResponsibilitySummary;
};

const scopeLabels: Record<NodeManagementScopeType, string> = {
  company: 'Empresa',
  division: 'División',
  local: 'Local',
  area: 'Área',
  warehouse: 'Almacén',
  'point-of-sale': 'Punto de venta',
};

const buildInvitationLink = (token: string) => {
  if (typeof window === 'undefined') {
    return `/accept-invitation/${token}`;
  }

  return `${window.location.origin}/accept-invitation/${token}`;
};

export const NodeManagementInvitePanel = ({
  companyId,
  companyName,
  targets,
}: {
  companyId: string;
  companyName: string;
  targets: InviteTarget[];
}) => {
  const inviteMutation = useCreateNodeManagementInvitation();
  const [scopeKey, setScopeKey] = useState(() => {
    const firstTarget = targets[0];
    return firstTarget ? `${firstTarget.scopeType}:${firstTarget.scopeId}` : '';
  });
  const [email, setEmail] = useState('');
  const [linkPreview, setLinkPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedTarget = useMemo(
    () =>
      targets.find((target) => `${target.scopeType}:${target.scopeId}` === scopeKey) ??
      targets[0] ??
      null,
    [scopeKey, targets],
  );

  const handleInvite = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!selectedTarget) {
      setFormError('No hay nodos disponibles para invitar.');
      return;
    }

    if (!trimmedEmail) {
      setFormError('El correo es obligatorio.');
      return;
    }

    try {
      const invitation = await inviteMutation.mutateAsync({
        companyId,
        scopeType: selectedTarget.scopeType,
        scopeId: selectedTarget.scopeId,
        inviteeEmail: trimmedEmail,
      });
      const nextLink = buildInvitationLink(invitation.invitationToken);
      setLinkPreview(nextLink);
      setEmail('');
      setFormError(null);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(nextLink);
      }
      sileo.success({
        title: 'Invitación creada',
        description: `Se generó acceso para ${invitation.inviteeEmail}.`,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo crear la invitación.');
    }
  };

  return (
    <Card className="border-border/70 bg-background/95 shadow-sm">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MailPlus className="size-4" />
          Invitar responsable
        </CardTitle>
        <CardDescription>
          Generá un acceso por correo para asignar responsable sobre un nodo de {companyName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field>
          <FieldLabel htmlFor="invite-target">Nodo</FieldLabel>
          <FieldContent>
            <select
              id="invite-target"
              aria-label="Nodo a invitar"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={scopeKey}
              onChange={(event) => {
                setScopeKey(event.target.value);
                setFormError(null);
              }}
              disabled={inviteMutation.isPending || targets.length === 0}
            >
              {targets.map((target) => {
                const key = `${target.scopeType}:${target.scopeId}`;
                return (
                  <option key={key} value={key}>
                    {scopeLabels[target.scopeType]} · {target.scopeName}
                  </option>
                );
              })}
            </select>
          </FieldContent>
          {selectedTarget ? (
            <FieldDescription>
              Estado actual: {selectedTarget.responsibility.badgeLabel.toLowerCase()}.
            </FieldDescription>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="invite-email">Correo</FieldLabel>
          <FieldContent>
            <Input
              id="invite-email"
              aria-label="Correo del responsable"
              type="email"
              autoComplete="email"
              value={email}
              disabled={inviteMutation.isPending}
              onChange={(event) => {
                setEmail(event.target.value);
                setFormError(null);
              }}
              placeholder="responsable@empresa.com"
            />
          </FieldContent>
        </Field>

        {linkPreview ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <p className="font-medium">Link generado</p>
            <p className="mt-1 break-all">{linkPreview}</p>
          </div>
        ) : null}

        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <Button
          type="button"
          className="w-full"
          disabled={inviteMutation.isPending || !selectedTarget}
          onClick={() => void handleInvite()}
        >
          {inviteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Crear invitación
        </Button>
      </CardContent>
    </Card>
  );
};
