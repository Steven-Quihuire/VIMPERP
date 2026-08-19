import { Users } from 'lucide-react';

import type { AuthSession } from '@/features/auth/domain/auth';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

import { usePositions } from '../../application/hr-employees-queries';
import { sortPositionsByName } from '../../domain/positions';

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
          <Skeleton key={index} className="h-14 w-full rounded-xl" />
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

  const positions = sortPositionsByName(positionsQuery.data ?? []);

  if (positions.length === 0) {
    return (
      <div className="border-t px-5 py-12 text-center">
        <Users className="mx-auto size-8 text-muted-foreground/50" />
        <h2 className="text-xl font-medium tracking-tight">
          Todavía no se crearon puestos
        </h2>
        <p className="mt-1 text-xs text-gray-600">
          Creá el primer puesto desde el formulario.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader className="rounded-2xl bg-[#f6f6f6]">
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
              <button
                type="button"
                className="cursor-pointer rounded-2xl border px-2.5 py-1.5 text-xs transition-all duration-400 ease-in-out hover:border-black hover:bg-black hover:text-white"
                onClick={() => onSelectPosition?.(position.id)}
                aria-label={`Abrir puesto ${position.id}`}
              >
                Ver detalles
              </button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
