import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSession } from '../../auth/domain/auth';
import { HttpError } from '@/shared/lib/http/http-client';
import type { Area, Division, Local } from '../domain/org-hierarchy';

import { AreasPage } from './areas-page';

type AreasQueryResult = {
  data?: Area[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

type DivisionsQueryResult = {
  data?: Division[];
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

type AreaMutationResult<TInput, TResult> = {
  mutateAsync: (input: TInput) => Promise<TResult>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
};

const useAreasMock = vi.fn<() => AreasQueryResult>();
const useDivisionsMock = vi.fn<() => DivisionsQueryResult>();
const useLocalsMock = vi.fn<() => LocalsQueryResult>();
const useCreateAreaMock = vi.fn<
  () => AreaMutationResult<
    | { companyId: string; name: string; divisionId: string }
    | { companyId: string; name: string; localId: string },
    Area
  >
>();
const useUpdateAreaMock = vi.fn<
  () => AreaMutationResult<
    | { areaId: string; name?: string; divisionId: string }
    | { areaId: string; name?: string; localId: string }
    | { areaId: string; name: string },
    Area
  >
>();
const useDeleteAreaMock = vi.fn<() => AreaMutationResult<string, void>>();

vi.mock('../application/org-hierarchy-queries', () => ({
  useAreas: () => useAreasMock(),
  useDivisions: () => useDivisionsMock(),
  useLocals: () => useLocalsMock(),
  useCreateArea: () => useCreateAreaMock(),
  useUpdateArea: () => useUpdateAreaMock(),
  useDeleteArea: () => useDeleteAreaMock(),
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

const divisions: Division[] = [
  {
    id: 'division-1',
    companyId: 'company-1',
    name: 'North Division',
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

const areas: Area[] = [
  {
    id: 'area-1',
    companyId: 'company-1',
    divisionId: 'division-1',
    localId: null,
    name: 'Operations',
    kind: 'area',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
];

const localOwnedArea: Area = {
  id: 'area-2',
  companyId: 'company-1',
  divisionId: null,
  localId: 'local-1',
  name: 'Cashiers',
  kind: 'area',
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

describe('AreasPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    useAreasMock.mockReturnValue({
      data: areas,
      isLoading: false,
      isError: false,
      error: null,
    });
    useDivisionsMock.mockReturnValue({
      data: divisions,
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
    useCreateAreaMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(areas[0]),
      isPending: false,
      isError: false,
      error: null,
    });
    useUpdateAreaMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(areas[0]),
      isPending: false,
      isError: false,
      error: null,
    });
    useDeleteAreaMock.mockReturnValue({
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

  it('renders the area list', () => {
    render(<AreasPage session={session} />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: 'Areas' })).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText(/Division: North Division/i)).toBeInTheDocument();
  });

  it('renders local-owned areas as local children', () => {
    useAreasMock.mockReturnValue({
      data: [localOwnedArea],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<AreasPage session={session} />, { wrapper: createWrapper() });

    expect(screen.getByText('Cashiers')).toBeInTheDocument();
    expect(screen.getByText(/Local: Central Store/i)).toBeInTheDocument();
  });

  it('opens a create dialog and submits a new area', async () => {
    const createMutate = vi.fn().mockResolvedValue(areas[0]);
    useCreateAreaMock.mockReturnValue({
      mutateAsync: createMutate,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<AreasPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /Agregar area/i }));

    const nameInput = await screen.findByLabelText('Nombre');
    fireEvent.change(nameInput, { target: { value: 'Support' } });
    fireEvent.change(screen.getByRole('combobox', { name: /Tipo de padre/i }), {
      target: { value: 'division' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /Padre del area/i }), {
      target: { value: 'division-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith({
        companyId: 'company-1',
        name: 'Support',
        divisionId: 'division-1',
      });
    });
  });

  it('surfaces a conflict error when create fails with 409', async () => {
    useCreateAreaMock.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new HttpError('Area exists', 409)),
      isPending: false,
      isError: true,
      error: new HttpError('Area exists', 409),
    });

    render(<AreasPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /Agregar area/i }));
    const nameInput = await screen.findByLabelText('Nombre');
    fireEvent.change(nameInput, { target: { value: 'Operations' } });
    fireEvent.change(screen.getByRole('combobox', { name: /Tipo de padre/i }), {
      target: { value: 'division' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /Padre del area/i }), {
      target: { value: 'division-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(screen.getByText('Area exists')).toBeInTheDocument();
    });
  });

  it('deletes an area on confirm', async () => {
    const deleteMutate = vi.fn().mockResolvedValue(undefined);
    useDeleteAreaMock.mockReturnValue({
      mutateAsync: deleteMutate,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<AreasPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /Eliminar Operations/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));

    await waitFor(() => {
      expect(deleteMutate).toHaveBeenCalledWith('area-1');
    });
  });
});
