import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type { AuthSession } from '@/features/auth/domain/auth';
import type { OrgTreeNode } from '@/features/org-tree/domain/org-tree';

import type {
  AssignmentFormValues,
  EmployeeAssignment,
  ReportingLineRecord,
} from '../../domain/assignments';
import type {
  CreateEmployeeInput,
  Employee,
  UpdateEmployeeInput,
} from '../../domain/employees';
import type { CreatePositionInput, Position } from '../../domain/positions';

import type * as hrEmployeesQueries from '../../application/hr-employees-queries';
import type * as orgTreeQueries from '@/features/org-tree/application/org-tree-queries';

import { AssignmentTimelinePage } from './assignment-timeline';
import { EmployeeDetailPage } from './employee-detail';
import { EmployeeFormPage } from './employee-form';
import { EmployeesListPage } from './employees-list';
import { PositionFormPage } from './position-form';
import { PositionsListPage } from './positions-list';

const useEmployeesMock = vi.fn<typeof hrEmployeesQueries.useEmployees>();
const useEmployeesPageMock = vi.fn<typeof hrEmployeesQueries.useEmployeesPage>();
const useEmployeeMock = vi.fn<typeof hrEmployeesQueries.useEmployee>();
const useCreateEmployeeMock = vi.fn<typeof hrEmployeesQueries.useCreateEmployee>();
const useUpdateEmployeeMock = vi.fn<typeof hrEmployeesQueries.useUpdateEmployee>();
const useDeleteEmployeeMock = vi.fn<typeof hrEmployeesQueries.useDeleteEmployee>();
const usePositionsMock = vi.fn<typeof hrEmployeesQueries.usePositions>();
const useCreatePositionMock = vi.fn<typeof hrEmployeesQueries.useCreatePosition>();
const useAssignmentsMock = vi.fn<typeof hrEmployeesQueries.useAssignments>();
const useOrgTreeMock = vi.fn<typeof orgTreeQueries.useOrgTree>();

/** Resolves to the real hook return when the first mock call returned, else undefined. */
type ReturnedValue<A> = A extends { type: 'return'; value: infer V } ? V : undefined;

/** Narrows vitest's union-typed mock results so the returned value keeps its real type. */
function firstReturnValue<A extends { type: unknown; value: unknown }>(
  results: readonly A[],
): ReturnedValue<A> {
  const first = results.at(0);
  return first?.type === 'return'
    ? (first.value as ReturnedValue<A>)
    : (undefined as ReturnedValue<A>);
}

/** Builds a fully-typed successful TanStack Query result for a fixture payload. */
function queryOk<TData>(data: TData): UseQueryResult<TData> {
  return {
    data,
    dataUpdatedAt: 0,
    error: null,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isError: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isLoading: false,
    isLoadingError: false,
    isInitialLoading: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: true,
    isSuccess: true,
    isEnabled: true,
    refetch: () => Promise.resolve(queryOk(data)),
    status: 'success',
    fetchStatus: 'idle',
    promise: Promise.resolve(data),
  };
}

/** Builds a fully-typed idle TanStack Mutation result resolving with a fixture value or implementation. */
function mutationOk<TData, TVariables = void>(
  resolveWith?: TData | ((variables: TVariables) => Promise<TData>),
): UseMutationResult<TData, Error, TVariables> {
  const asImpl = resolveWith as
    | ((variables: TVariables) => Promise<TData>)
    | undefined;
  return {
    context: undefined,
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    isError: false,
    isIdle: true,
    isPending: false,
    isSuccess: false,
    status: 'idle',
    submittedAt: 0,
    variables: undefined,
    mutate: () => {},
    reset: () => {},
    mutateAsync:
      typeof asImpl === 'function'
        ? vi.fn(asImpl)
        : vi.fn(() => Promise.resolve(resolveWith as TData)),
  };
}

vi.mock('../../application/hr-employees-queries', () => ({
  useEmployees:
    (...args: Parameters<typeof hrEmployeesQueries.useEmployees>) =>
    useEmployeesMock(...args),
  useEmployeesPage:
    (...args: Parameters<typeof hrEmployeesQueries.useEmployeesPage>) =>
    useEmployeesPageMock(...args),
  useEmployee:
    (...args: Parameters<typeof hrEmployeesQueries.useEmployee>) =>
    useEmployeeMock(...args),
  useCreateEmployee:
    (...args: Parameters<typeof hrEmployeesQueries.useCreateEmployee>) =>
    useCreateEmployeeMock(...args),
  useUpdateEmployee:
    (...args: Parameters<typeof hrEmployeesQueries.useUpdateEmployee>) =>
    useUpdateEmployeeMock(...args),
  useDeleteEmployee:
    (...args: Parameters<typeof hrEmployeesQueries.useDeleteEmployee>) =>
    useDeleteEmployeeMock(...args),
  usePositions:
    (...args: Parameters<typeof hrEmployeesQueries.usePositions>) =>
    usePositionsMock(...args),
  useCreatePosition:
    (...args: Parameters<typeof hrEmployeesQueries.useCreatePosition>) =>
    useCreatePositionMock(...args),
  useAssignments:
    (...args: Parameters<typeof hrEmployeesQueries.useAssignments>) =>
    useAssignmentsMock(...args),
}));

vi.mock('@/features/org-tree/application/org-tree-queries', () => ({
  useOrgTree:
    (...args: Parameters<typeof orgTreeQueries.useOrgTree>) =>
    useOrgTreeMock(...args),
}));

const session: AuthSession = {
  user: { id: 'user-1', email: 'owner@vimcore.test', username: 'owner' },
  memberships: [
    {
      companyId: 'company-1',
      role: 'company-owner',
      divisionId: null,
      localId: null,
    },
  ],
  activeCompany: { companyId: 'company-1', status: 'active' },
  activeScope: null,
  activeLocalId: null,
  capabilities: ['catalog.read'],
};

const employeeOne: Employee = {
  id: 'employee-1',
  companyId: 'company-1',
  fullName: 'Employee One',
  documentType: null,
  documentNumber: null,
  email: 'one@example.com',
  employmentStatus: 'active',
  hiredAt: null,
  createdAt: '2026-08-13T12:00:00.000Z',
  updatedAt: '2026-08-13T12:00:00.000Z',
};

const employeeTwoCreated: Employee = {
  id: 'employee-2',
  companyId: 'company-1',
  fullName: 'Employee Two',
  documentType: null,
  documentNumber: null,
  email: 'two@example.com',
  employmentStatus: 'active',
  hiredAt: '2026-08-13',
  createdAt: '2026-08-13T12:00:00.000Z',
  updatedAt: '2026-08-13T12:00:00.000Z',
};

const updatedEmployee: Employee = {
  id: 'employee-1',
  companyId: 'company-1',
  fullName: 'Updated Employee',
  documentType: null,
  documentNumber: null,
  email: 'one@example.com',
  employmentStatus: 'active',
  hiredAt: null,
  createdAt: '2026-08-13T12:00:00.000Z',
  updatedAt: '2026-08-13T12:00:00.000Z',
};

const deletedEmployee: Employee = {
  id: 'employee-1',
  companyId: 'company-1',
  fullName: 'Employee One',
  documentType: null,
  documentNumber: null,
  email: 'one@example.com',
  employmentStatus: 'separated',
  hiredAt: null,
  createdAt: '2026-08-13T12:00:00.000Z',
  updatedAt: '2026-08-13T12:00:00.000Z',
};

const positionOne: Position = {
  id: 'position-1',
  companyId: 'company-1',
  name: 'People Lead',
  reportsToPositionId: null,
  headcount: 2,
  occupiedHeadcount: 1,
  remainingVacancies: 1,
  isActive: true,
  createdAt: '2026-08-13T12:00:00.000Z',
};

const positionTwoCreated: Position = {
  id: 'position-2',
  companyId: 'company-1',
  name: 'HR Analyst',
  reportsToPositionId: null,
  headcount: 2,
  occupiedHeadcount: 0,
  remainingVacancies: 2,
  isActive: true,
  createdAt: '2026-08-13T12:00:00.000Z',
};

const assignmentThree: EmployeeAssignment = {
  id: 'assignment-3',
  companyId: 'company-1',
  employeeId: 'employee-1',
  scopeNodeId: 'company:company-1',
  positionId: 'position-1',
  startedAt: '2026-08-13T12:00:00.000Z',
  endedAt: null,
  isPrimary: true,
  createdAt: '2026-08-13T12:00:00.000Z',
  positionName: 'People Lead',
  scopeNodeName: 'Vimcore',
};

describe('hr-employees pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEmployeesMock.mockReturnValue(queryOk<Employee[]>([employeeOne]));
    useEmployeesPageMock.mockReturnValue(
      queryOk<{ items: Employee[]; total: number; page: number; pageSize: number }>({
        items: [employeeOne],
        total: 1,
        page: 1,
        pageSize: 10,
      }),
    );
    useEmployeeMock.mockReturnValue(queryOk<Employee | null>(employeeOne));
    useCreateEmployeeMock.mockReturnValue(
      mutationOk<Employee, CreateEmployeeInput>(employeeTwoCreated),
    );
    useUpdateEmployeeMock.mockReturnValue(
      mutationOk<Employee, UpdateEmployeeInput>(updatedEmployee),
    );
    useDeleteEmployeeMock.mockReturnValue(
      mutationOk<Employee | null, { companyId: string; employeeId: string }>(
        deletedEmployee,
      ),
    );
    usePositionsMock.mockReturnValue(queryOk<Position[]>([positionOne]));
    useCreatePositionMock.mockReturnValue(
      mutationOk<Position, CreatePositionInput>(positionTwoCreated),
    );
    useAssignmentsMock.mockReturnValue({
      managerQuery: queryOk<ReportingLineRecord | null>({
        employeeId: 'employee-9',
        positionId: 'position-1',
        assignmentId: 'assignment-1',
      }),
      directReportsQuery: queryOk<ReportingLineRecord[]>([
        {
          employeeId: 'employee-3',
          positionId: 'position-2',
          assignmentId: 'assignment-2',
        },
      ]),
      assignmentHistoryQuery: queryOk<EmployeeAssignment[]>([assignmentThree]),
      createAssignmentMutation:
        mutationOk<EmployeeAssignment, AssignmentFormValues>(assignmentThree),
    });
    useOrgTreeMock.mockReturnValue(
      queryOk<OrgTreeNode[]>([
        {
          ref: { scopeType: 'company', scopeId: 'company-1' },
          parentRef: null,
          companyId: 'company-1',
          name: 'Vimcore',
        },
      ]),
    );
  });

  it('renders employees and lets the user select one', () => {
    const onSelectEmployee = vi.fn();

    render(
      <EmployeesListPage
        session={session}
        selectedEmployeeId={null}
        onSelectEmployee={onSelectEmployee}
      />,
    );

    fireEvent.click(screen.getByText('Employee One'));

    expect(screen.getByText('Employee One')).toBeInTheDocument();
    expect(onSelectEmployee).toHaveBeenCalledWith('employee-1');
  });

  it('walks the three-step wizard and shows the created summary', async () => {
    render(<EmployeeFormPage session={session} />);

    fireEvent.change(screen.getByLabelText('Nombre completo'), {
      target: { value: 'Employee Two' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await screen.findByLabelText('Fecha de alta');
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await screen.findByLabelText('Puesto');
    fireEvent.click(screen.getByLabelText('Puesto'));
    fireEvent.click(
      await screen.findByRole('option', { name: 'People Lead · 1 vacantes' }),
    );
    fireEvent.click(screen.getByLabelText('Encargado'));
    fireEvent.click(
      await screen.findByRole('option', { name: 'Employee One' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Crear empleado' }));

    await waitFor(() => {
      expect(screen.getByText('Empleado creado')).toBeInTheDocument();
    });
    expect(screen.getByText('Employee Two')).toBeInTheDocument();
    expect(screen.getByText('People Lead')).toBeInTheDocument();
    expect(screen.getByText('Employee One')).toBeInTheDocument();

    expect(
      firstReturnValue(useCreateEmployeeMock.mock.results)?.mutateAsync,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        fullName: 'Employee Two',
        positionId: 'position-1',
        managerId: 'employee-1',
        scopeNodeId: null,
      }),
    );
  });

  it('keeps the create dialog open and navigates to the employee from the success screen', async () => {
    const onSelectEmployee = vi.fn();

    render(
      <EmployeesListPage
        session={session}
        selectedEmployeeId={null}
        onSelectEmployee={onSelectEmployee}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Nuevo empleado' }),
    );

    fireEvent.change(screen.getByLabelText('Nombre completo'), {
      target: { value: 'Employee Two' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByLabelText('Fecha de alta');
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByLabelText('Puesto');
    fireEvent.click(screen.getByRole('button', { name: 'Crear empleado' }));

    await screen.findByText('Empleado creado');

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }));

    expect(onSelectEmployee).toHaveBeenCalledWith('employee-2');
  });

  it('detects the document type while typing', () => {
    render(<EmployeeFormPage session={session} />);

    fireEvent.change(screen.getByLabelText('Número de documento'), {
      target: { value: '1710034065' },
    });

    expect(screen.getByText('Cédula')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Número de documento'), {
      target: { value: '1710034065001' },
    });

    expect(screen.getByText('RUC')).toBeInTheDocument();
  });

  it('renders employee detail with manager and direct reports', () => {
    render(
      <EmployeeDetailPage
        session={session}
        employeeId="employee-1"
        activeTab="info"
        onSelectTab={() => {}}
      />,
    );

    expect(screen.getByText('employee-1')).toBeInTheDocument();
    expect(screen.getByText(/employee-9/)).toBeInTheDocument();
    expect(screen.getByText(/employee-3/)).toBeInTheDocument();
  });

  it('renders positions and submits the position form', async () => {
    const onCreated = vi.fn();

    render(
      <>
        <PositionsListPage session={session} selectedPositionId={null} />
        <PositionFormPage session={session} onCreated={onCreated} />
      </>,
    );

    expect(screen.getAllByText('People Lead').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Nombre del puesto'), {
      target: { value: 'HR Analyst' },
    });
    fireEvent.change(screen.getByLabelText('¿Cuántas personas puede tener?'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear puesto' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('position-2'));
  });

  it('creates assignments and renders the reporting-line timeline', async () => {
    render(
      <AssignmentTimelinePage session={session} employeeId="employee-1" />,
    );

    expect(screen.getByText('People Lead')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Dónde trabaja'));
    fireEvent.click(
      await screen.findByRole('option', {
        name: 'Vimcore · Empresa (0 empleados)',
      }),
    );
    fireEvent.click(screen.getByLabelText('Puesto'));
    fireEvent.click(
      await screen.findByRole('option', { name: 'People Lead · 1 vacantes' }),
    );
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), {
      target: { value: '2026-08-13T12:30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear asignación' }));

    await waitFor(() => {
      expect(
        firstReturnValue(useAssignmentsMock.mock.results)?.createAssignmentMutation
          .mutateAsync,
      ).toHaveBeenCalledWith({
        scopeNodeId: 'company:company-1',
        positionId: 'position-1',
        startedAt: '2026-08-13T12:30:00.000Z',
      });
    });
  });
});
