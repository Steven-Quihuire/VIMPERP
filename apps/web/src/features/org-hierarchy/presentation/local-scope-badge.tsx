import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import type { AuthSession } from '../../auth/domain/auth';
import { useLocals } from '../application/org-hierarchy-queries';

type LocalScopeBadgeProps = {
  session: AuthSession;
  apiBaseUrl?: string;
};

export const LocalScopeBadge = ({
  session,
  apiBaseUrl,
}: LocalScopeBadgeProps) => {
  const companyId = session.activeCompany?.companyId;
  const localsQuery = useLocals(companyId, apiBaseUrl);
  const locals = localsQuery.data ?? [];

  const activeLocal =
    session.activeLocalId !== null
      ? (locals.find((local) => local.id === session.activeLocalId) ?? null)
      : null;

  if (localsQuery.isLoading) {
    return <Skeleton className="h-5 w-24" />;
  }

  return (
    <Badge variant={activeLocal ? 'outline' : 'secondary'}>
      {activeLocal ? activeLocal.name : 'Toda la empresa'}
    </Badge>
  );
};
