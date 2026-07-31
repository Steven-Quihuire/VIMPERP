import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

import { useItemsQuery } from '../infrastructure/item-queries';
import { useItemCatalogStore } from './use-item-catalog-store';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const typeBadgeClassName = {
  product: 'border-blue-200 bg-blue-50 text-blue-700',
  service: 'border-emerald-200 bg-emerald-50 text-emerald-700',
} as const;

export const ItemTable = () => {
  const { data, isLoading, isError, error } = useItemsQuery();
  const selectedItemId = useItemCatalogStore((state) => state.selectedItemId);
  const setSelectedItem = useItemCatalogStore((state) => state.setSelectedItem);
  const setPanelMode = useItemCatalogStore((state) => state.setPanelMode);

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`} data-testid="item-table-skeleton-row">
                <TableCell colSpan={6}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error instanceof Error ? error.message : 'Unable to load items.'}
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-10 text-center">
        <p className="text-sm font-medium">No items yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Create your first catalog item to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              role="button"
              tabIndex={0}
              aria-label={`Open item ${item.name}`}
              data-state={selectedItemId === item.id ? 'selected' : undefined}
              className="cursor-pointer"
              onClick={() => {
                setSelectedItem(item.id);
                setPanelMode('view');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedItem(item.id);
                  setPanelMode('view');
                }
              }}
            >
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.sku ?? '—'}</TableCell>
              <TableCell>
                <Badge variant="outline" className={typeBadgeClassName[item.type]}>
                  {item.type}
                </Badge>
              </TableCell>
              <TableCell>{item.unit}</TableCell>
              <TableCell>{currencyFormatter.format(item.unitPrice)}</TableCell>
              <TableCell>
                {item.tracksStock ? <Badge variant="secondary">Stock</Badge> : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
