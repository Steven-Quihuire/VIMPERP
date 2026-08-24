import { useState } from 'react';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { HttpError } from '@/shared/lib/http/http-client';

import {
  useCreateTimesheetEntry,
  useDeleteTimesheetEntry,
  useUpdateTimesheetEntry,
} from '../../application/hr-timesheets-queries';
import { useWeeklyEntryDraftStore } from '../../application/weekly-entry-draft-store';
import { getFriendlyTimesheetError } from '../../domain/friendly-timesheet-error';
import {
  canEditTimesheetEntries,
  type TimesheetEntry,
  type TimesheetPeriod,
  type WeeklyEntryDraft,
} from '../../domain/timesheets';

const newDraftKey = 'new-entry';

const toNewDraft = (periodStart: string): WeeklyEntryDraft => ({
  entryId: null,
  entryDate: periodStart,
  hours: '',
  projectId: '',
  taskLabel: '',
  note: '',
});

const toEntryDraft = (entry: TimesheetEntry): WeeklyEntryDraft => ({
  entryId: entry.id,
  entryDate: entry.entryDate,
  hours: String(entry.hours),
  projectId: entry.projectId ?? '',
  taskLabel: entry.taskLabel,
  note: entry.note ?? '',
});

const readErrorMessage = (error: unknown) => {
  if (error instanceof HttpError) {
    return getFriendlyTimesheetError(error.code);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return getFriendlyTimesheetError();
};

export const WeeklyEntryEditor = ({
  companyId,
  period,
  entries,
  apiBaseUrl,
  onError,
}: {
  companyId: string;
  period: TimesheetPeriod;
  entries: TimesheetEntry[];
  apiBaseUrl?: string;
  onError?: (message: string | null) => void;
}) => {
  const isEditable = canEditTimesheetEntries(period);
  const [activeDraftKey, setActiveDraftKey] = useState<string>(newDraftKey);
  const drafts = useWeeklyEntryDraftStore((state) => state.drafts);
  const setDraft = useWeeklyEntryDraftStore((state) => state.setDraft);
  const clearDraft = useWeeklyEntryDraftStore((state) => state.clearDraft);
  const createEntryMutation = useCreateTimesheetEntry(apiBaseUrl);
  const updateEntryMutation = useUpdateTimesheetEntry(apiBaseUrl);
  const deleteEntryMutation = useDeleteTimesheetEntry(apiBaseUrl);

  const fallbackDraft =
    activeDraftKey === newDraftKey
      ? toNewDraft(period.periodStart)
      : toEntryDraft(
          entries.find((entry) => entry.id === activeDraftKey) ?? entries[0] ?? {
            id: activeDraftKey,
            companyId,
            periodId: period.id,
            entryDate: period.periodStart,
            hours: 0,
            projectId: null,
            taskLabel: '',
            note: null,
            createdAt: period.createdAt,
            updatedAt: period.updatedAt,
          },
        );
  const activeDraft = drafts[activeDraftKey] ?? fallbackDraft;

  const updateDraft = (patch: Partial<WeeklyEntryDraft>) => {
    setDraft(activeDraftKey, {
      ...activeDraft,
      ...patch,
    });
  };

  const resetToNewDraft = () => {
    clearDraft(activeDraftKey);
    setActiveDraftKey(newDraftKey);
    clearDraft(newDraftKey);
  };

  const handleMutationError = (error: unknown) => {
    onError?.(readErrorMessage(error));
  };

  const handleCreate = async () => {
    if (!isEditable) {
      return;
    }

    try {
      await createEntryMutation.mutateAsync({
        companyId,
        periodId: period.id,
        entryDate: activeDraft.entryDate as `${number}-${number}-${number}`,
        hours: Number(activeDraft.hours),
        projectId: activeDraft.projectId || null,
        taskLabel: activeDraft.taskLabel,
        note: activeDraft.note || null,
      });
      onError?.(null);
      clearDraft(newDraftKey);
    } catch (error) {
      handleMutationError(error);
    }
  };

  const handleUpdate = async () => {
    if (!isEditable || !activeDraft.entryId) {
      return;
    }

    try {
      await updateEntryMutation.mutateAsync({
        companyId,
        periodId: period.id,
        entryId: activeDraft.entryId,
        entryDate: activeDraft.entryDate as `${number}-${number}-${number}`,
        hours: Number(activeDraft.hours),
        projectId: activeDraft.projectId || null,
        taskLabel: activeDraft.taskLabel,
        note: activeDraft.note || null,
      });
      onError?.(null);
      resetToNewDraft();
    } catch (error) {
      handleMutationError(error);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!isEditable) {
      return;
    }

    try {
      await deleteEntryMutation.mutateAsync({ companyId, periodId: period.id, entryId });
      onError?.(null);
      if (activeDraftKey === entryId) {
        resetToNewDraft();
      }
    } catch (error) {
      handleMutationError(error);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <header className="space-y-1">
        <h2 className="text-lg font-medium">Entradas semanales</h2>
        <p className="text-sm text-muted-foreground">
          Registrá tareas y horas por día dentro del período vigente.
        </p>
      </header>

      <div className="space-y-3">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <article
              key={entry.id}
              className="flex flex-col gap-3 rounded-lg border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium">{entry.taskLabel}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.entryDate} · {entry.hours} h
                </p>
                {entry.note ? (
                  <p className="text-sm text-muted-foreground">{entry.note}</p>
                ) : null}
              </div>

              {isEditable ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Editar ${entry.id}`}
                    onClick={() => {
                      setActiveDraftKey(entry.id);
                      setDraft(entry.id, toEntryDraft(entry));
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    aria-label={`Eliminar ${entry.id}`}
                    onClick={() => void handleDelete(entry.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            Todavía no hay entradas cargadas para esta semana.
          </p>
        )}
      </div>

      {isEditable ? (
        <div className="space-y-3 rounded-lg border border-border/70 bg-background px-4 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Fecha</span>
              <Input
                aria-label="Fecha"
                type="date"
                value={activeDraft.entryDate}
                onChange={(event) => updateDraft({ entryDate: event.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Horas</span>
              <Input
                aria-label="Horas"
                type="number"
                min="0"
                step="0.5"
                value={activeDraft.hours}
                onChange={(event) => updateDraft({ hours: event.target.value })}
              />
            </label>
          </div>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Tarea</span>
            <Input
              aria-label="Tarea"
              value={activeDraft.taskLabel}
              onChange={(event) => updateDraft({ taskLabel: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Nota</span>
            <textarea
              aria-label="Nota"
              className="min-h-24 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none"
              value={activeDraft.note}
              onChange={(event) => updateDraft({ note: event.target.value })}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {activeDraft.entryId ? (
              <>
                <Button type="button" onClick={() => void handleUpdate()}>
                  Guardar cambios
                </Button>
                <Button type="button" variant="outline" onClick={resetToNewDraft}>
                  Cancelar edición
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => void handleCreate()}>
                Guardar nueva entrada
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Este período ya no permite editar entradas.
        </p>
      )}
    </section>
  );
};
