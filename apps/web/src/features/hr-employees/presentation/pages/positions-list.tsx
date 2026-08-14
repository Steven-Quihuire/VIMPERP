import type { AuthSession } from '@/features/auth/domain/auth';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

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
    return <p className="text-sm text-muted-foreground">Seleccioná una compañía activa para consultar los puestos.</p>;
  }

  if (positionsQuery.isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (positionsQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
          {positionsQuery.error instanceof Error ? positionsQuery.error.message : 'No se pudieron cargar los puestos.'}
      </p>
    );
  }

  const positions = sortPositionsByName(positionsQuery.data ?? []);

  if (positions.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no se crearon puestos.</p>;
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Puesto</TableHead>
            <TableHead>Dotación</TableHead>
            <TableHead>Ocupadas</TableHead>
            <TableHead>Vacantes</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((position) => (
            <TableRow key={position.id} data-state={selectedPositionId === position.id ? 'selected' : undefined}>
              <TableCell>
                <div className="font-medium">{position.name}</div>
                <div className="text-xs text-muted-foreground">{position.id}</div>
              </TableCell>
              <TableCell>{position.headcount}</TableCell>
              <TableCell>{position.occupiedHeadcount}</TableCell>
              <TableCell>{position.remainingVacancies}</TableCell>
              <TableCell>
                <Badge variant={position.isActive ? 'secondary' : 'outline'}>
                    {position.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button type="button" variant="ghost" onClick={() => onSelectPosition?.(position.id)}>
                  Abrir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
