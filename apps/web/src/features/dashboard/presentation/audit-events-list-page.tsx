import { ChevronLeft, ChevronRight, ChevronsLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import type { AuditEventListFilters } from '../domain/audit-events';
import { AdminEmptyState } from './admin-empty-state';
import { AdminWorkspaceNav } from './admin-workspace-nav';
import { useAuditEventsWorkspace } from './use-admin-observability';

const readFilters = (searchParams: URLSearchParams): AuditEventListFilters => ({
  type: searchParams.get('type') ?? undefined,
  companyId: searchParams.get('companyId') ?? undefined,
  correlationId: searchParams.get('correlationId') ?? undefined,
  cursor: searchParams.get('cursor') ?? undefined,
  limit: Number(searchParams.get('limit') ?? 10),
});

const shortenIdentifier = (value: string) =>
  value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;

export const AuditEventsListPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const [searchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const { listQuery } = useAuditEventsWorkspace({
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
    ? `/dashboard/admin/audit-events?${nextPageSearchParams.toString()}`
    : null;
  const firstPageSearchParams = new URLSearchParams(searchParams);
  firstPageSearchParams.delete('cursor');
  const firstPageHref = `/dashboard/admin/audit-events${
    firstPageSearchParams.toString()
      ? `?${firstPageSearchParams.toString()}`
      : ''
  }`;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-medium tracking-tight">
          Eventos de auditoría
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
                Eventos de auditoría
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <AdminWorkspaceNav />

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando eventos...</p>
      ) : null}

      {listQuery.data ? (
        <section className="overflow-hidden rounded-xl border bg-card">
          {listQuery.data.items.length > 0 ? (
            <>
              <div className="grid grid-cols-5 border-b bg-muted/20 px-4 py-3 text-xs font-medium uppercase tracking-wide">
                <span className="ml-6">Evento</span>
                <span>Entidad</span>
                <span className="ml-3">Empresa</span>
                <span>Correlación</span>
                <span className="text-right mr-3">Acción</span>
              </div>

              <ul>
                {listQuery.data.items.map((event) => (
                  <li
                    key={event.id}
                    className="grid grid-cols-5 items-center border-b p-4 transition-colors last:border-b-0 hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                          Evento
                        </p>
                        <p className="text-xs font-semibold" title={event.type}>
                          {event.type}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                        Entidad
                      </p>
                      <p className="truncate text-xs text-gray-600">
                        {event.entityType ?? 'No disponible'}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                        Empresa
                      </p>
                      <p
                        className="truncate text-xs text-gray-600"
                        title={event.companyId}
                      >
                        {shortenIdentifier(event.companyId)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                        Correlación
                      </p>
                      <p
                        className="truncate text-xs text-gray-600"
                        title={event.correlationId ?? 'Sin correlación'}
                      >
                        {event.correlationId
                          ? shortenIdentifier(event.correlationId)
                          : 'Sin correlación'}
                      </p>
                    </div>

                    <div className="md:justify-self-end">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                        Acción
                      </p>
                      <Link
                        className="py-0.5 text-xs text-gray-600 transition-all duration-300 ease-in-out hover:border-b hover:border-b-black hover:text-black"
                        to={`/dashboard/admin/audit-events/${event.id}`}
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
                title="No hay eventos de auditoría"
                message="No hay eventos que coincidan con los filtros actuales."
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
                {listQuery.data.items.length === 1 ? 'evento' : 'eventos'}
              </span>
              <span aria-hidden className="h-4 w-px bg-border" />
              <span>Filas por página</span>
              <strong className="font-semibold text-foreground">
                {filters.limit}
              </strong>
            </div>

            <nav
              aria-label="Paginación de eventos"
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
                  aria-label="Ver más eventos"
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
