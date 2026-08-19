import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  Clock3,
  XCircle,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { Badge } from '../../../shared/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../../shared/ui/breadcrumb';
import type { ProvisioningRunListFilters } from '../domain/provisioning-runs';
import { AdminEmptyState } from './admin-empty-state';
import { AdminWorkspaceNav } from './admin-workspace-nav';
import { useProvisioningRunsWorkspace } from './use-admin-observability';

const DEFAULT_PAGE_SIZE = 10;

const readPageSize = (searchParams: URLSearchParams) => {
  const pageSize = Number(searchParams.get('limit') ?? DEFAULT_PAGE_SIZE);

  return Number.isInteger(pageSize) && pageSize > 0 && pageSize <= 50
    ? pageSize
    : DEFAULT_PAGE_SIZE;
};

const readFilters = (
  searchParams: URLSearchParams,
): ProvisioningRunListFilters => ({
  status:
    (searchParams.get('status') as
      ProvisioningRunListFilters['status'] | null) ?? undefined,
  correlationId: searchParams.get('correlationId') ?? undefined,
  cursor: searchParams.get('cursor') ?? undefined,
  limit: readPageSize(searchParams),
});

const getFriendlyErrorSummary = (summary: string | null) => {
  if (!summary) {
    return 'No se pudo completar el registro.';
  }

  if (/duplicate legal identifier/i.test(summary)) {
    return 'La identificación legal ya está registrada.';
  }

  return summary;
};

const getRunSummary = (
  status: ProvisioningRunListFilters['status'],
  errorSummary: string | null,
) => {
  switch (status) {
    case 'succeeded':
      return 'Sin incidencias';
    case 'failed':
      return getFriendlyErrorSummary(errorSummary);
    case 'running':
      return 'Procesando el registro...';
    case 'incomplete':
      return 'El proceso se interrumpió antes de finalizar.';
    default:
      return getFriendlyErrorSummary(errorSummary);
  }
};

const shortenIdentifier = (value: string) =>
  value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;

export const ProvisioningRunsListPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const [searchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const { listQuery } = useProvisioningRunsWorkspace({
    apiBaseUrl,
    isPlatformAdmin: true,
    filters,
  });
  const currentCursor = searchParams.get('cursor');
  const nextCursor = listQuery.data?.nextCursor;
  const nextPageSearchParams = new URLSearchParams(searchParams);
  if (nextCursor) {
    nextPageSearchParams.set('cursor', nextCursor);
  }
  const nextPageHref = nextCursor
    ? `/dashboard/admin/provisioning-runs?${nextPageSearchParams.toString()}`
    : null;
  const firstPageSearchParams = new URLSearchParams(searchParams);
  firstPageSearchParams.delete('cursor');
  const firstPageHref = `/dashboard/admin/provisioning-runs${
    firstPageSearchParams.toString()
      ? `?${firstPageSearchParams.toString()}`
      : ''
  }`;

  return (
    <main className="mx-auto flex max-w-6xl p-4 flex-col gap-6">
      <header>
        <h1 className="text-3xl font-medium tracking-tight">
          Historial de creación de empresas
        </h1>
        <Breadcrumb className="mt-1">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  className="text-gray-500 text-xs hover:text-gray-700 transition-all ease-in-out duration-300"
                  to="/dashboard"
                >
                  Inicio
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-gray-500 text-xs" />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  className="text-gray-500 text-xs hover:text-gray-700 transition-all ease-in-out duration-300"
                  to="/dashboard/admin/companies"
                >
                  Observabilidad
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-gray-800 text-xs">
                Empresas registradas
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <AdminWorkspaceNav />

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando empresas...</p>
      ) : null}

      {listQuery.data ? (
        <section className="overflow-hidden rounded-xl border bg-card">
          {listQuery.data.items.length > 0 ? (
            <>
              <div className="grid grid-cols-5 border-b bg-muted/20 px-4 py-3 text-xs font-medium uppercase tracking-wide">
                <span>Empresa</span>
                <span>Resumen</span>
                <span>Correlación</span>
                <span className="mr-8 text-right">Estado</span>
                <span className="mr-4 text-right">Acción</span>
              </div>

              <ul>
                {listQuery.data.items.map((run) => (
                  <li
                    key={run.id}
                    className="grid grid-cols-5 items-center border-b p-4 transition-colors last:border-b-0 hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                          Empresa
                        </p>
                        <p className="text-sm font-medium">
                          {run.companyName ?? 'Nombre no disponible'}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                        Resumen
                      </p>
                      <p
                        className="text-xs text-gray-600"
                        title={getRunSummary(run.status, run.errorSummary)}
                      >
                        {getRunSummary(run.status, run.errorSummary)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                        Correlación
                      </p>
                      <p
                        className="text-xs text-gray-600"
                        title={run.correlationId}
                      >
                        {shortenIdentifier(run.correlationId)}
                      </p>
                    </div>

                    <div className="md:justify-self-end">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                        Estado
                      </p>
                      <Badge
                        variant={
                          run.status === 'failed' ? 'destructive' : 'secondary'
                        }
                        className="rounded-full bg-black py-1 text-white"
                      >
                        {run.status === 'succeeded' ? (
                          <CheckCheck className="size-4" />
                        ) : run.status === 'failed' ? (
                          <XCircle className="size-3" />
                        ) : (
                          <Clock3 className="size-3" />
                        )}
                        {run.status === 'succeeded'
                          ? 'Completado'
                          : run.status === 'failed'
                            ? 'Fallido'
                            : run.status === 'running'
                              ? 'En ejecución'
                              : 'Interrumpido'}
                      </Badge>
                    </div>

                    <div className="md:justify-self-end">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                        Acción
                      </p>
                      <Link
                        className="py-0.5 text-xs text-gray-600 transition-all duration-300 ease-in-out hover:border-b hover:border-b-black hover:text-black"
                        to={`/dashboard/admin/provisioning-runs/${run.id}`}
                      >
                        Ver detalles
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="p-4">
              <AdminEmptyState
                title="No hay empresas registradas"
                message="No hay registros que coincidan con los filtros actuales."
              />
            </div>
          )}

          <footer className="flex min-h-16 flex-wrap items-center justify-between gap-4 border-t bg-muted/10 px-4 py-3 text-xs sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Mostrando{' '}
                <strong className="font-semibold text-foreground">
                  {listQuery.data.items.length}
                </strong>{' '}
                {listQuery.data.items.length === 1 ? 'registro' : 'registros'}
              </span>
              <span aria-hidden className="h-4 w-px bg-border" />
              <span>Filas por página</span>
              <strong className="font-semibold text-foreground">
                {filters.limit}
              </strong>
            </div>
            <nav
              aria-label="Paginación de empresas"
              className="flex items-center gap-1"
            >
              <Link
                aria-disabled={!currentCursor}
                aria-label="Ir a la primera página"
                className={`inline-flex size-8 items-center justify-center rounded-md transition-colors ${
                  currentCursor
                    ? 'text-foreground hover:bg-muted hover:text-primary'
                    : 'pointer-events-none text-muted-foreground/40'
                }`}
                to={firstPageHref}
              >
                <ChevronsLeft className="size-4" />
              </Link>
              <Link
                aria-disabled={!currentCursor}
                aria-label="Volver al inicio"
                className={`inline-flex size-8 items-center justify-center rounded-md transition-colors ${
                  currentCursor
                    ? 'text-foreground hover:bg-muted hover:text-primary'
                    : 'pointer-events-none text-muted-foreground/40'
                }`}
                to={firstPageHref}
              >
                <ChevronLeft className="size-4" />
              </Link>
              <span className="mx-1 h-5 w-px bg-border" />
              {nextPageHref ? (
                <Link
                  aria-label="Ver más empresas"
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
                  to={nextPageHref}
                >
                  Siguiente
                  <ChevronRight className="size-4" />
                </Link>
              ) : (
                <span className="px-2 text-muted-foreground/60">
                  Última página
                </span>
              )}
            </nav>
          </footer>
        </section>
      ) : null}
    </main>
  );
};
