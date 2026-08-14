import { z } from 'zod';

export type Employee = {
  id: string;
  companyId: string;
  createdAt: string;
};

export const employeeFormSchema = z.object({});

export type EmployeeFormValues = z.output<typeof employeeFormSchema>;

export const sortEmployeesByCreatedAtDesc = (employees: Employee[]) => {
  return [...employees].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
};
