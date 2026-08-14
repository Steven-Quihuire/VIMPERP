import { Box, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { HttpError } from '@/shared/lib/http/http-client';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import {
  Dialog,
  DialogClose,
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
import type { AuthSession } from '../../auth/domain/auth';
import type { Area, Local, Warehouse } from '../domain/org-hierarchy';
import {
  useAreas,
  useCreateWarehouse,
  useDeleteWarehouse,
  useLocals,
  useUpdateWarehouse,
  useWarehouses,
} from '../application/org-hierarchy-queries';

type WarehouseEditorState = {
  mode: 'create' | 'edit';
  warehouseId: string | null;
};

type WarehouseParentSelection = {
  parentType: 'area' | 'local';
  parentId: string;
};

const NO_PARENT = '__none__';

const getFriendlyWarehouseError = (error: unknown) => {
  if (error instanceof HttpError && error.status === 409) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo guardar el almacen.';
};

const getInitialParentSelection = (
  selectedWarehouse: Warehouse | null,
  areas: Area[],
  locals: Local[],
): WarehouseParentSelection => {
  if (selectedWarehouse?.areaId) {
    return { parentType: 'area' as const, parentId: selectedWarehouse.areaId };
  }

  if (selectedWarehouse?.localId) {
    return { parentType: 'local' as const, parentId: selectedWarehouse.localId };
  }

  if (areas[0]?.id) {
    return { parentType: 'area' as const, parentId: areas[0].id };
  }

  if (locals[0]?.id) {
    return { parentType: 'local' as const, parentId: locals[0].id };
  }

  return { parentType: 'local' as const, parentId: NO_PARENT };
};

const getParentName = (areas: Area[], locals: Local[], warehouse: Warehouse) => {
  if (warehouse.areaId) {
    return areas.find((area) => area.id === warehouse.areaId)?.name ?? null;
  }

  return locals.find((local) => local.id === warehouse.localId)?.name ?? null;
};

const WarehouseFormDialog = ({
  open,
  onOpenChange,
  warehouses,
  areas,
  locals,
  editorState,
  companyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Warehouse[];
  areas: Area[];
  locals: Local[];
  editorState: WarehouseEditorState;
  companyId: string;
}) => {
  const createMutation = useCreateWarehouse();
  const updateMutation = useUpdateWarehouse(companyId);
  const isEditMode =
    editorState.mode === 'edit' && editorState.warehouseId !== null;
  const selectedWarehouse = isEditMode
    ? (warehouses.find((warehouse) => warehouse.id === editorState.warehouseId) ??
        null)
    : null;
  const initialParentSelection = getInitialParentSelection(
    selectedWarehouse,
    areas,
    locals,
  );
  const isPending = createMutation.isPending || updateMutation.isPending;
  const submissionError = createMutation.error ?? updateMutation.error;
  const [name, setName] = useState(selectedWarehouse?.name ?? '');
  const [parentType, setParentType] = useState<'area' | 'local'>(
    initialParentSelection.parentType,
  );
  const [parentId, setParentId] = useState<string>(initialParentSelection.parentId);
  const [validationError, setValidationError] = useState<string | null>(null);

  const parentOptions = parentType === 'area' ? areas : locals;

  const handleSubmit = async () => {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      setValidationError('El nombre es obligatorio.');
      return;
    }

    if (parentId === NO_PARENT) {
      setValidationError('Debes elegir un padre para el almacen.');
      return;
    }

    try {
      if (isEditMode && selectedWarehouse) {
        await updateMutation.mutateAsync(
          parentType === 'area'
            ? {
                warehouseId: selectedWarehouse.id,
                name: trimmed,
                areaId: parentId,
              }
            : {
                warehouseId: selectedWarehouse.id,
                name: trimmed,
                localId: parentId,
              },
        );
      } else {
        await createMutation.mutateAsync(
          parentType === 'area'
            ? { companyId, name: trimmed, areaId: parentId }
            : { companyId, name: trimmed, localId: parentId },
        );
      }

      onOpenChange(false);
    } catch {
      // Mutation state renders feedback.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar almacen' : 'Crear almacen'}
          </DialogTitle>
          <DialogDescription>
            Define el almacen y el nivel padre donde operará.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="warehouse-name">Nombre</FieldLabel>
            <FieldContent>
              <Input
                id="warehouse-name"
                aria-label="Nombre"
                disabled={isPending}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setValidationError(null);
                }}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Tipo de padre</FieldLabel>
            <FieldContent>
              <Select
                value={parentType}
                onValueChange={(value) => {
                  const nextParentType = value as 'area' | 'local';
                  const nextDefaultParent =
                    nextParentType === 'area'
                      ? areas[0]?.id ?? NO_PARENT
                      : locals[0]?.id ?? NO_PARENT;
                  setParentType(nextParentType);
                  setParentId(nextDefaultParent);
                  setValidationError(null);
                }}
                disabled={isPending}
              >
                <SelectTrigger aria-label="Tipo de padre">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area">Area</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{parentType === 'area' ? 'Area' : 'Local'}</FieldLabel>
            <FieldContent>
              <Select
                value={parentId}
                onValueChange={(value) => {
                  setParentId(value);
                  setValidationError(null);
                }}
                disabled={isPending}
              >
                <SelectTrigger aria-label="Padre del almacen">
                  <SelectValue placeholder="Selecciona un padre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>Selecciona un padre</SelectItem>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationError ? (
                <FieldError errors={[{ message: validationError }]} />
              ) : null}
            </FieldContent>
          </Field>
        </FieldGroup>

        {submissionError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {getFriendlyWarehouseError(submissionError)}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => void handleSubmit()}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DeleteWarehouseDialog = ({
  open,
  onOpenChange,
  warehouse,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: Warehouse | null;
}) => {
  const deleteMutation = useDeleteWarehouse(warehouse?.companyId ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!warehouse) return;

    try {
      await deleteMutation.mutateAsync(warehouse.id);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        setError('No se puede eliminar un almacen con dependencias asociadas.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo eliminar el almacen.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar almacen</DialogTitle>
          <DialogDescription>
            ¿Seguro que deseas eliminar «{warehouse?.name}»? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => void handleConfirm()}
          >
            {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const WarehousesPage = ({ session }: { session: AuthSession }) => {
  const companyId = session.activeCompany?.companyId;
  const warehousesQuery = useWarehouses(companyId);
  const areasQuery = useAreas(companyId);
  const localsQuery = useLocals(companyId);
  const [editorState, setEditorState] = useState<WarehouseEditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);

  if (
    warehousesQuery.isLoading ||
    areasQuery.isLoading ||
    localsQuery.isLoading
  ) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-3xl font-medium tracking-tight">Almacenes</h1>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (warehousesQuery.isError) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-3xl font-medium tracking-tight">Almacenes</h1>
        <Card>
          <CardContent className="pt-6">
            <p role="alert" className="text-sm text-destructive">
              {warehousesQuery.error instanceof Error
                ? warehousesQuery.error.message
                : 'No se pudieron cargar los almacenes.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const warehouses = warehousesQuery.data ?? [];
  const areas = areasQuery.data ?? [];
  const locals = localsQuery.data ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Almacenes</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona almacenes bajo areas o locales.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setEditorState({ mode: 'create', warehouseId: null })}
        >
          <Plus className="size-4" />
          Agregar almacen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de almacenes</CardTitle>
          <CardDescription>
            Cada almacen debe pertenecer a un area o a un local.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {warehouses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay almacenes registrados.{' '}
              <button
                onClick={() =>
                  setEditorState({ mode: 'create', warehouseId: null })
                }
                className="cursor-pointer border-b border-b-black"
              >
                Agrega tu primer almacen
              </button>
            </p>
          ) : (
            <div className="space-y-3">
              {warehouses.map((warehouse) => {
                const parentName = getParentName(areas, locals, warehouse);
                const parentType = warehouse.areaId ? 'Area' : 'Local';

                return (
                  <div
                    key={warehouse.id}
                    className="flex items-center justify-between gap-4 rounded-xl border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Box className="size-4 text-muted-foreground" />
                        <p className="font-medium">{warehouse.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {warehouse.employeeCount ?? 0} empleados
                        </p>
                        <Badge variant="secondary">Almacen</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {parentType}: {parentName ?? 'Sin padre'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${warehouse.name}`}
                        onClick={() =>
                          setEditorState({
                            mode: 'edit',
                            warehouseId: warehouse.id,
                          })
                        }
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Eliminar ${warehouse.name}`}
                        onClick={() => setDeleteTarget(warehouse)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {editorState && companyId ? (
        <WarehouseFormDialog
          open={editorState !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditorState(null);
            }
          }}
          warehouses={warehouses}
          areas={areas}
          locals={locals}
          editorState={editorState}
          companyId={companyId}
        />
      ) : null}

      <DeleteWarehouseDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        warehouse={deleteTarget}
      />
    </div>
  );
};
