import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useItemCatalogStore } from './use-item-catalog-store';
import { ItemTable } from './item-table';

type ItemsQueryResult = {
  data?: {
    items: Array<{
      id: string;
      companyId: string;
      categoryId: string | null;
      sku: string | null;
      name: string;
      type: 'product' | 'service';
      unit: 'unit' | 'hour' | 'kg' | 'liter' | 'meter' | 'box' | 'service';
      unitPrice: number;
      tracksStock: boolean;
      trackBatchMode: 'none' | 'batch' | 'serial';
      deletedAt: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    nextCursor: string | null;
  };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

const useItemsQueryMock = vi.fn<() => ItemsQueryResult>();

vi.mock('../infrastructure/item-queries', () => ({
  useItemsQuery: () => useItemsQueryMock(),
}));

describe('ItemTable', () => {
  beforeEach(() => {
    useItemCatalogStore.setState({ selectedItemId: null, panelMode: 'view' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders items and stores the selected row on click', () => {
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
          {
            id: 'item-2',
            companyId: 'company-1',
            categoryId: null,
            sku: null,
            name: 'Consulting hour',
            type: 'service',
            unit: 'hour',
            unitPrice: 40,
            tracksStock: false,
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

    render(<ItemTable />);

    expect(screen.getByText('Desk lamp')).toBeInTheDocument();
    expect(screen.getByText('Consulting hour')).toBeInTheDocument();
    expect(screen.getByText('$12.00')).toBeInTheDocument();
    expect(screen.getByText('$40.00')).toBeInTheDocument();
    expect(screen.getAllByText('Stock')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /open item desk lamp/i }));

    expect(useItemCatalogStore.getState()).toMatchObject({
      selectedItemId: 'item-1',
      panelMode: 'view',
    });
  });

  it('renders loading skeleton rows while the list is loading', () => {
    useItemsQueryMock.mockReturnValue({
      isLoading: true,
      isError: false,
      error: null,
    });

    render(<ItemTable />);

    expect(screen.getAllByTestId('item-table-skeleton-row')).toHaveLength(5);
  });

  it('renders an empty state when there are no items', () => {
    useItemsQueryMock.mockReturnValue({
      data: { items: [], nextCursor: null },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<ItemTable />);

    expect(screen.getByText('No items yet')).toBeInTheDocument();
  });
});
