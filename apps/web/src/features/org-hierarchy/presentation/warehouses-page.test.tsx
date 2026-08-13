import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSession } from '../../auth/domain/auth';
import { HttpError } from '@/shared/lib/http/http-client';
import type { Area, Local, Warehouse } from '../domain/org-hierarchy';

import { WarehousesPage } from './warehouses-page';

type WarehousesQueryResult = {
  data?: Warehouse[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

type AreasQueryResult = {
  data?: Area[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

type LocalsQueryResult = {
  data?: Local[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

type WarehouseMutationResult<TInput, TResult> = {
  mutateAsync: (input: TInput) => Promise<TResult>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
};

const useWarehousesMock = vi.fn<() => WarehousesQueryResult>();
const useAreasMock = vi.fn<() => AreasQueryResult>();
const useLocalsMock = vi.fn<() => LocalsQueryResult>();
const useCreateWarehouseMock = vi.fn<
  () => WarehouseMutationResult<
    | { companyId: string; name: string; areaId: string }
    | { companyId: string; name: string; localId: string },
    Warehouse
  >
>();
const useUpdateWarehouseMock = vi.fn<
  () => WarehouseMutationResult<
    | { warehouseId: string; name?: string; areaId: string }
    | { warehouseId: string; name?: string; localId: string }
    | { warehouseId: string; name: string },
    Warehouse
  >
>();
const useDeleteWarehouseMock = vi.fn<() => WarehouseMutationResult<string, void>>();

vi.mock('../application/org-hierarchy-queries', () => ({
  useWarehouses: () => useWarehousesMock(),
  useAreas: () => useAreasMock(),
  useLocals: () => useLocalsMock(),
  useCreateWarehouse: () => useCreateWarehouseMock(),
  useUpdateWarehouse: () => useUpdateWarehouseMock(),
  useDeleteWarehouse: () => useDeleteWarehouseMock(),
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

const areas: Area[] = [
  {
    id: 'area-1',
    companyId: 'company-1',
    divisionId: null,
    localId: 'local-1',
    name: 'Operations',
    kind: 'area',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
];

const locals: Local[] = [
  {
    id: 'local-1',
    companyId: 'company-1',
    divisionId: null,
    name: 'Central Store',
    locale: null,
  },
];

const warehouses: Warehouse[] = [
  {
    id: 'warehouse-1',
    companyId: 'company-1',
    areaId: 'area-1',
    localId: null,
    name: 'Main Warehouse',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
];

const localOwnedWarehouse: Warehouse = {
  id: 'warehouse-2',
  companyId: 'company-1',
  areaId: null,
  localId: 'local-1',
  name: 'Backroom Storage',
  createdAt: '2026-08-01T10:00:00.000Z',
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

describe('WarehousesPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    useWarehousesMock.mockReturnValue({
      data: warehouses,
      isLoading: false,
      isError: false,
      error: null,
    });
    useAreasMock.mockReturnValue({
      data: areas,
      isLoading: false,
      isError: false,
      error: null,
    });
    useLocalsMock.mockReturnValue({
      data: locals,
      isLoading: false,
      isError: false,
      error: null,
    });
    useCreateWarehouseMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(warehouses[0]),
      isPending: false,
      isError: false,
      error: null,
    });
    useUpdateWarehouseMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(warehouses[0]),
      isPending: false,
      isError: false,
      error: null,
    });
    useDeleteWarehouseMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
      isError: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the warehouse list', () => {
    render(<WarehousesPage session={session} />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: 'Almacenes' })).toBeInTheDocument();
    expect(screen.getByText('Main Warehouse')).toBeInTheDocument();
    expect(screen.getByText(/Area: Operations/i)).toBeInTheDocument();
  });

  it('renders local-owned warehouses as local children', () => {
    useWarehousesMock.mockReturnValue({
      data: [localOwnedWarehouse],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<WarehousesPage session={session} />, { wrapper: createWrapper() });

    expect(screen.getByText('Backroom Storage')).toBeInTheDocument();
    expect(screen.getByText(/Local: Central Store/i)).toBeInTheDocument();
  });

  it('opens a create dialog and submits a new warehouse', async () => {
    const createMutate = vi.fn().mockResolvedValue(warehouses[0]);
    useCreateWarehouseMock.mockReturnValue({
      mutateAsync: createMutate,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<WarehousesPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /Agregar almacen/i }));

    const nameInput = await screen.findByLabelText('Nombre');
    fireEvent.change(nameInput, { target: { value: 'Reserve Warehouse' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith({
        companyId: 'company-1',
        name: 'Reserve Warehouse',
        areaId: 'area-1',
      });
    });
  });

  it('surfaces a conflict error when create fails with 409', async () => {
    useCreateWarehouseMock.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new HttpError('Warehouse exists', 409)),
      isPending: false,
      isError: true,
      error: new HttpError('Warehouse exists', 409),
    });

    render(<WarehousesPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /Agregar almacen/i }));
    const nameInput = await screen.findByLabelText('Nombre');
    fireEvent.change(nameInput, { target: { value: 'Main Warehouse' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(screen.getByText('Warehouse exists')).toBeInTheDocument();
    });
  });

  it('deletes a warehouse on confirm', async () => {
    const deleteMutate = vi.fn().mockResolvedValue(undefined);
    useDeleteWarehouseMock.mockReturnValue({
      mutateAsync: deleteMutate,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<WarehousesPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /Eliminar Main Warehouse/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));

    await waitFor(() => {
      expect(deleteMutate).toHaveBeenCalledWith('warehouse-1');
    });
  });
});
