import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import type { AuthSession } from '@/features/auth/domain/auth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

import { useCreateEmployee } from '../../application/hr-employees-queries';
import { employeeFormSchema, type EmployeeFormValues } from '../../domain/employees';

export const EmployeeFormPage = ({
  session,
  apiBaseUrl,
  onCreated,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
  onCreated?: (employeeId: string) => void;
}) => {
  const companyId = session.activeCompany?.companyId;
  const createEmployeeMutation = useCreateEmployee(apiBaseUrl);
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {},
  });

  if (!companyId) {
    return <p className="text-sm text-muted-foreground">Select an active company before creating employees.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create employee</CardTitle>
        <CardDescription>Employee records are created independently from ERP user access.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            void form.handleSubmit(async () => {
              const employee = await createEmployeeMutation.mutateAsync(companyId);
              onCreated?.(employee.id);
            })(event);
          }}
        >
          {createEmployeeMutation.error ? (
            <p role="alert" className="mb-4 text-sm text-destructive">
              {createEmployeeMutation.error instanceof Error
                ? createEmployeeMutation.error.message
                : 'Unable to create the employee record.'}
            </p>
          ) : null}

          <Button type="submit" disabled={createEmployeeMutation.isPending}>
            {createEmployeeMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Create employee record
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
