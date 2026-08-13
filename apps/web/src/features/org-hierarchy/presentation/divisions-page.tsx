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
import { Skeleton } from '@/shared/ui/skeleton';
import type { AuthSession } from '../../auth/domain/auth';
import type { Division } from '../domain/org-hierarchy';
import {
  useCreateDivision,
  useDeleteDivision,
  useDivisions,
  useUpdateDivision,
} from '../application/org-hierarchy-queries';

type DivisionEditorState = {
  mode: 'create' | 'edit';
  divisionId: string | null;
};

const emptyName = '';

const getFriendlyDivisionError = (error: unknown) => {
  if (error instanceof HttpError && error.status === 409) {
    return 'Ya existe una división con ese nombre.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo guardar la división.';
};

type DivisionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  divisions: Division[];
  editorState: DivisionEditorState;
  companyId: string;
};

const DivisionFormDialog = ({
  open,
  onOpenChange,
  divisions,
  editorState,
  companyId,
}: DivisionFormDialogProps) => {
  const createMutation = useCreateDivision();
  const updateMutation = useUpdateDivision(companyId);
  const isEditMode = editorState.mode === 'edit' && editorState.divisionId !== null;
  const selectedDivision = isEditMode
    ? (divisions.find((d) => d.id === editorState.divisionId) ?? null)
    : null;
  const isPending = createMutation.isPending || updateMutation.isPending;
  const submissionError = createMutation.error ?? updateMutation.error;
  const [name, setName] = useState(selectedDivision?.name ?? emptyName);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      setValidationError('El nombre es obligatorio.');
      return;
    }

    try {
      if (isEditMode && selectedDivision) {
        await updateMutation.mutateAsync({
          divisionId: selectedDivision.id,
          name: trimmed,
        });
      } else {
        await createMutation.mutateAsync({ companyId, name: trimmed });
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
            {isEditMode ? 'Editar división' : 'Crear división'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Actualiza el nombre de la división.'
              : 'Agrega una nueva división a tu empresa.'}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="division-name">Nombre</FieldLabel>
            <FieldContent>
              <Input
                id="division-name"
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
        </FieldGroup>

        {submissionError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {getFriendlyDivisionError(submissionError)}
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
  division: Division | null;
};

const DeleteDivisionDialog = ({
  open,
  onOpenChange,
  division,
}: DeleteDialogProps) => {
  const deleteMutation = useDeleteDivision(division?.companyId ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!division) return;

    try {
      await deleteMutation.mutateAsync(division.id);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo eliminar la división.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar división</DialogTitle>
          <DialogDescription>
            ¿Seguro que deseas eliminar «{division?.name}»? Esta acción no se puede deshacer.
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

export const DivisionsPage = ({ session }: { session: AuthSession }) => {
  const companyId = session.activeCompany?.companyId;
  const divisionsQuery = useDivisions(companyId);
  const [editorState, setEditorState] = useState<DivisionEditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Division | null>(null);

  if (divisionsQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-3xl font-medium tracking-tight">Divisiones</h1>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (divisionsQuery.isError) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-3xl font-medium tracking-tight">Divisiones</h1>
        <Card>
          <CardContent className="pt-6">
            <p role="alert" className="text-sm text-destructive">
              {divisionsQuery.error instanceof Error
                ? divisionsQuery.error.message
                : 'No se pudieron cargar las divisiones.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const divisions = divisionsQuery.data ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Divisiones</h1>
          <p className="text-sm text-muted-foreground">
            Organiza tu empresa en divisiones.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setEditorState({ mode: 'create', divisionId: null })}
        >
          <Plus className="size-4" />
          Agregar división
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de divisiones</CardTitle>
          <CardDescription>
            Las divisiones agrupan locales dentro de tu empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {divisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay divisiones registradas.{' '}
              <button
                onClick={() => setEditorState({ mode: 'create', divisionId: null })}
                className="border-b-black border-b cursor-pointer"
              >
                Agrega tu primera división
              </button>
            </p>
          ) : (
            <ul className="space-y-3">
              {divisions.map((division) => (
                <li
                  key={division.id}
                  className="flex items-center justify-between rounded-lg border bg-background/70 p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{division.name}</p>
                    <Badge variant="secondary">División</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditorState({ mode: 'edit', divisionId: division.id })}
                    >
                      <Pencil className="size-4" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar ${division.name}`}
                      onClick={() => setDeleteTarget(division)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {editorState ? (
        <DivisionFormDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditorState(null);
          }}
          divisions={divisions}
          editorState={editorState}
          companyId={companyId ?? ''}
        />
      ) : null}

      <DeleteDivisionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        division={deleteTarget}
      />
    </div>
  );
};
