import type { AuthSession } from '@/features/auth/domain/auth';
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
    return <p className="text-sm text-muted-foreground">Select an active company to review employees.</p>;
  }

  if (employeesQuery.isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (employeesQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {employeesQuery.error instanceof Error ? employeesQuery.error.message : 'Unable to load employees.'}
      </p>
    );
  }

  const employees = sortEmployeesByCreatedAtDesc(employeesQuery.data ?? []);

  if (employees.length === 0) {
    return <p className="text-sm text-muted-foreground">No employees have been created yet.</p>;
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Created at</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id} data-state={selectedEmployeeId === employee.id ? 'selected' : undefined}>
              <TableCell className="font-medium">{employee.id}</TableCell>
              <TableCell>{new Date(employee.createdAt).toLocaleString('en-US')}</TableCell>
              <TableCell className="text-right">
                <Button type="button" variant="ghost" onClick={() => onSelectEmployee?.(employee.id)} aria-label={`Open employee ${employee.id}`}>
                  Open
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
