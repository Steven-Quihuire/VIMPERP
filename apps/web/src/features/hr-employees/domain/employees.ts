import { z } from 'zod';

import {
  detectEcuadorianDocumentType,
  type EcuadorianDocumentType,
} from '@/shared/lib/ecuadorian-document';

export const employmentStatusValues = [
  'active',
  'suspended',
  'separated',
] as const;
export type EmploymentStatus = (typeof employmentStatusValues)[number];

export type EmployeeDocumentType = EcuadorianDocumentType;

export const employeeDocumentTypeValues = [
  'cedula',
  'ruc',
  'pasaporte',
] as const;

export const employeeDocumentTypeLabels = {
  cedula: 'Cédula',
  ruc: 'RUC',
  pasaporte: 'Pasaporte',
} as const;

export const getEmployeeDocumentTypeLabel = (documentType: string | null) => {
  if (!documentType) {
    return null;
  }
  return (
    employeeDocumentTypeLabels[documentType as EmployeeDocumentType] ??
    documentType
  );
};

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
  avatarUrl?: string | null;
};

export const employeeFormSchema = z
  .object({
    fullName: z.string().trim().min(1, 'El nombre completo es obligatorio.'),
    documentType: z.string().trim().default(''),
    documentNumber: z.string().trim().default(''),
    email: z.string().trim().default(''),
    employmentStatus: z.enum(employmentStatusValues).default('active'),
    hiredAt: z
      .string()
      .trim()
      .regex(/^$|^\d{4}-\d{2}-\d{2}$/, 'Seleccioná una fecha válida.')
      .default(''),
    positionId: z.string().trim().default(''),
    scopeNodeId: z.string().trim().default(''),
    managerId: z.string().trim().default(''),
  })
  .superRefine((values, context) => {
    if (
      values.documentNumber.length > 0 &&
      values.documentType.length === 0 &&
      detectEcuadorianDocumentType(values.documentNumber) === null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documentNumber'],
        message:
          'Ingresa una cédula (10 dígitos), RUC (13 dígitos) o pasaporte válido.',
      });
    }

    if (
      values.email.length > 0 &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'El correo electrónico debe tener un formato válido.',
      });
    }
  });

export type EmployeeFormValues = z.output<typeof employeeFormSchema>;

export type DocumentFieldState =
  | { status: 'empty' }
  | { status: 'pending'; hint: string }
  | { status: 'valid'; documentType: EmployeeDocumentType; label: string }
  | { status: 'invalid' };

export const getDocumentFieldState = (value: string): DocumentFieldState => {
  const normalized = value.trim();
  if (!normalized) {
    return { status: 'empty' };
  }

  const detected = detectEcuadorianDocumentType(normalized);
  if (detected) {
    return {
      status: 'valid',
      documentType: detected,
      label: employeeDocumentTypeLabels[detected],
    };
  }

  if (/^\d+$/.test(normalized)) {
    if (normalized.length < 10) {
      return { status: 'pending', hint: 'Cédula o RUC' };
    }
    if (normalized.length === 10) {
      return { status: 'invalid' };
    }
    if (normalized.length < 13) {
      return { status: 'pending', hint: 'RUC · 13 dígitos' };
    }
    return { status: 'invalid' };
  }

  if (/^[A-Za-z0-9]+$/.test(normalized) && normalized.length < 6) {
    return { status: 'pending', hint: 'Pasaporte' };
  }

  return { status: 'invalid' };
};

export type EmployeePayload = {
  fullName: string;
  documentType: string | null;
  documentNumber: string | null;
  email: string | null;
  employmentStatus: EmploymentStatus;
  hiredAt: string | null;
  positionId: string | null;
  scopeNodeId: string | null;
  managerId: string | null;
};

export type CreateEmployeeInput = EmployeePayload & { companyId: string };
export type UpdateEmployeeInput = EmployeePayload & {
  companyId: string;
  employeeId: string;
};

const toEmployeePayload = (values: EmployeeFormValues): EmployeePayload => {
  const documentNumber = values.documentNumber.trim();
  return {
    fullName: values.fullName.trim(),
    documentType: documentNumber
      ? (detectEcuadorianDocumentType(documentNumber) ??
        (values.documentType.trim() || null))
      : null,
    documentNumber: documentNumber ? documentNumber.toUpperCase() : null,
    email: values.email.trim() || null,
    employmentStatus: values.employmentStatus,
    hiredAt: values.hiredAt || null,
    positionId: values.positionId.trim() || null,
    scopeNodeId: values.scopeNodeId.trim() || null,
    managerId: values.managerId.trim() || null,
  };
};

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

export const toEmployeeFormValues = (
  employee?: Employee | null,
): EmployeeFormValues => ({
  fullName: employee?.fullName ?? '',
  documentType: employee?.documentType ?? '',
  documentNumber: employee?.documentNumber ?? '',
  email: employee?.email ?? '',
  employmentStatus: employee?.employmentStatus ?? 'active',
  hiredAt: employee?.hiredAt ? employee.hiredAt.slice(0, 10) : '',
  positionId: '',
  scopeNodeId: '',
  managerId: '',
});

export const sortEmployeesByCreatedAtDesc = (employees: Employee[]) => {
  return [...employees].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
};
