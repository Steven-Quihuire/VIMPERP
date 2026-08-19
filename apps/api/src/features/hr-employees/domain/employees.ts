import type {
  EmployeeAssignment,
  EmployeeAssignmentHistory,
} from './employee-assignments';
import type { Position } from './positions';
import { detectEcuadorianDocumentType } from '../../../shared/domain/ecuadorian-document';

export const employmentStatusValues = [
  'active',
  'suspended',
  'separated',
] as const;
export type EmploymentStatus = (typeof employmentStatusValues)[number];

export type EmployeeIdentityInput = {
  fullName: string;
  documentType: string | null;
  documentNumber: string | null;
  email: string | null;
  employmentStatus: EmploymentStatus;
  hiredAt: string | null;
};

export type Employee = {
  id: string;
  companyId: string;
  fullName?: string;
  documentType?: string | null;
  documentNumber?: string | null;
  email?: string | null;
  employmentStatus?: EmploymentStatus;
  hiredAt?: string | null;
  createdAt: Date;
  updatedAt?: Date;
};

export type EmployeeListFilters = {
  page: number;
  pageSize: number;
  search?: string | undefined;
  status?: EmploymentStatus | undefined;
};

export type EmployeePage = {
  items: Employee[];
  total: number;
  page: number;
  pageSize: number;
};

export const assertValidEmployeeIdentity = (input: EmployeeIdentityInput) => {
  if (!input.fullName.trim()) {
    throw new EmployeeValidationError('Employee full name is required.');
  }

  const hasDocumentType = input.documentType !== null;
  const hasDocumentNumber = input.documentNumber !== null;

  if (hasDocumentType !== hasDocumentNumber) {
    throw new EmployeeValidationError(
      'Document type and document number must be provided together.',
    );
  }
};

export const assertValidEmployeeDocument = (
  documentType: string | null | undefined,
  documentNumber: string | null | undefined,
) => {
  if (!documentNumber) return;

  const detectedType = detectEcuadorianDocumentType(documentNumber);
  if (!detectedType) {
    throw new EmployeeValidationError(
      'Employee document number must be a valid Ecuadorian cedula, RUC, or passport.',
    );
  }

  if (documentType && documentType !== detectedType) {
    throw new EmployeeValidationError(
      `Employee document type must be '${detectedType}' for the provided document number.`,
    );
  }
};

export type ScopeNodeRecord = {
  id: string;
  companyId: string;
  nodeType:
    'company' | 'division' | 'local' | 'area' | 'warehouse' | 'point-of-sale';
  sourceId: string;
  parentScopeNodeId: string | null;
  name: string;
};

export type HrEmployeesGateway = {
  createEmployee: (
    input: { companyId: string } & Partial<EmployeeIdentityInput>,
  ) => Promise<Employee>;
  updateEmployee: (
    companyId: string,
    employeeId: string,
    input?: EmployeeIdentityInput,
  ) => Promise<Employee | null>;
  getEmployeeById: (
    companyId: string,
    employeeId: string,
  ) => Promise<Employee | null>;
  deleteEmployee: (
    companyId: string,
    employeeId: string,
  ) => Promise<Employee | null>;
  listEmployees: (companyId: string) => Promise<Employee[]>;
  listEmployeesPage?: (
    companyId: string,
    filters: EmployeeListFilters,
  ) => Promise<EmployeePage>;

  createPosition: (input: {
    companyId: string;
    name: string;
    reportsToPositionId: string | null;
    headcount: number;
    isActive: boolean;
  }) => Promise<Position>;
  getPositionById: (
    companyId: string,
    positionId: string,
  ) => Promise<Position | null>;
  updatePositionReportsTo: (
    companyId: string,
    positionId: string,
    reportsToPositionId: string,
  ) => Promise<Position | null>;
  listPositions: (companyId: string) => Promise<Position[]>;
  countActivePrimaryAssignmentsForPosition: (
    positionId: string,
  ) => Promise<number>;
  findScopeNode: (
    companyId: string,
    scopeNodeId: string,
  ) => Promise<ScopeNodeRecord | null>;

  createAssignment: (input: {
    companyId: string;
    employeeId: string;
    scopeNodeId: string;
    positionId: string;
    startedAt: Date;
    isPrimary: boolean;
    createdAt: Date;
    id?: string;
  }) => Promise<EmployeeAssignment>;
  listAssignmentHistory: (
    companyId: string,
    employeeId: string,
  ) => Promise<EmployeeAssignmentHistory[]>;
  getActivePrimaryAssignmentByEmployeeId: (
    companyId: string,
    employeeId: string,
  ) => Promise<EmployeeAssignment | null>;
  getActivePrimaryAssignmentByPositionId: (
    companyId: string,
    positionId: string,
  ) => Promise<EmployeeAssignment | null>;
  listDirectReportAssignments: (
    companyId: string,
    managerPositionId: string,
  ) => Promise<EmployeeAssignment[]>;
};

export class EmployeeNotFoundError extends Error {
  readonly code = 'HR_EMPLOYEE_NOT_FOUND';

  constructor(message = 'Employee not found.') {
    super(message);
    this.name = 'EmployeeNotFoundError';
  }
}

export class EmployeeValidationError extends Error {
  readonly code = 'HR_EMPLOYEE_VALIDATION';

  constructor(message = 'Employee data is invalid.') {
    super(message);
    this.name = 'EmployeeValidationError';
  }
}

export class EmployeeDocumentConflictError extends Error {
  readonly code = 'HR_EMPLOYEE_DOCUMENT_CONFLICT';

  constructor(
    message = 'Another employee already uses this document identity.',
  ) {
    super(message);
    this.name = 'EmployeeDocumentConflictError';
  }
}

export class HrEmployeesScopeNotFoundError extends Error {
  readonly code = 'HR_EMPLOYEES_SCOPE_NOT_FOUND';

  constructor(message = 'Scope node not found for this company.') {
    super(message);
    this.name = 'HrEmployeesScopeNotFoundError';
  }
}
