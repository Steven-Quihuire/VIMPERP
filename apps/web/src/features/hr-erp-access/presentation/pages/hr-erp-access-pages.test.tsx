import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type { AuthSession } from '@/features/auth/domain/auth';
import type { Employee } from '@/features/hr-employees/domain/employees';
import type {
  AcceptErpAccessInvitationInput,
  CreateErpAccessInvitationInput,
} from '../../domain/erp-access';
import type {
  CreatedErpAccessInvitation,
  ErpAccessInvitationPage,
  RevokeErpAccessInput,
} from '../../infrastructure/create-erp-access-api';

import type * as authQueries from '@/features/auth/presentation/use-auth';
import type * as hrEmployeesQueries from '@/features/hr-employees/application/hr-employees-queries';
import type * as erpAccessQueries from '../../application/hr-erp-access-queries';

import { AcceptErpAccessInvitationPage } from './accept-invitation';
import { InvitationsListPage } from './invitations-list';

const useInvitationsPageMock = vi.fn<typeof erpAccessQueries.useInvitationsPage>();
const useEmployeesMock = vi.fn<typeof hrEmployeesQueries.useEmployees>();
const useAcceptInvitationMock = vi.fn<typeof erpAccessQueries.useAcceptInvitation>();
const useAuthMock = vi.fn<typeof authQueries.useAuth>();

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

vi.mock('../../application/hr-erp-access-queries', () => ({
  useInvitationsPage:
    (...args: Parameters<typeof erpAccessQueries.useInvitationsPage>) =>
    useInvitationsPageMock(...args),
  useAcceptInvitation:
    (...args: Parameters<typeof erpAccessQueries.useAcceptInvitation>) =>
    useAcceptInvitationMock(...args),
}));

vi.mock('@/features/hr-employees/application/hr-employees-queries', () => ({
  useEmployees:
    (...args: Parameters<typeof hrEmployeesQueries.useEmployees>) =>
    useEmployeesMock(...args),
}));

vi.mock('@/features/auth/presentation/use-auth', () => ({
  useAuth:
    (...args: Parameters<typeof authQueries.useAuth>) =>
    useAuthMock(...args),
  authQueryKey: ['auth', 'me'],
}));

const session: AuthSession = {
  user: { id: 'user-1', email: 'owner@vimcore.test', username: 'owner' },
  memberships: [
    { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
  ],
  activeCompany: { companyId: 'company-1', status: 'active' },
  activeScope: null,
  activeLocalId: null,
  capabilities: ['catalog.read'],
};

const employeeOne: Employee = {
  id: 'employee-1',
  companyId: 'company-1',
  fullName: 'Ana Pérez',
  documentType: null,
  documentNumber: null,
  email: 'person@vimcore.test',
  employmentStatus: 'active',
  hiredAt: null,
  createdAt: '2026-08-13T12:00:00.000Z',
  updatedAt: '2026-08-13T12:00:00.000Z',
};

const employeeTwo: Employee = {
  id: 'employee-2',
  companyId: 'company-1',
  fullName: 'Juan García',
  documentType: null,
  documentNumber: null,
  email: 'juan@vimcore.test',
  employmentStatus: 'active',
  hiredAt: null,
  createdAt: '2026-08-13T12:00:00.000Z',
  updatedAt: '2026-08-13T12:00:00.000Z',
};

const createdInvitation: CreatedErpAccessInvitation = {
  invitationId: 'invitation-2',
  invitationToken: 'token-2',
  companyId: 'company-1',
  employeeId: 'employee-2',
  inviteeEmail: 'person-2@vimcore.test',
  expiresAt: '2026-08-14T12:00:00.000Z',
};

const createAcceptWrapper = (initialEntries: string[]) => {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/hr-erp-access/accept/:token" element={children} />
        <Route path="/dashboard" element={<div>Dashboard home</div>} />
        <Route path="/dashboard/organization" element={<div>Organization landing</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('hr-erp-access pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEmployeesMock.mockReturnValue(
      queryOk<Employee[]>([employeeOne, employeeTwo]),
    );
    useInvitationsPageMock.mockReturnValue({
      invitationsQuery: queryOk<ErpAccessInvitationPage>({
        items: [
          {
            id: 'invitation-1',
            companyId: 'company-1',
            employeeId: 'employee-1',
            inviteeEmail: 'person@vimcore.test',
            createdAt: '2026-08-13T12:00:00.000Z',
            expiresAt: '2026-08-14T12:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      }),
      createInvitationMutation: mutationOk<
        CreatedErpAccessInvitation,
        CreateErpAccessInvitationInput
      >(createdInvitation),
      revokeAccessMutation: mutationOk<void, RevokeErpAccessInput>(),
    });
    useAcceptInvitationMock.mockReturnValue(
      mutationOk<void, AcceptErpAccessInvitationInput>(),
    );
    useAuthMock.mockReturnValue({
      ...queryOk(session),
      session,
      isAuthenticated: true,
      setActiveCompany: vi.fn(),
    });
  });

  it('renders invitations and submits invite and revoke actions', async () => {
    render(<InvitationsListPage session={session} />);

    expect(screen.getByText('person@vimcore.test')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nueva invitación' }));

    fireEvent.change(screen.getByLabelText('¿Qué empleado va a usar el sistema?'), {
      target: { value: 'employee-2' },
    });
    fireEvent.change(screen.getByLabelText('Correo de la persona invitada'), {
      target: { value: ' PERSON-2@VIMCORE.TEST ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    await waitFor(() => {
      expect(
        firstReturnValue(useInvitationsPageMock.mock.results)?.createInvitationMutation
          .mutateAsync,
      ).toHaveBeenCalledWith({
        companyId: 'company-1',
        employeeId: 'employee-2',
        inviteeEmail: 'person-2@vimcore.test',
      });
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Revocar acceso de la invitación de Ana Pérez',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Revocar' }));

    await waitFor(() => {
      expect(
        firstReturnValue(useInvitationsPageMock.mock.results)?.revokeAccessMutation
          .mutateAsync,
      ).toHaveBeenCalledWith({
        companyId: 'company-1',
        employeeId: 'employee-1',
      });
    });
  });

  it('accepts the invitation and redirects after refreshing auth', async () => {
    render(<AcceptErpAccessInvitationPage />, {
      wrapper: createAcceptWrapper(['/hr-erp-access/accept/token-1']),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Activar acceso ERP' }));

    expect(await screen.findByText('Organization landing')).toBeInTheDocument();
  });

  it('blocks mismatched passwords for a new account activation', async () => {
    render(<AcceptErpAccessInvitationPage />, {
      wrapper: createAcceptWrapper(['/hr-erp-access/accept/token-2']),
    });

    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'secret999' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Activar acceso ERP' }));

    expect(await screen.findByText('Las contraseñas deben coincidir.')).toBeInTheDocument();
  });
});
