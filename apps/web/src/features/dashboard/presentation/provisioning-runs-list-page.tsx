import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';

import { Badge } from '../../../shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import type { ProvisioningRunListFilters } from '../domain/provisioning-runs';
import { AdminEmptyState } from './admin-empty-state';
import { AdminWorkspaceNav } from './admin-workspace-nav';
import { useProvisioningRunsWorkspace } from './use-admin-observability';

const readFilters = (searchParams: URLSearchParams): ProvisioningRunListFilters => ({
  status:
    (searchParams.get('status') as ProvisioningRunListFilters['status'] | null) ??
    undefined,
  correlationId: searchParams.get('correlationId') ?? undefined,
  cursor: searchParams.get('cursor') ?? undefined,
});

export const ProvisioningRunsListPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const [searchParams] = useSearchParams();
  const { listQuery } = useProvisioningRunsWorkspace({
    apiBaseUrl,
    isPlatformAdmin: true,
    filters: readFilters(searchParams),
  });

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-primary">Observabilidad</p>
        <h1 className="text-3xl font-semibold tracking-tight">Procesos de alta</h1>
        <p className="mt-1 text-muted-foreground">Historial de altas de empresas y resultado de cada paso.</p>
      </header>
      <AdminWorkspaceNav />

      {listQuery.isLoading ? <p className="text-sm text-muted-foreground">Cargando procesos de alta...</p> : null}

      {listQuery.data && listQuery.data.items.length === 0 ? (
        <AdminEmptyState
          title="No hay procesos de alta"
          message="No hay procesos que coincidan con los filtros actuales."
        />
      ) : null}

      {listQuery.data && listQuery.data.items.length > 0 ? (
        <ul className="grid gap-3">
          {listQuery.data.items.map((run) => (
            <li key={run.id}>
              <Card className="transition-colors hover:border-primary/40">
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                  <div>
                    <CardTitle className="text-base">{run.process}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{run.errorSummary ?? 'Proceso completado sin errores.'}</p>
                  </div>
                  <Badge variant={run.status === 'failed' ? 'destructive' : 'secondary'} className="gap-1">
                    {run.status === 'succeeded' ? <CheckCircle2 className="size-3" /> : run.status === 'failed' ? <XCircle className="size-3" /> : <Clock3 className="size-3" />}
                    {run.status === 'succeeded' ? 'Completado' : run.status === 'failed' ? 'Fallido' : run.status}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-0 text-xs text-muted-foreground">
                  <span>Correlación: {run.correlationId}</span>
                  <Link className="font-medium text-primary hover:underline" to={`/dashboard/admin/provisioning-runs/${run.id}`}>
                    Ver proceso
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
};
