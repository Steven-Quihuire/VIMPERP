import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSession } from '../../auth/domain/auth';
import { HttpError } from '@/shared/lib/http/http-client';
import type { Division } from '../domain/org-hierarchy';

import { DivisionsPage } from './divisions-page';

type DivisionsQueryResult = {
  data?: Division[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

type DivisionMutationResult<TInput, TResult> = {
  mutateAsync: (input: TInput) => Promise<TResult>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
};

const useDivisionsMock = vi.fn<() => DivisionsQueryResult>();
const useCreateDivisionMock = vi.fn<
  () => DivisionMutationResult<{ companyId: string; name: string }, Division>
>();
const useUpdateDivisionMock = vi.fn<
  () => DivisionMutationResult<
    { divisionId: string; name: string },
    Division
  >
>();
const useDeleteDivisionMock = vi.fn<
  () => DivisionMutationResult<string, void>
>();

vi.mock('../application/org-hierarchy-queries', () => ({
  useDivisions: () => useDivisionsMock(),
  useCreateDivision: () => useCreateDivisionMock(),
  useUpdateDivision: () => useUpdateDivisionMock(),
  useDeleteDivision: () => useDeleteDivisionMock(),
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

describe('DivisionsPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    useDivisionsMock.mockReturnValue({
      data: divisions,
      isLoading: false,
      isError: false,
      error: null,
    });
    useCreateDivisionMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(divisions[0]),
      isPending: false,
      isError: false,
      error: null,
    });
    useUpdateDivisionMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(divisions[0]),
      isPending: false,
      isError: false,
      error: null,
    });
    useDeleteDivisionMock.mockReturnValue({
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

  it('renders the division list', () => {
    render(<DivisionsPage session={session} />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: 'Divisiones' })).toBeInTheDocument();
    expect(screen.getByText('North Division')).toBeInTheDocument();
  });

  it('opens a create dialog and submits a new division', async () => {
    const createMutate = vi.fn().mockResolvedValue(divisions[0]);
    useCreateDivisionMock.mockReturnValue({
      mutateAsync: createMutate,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<DivisionsPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /Agregar división/i }));

    const nameInput = await screen.findByLabelText('Nombre');
    fireEvent.change(nameInput, { target: { value: 'South Division' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith({
        companyId: 'company-1',
        name: 'South Division',
      });
    });
  });

  it('surfaces a conflict error when create fails with 409', async () => {
    useCreateDivisionMock.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(
        new HttpError('Division name already exists', 409),
      ),
      isPending: false,
      isError: true,
      error: new HttpError('Division name already exists', 409),
    });

    render(<DivisionsPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /Agregar división/i }));
    const nameInput = await screen.findByLabelText('Nombre');
    fireEvent.change(nameInput, { target: { value: 'North Division' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('deletes a division on confirm', async () => {
    const deleteMutate = vi.fn().mockResolvedValue(undefined);
    useDeleteDivisionMock.mockReturnValue({
      mutateAsync: deleteMutate,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<DivisionsPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /Eliminar North Division/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));

    await waitFor(() => {
      expect(deleteMutate).toHaveBeenCalledWith('division-1');
    });
  });
});
