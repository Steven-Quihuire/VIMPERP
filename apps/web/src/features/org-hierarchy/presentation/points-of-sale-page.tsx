import { Loader2, Pencil, Plus, ShoppingBasket, Trash2 } from 'lucide-react';
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
import {
  useAreas,
  useCreatePointOfSale,
  useDeletePointOfSale,
  useLocals,
  usePointsOfSale,
  useUpdatePointOfSale,
} from '../application/org-hierarchy-queries';
import type { Area, Local, PointOfSale } from '../domain/org-hierarchy';

type PointOfSaleEditorState = {
  mode: 'create' | 'edit';
  pointOfSaleId: string | null;
};

type PointOfSaleParentSelection = {
  parentType: 'area' | 'local';
  parentId: string;
};

const NO_PARENT = '__none__';

const getFriendlyPointOfSaleError = (error: unknown) => {
  if (error instanceof HttpError && error.status === 409) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo guardar el punto de venta.';
};

const getInitialParentSelection = (
  selectedPointOfSale: PointOfSale | null,
  areas: Area[],
  locals: Local[],
): PointOfSaleParentSelection => {
  if (selectedPointOfSale?.areaId) {
    return { parentType: 'area' as const, parentId: selectedPointOfSale.areaId };
  }

  if (selectedPointOfSale?.localId) {
    return { parentType: 'local' as const, parentId: selectedPointOfSale.localId };
  }

  if (areas[0]?.id) {
    return { parentType: 'area' as const, parentId: areas[0].id };
  }

  if (locals[0]?.id) {
    return { parentType: 'local' as const, parentId: locals[0].id };
  }

  return { parentType: 'local' as const, parentId: NO_PARENT };
};

const getParentName = (
  areas: Area[],
  locals: Local[],
  pointOfSale: PointOfSale,
) => {
  if (pointOfSale.areaId) {
    return areas.find((area) => area.id === pointOfSale.areaId)?.name ?? null;
  }

  return locals.find((local) => local.id === pointOfSale.localId)?.name ?? null;
};

const PointOfSaleFormDialog = ({
  open,
  onOpenChange,
  pointsOfSale,
  areas,
  locals,
  editorState,
  companyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pointsOfSale: PointOfSale[];
  areas: Area[];
  locals: Local[];
  editorState: PointOfSaleEditorState;
  companyId: string;
}) => {
  const createMutation = useCreatePointOfSale();
  const updateMutation = useUpdatePointOfSale(companyId);
  const isEditMode =
    editorState.mode === 'edit' && editorState.pointOfSaleId !== null;
  const selectedPointOfSale = isEditMode
    ? (
        pointsOfSale.find(
          (pointOfSale) => pointOfSale.id === editorState.pointOfSaleId,
        ) ?? null
      )
    : null;
  const initialParentSelection = getInitialParentSelection(
    selectedPointOfSale,
    areas,
    locals,
  );
  const isPending = createMutation.isPending || updateMutation.isPending;
  const submissionError = createMutation.error ?? updateMutation.error;
  const [name, setName] = useState(selectedPointOfSale?.name ?? '');
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
      setValidationError('Debes elegir un padre para el punto de venta.');
      return;
    }

    try {
      if (isEditMode && selectedPointOfSale) {
        await updateMutation.mutateAsync(
          parentType === 'area'
            ? {
                pointOfSaleId: selectedPointOfSale.id,
                name: trimmed,
                areaId: parentId,
              }
            : {
                pointOfSaleId: selectedPointOfSale.id,
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
            {isEditMode ? 'Editar punto de venta' : 'Crear punto de venta'}
          </DialogTitle>
          <DialogDescription>
            Define el punto de venta y el nivel padre donde operará.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="point-of-sale-name">Nombre</FieldLabel>
            <FieldContent>
              <Input
                id="point-of-sale-name"
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
                <SelectTrigger aria-label="Padre del punto de venta">
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
            {getFriendlyPointOfSaleError(submissionError)}
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

const DeletePointOfSaleDialog = ({
  open,
  onOpenChange,
  pointOfSale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pointOfSale: PointOfSale | null;
}) => {
  const deleteMutation = useDeletePointOfSale(pointOfSale?.companyId ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!pointOfSale) return;

    try {
      await deleteMutation.mutateAsync(pointOfSale.id);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        setError(
          'No se puede eliminar un punto de venta con dependencias asociadas.',
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo eliminar el punto de venta.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar punto de venta</DialogTitle>
          <DialogDescription>
            ¿Seguro que deseas eliminar «{pointOfSale?.name}»? Esta acción no se puede deshacer.
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
            {deleteMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const PointsOfSalePage = ({ session }: { session: AuthSession }) => {
  const companyId = session.activeCompany?.companyId;
  const pointsOfSaleQuery = usePointsOfSale(companyId);
  const areasQuery = useAreas(companyId);
  const localsQuery = useLocals(companyId);
  const [editorState, setEditorState] =
    useState<PointOfSaleEditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PointOfSale | null>(null);

  if (
    pointsOfSaleQuery.isLoading ||
    areasQuery.isLoading ||
    localsQuery.isLoading
  ) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-3xl font-medium tracking-tight">Puntos de venta</h1>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pointsOfSaleQuery.isError) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-3xl font-medium tracking-tight">Puntos de venta</h1>
        <Card>
          <CardContent className="pt-6">
            <p role="alert" className="text-sm text-destructive">
              {pointsOfSaleQuery.error instanceof Error
                ? pointsOfSaleQuery.error.message
                : 'No se pudieron cargar los puntos de venta.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pointsOfSale = pointsOfSaleQuery.data ?? [];
  const areas = areasQuery.data ?? [];
  const locals = localsQuery.data ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">
            Puntos de venta
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona puntos de venta bajo areas o locales.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setEditorState({ mode: 'create', pointOfSaleId: null })}
        >
          <Plus className="size-4" />
          Agregar punto de venta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de puntos de venta</CardTitle>
          <CardDescription>
            Cada punto de venta debe pertenecer a un area o a un local.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pointsOfSale.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay puntos de venta registrados.{' '}
              <button
                onClick={() =>
                  setEditorState({ mode: 'create', pointOfSaleId: null })
                }
                className="cursor-pointer border-b border-b-black"
              >
                Agrega tu primer punto de venta
              </button>
            </p>
          ) : (
            <div className="space-y-3">
              {pointsOfSale.map((pointOfSale) => {
                const parentName = getParentName(areas, locals, pointOfSale);
                const parentType = pointOfSale.areaId ? 'Area' : 'Local';

                return (
                  <div
                    key={pointOfSale.id}
                    className="flex items-center justify-between gap-4 rounded-xl border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShoppingBasket className="size-4 text-muted-foreground" />
                        <p className="font-medium">{pointOfSale.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {pointOfSale.employeeCount ?? 0} empleados
                        </p>
                        <Badge variant="secondary">Punto de venta</Badge>
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
                        aria-label={`Editar ${pointOfSale.name}`}
                        onClick={() =>
                          setEditorState({
                            mode: 'edit',
                            pointOfSaleId: pointOfSale.id,
                          })
                        }
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Eliminar ${pointOfSale.name}`}
                        onClick={() => setDeleteTarget(pointOfSale)}
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
        <PointOfSaleFormDialog
          open={editorState !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditorState(null);
            }
          }}
          pointsOfSale={pointsOfSale}
          areas={areas}
          locals={locals}
          editorState={editorState}
          companyId={companyId}
        />
      ) : null}

      <DeletePointOfSaleDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        pointOfSale={deleteTarget}
      />
    </div>
  );
};
