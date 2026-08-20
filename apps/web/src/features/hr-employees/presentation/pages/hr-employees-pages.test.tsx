import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { AuthSession } from '@/features/auth/domain/auth';

import { AssignmentTimelinePage } from './assignment-timeline';
import { EmployeeDetailPage } from './employee-detail';
import { EmployeeFormPage } from './employee-form';
import { EmployeesListPage } from './employees-list';
import { PositionFormPage } from './position-form';
import { PositionsListPage } from './positions-list';

const useEmployeesMock = vi.fn();
const useEmployeesPageMock = vi.fn();
const useEmployeeMock = vi.fn();
const useCreateEmployeeMock = vi.fn();
const useUpdateEmployeeMock = vi.fn();
const useDeleteEmployeeMock = vi.fn();
const usePositionsMock = vi.fn();
const useCreatePositionMock = vi.fn();
const useAssignmentsMock = vi.fn();
const useOrgTreeMock = vi.fn();

vi.mock('../../application/hr-employees-queries', () => ({
  useEmployees: (...args: unknown[]) => useEmployeesMock(...args),
  useEmployeesPage: (...args: unknown[]) => useEmployeesPageMock(...args),
  useEmployee: (...args: unknown[]) => useEmployeeMock(...args),
  useCreateEmployee: (...args: unknown[]) => useCreateEmployeeMock(...args),
  useUpdateEmployee: (...args: unknown[]) => useUpdateEmployeeMock(...args),
  useDeleteEmployee: (...args: unknown[]) => useDeleteEmployeeMock(...args),
  usePositions: (...args: unknown[]) => usePositionsMock(...args),
  useCreatePosition: (...args: unknown[]) => useCreatePositionMock(...args),
  useAssignments: (...args: unknown[]) => useAssignmentsMock(...args),
}));

vi.mock('@/features/org-tree/application/org-tree-queries', () => ({
  useOrgTree: (...args: unknown[]) => useOrgTreeMock(...args),
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

describe('hr-employees pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEmployeesMock.mockReturnValue({
      data: [
        {
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
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });
    useEmployeesPageMock.mockReturnValue({
      data: {
        items: [
          {
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
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    useEmployeeMock.mockReturnValue({
      data: {
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
      },
      isLoading: false,
      isError: false,
      error: null,
    });
    useCreateEmployeeMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
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
      }),
      isPending: false,
      error: null,
    });
    useUpdateEmployeeMock.mockReturnValue({
      mutateAsync: vi
        .fn()
        .mockResolvedValue({ id: 'employee-1', fullName: 'Updated Employee' }),
      isPending: false,
      error: null,
    });
    useDeleteEmployeeMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'employee-1' }),
      isPending: false,
      error: null,
    });
    usePositionsMock.mockReturnValue({
      data: [
        {
          id: 'position-1',
          companyId: 'company-1',
          name: 'People Lead',
          reportsToPositionId: null,
          headcount: 2,
          occupiedHeadcount: 1,
          remainingVacancies: 1,
          isActive: true,
          createdAt: '2026-08-13T12:00:00.000Z',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });
    useCreatePositionMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'position-2' }),
      isPending: false,
      error: null,
    });
    useAssignmentsMock.mockReturnValue({
      managerQuery: {
        data: {
          employeeId: 'employee-9',
          positionId: 'position-1',
          assignmentId: 'assignment-1',
        },
        isLoading: false,
        isError: false,
        error: null,
      },
      directReportsQuery: {
        data: [
          {
            employeeId: 'employee-3',
            positionId: 'position-2',
            assignmentId: 'assignment-2',
          },
        ],
        isLoading: false,
        isError: false,
        error: null,
      },
      assignmentHistoryQuery: {
        data: [
          {
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
          },
        ],
        isLoading: false,
        isError: false,
        error: null,
      },
      createAssignmentMutation: {
        mutateAsync: vi.fn().mockResolvedValue({ id: 'assignment-3' }),
        isPending: false,
        error: null,
      },
    });
    useOrgTreeMock.mockReturnValue({
      data: [
        {
          ref: { scopeType: 'company', scopeId: 'company-1' },
          parentRef: null,
          companyId: 'company-1',
          name: 'Vimcore',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });
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
      useCreateEmployeeMock.mock.results[0]?.value.mutateAsync,
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
    render(<EmployeeDetailPage session={session} employeeId="employee-1" />);

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
        useAssignmentsMock.mock.results[0]?.value.createAssignmentMutation
          .mutateAsync,
      ).toHaveBeenCalledWith({
        scopeNodeId: 'company:company-1',
        positionId: 'position-1',
        startedAt: '2026-08-13T12:30:00.000Z',
      });
    });
  });
});
