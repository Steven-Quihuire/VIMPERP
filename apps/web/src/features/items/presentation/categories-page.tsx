import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import type { AuthSession } from '../../auth/domain/auth';
import type { ItemCategory } from '../domain/item';
import { useCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation } from '../infrastructure/item-queries';
import { HttpError } from '@/shared/lib/http/http-client';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

type CategoryTreeNode = ItemCategory & {
  children: CategoryTreeNode[];
};

type CategoryFormValues = {
  name: string;
  parentId: string;
};

type CategoryEditorState = {
  mode: 'create' | 'edit';
  categoryId: string | null;
};

const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  parentId: z.string(),
});

const emptyCategoryValues: CategoryFormValues = {
  name: '',
  parentId: '',
};

const buildCategoryTree = (categories: ItemCategory[]) => {
  const nodes = new Map<string, CategoryTreeNode>();

  for (const category of categories) {
    nodes.set(category.id, { ...category, children: [] });
  }

  const roots: CategoryTreeNode[] = [];

  for (const category of categories) {
    const node = nodes.get(category.id);

    if (!node) {
      continue;
    }

    if (!category.parentId) {
      roots.push(node);
      continue;
    }

    const parent = nodes.get(category.parentId);

    if (!parent) {
      roots.push(node);
      continue;
    }

    parent.children.push(node);
  }

  const sortNodes = (treeNodes: CategoryTreeNode[]) => {
    treeNodes.sort((left, right) => left.name.localeCompare(right.name));

    for (const node of treeNodes) {
      sortNodes(node.children);
    }

    return treeNodes;
  };

  return sortNodes(roots);
};

const buildCategoryMap = (categories: ItemCategory[]) =>
  new Map(categories.map((category) => [category.id, category]));

const getFriendlyCategoryError = (error: unknown) => {
  if (error instanceof HttpError && error.status === 409) {
    return 'No se puede asignar una categoría como hija de su propia descendencia.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to save category.';
};

const CategoryTreeList = ({
  nodes,
  categoriesById,
  onEdit,
  depth = 0,
}: {
  nodes: CategoryTreeNode[];
  categoriesById: Map<string, ItemCategory>;
  onEdit: (categoryId: string) => void;
  depth?: number;
}) => {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-3">
      {nodes.map((node) => {
        const parentName = node.parentId ? categoriesById.get(node.parentId)?.name ?? null : null;

        return (
          <li key={node.id}>
            <div
              className="rounded-lg border bg-background/70 p-4"
              style={{ marginLeft: `${depth * 20}px` }}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <p className="font-medium">{node.name}</p>
                  <Badge variant={parentName ? 'outline' : 'secondary'}>
                    {parentName ? `Parent: ${parentName}` : 'Root category'}
                  </Badge>
                </div>
                <Button type="button" variant="outline" onClick={() => onEdit(node.id)}>
                  Edit {node.name}
                </Button>
              </div>
            </div>

            {node.children.length > 0 ? (
              <div className="mt-3 border-l border-border/60">
                <CategoryTreeList
                  nodes={node.children}
                  categoriesById={categoriesById}
                  onEdit={onEdit}
                  depth={depth + 1}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

const CategoryFormCard = ({
  categories,
  editorState,
  session,
  onCancel,
  onSuccess,
}: {
  categories: ItemCategory[];
  editorState: CategoryEditorState;
  session: AuthSession;
  onCancel: () => void;
  onSuccess: () => void;
}) => {
  const selectedCategory = categories.find((category) => category.id === editorState.categoryId) ?? null;
  const createCategoryMutation = useCreateCategoryMutation();
  const updateCategoryMutation = useUpdateCategoryMutation();
  const isEditMode = editorState.mode === 'edit' && selectedCategory !== null;
  const isSubmitting = createCategoryMutation.isPending || updateCategoryMutation.isPending;
  const submissionError = createCategoryMutation.error ?? updateCategoryMutation.error;
  const companyLabel = session.memberships[0]?.companyId ? 'Current company' : 'Workspace';

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: isEditMode
      ? {
          name: selectedCategory.name,
          parentId: selectedCategory.parentId ?? '',
        }
      : emptyCategoryValues,
  });

  const onSubmit = async (values: CategoryFormValues) => {
    const payload = {
      name: values.name.trim(),
      parentId: values.parentId.length > 0 ? values.parentId : null,
    };

    try {
      if (isEditMode && selectedCategory) {
        await updateCategoryMutation.mutateAsync({
          id: selectedCategory.id,
          input: payload,
        });
      } else {
        await createCategoryMutation.mutateAsync(payload);
      }

      onSuccess();
    } catch {
      // Mutation state renders feedback.
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit category' : 'Create category'}</CardTitle>
        <CardDescription>{companyLabel} category hierarchy</CardDescription>
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
              <FieldLabel htmlFor="category-name">Name</FieldLabel>
              <FieldContent>
                <Input id="category-name" aria-label="Name" disabled={isSubmitting} {...form.register('name')} />
                <FieldError errors={[form.formState.errors.name]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Parent category</FieldLabel>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <SelectTrigger aria-label="Parent category">
                        <SelectValue placeholder="Sin categoría padre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin categoría padre</SelectItem>
                        {categories.map((category) => (
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
              {getFriendlyCategoryError(submissionError)}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditMode ? 'Save changes' : 'Save category'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export const CategoriesPage = ({ session }: { session: AuthSession }) => {
  const categoriesQuery = useCategoriesQuery();
  const [state, setState] = useState<CategoryEditorState>({ mode: 'create', categoryId: null });

  if (categoriesQuery.isLoading) {
    return (
      <div className="flex h-full min-h-[calc(100dvh-9rem)] flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Inventory</p>
            <h1 className="text-3xl font-semibold tracking-tight">Categories</h1>
          </div>
          <Button type="button" disabled>
            Add Category
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,420px)]">
          <Card>
            <CardHeader>
              <CardTitle>Category tree</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton data-testid="categories-skeleton" className="h-16 w-full" />
              <Skeleton data-testid="categories-skeleton" className="h-16 w-full" />
              <Skeleton data-testid="categories-skeleton" className="h-16 w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton data-testid="categories-skeleton" className="h-10 w-full" />
              <Skeleton data-testid="categories-skeleton" className="h-10 w-full" />
              <Skeleton data-testid="categories-skeleton" className="h-10 w-32" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (categoriesQuery.isError) {
    return (
      <div className="flex h-full min-h-[calc(100dvh-9rem)] flex-col gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Inventory</p>
          <h1 className="text-3xl font-semibold tracking-tight">Categories</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {categoriesQuery.error instanceof Error ? categoriesQuery.error.message : 'Unable to load categories.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = categoriesQuery.data?.categories ?? [];
  const categoriesById = buildCategoryMap(categories);
  const categoryTree = buildCategoryTree(categories);

  return (
    <div className="flex h-full min-h-[calc(100dvh-9rem)] flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Inventory</p>
          <h1 className="text-3xl font-semibold tracking-tight">Categories</h1>
        </div>
        <Button type="button" onClick={() => setState({ mode: 'create', categoryId: null })}>
          Add Category
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,420px)]">
        <Card>
          <CardHeader>
            <CardTitle>Category tree</CardTitle>
            <CardDescription>Organize parent and child categories for the catalog.</CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay categorías todavía. Creá la primera.</p>
            ) : (
              <CategoryTreeList
                nodes={categoryTree}
                categoriesById={categoriesById}
                onEdit={(categoryId) => setState({ mode: 'edit', categoryId })}
              />
            )}
          </CardContent>
        </Card>

        <CategoryFormCard
          key={`${state.mode}-${state.categoryId ?? 'create'}-${categories.length}`}
          categories={categories}
          editorState={state}
          session={session}
          onCancel={() => setState({ mode: 'create', categoryId: null })}
          onSuccess={() => setState({ mode: 'create', categoryId: null })}
        />
      </div>
    </div>
  );
};
