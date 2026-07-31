import type { AuthSession } from '../../auth/domain/auth';
import { Button } from '@/shared/ui/button';

import { ItemFormPanel } from './item-form-panel';
import { ItemTable } from './item-table';
import { useItemCatalogStore } from './use-item-catalog-store';

export const ItemCatalogPage = ({ session }: { session: AuthSession }) => {
  const startCreate = useItemCatalogStore((state) => state.startCreate);

  return (
    <div className="flex h-full min-h-[calc(100dvh-9rem)] flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Inventory</p>
          <h1 className="text-3xl font-semibold tracking-tight">Items</h1>
        </div>
        <Button type="button" onClick={() => startCreate()}>
          Add Product
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <section className="min-h-0 flex-1">
          <ItemTable />
        </section>
        <aside className="w-full max-w-[400px] min-w-[360px]">
          <ItemFormPanel session={session} />
        </aside>
      </div>
    </div>
  );
};
