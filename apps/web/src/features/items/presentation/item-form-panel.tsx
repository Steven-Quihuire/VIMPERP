import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

import type { AuthSession } from '../../auth/domain/auth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Switch } from '@/shared/ui/switch';

import {
  isCompanyOwner,
  itemTrackBatchModeValues,
  itemTypeValues,
  itemUnitValues,
  type Item,
} from '../domain/item';
import {
  useCategoriesQuery,
  useCreateItemMutation,
  useItemQuery,
  useSoftDeleteItemMutation,
  useUpdateItemMutation,
} from '../infrastructure/item-queries';
import {
  itemFormSchema,
  toCreatePayload,
  toPatchPayload,
  type ItemFormValues,
} from './item-form-schema';
import { useItemCatalogStore } from './use-item-catalog-store';

type ItemFormInput = z.input<typeof itemFormSchema>;

const defaultFormValues: ItemFormValues = {
  name: '',
  type: 'product',
  sku: '',
  unit: 'unit',
  unitPrice: 0,
  tracksStock: true,
  trackBatchMode: 'none',
  categoryId: '',
};

const getInitialValues = (item?: Item | null): ItemFormValues => {
  if (!item) {
    return defaultFormValues;
  }

  return {
    name: item.name,
    type: item.type,
    sku: item.sku ?? '',
    unit: item.unit,
    unitPrice: item.unitPrice,
    tracksStock: item.tracksStock,
    trackBatchMode: item.trackBatchMode,
    categoryId: item.categoryId ?? '',
  };
};

const ItemFormFields = ({
  session,
  panelMode,
  item,
}: {
  session: AuthSession;
  panelMode: 'view' | 'edit' | 'create';
  item: Item | null | undefined;
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const setPanelMode = useItemCatalogStore((state) => state.setPanelMode);
  const setSelectedItem = useItemCatalogStore((state) => state.setSelectedItem);
  const clearSelection = useItemCatalogStore((state) => state.clearSelection);
  const categoriesQuery = useCategoriesQuery();
  const createItemMutation = useCreateItemMutation();
  const updateItemMutation = useUpdateItemMutation();
  const softDeleteItemMutation = useSoftDeleteItemMutation();

  const isCreateMode = panelMode === 'create';
  const isEditMode = panelMode === 'edit';
  const isViewMode = panelMode === 'view';
  const canDelete = session.memberships.some((membership) => isCompanyOwner(membership.role));
  const isSubmitting = createItemMutation.isPending || updateItemMutation.isPending;
  const submissionError = createItemMutation.error ?? updateItemMutation.error;
  const deleteError = softDeleteItemMutation.error;

  const form = useForm<ItemFormInput, unknown, ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: getInitialValues(item),
  });

  const onSubmit = async (values: ItemFormValues) => {
    try {
      if (isCreateMode) {
        const result = await createItemMutation.mutateAsync(toCreatePayload(values));

        setSelectedItem(result.itemId);
        setPanelMode('view');
        return;
      }

      if (!item) {
        return;
      }

      await updateItemMutation.mutateAsync({ id: item.id, input: toPatchPayload(values) });
      setPanelMode('view');
    } catch {
      // Mutation state renders the feedback.
    }
  };

  const onDelete = async () => {
    if (!item) {
      return;
    }

    try {
      await softDeleteItemMutation.mutateAsync(item.id);
      setDeleteDialogOpen(false);
      clearSelection();
    } catch {
      // Mutation state renders the feedback.
    }
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <h2 className="text-xl font-semibold tracking-tight">
            {isCreateMode ? 'Create item' : isEditMode ? 'Edit item' : 'Item details'}
          </h2>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            noValidate
            onSubmit={(event) => {
              void form.handleSubmit(onSubmit)(event);
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="item-name">Name</FieldLabel>
                <FieldContent>
                  <Input id="item-name" aria-label="Name" disabled={isViewMode || isSubmitting} {...form.register('name')} />
                  <FieldError errors={[form.formState.errors.name]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Type</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={!isCreateMode || isSubmitting}>
                        <SelectTrigger aria-label="Type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {itemTypeValues.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[form.formState.errors.type]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="item-sku">SKU</FieldLabel>
                <FieldContent>
                  <Input id="item-sku" aria-label="SKU" disabled={isViewMode || isSubmitting} {...form.register('sku')} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Unit</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={isViewMode || isSubmitting}>
                        <SelectTrigger aria-label="Unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {itemUnitValues.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[form.formState.errors.unit]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="item-unit-price">Unit price</FieldLabel>
                <FieldContent>
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">$</span>
                    <Input
                      id="item-unit-price"
                      aria-label="Unit price"
                      type="number"
                      min={0}
                      step="0.01"
                      className="pl-7"
                      disabled={isViewMode || isSubmitting}
                      {...form.register('unitPrice', { valueAsNumber: true })}
                    />
                  </div>
                  <FieldError errors={[form.formState.errors.unitPrice]} />
                </FieldContent>
              </Field>

              <Field orientation="horizontal">
                <FieldLabel htmlFor="item-tracks-stock">Tracks stock</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="tracksStock"
                    render={({ field }) => (
                      <Switch
                        id="item-tracks-stock"
                        aria-label="Tracks stock"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isViewMode || isSubmitting}
                      />
                    )}
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Track batch mode</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="trackBatchMode"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={isViewMode || isSubmitting}>
                        <SelectTrigger aria-label="Track batch mode">
                          <SelectValue placeholder="Select batch mode" />
                        </SelectTrigger>
                        <SelectContent>
                          {itemTrackBatchModeValues.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[form.formState.errors.trackBatchMode]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Category</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={isViewMode || isSubmitting || categoriesQuery.isLoading}>
                        <SelectTrigger aria-label="Category">
                          <SelectValue placeholder="Sin categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sin categoría</SelectItem>
                          {(categoriesQuery.data?.categories ?? []).map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FieldContent>
              </Field>
            </FieldGroup>

            {submissionError ? (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {submissionError instanceof Error ? submissionError.message : 'Unable to save item.'}
              </p>
            ) : null}

            {deleteError ? (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {deleteError instanceof Error ? deleteError.message : 'Unable to delete item.'}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {isViewMode && item ? (
                <Button type="button" onClick={() => setPanelMode('edit')}>
                  Edit item
                </Button>
              ) : null}

              {!isViewMode ? (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {isCreateMode ? 'Create item' : 'Save changes'}
                </Button>
              ) : null}

              {(isEditMode || isViewMode) && item ? (
                <Button type="button" variant="ghost" onClick={() => setPanelMode('view')}>
                  Cancel
                </Button>
              ) : null}

              {canDelete && item ? (
                <Button type="button" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                  Delete item
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete item</DialogTitle>
            <DialogDescription>
              This removes the item from the active catalog list. You can’t undo this action from the UI.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void onDelete()}>
              Confirm delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const ItemFormPanel = ({ session }: { session: AuthSession }) => {
  const selectedItemId = useItemCatalogStore((state) => state.selectedItemId);
  const panelMode = useItemCatalogStore((state) => state.panelMode);
  const itemQuery = useItemQuery(selectedItemId ?? '');

  if (panelMode !== 'create' && !selectedItemId) {
    return (
      <Card className="h-full">
        <CardHeader>
          <h2 className="text-xl font-semibold tracking-tight">Item details</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Select an item to view details.</p>
        </CardContent>
      </Card>
    );
  }

  if (panelMode !== 'create' && itemQuery.isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <h2 className="text-xl font-semibold tracking-tight">Item details</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (panelMode !== 'create' && itemQuery.isError) {
    return (
      <Card className="h-full">
        <CardHeader>
          <h2 className="text-xl font-semibold tracking-tight">Item details</h2>
        </CardHeader>
        <CardContent>
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {itemQuery.error instanceof Error ? itemQuery.error.message : 'Unable to load the selected item.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ItemFormFields
      key={`${panelMode}-${itemQuery.data?.id ?? 'create'}-${itemQuery.data?.updatedAt ?? 'draft'}`}
      session={session}
      panelMode={panelMode}
      item={panelMode === 'create' ? null : itemQuery.data}
    />
  );
};
