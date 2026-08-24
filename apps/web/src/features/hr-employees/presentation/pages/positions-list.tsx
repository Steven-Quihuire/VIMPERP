import type { AuthSession } from '@/features/auth/domain/auth';
import {
  ChevronLeft,
  ChevronsLeft,
  BriefcaseBusiness,
  CircleAlert,
  Download,
  Search,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { Position } from '../../domain/positions';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import { TablePageSize } from '@/shared/ui/table-page-size';
import { defaultPageSizeOptions } from '@/shared/ui/table-page-size-options';
import { HoverExpandFab } from '@/shared/ui/hover-expand-fab';

import { usePositions } from '../../application/hr-employees-queries';
import { PositionDetailDrawer } from '../components/position-detail-drawer';
import { PositionFilters } from '../components/position-filters';
import type { PositionFiltersValue } from '../components/position-filters';
import { PositionRowActions } from '../components/position-row-actions';
import { PositionFormPage } from './position-form';

const emptyFilters: PositionFiltersValue = { active: new Set() };

export const PositionsListPage = ({
  session,
  apiBaseUrl,
  selectedPositionId,
  onSelectPosition,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
  selectedPositionId?: string | null;
  onSelectPosition?: (positionId: string) => void;
}) => {
  const companyId = session.activeCompany?.companyId;
  const positionsQuery = usePositions(companyId, apiBaseUrl);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [filters, setFilters] = useState<PositionFiltersValue>(emptyFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailPositionId, setDetailPositionId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const filteredPositions = useMemo(
    () =>
      (positionsQuery.data ?? []).filter((position) => {
        if (filters.active.size > 0) {
          if (filters.active.has('active') && !position.isActive) return false;
          if (filters.active.has('inactive') && position.isActive) return false;
        }
        if (debouncedSearch) {
          const query = debouncedSearch.toLowerCase();
          if (
            !position.name.toLowerCase().includes(query) &&
            !position.id.toLowerCase().includes(query)
          ) {
            return false;
          }
        }
        return true;
      }),
    [positionsQuery.data, filters, debouncedSearch],
  );

  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleccioná una compañía activa para consultar los puestos.
      </p>
    );
  }

  if (positionsQuery.isLoading) {
    return (
      <div className="space-y-3" aria-label="Cargando puestos">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="h-14 w-full animate-pulse rounded-xl bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (positionsQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {positionsQuery.error instanceof Error
          ? positionsQuery.error.message
          : 'No se pudieron cargar los puestos.'}
      </p>
    );
  }

  const allPositions = positionsQuery.data ?? [];
  const totalPositions = filteredPositions.length;
  const totalPages = Math.max(1, Math.ceil(totalPositions / pageSize));
  const positions = filteredPositions.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const detailPosition = allPositions.find(
    (position) => position.id === detailPositionId,
  );

  const allOnPageSelected =
    positions.length > 0 && positions.every((position) => selectedIds.has(position.id));

  const toggleId = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(positions.map((position) => position.id)));
  };

  const exportCsv = () => {
    const rows = [...selectedIds]
      .map((id) => allPositions.find((position) => position.id === id))
      .filter((position): position is Position => Boolean(position));
    const header = 'nombre,dotacion,ocupadas,vacantes,estado\n';
    const body = rows
      .map((position) =>
        [
          position.name,
          position.headcount,
          position.occupiedHeadcount,
          position.remainingVacancies,
          position.isActive ? 'activo' : 'inactivo',
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    const blob = new Blob([`${header}${body}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'puestos.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo exportado', {
      description: `${rows.length} puestos en puestos.csv`,
    });
  };

  return (
    <section className="space-y-6">
      <div className="mt-0 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-xl font-medium tracking-tight">Gestionar puestos</h2>
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="h-10 w-full border px-4 rounded-2xl justify-start flex items-center">
              <Search size={18} color="#000" />
              <Input
                aria-label="Buscar puestos"
                className="h-10 placeholder:truncate placeholder:text-xs border-none text-sm focus-visible:border-none focus-visible:outline-none"
                placeholder="Buscar por nombre o id"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <PositionFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
            onClear={() => {
              setFilters(emptyFilters);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent
          hideCloseButton
          className="gap-0 overflow-hidden border-0 p-0 sm:max-w-4xl"
        >
          <DialogTitle className="sr-only">Agregar puesto</DialogTitle>
          <div className="grid sm:grid-cols-[2fr_3fr]">
            <div className="relative hidden overflow-hidden sm:block">
              <img
                src="/bg__positions-bw.svg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="max-h-[90vh] overflow-y-auto">
              <PositionFormPage
                key={isCreateOpen ? 'open' : 'closed'}
                session={session}
                {...(apiBaseUrl ? { apiBaseUrl } : {})}
                onCreated={(positionId) => {
                  setIsCreateOpen(false);
                  onSelectPosition?.(positionId);
                  setPage(1);
                }}
                onCancel={() => setIsCreateOpen(false)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {totalPositions === 0 && !debouncedSearch && filters.active.size === 0 ? (
        <div className="border-t px-5 py-12 text-center">
          <Users className="mx-auto size-8 text-muted-foreground/50" />
          <h2 className="text-xl font-medium tracking-tight">
            Todavía no se crearon puestos
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            Creá el primer puesto con el botón “Asignar puesto”.
          </p>
        </div>
      ) : positions.length === 0 ? (
        <div className="border-t px-5 py-12 text-center">
          <h2 className="text-xl flex items-center justify-center gap-2 font-medium tracking-tight">
            <CircleAlert size={18} color="#000" /> No encontramos puestos
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            Probá con otro nombre o cambiá los filtros.
          </p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader className="bg-[#f6f6f6] rounded-2xl">
              <TableRow>
                <TableHead className="h-11 w-10 pl-5">
                  <Checkbox
                    aria-label="Seleccionar página"
                    checked={allOnPageSelected}
                    onCheckedChange={toggleAllOnPage}
                  />
                </TableHead>
                <TableHead className="h-11 text-xs">Puesto</TableHead>
                <TableHead className="h-11 text-xs">Dotación</TableHead>
                <TableHead className="h-11 text-xs">Ocupadas</TableHead>
                <TableHead className="h-11 text-xs">Vacantes</TableHead>
                <TableHead className="h-11 text-xs">Estado</TableHead>
                <TableHead className="h-11 pr-5 text-right text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => (
                <TableRow
                  key={position.id}
                  data-state={
                    selectedPositionId === position.id ? 'selected' : undefined
                  }
                  className="group"
                >
                  <TableCell className="pl-5">
                    <Checkbox
                      aria-label={`Seleccionar ${position.name}`}
                      checked={selectedIds.has(position.id)}
                      onCheckedChange={() => toggleId(position.id)}
                    />
                  </TableCell>
                  <TableCell className="py-4 pl-5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {position.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{position.name}</div>
                        <div className="truncate text-xs text-gray-600">
                          {position.id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {position.headcount}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {position.occupiedHeadcount}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {position.remainingVacancies}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        position.isActive
                          ? 'rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'rounded-2xl border-gray-200 bg-gray-50 text-gray-600'
                      }
                    >
                      {position.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <PositionRowActions
                      position={position}
                      onView={(positionId) => {
                        setDetailPositionId(positionId);
                        onSelectPosition?.(positionId);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <footer className="flex min-h-16 flex-wrap items-center justify-between gap-4 border-t bg-muted/10 px-4 py-3 text-xs sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Mostrando{' '}
                <strong className="font-semibold text-foreground">
                  {positions.length}
                </strong>{' '}
                puestos de{' '}
                <strong className="font-semibold text-foreground">
                  {totalPositions}
                </strong>
              </span>
              <span aria-hidden className="h-4 w-px bg-border" />
              <span>Filas por página</span>
              <TablePageSize
                value={pageSize}
                options={defaultPageSizeOptions}
                onChange={(next) => {
                  setPageSize(next);
                  setPage(1);
                }}
              />
            </div>
            <nav
              aria-label="Paginación de puestos"
              className="flex items-center gap-1"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Ir a la primera página"
                disabled={page === 1 || positionsQuery.isFetching}
                onClick={() => setPage(1)}
                className="size-8 rounded-md"
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Volver al inicio"
                disabled={page === 1 || positionsQuery.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="size-8 rounded-md"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="mx-1 h-5 w-px bg-border" />
              {page < totalPages ? (
                <Button
                  type="button"
                  variant="ghost"
                  aria-label="Ver más puestos"
                  disabled={positionsQuery.isFetching}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  className="inline-flex text-xs cursor-pointer h-8 items-center gap-1 rounded-md px-2 font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
                >
                  Siguiente
                </Button>
              ) : (
                <span className="px-2 text-muted-foreground/60">
                  Última página
                </span>
              )}
            </nav>
          </footer>
        </>
      )}

      {selectedIds.size > 0 ? (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-xl">
            <span className="text-sm font-medium">
              {selectedIds.size} seleccionados
            </span>
            <span aria-hidden className="h-5 w-px bg-border" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-2xl"
              onClick={exportCsv}
            >
              <Download className="size-4" />
              Exportar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-2xl"
              onClick={() => setSelectedIds(new Set())}
            >
              Limpiar
            </Button>
          </div>
        </div>
      ) : null}

      <HoverExpandFab
        label="Asignar puesto"
        icon={<BriefcaseBusiness className="size-6" />}
        ariaLabel="Nuevo puesto"
        onClick={() => setIsCreateOpen(true)}
      />

      {detailPosition ? (
        <PositionDetailDrawer
          position={detailPosition}
          positions={allPositions}
          open={detailPositionId !== null}
          onOpenChange={(open) => {
            if (!open) setDetailPositionId(null);
          }}
        />
      ) : null}
    </section>
  );
};
