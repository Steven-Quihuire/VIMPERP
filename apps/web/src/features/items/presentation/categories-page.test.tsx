import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSession } from '../../auth/domain/auth';
import { HttpError } from '@/shared/lib/http/http-client';

import { CategoriesPage } from './categories-page';

type CategoriesQueryResult = {
  data?: {
    categories: Array<{ id: string; companyId: string; parentId: string | null; name: string; createdAt: string }>;
  };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

type CategoryMutationResult<TInput> = {
  mutateAsync: (input: TInput) => Promise<{ categoryId: string }>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
};

const useCategoriesQueryMock = vi.fn<() => CategoriesQueryResult>();
const useCreateCategoryMutationMock = vi.fn<
  () => CategoryMutationResult<{ name: string; parentId: string | null }>
>();
const useUpdateCategoryMutationMock = vi.fn<
  () => CategoryMutationResult<{ id: string; input: { name?: string; parentId?: string | null } }>
>();

vi.mock('../infrastructure/item-queries', () => ({
  useCategoriesQuery: () => useCategoriesQueryMock(),
  useCreateCategoryMutation: () => useCreateCategoryMutationMock(),
  useUpdateCategoryMutation: () => useUpdateCategoryMutationMock(),
}));

const session: AuthSession = {
  user: { id: 'user-1', email: 'owner@vimcore.test', username: 'owner' },
  memberships: [{ companyId: 'company-1', role: 'company-owner' }],
};

const categories = [
  {
    id: 'category-root',
    companyId: 'company-1',
    parentId: null,
    name: 'Furniture',
    createdAt: '2026-07-31T11:00:00.000Z',
  },
  {
    id: 'category-child',
    companyId: 'company-1',
    parentId: 'category-root',
    name: 'Office chairs',
    createdAt: '2026-07-31T11:05:00.000Z',
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    useCategoriesQueryMock.mockReturnValue({
      data: { categories },
      isLoading: false,
      isError: false,
      error: null,
    });
    useCreateCategoryMutationMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ categoryId: 'category-new' }),
      isPending: false,
      isError: false,
      error: null,
    });
    useUpdateCategoryMutationMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ categoryId: 'category-child' }),
      isPending: false,
      isError: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders categories as a parent-child tree', () => {
    render(<CategoriesPage session={session} />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: 'Edit Furniture' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Office chairs' })).toBeInTheDocument();
    expect(screen.getByText('Parent: Furniture')).toBeInTheDocument();
    expect(screen.getAllByText('Furniture')).not.toHaveLength(0);
  });

  it('validates and submits the create category form', async () => {
    const createCategory = vi.fn().mockResolvedValue({ categoryId: 'category-new' });
    useCreateCategoryMutationMock.mockReturnValue({
      mutateAsync: createCategory,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<CategoriesPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save category' }));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(createCategory).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Lighting' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() => {
      expect(createCategory).toHaveBeenCalledWith({
        name: 'Lighting',
        parentId: null,
      });
    });
  });

  it('validates and submits the edit category form', async () => {
    const updateCategory = vi.fn().mockResolvedValue({ categoryId: 'category-child' });
    useUpdateCategoryMutationMock.mockReturnValue({
      mutateAsync: updateCategory,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<CategoriesPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: 'Edit Office chairs' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(updateCategory).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Executive chairs' } });
    fireEvent.click(screen.getByRole('combobox', { name: 'Parent category' }));
    fireEvent.click(screen.getByRole('option', { name: 'Sin categoría padre' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(updateCategory).toHaveBeenCalledWith({
        id: 'category-child',
        input: {
          name: 'Executive chairs',
          parentId: null,
        },
      });
    });
  });

  it('shows a friendly cycle error when the API rejects a reparenting loop', async () => {
    const updateCategory = vi.fn().mockRejectedValue(
      new HttpError('Category parent cannot reference itself or a descendant', 409),
    );
    useUpdateCategoryMutationMock.mockReturnValue({
      mutateAsync: updateCategory,
      isPending: false,
      isError: true,
      error: new HttpError('Category parent cannot reference itself or a descendant', 409),
    });

    render(<CategoriesPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: 'Edit Office chairs' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Office chairs' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText('No se puede asignar una categoría como hija de su propia descendencia.'),
    ).toBeInTheDocument();
  });

  it('renders the empty state when there are no categories', () => {
    useCategoriesQueryMock.mockReturnValue({
      data: { categories: [] },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<CategoriesPage session={session} />, { wrapper: createWrapper() });

    expect(screen.getByText('No hay categorías todavía. Creá la primera.')).toBeInTheDocument();
  });

  it('renders loading skeletons while categories load', () => {
    useCategoriesQueryMock.mockReturnValue({
      isLoading: true,
      isError: false,
      error: null,
    });

    render(<CategoriesPage session={session} />, { wrapper: createWrapper() });

    expect(screen.getAllByTestId('categories-skeleton')).not.toHaveLength(0);
  });
});
