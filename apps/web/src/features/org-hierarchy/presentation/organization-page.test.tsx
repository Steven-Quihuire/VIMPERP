import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSession } from '../../auth/domain/auth';

import { OrganizationPage } from './organization-page';

const useDivisionsMock = vi.fn();
const useLocalsMock = vi.fn();
const useAreasMock = vi.fn();
const useWarehousesMock = vi.fn();
const usePointsOfSaleMock = vi.fn();
const useCreateDivisionMock = vi.fn();
const useCreateLocalMock = vi.fn();
const useCreateAreaMock = vi.fn();
const useCreateWarehouseMock = vi.fn();
const useCreatePointOfSaleMock = vi.fn();
const useUpdateDivisionMock = vi.fn();
const useUpdateLocalMock = vi.fn();
const useUpdateAreaMock = vi.fn();
const useUpdateWarehouseMock = vi.fn();
const useUpdatePointOfSaleMock = vi.fn();
const useDeleteDivisionMock = vi.fn();
const useDeleteLocalMock = vi.fn();
const useDeleteAreaMock = vi.fn();
const useDeleteWarehouseMock = vi.fn();
const useDeletePointOfSaleMock = vi.fn();
const useDashboardCurrentCompanyMock = vi.fn();
const useNodeManagementResponsibilitiesMock = vi.fn();
const useNodeManagementPendingInvitationsMock = vi.fn();
const useCreateNodeManagementInvitationMock = vi.fn();

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

    useDivisionsMock.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    useLocalsMock.mockReturnValue({ data: [{ id: 'local-1', companyId: 'company-1', divisionId: null, name: 'Central Store', locale: null }], isLoading: false, isError: false, error: null });
    useAreasMock.mockReturnValue({ data: [{ id: 'area-1', companyId: 'company-1', divisionId: null, localId: 'local-1', name: 'Area Norte', kind: 'area', createdAt: '2026-08-13T10:00:00.000Z' }], isLoading: false, isError: false, error: null });
    useWarehousesMock.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    usePointsOfSaleMock.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    useDashboardCurrentCompanyMock.mockReturnValue({ data: { name: 'Vimcore Labs' } });
    useCreateDivisionMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useCreateLocalMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useCreateAreaMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useCreateWarehouseMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useCreatePointOfSaleMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useUpdateDivisionMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useUpdateLocalMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useUpdateAreaMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useUpdateWarehouseMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useUpdatePointOfSaleMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useDeleteDivisionMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useDeleteLocalMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useDeleteAreaMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useDeleteWarehouseMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useDeletePointOfSaleMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null });
    useNodeManagementResponsibilitiesMock.mockReturnValue({
      data: [{
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
      }],
      isLoading: false,
      isError: false,
      error: null,
    });
    useNodeManagementPendingInvitationsMock.mockReturnValue({
      data: [{
        id: 'inv-1',
        companyId: 'company-1',
        scopeNodeId: 'scope-area-1',
        scopeType: 'area',
        scopeId: 'area-1',
        scopeName: 'Area Norte',
        inviteeEmail: 'pending@vimcore.test',
        createdAt: '2026-08-13T10:00:00.000Z',
        expiresAt: '2026-08-20T10:00:00.000Z',
      }],
      isLoading: false,
      isError: false,
      error: null,
    });
    useCreateNodeManagementInvitationMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        invitationId: 'inv-2',
        invitationToken: 'token-2',
        inviteeEmail: 'new.manager@vimcore.test',
      }),
      isPending: false,
    });
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

  it('creates an invitation from the compact panel', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      invitationId: 'inv-2',
      invitationToken: 'token-2',
      inviteeEmail: 'new.manager@vimcore.test',
    });
    useCreateNodeManagementInvitationMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    render(<OrganizationPage session={session} />, { wrapper: createWrapper() });

    fireEvent.change(await screen.findByLabelText('Correo del responsable'), {
      target: { value: 'new.manager@vimcore.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear invitación' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        companyId: 'company-1',
        scopeType: 'local',
        scopeId: 'local-1',
        inviteeEmail: 'new.manager@vimcore.test',
      });
    });

    expect(await screen.findByText(/accept-invitation\/token-2/i)).toBeInTheDocument();
  });
});
