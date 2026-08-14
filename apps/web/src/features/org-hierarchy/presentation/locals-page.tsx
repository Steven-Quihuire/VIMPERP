import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
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
import type { Division, Local } from '../domain/org-hierarchy';
import {
  useCreateLocal,
  useDeleteLocal,
  useDivisions,
  useLocals,
  useUpdateLocal,
} from '../application/org-hierarchy-queries';

type LocalEditorState = {
  mode: 'create' | 'edit';
  localId: string | null;
};

const NO_DIVISION = '__none__';

const getFriendlyLocalError = (error: unknown) => {
  if (error instanceof HttpError && error.status === 409) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo guardar el local.';
};

type LocalFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locals: Local[];
  divisions: Division[];
  editorState: LocalEditorState;
  companyId: string;
};

const LocalFormDialog = ({
  open,
  onOpenChange,
  locals,
  divisions,
  editorState,
  companyId,
}: LocalFormDialogProps) => {
  const createMutation = useCreateLocal();
  const updateMutation = useUpdateLocal(companyId);
  const isEditMode = editorState.mode === 'edit' && editorState.localId !== null;
  const selectedLocal = isEditMode
    ? (locals.find((l) => l.id === editorState.localId) ?? null)
    : null;
  const isPending = createMutation.isPending || updateMutation.isPending;
  const submissionError = createMutation.error ?? updateMutation.error;
  const [name, setName] = useState(selectedLocal?.name ?? '');
  const [divisionId, setDivisionId] = useState(
    selectedLocal?.divisionId ?? NO_DIVISION,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      setValidationError('El nombre es obligatorio.');
      return;
    }

    const resolvedDivisionId =
      divisionId === NO_DIVISION ? null : divisionId;

    try {
      if (isEditMode && selectedLocal) {
        await updateMutation.mutateAsync({
          localId: selectedLocal.id,
          name: trimmed,
          divisionId: resolvedDivisionId,
        });
      } else {
        await createMutation.mutateAsync({
          companyId,
          name: trimmed,
          divisionId: resolvedDivisionId,
        });
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
            {isEditMode ? 'Editar local' : 'Crear local'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Actualiza los datos del local.'
              : 'Agrega un nuevo local a tu empresa.'}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="local-name">Nombre</FieldLabel>
            <FieldContent>
              <Input
                id="local-name"
                aria-label="Nombre"
                disabled={isPending}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setValidationError(null);
                }}
              />
              {validationError ? (
                <FieldError errors={[{ message: validationError }]} />
              ) : null}
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>División</FieldLabel>
            <FieldContent>
              <Select
                value={divisionId}
                onValueChange={setDivisionId}
                disabled={isPending}
              >
                <SelectTrigger aria-label="División">
                  <SelectValue placeholder="Sin división" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DIVISION}>Sin división</SelectItem>
                  {divisions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
        </FieldGroup>

        {submissionError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {getFriendlyLocalError(submissionError)}
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

type DeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  local: Local | null;
};

const DeleteLocalDialog = ({ open, onOpenChange, local }: DeleteDialogProps) => {
  const deleteMutation = useDeleteLocal(local?.companyId ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!local) return;

    try {
      await deleteMutation.mutateAsync(local.id);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo eliminar el local.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar local</DialogTitle>
          <DialogDescription>
            ¿Seguro que deseas eliminar «{local?.name}»? Esta acción no se puede deshacer.
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

const getDivisionName = (
  divisions: Division[],
  divisionId: string | null,
) => {
  if (!divisionId) return null;
  return divisions.find((d) => d.id === divisionId)?.name ?? null;
};

export const LocalsPage = ({ session }: { session: AuthSession }) => {
  const companyId = session.activeCompany?.companyId;
  const localsQuery = useLocals(companyId);
  const divisionsQuery = useDivisions(companyId);
  const [editorState, setEditorState] = useState<LocalEditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Local | null>(null);

  if (localsQuery.isLoading || divisionsQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-3xl font-medium tracking-tight">Locales</h1>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (localsQuery.isError) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-3xl font-medium tracking-tight">Locales</h1>
        <Card>
          <CardContent className="pt-6">
            <p role="alert" className="text-sm text-destructive">
              {localsQuery.error instanceof Error
                ? localsQuery.error.message
                : 'No se pudieron cargar los locales.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const locals = localsQuery.data ?? [];
  const divisions = divisionsQuery.data ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Locales</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los locales de tu empresa.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setEditorState({ mode: 'create', localId: null })}
        >
          <Plus className="size-4" />
          Agregar local
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de locales</CardTitle>
          <CardDescription>
            Los locales determinan el alcance de items y categorías.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay locales registrados.{' '}
              <button
                onClick={() => setEditorState({ mode: 'create', localId: null })}
                className="border-b-black border-b cursor-pointer"
              >
                Agrega tu primer local
              </button>
            </p>
          ) : (
            <ul className="space-y-3">
              {locals.map((local) => {
                const divisionName = getDivisionName(divisions, local.divisionId);

                return (
                  <li
                    key={local.id}
                    className="flex items-center justify-between rounded-lg border bg-background/70 p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{local.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {local.employeeCount ?? 0} empleados
                      </p>
                      <Badge variant={divisionName ? 'outline' : 'secondary'}>
                        {divisionName ?? 'Sin división'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditorState({ mode: 'edit', localId: local.id })}
                      >
                        <Pencil className="size-4" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Eliminar ${local.name}`}
                        onClick={() => setDeleteTarget(local)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {editorState ? (
        <LocalFormDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditorState(null);
          }}
          locals={locals}
          divisions={divisions}
          editorState={editorState}
          companyId={companyId ?? ''}
        />
      ) : null}

      <DeleteLocalDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        local={deleteTarget}
      />
    </div>
  );
};
