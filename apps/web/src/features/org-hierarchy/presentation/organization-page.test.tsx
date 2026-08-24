import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sileo } from 'sileo';

import type { AuthSession } from '../../auth/domain/auth';
import type { DashboardCurrentCompanySummary } from '../../dashboard/domain/dashboard';
import type {
  Area,
  CreateDivisionInput,
  Division,
  Local,
  PointOfSale,
  Warehouse,
} from '../domain/org-hierarchy';
import type {
  CreateNodeManagementInvitationInput,
  CreatedNodeManagementInvitation,
  NodeResponsibilityRecord,
  PendingNodeManagementInvitation,
} from '../../node-management/domain/node-management';

import type * as dashboardQueries from '../../dashboard/presentation/use-dashboard';
import type * as nodeManagementQueries from '../../node-management/application/node-management-queries';
import type * as orgHierarchyQueries from '../application/org-hierarchy-queries';

import { OrganizationPage } from './organization-page';

const useDivisionsMock = vi.fn<
  () => ReturnType<typeof orgHierarchyQueries.useDivisions>
>();
const useLocalsMock = vi.fn<() => ReturnType<typeof orgHierarchyQueries.useLocals>>();
const useAreasMock = vi.fn<() => ReturnType<typeof orgHierarchyQueries.useAreas>>();
const useWarehousesMock = vi.fn<
  () => ReturnType<typeof orgHierarchyQueries.useWarehouses>
>();
const usePointsOfSaleMock = vi.fn<
  () => ReturnType<typeof orgHierarchyQueries.usePointsOfSale>
>();
const useCreateDivisionMock = vi.fn<
  () => ReturnType<typeof orgHierarchyQueries.useCreateDivision>
>();
const useCreateLocalMock = vi.fn<() => ReturnType<typeof orgHierarchyQueries.useCreateLocal>>();
const useCreateAreaMock = vi.fn<() => ReturnType<typeof orgHierarchyQueries.useCreateArea>>();
const useCreateWarehouseMock = vi.fn<
  () => ReturnType<typeof orgHierarchyQueries.useCreateWarehouse>
>();
const useCreatePointOfSaleMock = vi.fn<
  () => ReturnType<typeof orgHierarchyQueries.useCreatePointOfSale>
>();
const useUpdateDivisionMock = vi.fn<
  () => ReturnType<typeof orgHierarchyQueries.useUpdateDivision>
>();
const useUpdateLocalMock = vi.fn<() => ReturnType<typeof orgHierarchyQueries.useUpdateLocal>>();
const useUpdateAreaMock = vi.fn<() => ReturnType<typeof orgHierarchyQueries.useUpdateArea>>();
const useUpdateWarehouseMock = vi.fn<
  () => ReturnType<typeof orgHierarchyQueries.useUpdateWarehouse>
>();
const useUpdatePointOfSaleMock = vi.fn<
  () => ReturnType<typeof orgHierarchyQueries.useUpdatePointOfSale>
>();
const useDeleteDivisionMock = vi.fn<
  () => ReturnType<typeof orgHierarchyQueries.useDeleteDivision>
>();
const useDeleteLocalMock = vi.fn<() => ReturnType<typeof orgHierarchyQueries.useDeleteLocal>>();
const useDeleteAreaMock = vi.fn<() => ReturnType<typeof orgHierarchyQueries.useDeleteArea>>();
const useDeleteWarehouseMock = vi.fn<
  () => ReturnType<typeof orgHierarchyQueries.useDeleteWarehouse>
>();
const useDeletePointOfSaleMock = vi.fn<
  () => ReturnType<typeof orgHierarchyQueries.useDeletePointOfSale>
>();
const useDashboardCurrentCompanyMock = vi.fn<
  () => ReturnType<typeof dashboardQueries.useDashboardCurrentCompany>
>();
const useNodeManagementResponsibilitiesMock = vi.fn<
  () => ReturnType<typeof nodeManagementQueries.useNodeManagementResponsibilities>
>();
const useNodeManagementPendingInvitationsMock = vi.fn<
  () => ReturnType<typeof nodeManagementQueries.useNodeManagementPendingInvitations>
>();
const useCreateNodeManagementInvitationMock = vi.fn<
  () => ReturnType<typeof nodeManagementQueries.useCreateNodeManagementInvitation>
>();

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

vi.mock('../application/org-hierarchy-queries', () => ({
  useDivisions: () => useDivisionsMock(),
  useLocals: () => useLocalsMock(),
  useAreas: () => useAreasMock(),
  useWarehouses: () => useWarehousesMock(),
  usePointsOfSale: () => usePointsOfSaleMock(),
  useCreateDivision: () => useCreateDivisionMock(),
  useCreateLocal: () => useCreateLocalMock(),
  useCreateArea: () => useCreateAreaMock(),
  useCreateWarehouse: () => useCreateWarehouseMock(),
  useCreatePointOfSale: () => useCreatePointOfSaleMock(),
  useUpdateDivision: () => useUpdateDivisionMock(),
  useUpdateLocal: () => useUpdateLocalMock(),
  useUpdateArea: () => useUpdateAreaMock(),
  useUpdateWarehouse: () => useUpdateWarehouseMock(),
  useUpdatePointOfSale: () => useUpdatePointOfSaleMock(),
  useDeleteDivision: () => useDeleteDivisionMock(),
  useDeleteLocal: () => useDeleteLocalMock(),
  useDeleteArea: () => useDeleteAreaMock(),
  useDeleteWarehouse: () => useDeleteWarehouseMock(),
  useDeletePointOfSale: () => useDeletePointOfSaleMock(),
}));

vi.mock('../../dashboard/presentation/use-dashboard', () => ({
  useDashboardCurrentCompany: () => useDashboardCurrentCompanyMock(),
}));

vi.mock('../../node-management/application/node-management-queries', () => ({
  useNodeManagementResponsibilities: () => useNodeManagementResponsibilitiesMock(),
  useNodeManagementPendingInvitations: () => useNodeManagementPendingInvitationsMock(),
  useCreateNodeManagementInvitation: () => useCreateNodeManagementInvitationMock(),
}));

vi.mock('sileo', () => ({
  sileo: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

const session: AuthSession = {
  user: { id: 'user-1', email: 'owner@vimcore.test', username: 'owner' },
  memberships: [
    { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
  ],
  activeCompany: { companyId: 'company-1', status: 'active' },
  activeScope: null,
  activeLocalId: null,
  capabilities: ['catalog.read', 'catalog.write', 'catalog.delete'],
};

const createdDivision: Division = {
  id: 'division-2',
  companyId: 'company-1',
  name: 'New Division',
  createdAt: '2026-08-13T10:00:00.000Z',
};

const createdInvitation: CreatedNodeManagementInvitation = {
  invitationId: 'inv-2',
  invitationToken: 'token-2',
  inviteeEmail: 'new.manager@vimcore.test',
  companyId: 'company-1',
  companyName: 'Vimcore Labs',
  scopeNodeId: 'scope-division-2',
  scopeType: 'division',
  scopeId: 'division-2',
  scopeName: 'New Division',
  expiresAt: '2026-08-20T10:00:00.000Z',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe('OrganizationPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal(
      'DOMMatrixReadOnly',
      class DOMMatrixReadOnly {
        m22 = 1;
        inverse() {
          return this;
        }
      },
    );

    useDivisionsMock.mockReturnValue(queryOk<Division[]>([]));
    useLocalsMock.mockReturnValue(
      queryOk<Local[]>([
        {
          id: 'local-1',
          companyId: 'company-1',
          divisionId: null,
          name: 'Central Store',
          locale: null,
        },
      ]),
    );
    useAreasMock.mockReturnValue(
      queryOk<Area[]>([
        {
          id: 'area-1',
          companyId: 'company-1',
          divisionId: null,
          localId: 'local-1',
          name: 'Area Norte',
          kind: 'area',
          createdAt: '2026-08-13T10:00:00.000Z',
        },
      ]),
    );
    useWarehousesMock.mockReturnValue(queryOk<Warehouse[]>([]));
    usePointsOfSaleMock.mockReturnValue(queryOk<PointOfSale[]>([]));
    useDashboardCurrentCompanyMock.mockReturnValue(
      queryOk<DashboardCurrentCompanySummary | null>({
        companyId: 'company-1',
        name: 'Vimcore Labs',
      }),
    );
    useCreateDivisionMock.mockReturnValue(mutationOk());
    useCreateLocalMock.mockReturnValue(mutationOk());
    useCreateAreaMock.mockReturnValue(mutationOk());
    useCreateWarehouseMock.mockReturnValue(mutationOk());
    useCreatePointOfSaleMock.mockReturnValue(mutationOk());
    useUpdateDivisionMock.mockReturnValue(mutationOk());
    useUpdateLocalMock.mockReturnValue(mutationOk());
    useUpdateAreaMock.mockReturnValue(mutationOk());
    useUpdateWarehouseMock.mockReturnValue(mutationOk());
    useUpdatePointOfSaleMock.mockReturnValue(mutationOk());
    useDeleteDivisionMock.mockReturnValue(mutationOk());
    useDeleteLocalMock.mockReturnValue(mutationOk());
    useDeleteAreaMock.mockReturnValue(mutationOk());
    useDeleteWarehouseMock.mockReturnValue(mutationOk());
    useDeletePointOfSaleMock.mockReturnValue(mutationOk());
    useNodeManagementResponsibilitiesMock.mockReturnValue(
      queryOk<NodeResponsibilityRecord[]>([
        {
          id: 'resp-1',
          companyId: 'company-1',
          scopeNodeId: 'scope-local-1',
          scopeType: 'local',
          scopeId: 'local-1',
          scopeName: 'Central Store',
          responsibleUserId: 'user-2',
          responsibleUserEmail: 'manager@vimcore.test',
          responsibleUsername: 'manager',
          managedRoleKey: 'node-manager',
          assignmentMode: 'subtree_inclusive',
          baseMembershipRole: 'company-user',
          isActive: true,
          createdAt: '2026-08-13T10:00:00.000Z',
          updatedAt: '2026-08-13T10:00:00.000Z',
          endedAt: null,
        },
      ]),
    );
    useNodeManagementPendingInvitationsMock.mockReturnValue(
      queryOk<PendingNodeManagementInvitation[]>([
        {
          id: 'inv-1',
          companyId: 'company-1',
          scopeNodeId: 'scope-area-1',
          scopeType: 'area',
          scopeId: 'area-1',
          scopeName: 'Area Norte',
          inviteeEmail: 'pending@vimcore.test',
          createdAt: '2026-08-13T10:00:00.000Z',
          expiresAt: '2026-08-20T10:00:00.000Z',
        },
      ]),
    );
    useCreateNodeManagementInvitationMock.mockReturnValue(
      mutationOk<CreatedNodeManagementInvitation, CreateNodeManagementInvitationInput>(
        createdInvitation,
      ),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders compact node responsibility states in the organization graph', async () => {
    render(<OrganizationPage session={session} />, { wrapper: createWrapper() });

    expect(await screen.findAllByText('Responsable activo')).not.toHaveLength(0);
    expect(screen.getByText('manager · manager@vimcore.test')).toBeInTheDocument();
    expect(screen.getAllByText('Invitacion pendiente').length).toBeGreaterThan(0);
    expect(screen.getByText(/pending@vimcore.test/i)).toBeInTheDocument();
    expect(screen.getAllByText('Sin responsable').length).toBeGreaterThan(0);
  });

  it('creates a node and its optional responsible invitation from the create sheet', async () => {
    const createDivisionMutateAsync = vi
      .fn<(input: CreateDivisionInput) => Promise<Division>>()
      .mockResolvedValue(createdDivision);
    const createInvitationMutateAsync = vi
      .fn<
        (input: CreateNodeManagementInvitationInput) => Promise<CreatedNodeManagementInvitation>
      >()
      .mockResolvedValue({ ...createdInvitation, delivery: { status: 'sent' } });
    useCreateDivisionMock.mockReturnValue(
      mutationOk(createDivisionMutateAsync),
    );
    useCreateNodeManagementInvitationMock.mockReturnValue(
      mutationOk(createInvitationMutateAsync),
    );

    render(<OrganizationPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(await screen.findByLabelText('Agregar hijo a Empresa'));

    const dialog = await screen.findByText((content) => content.includes('Crear') && content.includes('división'));
    const sheet = dialog.closest('[role="dialog"]');
    expect(sheet).not.toBeNull();
    const scope = within(sheet as HTMLElement);

    fireEvent.change(scope.getByLabelText('Nombre'), {
      target: { value: 'New Division' },
    });
    fireEvent.change(scope.getByLabelText('Correo del responsable'), {
      target: { value: 'new.manager@vimcore.test' },
    });
    fireEvent.click(scope.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(createDivisionMutateAsync).toHaveBeenCalledWith({
        companyId: 'company-1',
        name: 'New Division',
      });
      expect(createInvitationMutateAsync).toHaveBeenCalledWith({
        companyId: 'company-1',
        scopeType: 'division',
        scopeId: 'division-2',
        inviteeEmail: 'new.manager@vimcore.test',
      });
    });

    expect(sileo.success).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Invitation email sent to new.manager@vimcore.test.',
      }),
    );
  });

  it('warns when the invitation is created but email delivery is skipped or fails', async () => {
    const createDivisionMutateAsync = vi
      .fn<(input: CreateDivisionInput) => Promise<Division>>()
      .mockResolvedValue(createdDivision);
    const createInvitationMutateAsync = vi
      .fn<
        (input: CreateNodeManagementInvitationInput) => Promise<CreatedNodeManagementInvitation>
      >()
      .mockResolvedValue({
        ...createdInvitation,
        delivery: {
          status: 'failed',
          message: 'provider timeout',
        },
      });
    useCreateDivisionMock.mockReturnValue(
      mutationOk(createDivisionMutateAsync),
    );
    useCreateNodeManagementInvitationMock.mockReturnValue(
      mutationOk(createInvitationMutateAsync),
    );

    render(<OrganizationPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(await screen.findByLabelText('Agregar hijo a Empresa'));

    const dialog = await screen.findByText((content) => content.includes('Crear') && content.includes('división'));
    const sheet = dialog.closest('[role="dialog"]');
    expect(sheet).not.toBeNull();
    const scope = within(sheet as HTMLElement);

    fireEvent.change(scope.getByLabelText('Nombre'), {
      target: { value: 'New Division' },
    });
    fireEvent.change(scope.getByLabelText('Correo del responsable'), {
      target: { value: 'new.manager@vimcore.test' },
    });
    fireEvent.click(scope.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(sileo.warning).toHaveBeenCalledWith(
        expect.objectContaining({
          description:
            'Invitation created for new.manager@vimcore.test, but email delivery failed: provider timeout',
        }),
      );
    });
  });

  it('keeps the create sheet open when the invitation fails after node creation', async () => {
    const createDivisionMutateAsync = vi
      .fn<(input: CreateDivisionInput) => Promise<Division>>()
      .mockResolvedValue(createdDivision);
    const createInvitationMutateAsync = vi
      .fn<
        (input: CreateNodeManagementInvitationInput) => Promise<CreatedNodeManagementInvitation>
      >()
      .mockRejectedValue(new Error('No se pudo crear la invitación.'));
    useCreateDivisionMock.mockReturnValue(
      mutationOk(createDivisionMutateAsync),
    );
    useCreateNodeManagementInvitationMock.mockReturnValue(
      mutationOk(createInvitationMutateAsync),
    );

    render(<OrganizationPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(await screen.findByLabelText('Agregar hijo a Empresa'));

    const dialog = await screen.findByText((content) => content.includes('Crear') && content.includes('división'));
    const sheet = dialog.closest('[role="dialog"]');
    expect(sheet).not.toBeNull();
    const scope = within(sheet as HTMLElement);

    fireEvent.change(scope.getByLabelText('Nombre'), {
      target: { value: 'New Division' },
    });
    fireEvent.change(scope.getByLabelText('Correo del responsable'), {
      target: { value: 'new.manager@vimcore.test' },
    });
    fireEvent.click(scope.getByRole('button', { name: 'Guardar' }));

    expect(
      await scope.findByText('No se pudo crear la invitación.'),
    ).toBeInTheDocument();
    expect(
      scope.getByText(
        /el nodo ya fue creado. podés corregir el correo y reintentar la invitación/i,
      ),
    ).toBeInTheDocument();

    fireEvent.change(scope.getByLabelText('Correo del responsable'), {
      target: { value: 'retry.manager@vimcore.test' },
    });

    createInvitationMutateAsync.mockResolvedValueOnce({
      ...createdInvitation,
      invitationId: 'inv-3',
      invitationToken: 'token-3',
      inviteeEmail: 'retry.manager@vimcore.test',
    });
    fireEvent.click(scope.getByRole('button', { name: 'Reintentar invitación' }));

    await waitFor(() => {
      expect(createDivisionMutateAsync).toHaveBeenCalledTimes(1);
      expect(createInvitationMutateAsync).toHaveBeenLastCalledWith({
        companyId: 'company-1',
        scopeType: 'division',
        scopeId: 'division-2',
        inviteeEmail: 'retry.manager@vimcore.test',
      });
    });
  });
});
