export type Employee = {
  id: string;
  companyId: string;
  createdAt: Date;
};

export type ScopeNodeRecord = {
  id: string;
  companyId: string;
  nodeType: 'company' | 'division' | 'local' | 'area' | 'warehouse' | 'point-of-sale';
  sourceId: string;
  parentScopeNodeId: string | null;
  name: string;
};

export type HrEmployeesGateway = {
  createEmployee: (input: { companyId: string }) => Promise<Employee>;
  updateEmployee: (
    companyId: string,
    employeeId: string,
    input?: Record<string, never>,
  ) => Promise<Employee | null>;
  getEmployeeById: (companyId: string, employeeId: string) => Promise<Employee | null>;
  listEmployees: (companyId: string) => Promise<Employee[]>;

  createPosition: (input: {
    companyId: string;
    name: string;
    reportsToPositionId: string | null;
    headcount: number;
    isActive: boolean;
  }) => Promise<import('./positions').Position>;
  getPositionById: (
    companyId: string,
    positionId: string,
  ) => Promise<import('./positions').Position | null>;
  listPositions: (companyId: string) => Promise<import('./positions').Position[]>;
  countActivePrimaryAssignmentsForPosition: (positionId: string) => Promise<number>;
  findScopeNode: (companyId: string, scopeNodeId: string) => Promise<ScopeNodeRecord | null>;

  createAssignment: (input: {
    companyId: string;
    employeeId: string;
    scopeNodeId: string;
    positionId: string;
    startedAt: Date;
    isPrimary: boolean;
    createdAt: Date;
    id?: string;
  }) => Promise<import('./employee-assignments').EmployeeAssignment>;
  getActivePrimaryAssignmentByEmployeeId: (
    companyId: string,
    employeeId: string,
  ) => Promise<import('./employee-assignments').EmployeeAssignment | null>;
  getActivePrimaryAssignmentByPositionId: (
    companyId: string,
    positionId: string,
  ) => Promise<import('./employee-assignments').EmployeeAssignment | null>;
  listDirectReportAssignments: (
    companyId: string,
    managerPositionId: string,
  ) => Promise<import('./employee-assignments').EmployeeAssignment[]>;
};

export class EmployeeNotFoundError extends Error {
  readonly code = 'HR_EMPLOYEE_NOT_FOUND';

  constructor(message = 'Employee not found.') {
    super(message);
    this.name = 'EmployeeNotFoundError';
  }
}

export class HrEmployeesScopeNotFoundError extends Error {
  readonly code = 'HR_EMPLOYEES_SCOPE_NOT_FOUND';

  constructor(message = 'Scope node not found for this company.') {
    super(message);
    this.name = 'HrEmployeesScopeNotFoundError';
  }
}
