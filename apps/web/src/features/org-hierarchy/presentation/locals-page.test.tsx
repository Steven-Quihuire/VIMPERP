import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSession } from '../../auth/domain/auth';
import { HttpError } from '@/shared/lib/http/http-client';
import type { Division, Local } from '../domain/org-hierarchy';

import { LocalsPage } from './locals-page';

type LocalsQueryResult = {
  data?: Local[];
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

type LocalMutationResult<TInput, TResult> = {
  mutateAsync: (input: TInput) => Promise<TResult>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
};

const useLocalsMock = vi.fn<() => LocalsQueryResult>();
const useDivisionsMock = vi.fn<() => DivisionsQueryResult>();
const useCreateLocalMock = vi.fn<
  () => LocalMutationResult<
    { companyId: string; name: string; divisionId?: string | null },
    Local
  >
>();
const useUpdateLocalMock = vi.fn<
  () => LocalMutationResult<
    { localId: string; name?: string; divisionId?: string | null },
    Local
  >
>();
const useDeleteLocalMock = vi.fn<() => LocalMutationResult<string, void>>();

vi.mock('../application/org-hierarchy-queries', () => ({
  useLocals: () => useLocalsMock(),
  useDivisions: () => useDivisionsMock(),
  useCreateLocal: () => useCreateLocalMock(),
  useUpdateLocal: () => useUpdateLocalMock(),
  useDeleteLocal: () => useDeleteLocalMock(),
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
    divisionId: 'division-1',
    name: 'Central Store',
    locale: null,
  },
];

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

describe('LocalsPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    useLocalsMock.mockReturnValue({
      data: locals,
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
    useCreateLocalMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(locals[0]),
      isPending: false,
      isError: false,
      error: null,
    });
    useUpdateLocalMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(locals[0]),
      isPending: false,
      isError: false,
      error: null,
    });
    useDeleteLocalMock.mockReturnValue({
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

  it('renders the local list with division name', () => {
    render(<LocalsPage session={session} />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: 'Locales' })).toBeInTheDocument();
    expect(screen.getByText('Central Store')).toBeInTheDocument();
    expect(screen.getByText('North Division')).toBeInTheDocument();
  });

  it('opens a create dialog and submits a new local', async () => {
    const createMutate = vi.fn().mockResolvedValue(locals[0]);
    useCreateLocalMock.mockReturnValue({
      mutateAsync: createMutate,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<LocalsPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /Agregar local/i }));

    const nameInput = await screen.findByLabelText('Nombre');
    fireEvent.change(nameInput, { target: { value: 'South Store' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'company-1',
          name: 'South Store',
        }),
      );
    });
  });

  it('surfaces a conflict error when create fails with 409', async () => {
    useCreateLocalMock.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(
        new HttpError('Local name already exists', 409),
      ),
      isPending: false,
      isError: true,
      error: new HttpError('Local name already exists', 409),
    });

    render(<LocalsPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /Agregar local/i }));
    const nameInput = await screen.findByLabelText('Nombre');
    fireEvent.change(nameInput, { target: { value: 'Central Store' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('deletes a local on confirm', async () => {
    const deleteMutate = vi.fn().mockResolvedValue(undefined);
    useDeleteLocalMock.mockReturnValue({
      mutateAsync: deleteMutate,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<LocalsPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /Eliminar Central Store/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));

    await waitFor(() => {
      expect(deleteMutate).toHaveBeenCalledWith('local-1');
    });
  });
});
