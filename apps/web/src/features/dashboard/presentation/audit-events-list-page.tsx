import { Link, useSearchParams } from 'react-router-dom';
import { FileClock } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import type { AuditEventListFilters } from '../domain/audit-events';
import { AdminEmptyState } from './admin-empty-state';
import { AdminWorkspaceNav } from './admin-workspace-nav';
import { useAuditEventsWorkspace } from './use-admin-observability';

const readFilters = (searchParams: URLSearchParams): AuditEventListFilters => ({
  type: searchParams.get('type') ?? undefined,
  companyId: searchParams.get('companyId') ?? undefined,
  correlationId: searchParams.get('correlationId') ?? undefined,
  cursor: searchParams.get('cursor') ?? undefined,
});

export const AuditEventsListPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const [searchParams] = useSearchParams();
  const { listQuery } = useAuditEventsWorkspace({
    apiBaseUrl,
    isPlatformAdmin: true,
    filters: readFilters(searchParams),
  });

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-primary">Observabilidad</p>
        <h1 className="text-3xl font-semibold tracking-tight">Eventos de auditoría</h1>
        <p className="mt-1 text-muted-foreground">Trazabilidad de acciones con contexto de empresa y entidad.</p>
      </header>
      <AdminWorkspaceNav />

      {listQuery.isLoading ? <p className="text-sm text-muted-foreground">Cargando eventos...</p> : null}

      {listQuery.data && listQuery.data.items.length === 0 ? (
        <AdminEmptyState
          title="No hay eventos de auditoría"
          message="No hay eventos que coincidan con los filtros actuales."
        />
      ) : null}

      {listQuery.data && listQuery.data.items.length > 0 ? (
        <ul className="grid gap-3">
          {listQuery.data.items.map((event) => (
            <li key={event.id}>
              <Card className="transition-colors hover:border-primary/40">
                <CardHeader className="flex flex-row items-start gap-3 pb-3"><FileClock className="mt-0.5 size-5 text-muted-foreground" /><div><CardTitle className="text-base">{event.type}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Entidad: {event.entityType ?? 'No disponible'}</p></div></CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-0 text-xs text-muted-foreground"><span>Empresa: {event.companyId}</span><Link className="font-medium text-primary hover:underline" to={`/dashboard/admin/audit-events/${event.id}`}>Ver evento</Link></CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
};
