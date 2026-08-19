import type { AuthSession } from '@/features/auth/domain/auth';
import { BriefcaseBusiness, Plus, Users } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

import { usePositions } from '../../application/hr-employees-queries';
import type { Position } from '../../domain/positions';
import { PositionDetailDrawer } from '../components/position-detail-drawer';
import { PositionFilters } from '../components/position-filters';
import type { PositionFiltersValue } from '../components/position-filters';
import { PositionRowActions } from '../components/position-row-actions';
import { PositionStatsCards } from '../components/position-stats';
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
  const [filters, setFilters] = useState<PositionFiltersValue>(emptyFilters);
  const [detailPositionId, setDetailPositionId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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

  const positions = (positionsQuery.data ?? []).filter((position) => {
    if (filters.active.size === 0) return true;
    if (filters.active.has('active') && position.isActive) return true;
    if (filters.active.has('inactive') && !position.isActive) return true;
    return false;
  });

  const detailPosition = positionsQuery.data?.find(
    (position) => position.id === detailPositionId,
  );

  return (
    <section className="space-y-6">
      <PositionStatsCards positions={positionsQuery.data ?? []} />

      <div className="-mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-medium tracking-tight">Gestionar puestos</h2>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 cursor-pointer rounded-2xl"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-4" color="#000" />
            Agregar puesto
          </Button>
        </div>
        <PositionFilters
          value={filters}
          onChange={setFilters}
          onClear={() => setFilters(emptyFilters)}
        />
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
                }}
                onCancel={() => setIsCreateOpen(false)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {positions.length === 0 ? (
        <div className="border-t px-5 py-12 text-center">
          <Users className="mx-auto size-8 text-muted-foreground/50" />
          <h2 className="text-xl font-medium tracking-tight">
            {filters.active.size > 0
              ? 'No hay puestos con esos filtros'
              : 'Todavía no se crearon puestos'}
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            Creá el primer puesto con el botón “Agregar puesto”.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader className="bg-[#f6f6f6] rounded-2xl">
            <TableRow>
              <TableHead className="h-11 pl-5 text-xs">Puesto</TableHead>
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
                  <span
                    className={
                      position.isActive
                        ? 'rounded-2xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'
                        : 'rounded-2xl border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600'
                    }
                  >
                    {position.isActive ? 'Activo' : 'Inactivo'}
                  </span>
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
      )}

      <button
        type="button"
        aria-label="Nuevo puesto"
        className="fixed bottom-6 right-6 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-primary/90 hover:scale-105"
        onClick={() => setIsCreateOpen(true)}
      >
        <BriefcaseBusiness className="size-6" />
      </button>

      {detailPosition ? (
        <PositionDetailDrawer
          position={detailPosition}
          positions={positionsQuery.data ?? []}
          open={detailPositionId !== null}
          onOpenChange={(open) => {
            if (!open) setDetailPositionId(null);
          }}
        />
      ) : null}
    </section>
  );
};
