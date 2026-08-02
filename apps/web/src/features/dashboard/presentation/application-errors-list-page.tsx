import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

import { Badge } from '../../../shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import type { ApplicationErrorListFilters } from '../domain/application-errors';
import { AdminEmptyState } from './admin-empty-state';
import { AdminWorkspaceNav } from './admin-workspace-nav';
import { useApplicationErrorsWorkspace } from './use-admin-observability';

const readFilters = (searchParams: URLSearchParams): ApplicationErrorListFilters => ({
  fingerprint: searchParams.get('fingerprint') ?? undefined,
  correlationId: searchParams.get('correlationId') ?? undefined,
  cursor: searchParams.get('cursor') ?? undefined,
});

export const ApplicationErrorsListPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const [searchParams] = useSearchParams();
  const { listQuery } = useApplicationErrorsWorkspace({
    apiBaseUrl,
    isPlatformAdmin: true,
    filters: readFilters(searchParams),
  });

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-primary">Observabilidad</p>
        <h1 className="text-3xl font-semibold tracking-tight">Errores de aplicación</h1>
        <p className="mt-1 text-muted-foreground">Fallos técnicos sanitizados para investigar incidentes sin exponer datos sensibles.</p>
      </header>
      <AdminWorkspaceNav />

      {listQuery.isLoading ? <p className="text-sm text-muted-foreground">Cargando errores...</p> : null}

      {listQuery.data && listQuery.data.items.length === 0 ? (
        <AdminEmptyState
          title="No hay errores registrados"
          message="No hay errores que coincidan con los filtros actuales."
        />
      ) : null}

      {listQuery.data && listQuery.data.items.length > 0 ? (
        <ul className="grid gap-3">
          {listQuery.data.items.map((error) => (
            <li key={error.id}>
              <Card className="transition-colors hover:border-destructive/40">
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                  <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5 text-destructive" /><div><CardTitle className="text-base">{error.code}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{error.message}</p></div></div>
                  <Badge variant="destructive">{error.status}</Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-0 text-xs text-muted-foreground"><span>Correlación: {error.correlationId}</span><Link className="font-medium text-primary hover:underline" to={`/dashboard/admin/application-errors/${error.id}`}>Ver error</Link></CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
};
