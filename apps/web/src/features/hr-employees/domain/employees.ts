import { z } from 'zod';

export const employmentStatusValues = ['active', 'suspended', 'separated'] as const;
export type EmploymentStatus = (typeof employmentStatusValues)[number];

export type Employee = {
  id: string;
  companyId: string;
  fullName: string;
  documentType: string | null;
  documentNumber: string | null;
  email: string | null;
  employmentStatus: EmploymentStatus;
  hiredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const employeeFormSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required.'),
    documentType: z.string().trim().default(''),
    documentNumber: z.string().trim().default(''),
    email: z.string().trim().default(''),
    employmentStatus: z.enum(employmentStatusValues).default('active'),
    hiredAt: z.string().trim().default(''),
  })
  .superRefine((values, context) => {
    if ((values.documentType.length > 0) !== (values.documentNumber.length > 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documentType'],
        message: 'Document type and document number must be provided together.',
      });
    }

    if (values.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Email must be a valid email address.',
      });
    }
  });

export type EmployeeFormValues = z.output<typeof employeeFormSchema>;

export type EmployeePayload = {
  fullName: string;
  documentType: string | null;
  documentNumber: string | null;
  email: string | null;
  employmentStatus: EmploymentStatus;
  hiredAt: string | null;
};

export type CreateEmployeeInput = EmployeePayload & { companyId: string };
export type UpdateEmployeeInput = EmployeePayload & { companyId: string; employeeId: string };

const normalizeDate = (value: string) => {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00.000Z`
    : new Date(value).toISOString();
};

const toEmployeePayload = (values: EmployeeFormValues): EmployeePayload => ({
  fullName: values.fullName.trim(),
  documentType: values.documentType.trim() || null,
  documentNumber: values.documentNumber.trim() || null,
  email: values.email.trim() || null,
  employmentStatus: values.employmentStatus,
  hiredAt: normalizeDate(values.hiredAt),
});

export const toCreateEmployeeInput = (
  companyId: string,
  values: EmployeeFormValues,
): CreateEmployeeInput => ({
  companyId,
  ...toEmployeePayload(values),
});

export const toUpdateEmployeeInput = (
  companyId: string,
  employeeId: string,
  values: EmployeeFormValues,
): UpdateEmployeeInput => ({
  companyId,
  employeeId,
  ...toEmployeePayload(values),
});

export const toEmployeeFormValues = (employee?: Employee | null): EmployeeFormValues => ({
  fullName: employee?.fullName ?? '',
  documentType: employee?.documentType ?? '',
  documentNumber: employee?.documentNumber ?? '',
  email: employee?.email ?? '',
  employmentStatus: employee?.employmentStatus ?? 'active',
  hiredAt: employee?.hiredAt ? employee.hiredAt.slice(0, 16) : '',
});

export const sortEmployeesByCreatedAtDesc = (employees: Employee[]) => {
  return [...employees].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
};
