import type { AuthSession } from '@/features/auth/domain/auth';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

import { sortEmployeesByCreatedAtDesc } from '../../domain/employees';
import { useEmployees } from '../../application/hr-employees-queries';

export const EmployeesListPage = ({
  session,
  apiBaseUrl,
  selectedEmployeeId,
  onSelectEmployee,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
  selectedEmployeeId?: string | null;
  onSelectEmployee?: (employeeId: string) => void;
}) => {
  const companyId = session.activeCompany?.companyId;
  const employeesQuery = useEmployees(companyId, apiBaseUrl);

  if (!companyId) {
    return <p className="text-sm text-muted-foreground">Seleccioná una compañía activa para consultar los empleados.</p>;
  }

  if (employeesQuery.isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (employeesQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
          {employeesQuery.error instanceof Error ? employeesQuery.error.message : 'No se pudieron cargar los empleados.'}
      </p>
    );
  }

  const employees = sortEmployeesByCreatedAtDesc(employeesQuery.data ?? []);

  if (employees.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no se crearon empleados.</p>;
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha de creación</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id} data-state={selectedEmployeeId === employee.id ? 'selected' : undefined}>
              <TableCell>
                <div className="font-medium">{employee.fullName || employee.id}</div>
                <div className="text-xs text-muted-foreground">{employee.id}</div>
              </TableCell>
              <TableCell>
                <Badge variant={employee.employmentStatus === 'active' ? 'secondary' : 'outline'}>
                  {employee.employmentStatus === 'active'
                    ? 'Activo'
                    : employee.employmentStatus === 'suspended'
                      ? 'Suspendido'
                      : 'Desvinculado'}
                </Badge>
              </TableCell>
              <TableCell>{new Date(employee.createdAt).toLocaleString('es-AR')}</TableCell>
              <TableCell className="text-right">
                <Button type="button" variant="ghost" onClick={() => onSelectEmployee?.(employee.id)} aria-label={`Abrir empleado ${employee.id}`}>
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
