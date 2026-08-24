import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TimesheetEntry, TimesheetPeriod } from '@/features/hr-timesheets/domain/timesheets';

import { useWeeklyEntryDraftStore } from '@/features/hr-timesheets/application/weekly-entry-draft-store';
import { WeeklyEntryEditor } from '../weekly-entry-editor';

const createPeriod = (status: TimesheetPeriod['status'] = 'draft'): TimesheetPeriod => ({
  id: 'period-1',
  companyId: 'company-1',
  employeeAssignmentId: 'assignment-1',
  periodStart: '2026-08-11',
  periodEnd: '2026-08-17',
  status,
  submittedAt: null,
  submittedByUserId: null,
  approvedAt: null,
  approvedByUserId: null,
  rejectionReason: null,
  approvalPolicyId: null,
  createdAt: '2026-08-11T00:00:00.000Z',
  updatedAt: '2026-08-11T00:00:00.000Z',
});

const existingEntry: TimesheetEntry = {
  id: 'entry-1',
  companyId: 'company-1',
  periodId: 'period-1',
  entryDate: '2026-08-11',
  hours: 8,
  projectId: null,
  taskLabel: 'Atención al cliente',
  note: 'Turno mañana',
  createdAt: '2026-08-11T00:00:00.000Z',
  updatedAt: '2026-08-11T00:00:00.000Z',
};

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const renderEditor = (period = createPeriod()) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <WeeklyEntryEditor
        companyId="company-1"
        period={period}
        entries={[existingEntry]}
        apiBaseUrl="https://api.vimcore.test"
      />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  useWeeklyEntryDraftStore.getState().resetDrafts();
  useWeeklyEntryDraftStore.getState().closeRejectDialog();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('WeeklyEntryEditor', () => {
  it('creates, updates, and deletes entries only when the period is editable', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? 'GET';

      if (url.endsWith('/companies/company-1/timesheets/period-1/entries') && method === 'POST') {
        return Promise.resolve(
          createJsonResponse({
            ...existingEntry,
            id: 'entry-new',
            entryDate: '2026-08-13',
            hours: 5,
            taskLabel: 'Capacitación',
            note: 'Inducción',
          }, 201),
        );
      }

      if (url.endsWith('/companies/company-1/timesheets/period-1/entries/entry-1') && method === 'PATCH') {
        return Promise.resolve(
          createJsonResponse({
            ...existingEntry,
            hours: 7,
            taskLabel: 'Atención actualizada',
          }),
        );
      }

      if (url.endsWith('/companies/company-1/timesheets/period-1/entries/entry-1') && method === 'DELETE') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      throw new Error(`unexpected request: ${method} ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    renderEditor();

    fireEvent.change(screen.getByLabelText('Fecha'), {
      target: { value: '2026-08-13' },
    });
    fireEvent.change(screen.getByLabelText('Horas'), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByLabelText('Tarea'), {
      target: { value: 'Capacitación' },
    });
    fireEvent.change(screen.getByLabelText('Nota'), {
      target: { value: 'Inducción' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva entrada' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.vimcore.test/companies/company-1/timesheets/period-1/entries',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Editar entry-1' }));
    fireEvent.change(screen.getByLabelText('Horas'), {
      target: { value: '7' },
    });
    fireEvent.change(screen.getByLabelText('Tarea'), {
      target: { value: 'Atención actualizada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.vimcore.test/companies/company-1/timesheets/period-1/entries/entry-1',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar entry-1' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.vimcore.test/companies/company-1/timesheets/period-1/entries/entry-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  it('hides create, update, and delete controls when the period is not editable', () => {
    renderEditor(createPeriod('submitted'));

    expect(screen.queryByRole('button', { name: 'Guardar nueva entrada' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar entry-1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar entry-1' })).not.toBeInTheDocument();
  });
});
