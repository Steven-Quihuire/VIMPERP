import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../../app/app';
import type { AuthSession } from '../../auth/domain/auth';
import type { Item } from '../domain/item';
import { useItemCatalogStore } from './use-item-catalog-store';
import { ItemCatalogPage } from './item-catalog-page';

type ItemsQueryResult = {
  data?: { items: Item[]; nextCursor: string | null };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

type ItemQueryResult = {
  data?: Item | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

type CategoriesQueryResult = {
  data?: { categories: Array<{ id: string; companyId: string; parentId: string | null; name: string; createdAt: string }> };
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

const useItemsQueryMock = vi.fn<() => ItemsQueryResult>();
const useItemQueryMock = vi.fn<(id: string) => ItemQueryResult>();
const useCategoriesQueryMock = vi.fn<() => CategoriesQueryResult>();
const useCreateItemMutationMock = vi.fn<() => ItemMutationResult<unknown, { itemId: string }>>();
const useUpdateItemMutationMock = vi.fn<() => ItemMutationResult<unknown, { itemId: string }>>();
const useSoftDeleteItemMutationMock = vi.fn<() => ItemMutationResult<string, void>>();

vi.mock('../infrastructure/item-queries', () => ({
  useItemsQuery: () => useItemsQueryMock(),
  useItemQuery: (id: string) => useItemQueryMock(id),
  useCategoriesQuery: () => useCategoriesQueryMock(),
  useCreateItemMutation: () => useCreateItemMutationMock(),
  useUpdateItemMutation: () => useUpdateItemMutationMock(),
  useSoftDeleteItemMutation: () => useSoftDeleteItemMutationMock(),
}));

const session: AuthSession = {
  user: { id: 'user-1', email: 'owner@vimcore.test', username: 'owner' },
  memberships: [{ companyId: 'company-1', role: 'company-owner' }],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('ItemCatalogPage', () => {
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
    useItemsQueryMock.mockReturnValue({
      data: {
        items: [
          {
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
          },
        ],
        nextCursor: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    });
    useItemQueryMock.mockImplementation((id: string) => ({
      data:
        id === 'item-1'
          ? {
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
            }
          : null,
      isLoading: false,
      isError: false,
      error: null,
    }));
    useCategoriesQueryMock.mockReturnValue({
      data: { categories: [] },
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

  it('renders the split panel layout', () => {
    render(<ItemCatalogPage session={session} />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: 'Add Product' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Select an item to view details.')).toBeInTheDocument();
  });

  it('opens a blank create form when Add Product is clicked', () => {
    render(<ItemCatalogPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(screen.getByRole('heading', { name: 'Create item' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Type' })).toBeEnabled();
  });

  it('loads the selected item into the right panel', () => {
    render(<ItemCatalogPage session={session} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /open item desk lamp/i }));

    expect(screen.getByDisplayValue('Desk lamp')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit item' })).toBeInTheDocument();
  });

  it('renders the items route at /dashboard/items within the app router', async () => {
    const setDesktopBrowser = (userAgent: string, coarsePointer: boolean) => {
      Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        value: userAgent,
      });

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(pointer: coarse)' ? coarsePointer : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    };

    setDesktopBrowser(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0',
      false,
    );

    const createJsonResponse = (body: unknown, status: number) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse({
            user: { id: 'user-1', email: 'owner@vimcore.test', username: 'owner' },
            memberships: [{ companyId: 'company-1', role: 'company-owner' }],
          }, 200),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'forest' }, 200));
      }

      if (url.endsWith('/me/company')) {
        return Promise.resolve(createJsonResponse({ companyId: 'company-1', name: 'Northwind' }, 200));
      }

      if (url.endsWith('/items')) {
        return Promise.resolve(createJsonResponse({ items: [], nextCursor: null }, 200));
      }

      if (url.endsWith('/item-categories')) {
        return Promise.resolve(createJsonResponse({ categories: [] }, 200));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App initialEntries={['/dashboard/items']} />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('button', { name: 'Add Product' })).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
