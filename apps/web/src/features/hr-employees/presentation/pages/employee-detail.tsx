import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import type { AuthSession } from '@/features/auth/domain/auth';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

import { useAssignments, useEmployee, useUpdateEmployee } from '../../application/hr-employees-queries';
import {
  employeeFormSchema,
  toEmployeeFormValues,
  toUpdateEmployeeInput,
  type EmployeeFormValues,
} from '../../domain/employees';

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
  const updateEmployeeMutation = useUpdateEmployee(apiBaseUrl);
  const assignments = useAssignments(
    { companyId, employeeId: employeeId ?? undefined },
    apiBaseUrl,
  );
  const form = useForm<z.input<typeof employeeFormSchema>, unknown, EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    values: toEmployeeFormValues(employeeQuery.data),
  });

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
        <CardTitle>{employee.fullName || employee.id}</CardTitle>
        <CardDescription>Created {new Date(employee.createdAt).toLocaleString('en-US')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="font-medium">Employee id:</span> {employee.id}</p>
          <p><span className="font-medium">Email:</span> {employee.email ?? 'Not provided'}</p>
          <p><span className="font-medium">Document:</span> {employee.documentNumber ?? 'Not provided'}</p>
          <p><span className="font-medium">Hire date:</span> {employee.hiredAt ? new Date(employee.hiredAt).toLocaleDateString('en-US') : 'Not provided'}</p>
          <p className="flex items-center gap-2"><span className="font-medium">Status:</span> <Badge variant={employee.employmentStatus === 'active' ? 'secondary' : 'outline'}>{employee.employmentStatus}</Badge></p>
        </div>

        <form
          className="space-y-4 border-t pt-4"
          onSubmit={(event) => {
            void form.handleSubmit(async (values) => {
              await updateEmployeeMutation.mutateAsync(
                toUpdateEmployeeInput(companyId, employee.id, values),
              );
            })(event);
          }}
        >
          <h3 className="font-medium">Edit employee</h3>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-employee-full-name">Full name</FieldLabel>
              <FieldContent>
                <Input id="edit-employee-full-name" aria-label="Edit full name" {...form.register('fullName')} />
                <FieldError errors={[form.formState.errors.fullName]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-employee-document-type">Document type</FieldLabel>
              <FieldContent>
                <Input id="edit-employee-document-type" aria-label="Edit document type" {...form.register('documentType')} />
                <FieldError errors={[form.formState.errors.documentType]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-employee-document-number">Document number</FieldLabel>
              <FieldContent>
                <Input id="edit-employee-document-number" aria-label="Edit document number" {...form.register('documentNumber')} />
                <FieldError errors={[form.formState.errors.documentNumber]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-employee-email">Email</FieldLabel>
              <FieldContent>
                <Input id="edit-employee-email" aria-label="Edit email" type="email" {...form.register('email')} />
                <FieldError errors={[form.formState.errors.email]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-employee-employment-status">Employment status</FieldLabel>
              <FieldContent>
                <select
                  id="edit-employee-employment-status"
                  aria-label="Edit employment status"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2"
                  {...form.register('employmentStatus')}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="separated">Separated</option>
                </select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-employee-hired-at">Hire date</FieldLabel>
              <FieldContent>
                <Input id="edit-employee-hired-at" aria-label="Edit hire date" type="datetime-local" {...form.register('hiredAt')} />
                <FieldError errors={[form.formState.errors.hiredAt]} />
              </FieldContent>
            </Field>
          </FieldGroup>
          {updateEmployeeMutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {updateEmployeeMutation.error instanceof Error ? updateEmployeeMutation.error.message : 'Unable to update employee.'}
            </p>
          ) : null}
          <Button type="submit" disabled={updateEmployeeMutation.isPending}>Save employee changes</Button>
        </form>

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
