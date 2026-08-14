import { Loader2, Map, Pencil, Plus, Trash2 } from 'lucide-react';
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
import type { Area, Division, Local } from '../domain/org-hierarchy';
import {
  useAreas,
  useCreateArea,
  useDeleteArea,
  useDivisions,
  useLocals,
  useUpdateArea,
} from '../application/org-hierarchy-queries';

type AreaEditorState = {
  mode: 'create' | 'edit';
  areaId: string | null;
};

type AreaParentSelection = {
  parentType: 'division' | 'local';
  parentId: string;
};

const NO_PARENT = '__none__';

const getFriendlyAreaError = (error: unknown) => {
  if (error instanceof HttpError && error.status === 409) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo guardar el area.';
};

const getParentName = (
  divisions: Division[],
  locals: Local[],
  area: Area,
) => {
  if (area.divisionId) {
    return divisions.find((division) => division.id === area.divisionId)?.name ?? null;
  }

  return locals.find((local) => local.id === area.localId)?.name ?? null;
};

type AreaFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areas: Area[];
  divisions: Division[];
  locals: Local[];
  editorState: AreaEditorState;
  companyId: string;
};

const getInitialParentSelection = (
  selectedArea: Area | null,
  divisions: Division[],
  locals: Local[],
): AreaParentSelection => {
  if (selectedArea?.divisionId) {
    return { parentType: 'division' as const, parentId: selectedArea.divisionId };
  }

  if (selectedArea?.localId) {
    return { parentType: 'local' as const, parentId: selectedArea.localId };
  }

  if (divisions[0]?.id) {
    return { parentType: 'division' as const, parentId: divisions[0].id };
  }

  if (locals[0]?.id) {
    return { parentType: 'local' as const, parentId: locals[0].id };
  }

  return { parentType: 'local' as const, parentId: NO_PARENT };
};

const AreaFormDialog = ({
  open,
  onOpenChange,
  areas,
  divisions,
  locals,
  editorState,
  companyId,
}: AreaFormDialogProps) => {
  const createMutation = useCreateArea();
  const updateMutation = useUpdateArea(companyId);
  const isEditMode = editorState.mode === 'edit' && editorState.areaId !== null;
  const selectedArea = isEditMode
    ? (areas.find((area) => area.id === editorState.areaId) ?? null)
    : null;
  const initialParentSelection = getInitialParentSelection(
    selectedArea,
    divisions,
    locals,
  );
  const isPending = createMutation.isPending || updateMutation.isPending;
  const submissionError = createMutation.error ?? updateMutation.error;
  const [name, setName] = useState(selectedArea?.name ?? '');
  const [parentType, setParentType] = useState<'division' | 'local'>(
    initialParentSelection.parentType,
  );
  const [parentId, setParentId] = useState<string>(initialParentSelection.parentId);
  const [validationError, setValidationError] = useState<string | null>(null);

  const parentOptions = parentType === 'division' ? divisions : locals;

  const handleSubmit = async () => {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      setValidationError('El nombre es obligatorio.');
      return;
    }

    if (parentId === NO_PARENT) {
      setValidationError('Debes elegir un padre para el area.');
      return;
    }

    try {
      if (isEditMode && selectedArea) {
        await updateMutation.mutateAsync(
          parentType === 'division'
            ? { areaId: selectedArea.id, name: trimmed, divisionId: parentId }
            : { areaId: selectedArea.id, name: trimmed, localId: parentId },
        );
      } else {
        await createMutation.mutateAsync(
          parentType === 'division'
            ? { companyId, name: trimmed, divisionId: parentId }
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
          <DialogTitle>{isEditMode ? 'Editar area' : 'Crear area'}</DialogTitle>
          <DialogDescription>
            Define el area y el nivel padre donde operará.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="area-name">Nombre</FieldLabel>
            <FieldContent>
              <Input
                id="area-name"
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
                  const nextParentType = value as 'division' | 'local';
                  const nextDefaultParent =
                    nextParentType === 'division'
                      ? divisions[0]?.id ?? NO_PARENT
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
                  <SelectItem value="division">Division</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{parentType === 'division' ? 'Division' : 'Local'}</FieldLabel>
            <FieldContent>
              <Select
                value={parentId}
                onValueChange={(value) => {
                  setParentId(value);
                  setValidationError(null);
                }}
                disabled={isPending}
              >
                <SelectTrigger aria-label="Padre del area">
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
            {getFriendlyAreaError(submissionError)}
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

const DeleteAreaDialog = ({
  open,
  onOpenChange,
  area,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: Area | null;
}) => {
  const deleteMutation = useDeleteArea(area?.companyId ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!area) return;

    try {
      await deleteMutation.mutateAsync(area.id);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo eliminar el area.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar area</DialogTitle>
          <DialogDescription>
            ¿Seguro que deseas eliminar «{area?.name}»? Esta acción no se puede deshacer.
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

export const AreasPage = ({ session }: { session: AuthSession }) => {
  const companyId = session.activeCompany?.companyId;
  const areasQuery = useAreas(companyId);
  const divisionsQuery = useDivisions(companyId);
  const localsQuery = useLocals(companyId);
  const [editorState, setEditorState] = useState<AreaEditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null);

  if (areasQuery.isLoading || divisionsQuery.isLoading || localsQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-3xl font-medium tracking-tight">Areas</h1>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (areasQuery.isError) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-3xl font-medium tracking-tight">Areas</h1>
        <Card>
          <CardContent className="pt-6">
            <p role="alert" className="text-sm text-destructive">
              {areasQuery.error instanceof Error
                ? areasQuery.error.message
                : 'No se pudieron cargar las areas.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const areas = areasQuery.data ?? [];
  const divisions = divisionsQuery.data ?? [];
  const locals = localsQuery.data ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Areas</h1>
          <p className="text-sm text-muted-foreground">
            Organiza zonas operativas bajo divisiones o locales.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setEditorState({ mode: 'create', areaId: null })}
        >
          <Plus className="size-4" />
          Agregar area
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de areas</CardTitle>
          <CardDescription>
            Cada area debe pertenecer a una division o a un local.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {areas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay areas registradas.{' '}
              <button
                onClick={() => setEditorState({ mode: 'create', areaId: null })}
                className="cursor-pointer border-b border-b-black"
              >
                Agrega tu primera area
              </button>
            </p>
          ) : (
            <div className="space-y-3">
              {areas.map((area) => {
                const parentName = getParentName(divisions, locals, area);
                const parentType = area.divisionId ? 'Division' : 'Local';

                return (
                  <div
                    key={area.id}
                    className="flex items-center justify-between gap-4 rounded-xl border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Map className="size-4 text-muted-foreground" />
                        <p className="font-medium">{area.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {area.employeeCount ?? 0} empleados
                        </p>
                        <Badge variant="secondary">Area</Badge>
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
                        aria-label={`Editar ${area.name}`}
                        onClick={() =>
                          setEditorState({ mode: 'edit', areaId: area.id })
                        }
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Eliminar ${area.name}`}
                        onClick={() => setDeleteTarget(area)}
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
        <AreaFormDialog
          open={editorState !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditorState(null);
            }
          }}
          areas={areas}
          divisions={divisions}
          locals={locals}
          editorState={editorState}
          companyId={companyId}
        />
      ) : null}

      <DeleteAreaDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        area={deleteTarget}
      />
    </div>
  );
};
