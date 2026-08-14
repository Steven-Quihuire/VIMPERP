import type { AuthSession } from '@/features/auth/domain/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

import { useAssignments, useEmployee } from '../../application/hr-employees-queries';

export const EmployeeDetailPage = ({
  session,
  employeeId,
  apiBaseUrl,
}: {
  session: AuthSession;
  employeeId: string | null;
  apiBaseUrl?: string;
}) => {
  const companyId = session.activeCompany?.companyId;
  const employeeQuery = useEmployee(companyId, employeeId ?? undefined, apiBaseUrl);
  const assignments = useAssignments(
    { companyId, employeeId: employeeId ?? undefined },
    apiBaseUrl,
  );

  if (!companyId) {
    return <p className="text-sm text-muted-foreground">Select an active company to review employee details.</p>;
  }

  if (!employeeId) {
    return <p className="text-sm text-muted-foreground">Choose an employee from the list to inspect details.</p>;
  }

  if (employeeQuery.isLoading || assignments.managerQuery.isLoading || assignments.directReportsQuery.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (employeeQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {employeeQuery.error instanceof Error ? employeeQuery.error.message : 'Unable to load employee details.'}
      </p>
    );
  }

  const employee = employeeQuery.data;

  if (!employee) {
    return <p className="text-sm text-muted-foreground">The selected employee no longer exists.</p>;
  }

  const manager = assignments.managerQuery.data;
  const directReports = assignments.directReportsQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{employee.id}</CardTitle>
        <CardDescription>Created {new Date(employee.createdAt).toLocaleString('en-US')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium">Current manager</p>
          <p className="text-sm text-muted-foreground">
            {manager ? manager.employeeId : 'No reporting line resolved yet.'}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium">Direct reports</p>
          {directReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No direct reports for this employee.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {directReports.map((directReport) => (
                <li key={directReport.assignmentId}>{directReport.employeeId}</li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
