import { useState, type FormEvent } from 'react';

import type { AuthSession } from '@/features/auth/domain/auth';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/ui/dialog';
import { HttpError } from '@/shared/lib/http/http-client';

import {
  useApproveTimesheetPeriod,
  usePatchTimesheetPeriod,
  useRejectTimesheetPeriod,
  useReopenTimesheetPeriod,
  useSubmitTimesheetPeriod,
  useTimesheetPeriod,
  useTimesheetPeriodEntries,
} from '../../application/hr-timesheets-queries';
import { useWeeklyEntryDraftStore } from '../../application/weekly-entry-draft-store';
import { DatePickerField } from '@/features/hr-employees/presentation/components/date-picker-field';
import {
  canApproveTimesheetPeriod,
  canEditTimesheetEntries,
  canRejectTimesheetPeriod,
  canReopenTimesheetPeriod,
  canSubmitTimesheetPeriod,
} from '../../domain/timesheets';
import { getFriendlyTimesheetError } from '../../domain/friendly-timesheet-error';
import { WeeklyEntryEditor } from '../components/weekly-entry-editor';

const statusLabels = {
  draft: 'Borrador',
  submitted: 'Enviado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
} as const;

const readErrorMessage = (error: unknown) => {
  if (error instanceof HttpError) {
    return getFriendlyTimesheetError(error.code);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return getFriendlyTimesheetError();
};

export const TimesheetPeriodDetailPage = ({
  session,
  periodId,
  apiBaseUrl,
}: {
  session: AuthSession;
  periodId: string;
  apiBaseUrl?: string;
}) => {
  const companyId = session.activeCompany?.companyId;
  const periodQuery = useTimesheetPeriod(companyId, periodId, apiBaseUrl);
  const entriesQuery = useTimesheetPeriodEntries(companyId, periodId, apiBaseUrl);
  const submitMutation = useSubmitTimesheetPeriod(apiBaseUrl);
  const approveMutation = useApproveTimesheetPeriod(apiBaseUrl);
  const rejectMutation = useRejectTimesheetPeriod(apiBaseUrl);
  const reopenMutation = useReopenTimesheetPeriod(apiBaseUrl);
  const patchMutation = usePatchTimesheetPeriod(apiBaseUrl);
  const rejectDialog = useWeeklyEntryDraftStore((state) => state.rejectDialog);
  const openRejectDialog = useWeeklyEntryDraftStore((state) => state.openRejectDialog);
  const setRejectReason = useWeeklyEntryDraftStore((state) => state.setRejectReason);
  const closeRejectDialog = useWeeklyEntryDraftStore((state) => state.closeRejectDialog);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEditDatesOpen, setIsEditDatesOpen] = useState(false);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const openEditDates = () => {
    setEditStart(period?.periodStart ?? '');
    setEditEnd(period?.periodEnd ?? '');
    setEditError(null);
    setIsEditDatesOpen(true);
  };

  const handlePatchDates = async (event: FormEvent) => {
    event.preventDefault();
    setEditError(null);
    try {
      await patchMutation.mutateAsync({
        companyId: companyId as string,
        periodId,
        periodStart: editStart as `${number}-${number}-${number}`,
        periodEnd: editEnd as `${number}-${number}-${number}`,
      });
      setIsEditDatesOpen(false);
    } catch (error) {
      setEditError(readErrorMessage(error));
    }
  };

  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleccioná una compañía activa para consultar el detalle del período.
      </p>
    );
  }

  if (periodQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando período…</p>;
  }

  if (periodQuery.isError) {
    return (
      <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {readErrorMessage(periodQuery.error)}
      </p>
    );
  }

  const period = periodQuery.data;

  if (!period) {
    return (
      <p className="text-sm text-muted-foreground">
        El período seleccionado ya no está disponible.
      </p>
    );
  }

  const entriesError = entriesQuery.isError ? readErrorMessage(entriesQuery.error) : null;
  const visibleMessage = feedback ?? entriesError;
  const isEditable = canEditTimesheetEntries(period);

  const runAction = async (runner: () => Promise<unknown>) => {
    try {
      await runner();
      setFeedback(null);
    } catch (error) {
      setFeedback(readErrorMessage(error));
    }
  };

  const handleReject = async () => {
    if (rejectDialog.reason.trim().length === 0) {
      setFeedback(getFriendlyTimesheetError('TIMESHEET_REJECTION_REASON_REQUIRED'));
      return;
    }

    await runAction(async () => {
      await rejectMutation.mutateAsync({
        companyId,
        periodId,
        rejectionReason: rejectDialog.reason,
      });
      closeRejectDialog();
    });
  };

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-medium tracking-tight">Detalle del período</h1>
          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            {statusLabels[period.status]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {period.periodStart} → {period.periodEnd}
        </p>
        {period.rejectionReason ? (
          <p className="text-sm text-muted-foreground">
            Motivo del rechazo: {period.rejectionReason}
          </p>
        ) : null}
      </header>

      {visibleMessage ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {visibleMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canSubmitTimesheetPeriod(period) ? (
          <Button
            type="button"
            onClick={() =>
              void runAction(() => submitMutation.mutateAsync({ companyId, periodId }))
            }
          >
            Enviar período
          </Button>
        ) : null}
        {canApproveTimesheetPeriod(period, session.user.id) ? (
          <Button
            type="button"
            onClick={() =>
              void runAction(() => approveMutation.mutateAsync({ companyId, periodId }))
            }
          >
            Aprobar período
          </Button>
        ) : null}
        {canRejectTimesheetPeriod(period, session.user.id) ? (
          <Button type="button" variant="outline" onClick={() => openRejectDialog(periodId)}>
            Rechazar período
          </Button>
        ) : null}
        {canReopenTimesheetPeriod(period) ? (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void runAction(() => reopenMutation.mutateAsync({ companyId, periodId }))
            }
          >
            Reabrir período
          </Button>
        ) : null}
        {isEditable ? (
          <Button type="button" variant="outline" onClick={openEditDates}>
            Editar fechas
          </Button>
        ) : null}
      </div>

      {rejectDialog.isOpen && rejectDialog.periodId === periodId ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4" role="dialog" aria-label="Rechazar período">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Motivo del rechazo</span>
            <textarea
              aria-label="Motivo del rechazo"
              className="min-h-24 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none"
              value={rejectDialog.reason}
              onChange={(event) => setRejectReason(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void handleReject()}>
              Confirmar rechazo
            </Button>
            <Button type="button" variant="outline" onClick={closeRejectDialog}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      <WeeklyEntryEditor
        companyId={companyId}
        period={period}
        entries={entriesQuery.data ?? []}
        {...(apiBaseUrl ? { apiBaseUrl } : {})}
        onError={setFeedback}
      />

      {!isEditable ? (
        <p className="text-sm text-muted-foreground">
          El período ya no está en borrador, por eso los controles de edición quedaron ocultos.
        </p>
      ) : null}

      <Dialog open={isEditDatesOpen} onOpenChange={setIsEditDatesOpen}>
        <DialogContent>
          <DialogTitle>Editar fechas del período</DialogTitle>
          <form className="space-y-4" onSubmit={(event) => void handlePatchDates(event)}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="timesheet-edit-start">
                Inicio
              </label>
              <DatePickerField
                id="timesheet-edit-start"
                value={editStart}
                onChange={setEditStart}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="timesheet-edit-end">
                Fin
              </label>
              <DatePickerField
                id="timesheet-edit-end"
                value={editEnd}
                onChange={setEditEnd}
              />
            </div>

            {editError ? (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {editError}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDatesOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!editStart || !editEnd || patchMutation.isPending}
              >
                Guardar fechas
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};
