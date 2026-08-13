import type {
  NodeResponsibilityRecord,
  NodeResponsibilitySummary,
  PendingNodeManagementInvitation,
} from '../domain/node-management';

const formatInvitationDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
};

export const buildNodeResponsibilitySummary = ({
  activeResponsibility,
  pendingInvitation,
}: {
  activeResponsibility?: NodeResponsibilityRecord | null;
  pendingInvitation?: PendingNodeManagementInvitation | null;
}): NodeResponsibilitySummary => {
  if (activeResponsibility) {
    return {
      status: 'active',
      badgeLabel: 'Responsable activo',
      detail: `${activeResponsibility.responsibleUsername} · ${activeResponsibility.responsibleUserEmail}`,
    };
  }

  if (pendingInvitation) {
    const expiresAt = formatInvitationDate(pendingInvitation.expiresAt);

    return {
      status: 'pending',
      badgeLabel: 'Invitacion pendiente',
      detail: expiresAt
        ? `${pendingInvitation.inviteeEmail} · vence ${expiresAt}`
        : pendingInvitation.inviteeEmail,
    };
  }

  return {
    status: 'empty',
    badgeLabel: 'Sin responsable',
    detail: 'Todavia no hay una persona asignada.',
  };
};

export const getNodeResponsibilityBadgeClassName = (
  status: NodeResponsibilitySummary['status'],
) => {
  switch (status) {
    case 'active':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'empty':
      return 'border-zinc-200 bg-zinc-50 text-zinc-600';
  }
};
