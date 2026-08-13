import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSession } from '../../auth/domain/auth';
import type { Item } from '../domain/item';
import { useItemCatalogStore } from './use-item-catalog-store';
import { ItemFormPanel } from './item-form-panel';

type CategoriesQueryResult = {
  data?: {
    categories: Array<{ id: string; companyId: string; parentId: string | null; name: string; createdAt: string }>;
  };
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
};

type ItemQueryResult = {
  data?: Item | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

type ItemMutationResult<TInput, TResult> = {
  mutateAsync: (input: TInput) => Promise<TResult>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
};

const useCategoriesQueryMock = vi.fn<() => CategoriesQueryResult>();
const useItemQueryMock = vi.fn<(id: string) => ItemQueryResult>();
const useCreateItemMutationMock = vi.fn<() => ItemMutationResult<unknown, { itemId: string }>>();
const useUpdateItemMutationMock = vi.fn<() => ItemMutationResult<unknown, { itemId: string }>>();
const useSoftDeleteItemMutationMock = vi.fn<() => ItemMutationResult<string, void>>();

vi.mock('../infrastructure/item-queries', () => ({
  useCategoriesQuery: () => useCategoriesQueryMock(),
  useItemQuery: (id: string) => useItemQueryMock(id),
  useCreateItemMutation: () => useCreateItemMutationMock(),
  useUpdateItemMutation: () => useUpdateItemMutationMock(),
  useSoftDeleteItemMutation: () => useSoftDeleteItemMutationMock(),
}));

const ownerSession: AuthSession = {
  user: { id: 'user-1', email: 'owner@vimcore.test', username: 'owner' },
  memberships: [{ companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null }],
  activeCompany: { companyId: 'company-1', status: 'active' },
  activeScope: null,
  activeLocalId: null,
  capabilities: ['catalog.read', 'catalog.write', 'catalog.delete'],
};

const userSession: AuthSession = {
  user: { id: 'user-2', email: 'user@vimcore.test', username: 'user' },
  memberships: [{ companyId: 'company-1', role: 'company-user', divisionId: null, localId: null }],
  activeCompany: { companyId: 'company-1', status: 'active' },
  activeScope: null,
  activeLocalId: null,
  capabilities: ['catalog.read', 'catalog.write'],
};

const selectedItem: Item = {
  id: 'item-1',
  companyId: 'company-1',
  categoryId: null,
  sku: 'SKU-1',
  name: 'Desk lamp',
  type: 'product',
  unit: 'unit',
  unitPrice: 12,
  tracksStock: true,
  trackBatchMode: 'none',
  deletedAt: null,
  createdAt: '2026-07-31T10:00:00.000Z',
  updatedAt: '2026-07-31T10:00:00.000Z',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('ItemFormPanel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    useItemCatalogStore.setState({ selectedItemId: null, panelMode: 'view' });

    useCategoriesQueryMock.mockReturnValue({
      data: {
        categories: [{ id: 'category-1', companyId: 'company-1', parentId: null, name: 'Lighting', createdAt: '2026-07-31T10:00:00.000Z' }],
      },
      isLoading: false,
      isError: false,
    });
    useItemQueryMock.mockReturnValue({
      data: selectedItem,
      isLoading: false,
      isError: false,
      error: null,
    });
    useCreateItemMutationMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ itemId: 'item-2' }),
      isPending: false,
      isError: false,
      error: null,
    });
    useUpdateItemMutationMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ itemId: 'item-1' }),
      isPending: false,
      isError: false,
      error: null,
    });
    useSoftDeleteItemMutationMock.mockReturnValue({
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

  it('enables type selection in create mode', () => {
    useItemCatalogStore.getState().startCreate();

    render(<ItemFormPanel session={ownerSession} />, { wrapper: createWrapper() });

    expect(screen.getByRole('combobox', { name: 'Type' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Create item' })).toBeInTheDocument();
  });

  it('disables type selection in edit mode', () => {
    useItemCatalogStore.setState({ selectedItemId: 'item-1', panelMode: 'edit' });

    render(<ItemFormPanel session={ownerSession} />, { wrapper: createWrapper() });

    expect(screen.getByRole('combobox', { name: 'Type' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('blocks invalid submissions and shows validation errors', async () => {
    useItemCatalogStore.getState().startCreate();

    const createMutation = vi.fn().mockResolvedValue({ itemId: 'item-2' });
    useCreateItemMutationMock.mockReturnValue({
      mutateAsync: createMutation,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<ItemFormPanel session={ownerSession} />, { wrapper: createWrapper() });

    const priceInput = screen.getByLabelText('Unit price');
    fireEvent.change(priceInput, { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create item' }));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Unit price must be 0 or more.')).toBeInTheDocument();
    expect(createMutation).not.toHaveBeenCalled();
  });

  it('submits create mode through the create mutation', async () => {
    useItemCatalogStore.getState().startCreate();

    const createMutation = vi.fn().mockResolvedValue({ itemId: 'item-2' });
    useCreateItemMutationMock.mockReturnValue({
      mutateAsync: createMutation,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<ItemFormPanel session={ownerSession} />, { wrapper: createWrapper() });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Desk lamp' } });
    fireEvent.change(screen.getByLabelText('SKU'), { target: { value: 'SKU-1' } });
    const priceInput = screen.getByLabelText('Unit price');
    fireEvent.change(priceInput, { target: { value: '15' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create item' }));

    await waitFor(() => {
      expect(createMutation).toHaveBeenCalledWith({
        name: 'Desk lamp',
        type: 'product',
        sku: 'SKU-1',
        unit: 'unit',
        unitPrice: 15,
        tracksStock: true,
        trackBatchMode: 'none',
        categoryId: null,
      });
    });
  });

  it('shows delete controls only for company owners and requires confirmation', async () => {
    useItemCatalogStore.setState({ selectedItemId: 'item-1', panelMode: 'view' });

    const deleteMutation = vi.fn().mockResolvedValue(undefined);
    useSoftDeleteItemMutationMock.mockReturnValue({
      mutateAsync: deleteMutation,
      isPending: false,
      isError: false,
      error: null,
    });

    const { rerender } = render(<ItemFormPanel session={ownerSession} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: 'Delete item' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    await waitFor(() => {
      expect(deleteMutation).toHaveBeenCalledWith('item-1');
    });

    rerender(<ItemFormPanel session={userSession} />);

    expect(screen.queryByRole('button', { name: 'Delete item' })).not.toBeInTheDocument();
  });

  it('shows an error message when the submit mutation fails', async () => {
    useItemCatalogStore.getState().startCreate();

    useCreateItemMutationMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ itemId: 'item-2' }),
      isPending: false,
      isError: true,
      error: new Error('Server error'),
    });

    render(<ItemFormPanel session={ownerSession} />, { wrapper: createWrapper() });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Desk lamp' } });
    fireEvent.change(screen.getByLabelText('Unit price'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create item' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Server error');
  });

  it('does not render a currency selector field', () => {
    useItemCatalogStore.getState().startCreate();

    render(<ItemFormPanel session={ownerSession} />, { wrapper: createWrapper() });

    expect(screen.queryByLabelText('Currency')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Currency' })).not.toBeInTheDocument();
  });

  it('does not render a currency selector field in edit mode either', () => {
    useItemCatalogStore.setState({ selectedItemId: 'item-1', panelMode: 'edit' });

    render(<ItemFormPanel session={ownerSession} />, { wrapper: createWrapper() });

    expect(screen.queryByLabelText('Currency')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Currency' })).not.toBeInTheDocument();
  });

  it('submits edit mode through the update mutation', async () => {
    useItemCatalogStore.setState({ selectedItemId: 'item-1', panelMode: 'edit' });

    const updateMutation = vi.fn().mockResolvedValue({ itemId: 'item-1' });
    useUpdateItemMutationMock.mockReturnValue({
      mutateAsync: updateMutation,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<ItemFormPanel session={ownerSession} />, { wrapper: createWrapper() });

    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Desk lamp pro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(updateMutation).toHaveBeenCalledWith({
        id: 'item-1',
        input: {
          name: 'Desk lamp pro',
          sku: 'SKU-1',
          unit: 'unit',
          unitPrice: 12,
          tracksStock: true,
          trackBatchMode: 'none',
          categoryId: null,
        },
      });
    });
  });

  it('lets a company-user save a new item through the create mutation', async () => {
    useItemCatalogStore.getState().startCreate();

    const createMutation = vi.fn().mockResolvedValue({ itemId: 'item-2' });
    useCreateItemMutationMock.mockReturnValue({
      mutateAsync: createMutation,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<ItemFormPanel session={userSession} />, { wrapper: createWrapper() });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Desk lamp' } });
    fireEvent.change(screen.getByLabelText('Unit price'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create item' }));

    await waitFor(() => {
      expect(createMutation).toHaveBeenCalledWith({
        name: 'Desk lamp',
        type: 'product',
        sku: null,
        unit: 'unit',
        unitPrice: 18,
        tracksStock: true,
        trackBatchMode: 'none',
        categoryId: null,
      });
    });
  });
});
