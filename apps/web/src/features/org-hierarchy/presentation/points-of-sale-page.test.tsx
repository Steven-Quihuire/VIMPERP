import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '@/shared/lib/http/http-client';
import type { AuthSession } from '../../auth/domain/auth';
import type { Area, Local, PointOfSale } from '../domain/org-hierarchy';
import { PointsOfSalePage } from './points-of-sale-page';

type PointsOfSaleQueryResult = {
  data?: PointOfSale[];
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

type PointOfSaleMutationResult<TInput, TResult> = {
  mutateAsync: (input: TInput) => Promise<TResult>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
};

const usePointsOfSaleMock = vi.fn<() => PointsOfSaleQueryResult>();
const useAreasMock = vi.fn<() => AreasQueryResult>();
const useLocalsMock = vi.fn<() => LocalsQueryResult>();
const useCreatePointOfSaleMock = vi.fn<
  () =>
    PointOfSaleMutationResult<
      | { companyId: string; name: string; areaId: string }
      | { companyId: string; name: string; localId: string },
      PointOfSale
    >
>();
const useUpdatePointOfSaleMock = vi.fn<
  () =>
    PointOfSaleMutationResult<
      | { pointOfSaleId: string; name?: string; areaId: string }
      | { pointOfSaleId: string; name?: string; localId: string }
      | { pointOfSaleId: string; name: string },
      PointOfSale
    >
>();
const useDeletePointOfSaleMock = vi.fn<
  () => PointOfSaleMutationResult<string, void>
>();

vi.mock('../application/org-hierarchy-queries', () => ({
  usePointsOfSale: () => usePointsOfSaleMock(),
  useAreas: () => useAreasMock(),
  useLocals: () => useLocalsMock(),
  useCreatePointOfSale: () => useCreatePointOfSaleMock(),
  useUpdatePointOfSale: () => useUpdatePointOfSaleMock(),
  useDeletePointOfSale: () => useDeletePointOfSaleMock(),
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

const pointsOfSale: PointOfSale[] = [
  {
    id: 'pos-1',
    companyId: 'company-1',
    areaId: 'area-1',
    localId: null,
    name: 'POS 01',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
];

const localOwnedPointOfSale: PointOfSale = {
  id: 'pos-2',
  companyId: 'company-1',
  areaId: null,
  localId: 'local-1',
  name: 'POS Lobby',
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

describe('PointsOfSalePage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    usePointsOfSaleMock.mockReturnValue({
      data: pointsOfSale,
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
    useCreatePointOfSaleMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(pointsOfSale[0]),
      isPending: false,
      isError: false,
      error: null,
    });
    useUpdatePointOfSaleMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(pointsOfSale[0]),
      isPending: false,
      isError: false,
      error: null,
    });
    useDeletePointOfSaleMock.mockReturnValue({
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

  it('renders the points of sale list', () => {
    render(<PointsOfSalePage session={session} />, { wrapper: createWrapper() });

    expect(
      screen.getByRole('heading', { name: 'Puntos de venta' }),
    ).toBeInTheDocument();
    expect(screen.getByText('POS 01')).toBeInTheDocument();
    expect(screen.getByText(/Area: Operations/i)).toBeInTheDocument();
  });

  it('renders local-owned points of sale as local children', () => {
    usePointsOfSaleMock.mockReturnValue({
      data: [localOwnedPointOfSale],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<PointsOfSalePage session={session} />, { wrapper: createWrapper() });

    expect(screen.getByText('POS Lobby')).toBeInTheDocument();
    expect(screen.getByText(/Local: Central Store/i)).toBeInTheDocument();
  });

  it('opens a create dialog and submits a new point of sale', async () => {
    const createMutate = vi.fn().mockResolvedValue(pointsOfSale[0]);
    useCreatePointOfSaleMock.mockReturnValue({
      mutateAsync: createMutate,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<PointsOfSalePage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(
      screen.getByRole('button', { name: /Agregar punto de venta/i }),
    );

    const nameInput = await screen.findByLabelText('Nombre');
    fireEvent.change(nameInput, { target: { value: 'POS 02' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith({
        companyId: 'company-1',
        name: 'POS 02',
        areaId: 'area-1',
      });
    });
  });

  it('surfaces a conflict error when create fails with 409', async () => {
    useCreatePointOfSaleMock.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new HttpError('Point of sale exists', 409)),
      isPending: false,
      isError: true,
      error: new HttpError('Point of sale exists', 409),
    });

    render(<PointsOfSalePage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(
      screen.getByRole('button', { name: /Agregar punto de venta/i }),
    );
    const nameInput = await screen.findByLabelText('Nombre');
    fireEvent.change(nameInput, { target: { value: 'POS 01' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(screen.getByText('Point of sale exists')).toBeInTheDocument();
    });
  });

  it('deletes a point of sale on confirm', async () => {
    const deleteMutate = vi.fn().mockResolvedValue(undefined);
    useDeletePointOfSaleMock.mockReturnValue({
      mutateAsync: deleteMutate,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<PointsOfSalePage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /Eliminar POS 01/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));

    await waitFor(() => {
      expect(deleteMutate).toHaveBeenCalledWith('pos-1');
    });
  });
});
