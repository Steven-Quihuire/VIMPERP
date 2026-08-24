import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import type { AuthSession } from '@/features/auth/domain/auth';

import { TimesheetPeriodDetailPage } from '../timesheet-period-detail';

const createSession = (): AuthSession => ({
  user: {
    id: 'manager-1',
    email: 'manager@vimcore.test',
    username: 'manager',
  },
  memberships: [
    { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
  ],
  activeCompany: { companyId: 'company-1', status: 'active' },
  activeLocalId: null,
  activeScope: null,
  capabilities: ['hr.timesheets.read', 'hr.timesheets.write', 'hr.timesheets.submit', 'hr.timesheets.approve'],
});

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const periodResponse = (status: 'draft' | 'submitted' | 'rejected' | 'approved' = 'draft') => ({
  id: 'period-1',
  companyId: 'company-1',
  employeeAssignmentId: 'assignment-1',
  periodStart: '2026-08-11',
  periodEnd: '2026-08-17',
  status,
  submittedAt: status === 'submitted' ? '2026-08-17T18:00:00.000Z' : null,
  submittedByUserId: status === 'submitted' ? 'employee-1' : null,
  approvedAt: null,
  approvedByUserId: null,
  rejectionReason: null,
  approvalPolicyId: null,
  createdAt: '2026-08-11T00:00:00.000Z',
  updatedAt: '2026-08-11T00:00:00.000Z',
});

const renderPage = (periodId = 'period-1') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TimesheetPeriodDetailPage
          session={createSession()}
          periodId={periodId}
          apiBaseUrl="https://api.vimcore.test"
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TimesheetPeriodDetailPage', () => {
  it('composes the period metadata with its weekly entries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.endsWith('/companies/company-1/timesheets/period-1')) {
          return Promise.resolve(createJsonResponse(periodResponse()));
        }

        if (url.endsWith('/companies/company-1/timesheets/period-1/entries')) {
          return Promise.resolve(
            createJsonResponse([
              {
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
              },
              {
                id: 'entry-2',
                companyId: 'company-1',
                periodId: 'period-1',
                entryDate: '2026-08-12',
                hours: 6,
                projectId: null,
                taskLabel: 'Cierre de caja',
                note: null,
                createdAt: '2026-08-12T00:00:00.000Z',
                updatedAt: '2026-08-12T00:00:00.000Z',
              },
            ]),
          );
        }

        throw new Error(`unexpected request: ${url}`);
      }),
    );

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Detalle del período' })).toBeInTheDocument();
    expect(screen.getByText('Atención al cliente')).toBeInTheDocument();
    expect(screen.getByText('Cierre de caja')).toBeInTheDocument();
  });

  it('keeps the period context visible and shows a friendly conflict banner when entries fail to load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.endsWith('/companies/company-1/timesheets/period-1')) {
          return Promise.resolve(createJsonResponse(periodResponse()));
        }

        if (url.endsWith('/companies/company-1/timesheets/period-1/entries')) {
          return Promise.resolve(
            createJsonResponse(
              {
                error: {
                  code: 'TIMESHEET_ENTRY_CONFLICT',
                  message: 'Conflict while loading entries.',
                },
              },
              409,
            ),
          );
        }

        throw new Error(`unexpected request: ${url}`);
      }),
    );

    renderPage();

    expect(await screen.findByText('2026-08-11 → 2026-08-17')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe una carga para esa fecha y tarea. Revisá las horas o editá la entrada existente.',
    );
  });

  it('hides draft editing controls when the period is not editable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.endsWith('/companies/company-1/timesheets/period-1')) {
          return Promise.resolve(createJsonResponse(periodResponse('submitted')));
        }

        if (url.endsWith('/companies/company-1/timesheets/period-1/entries')) {
          return Promise.resolve(createJsonResponse([]));
        }

        throw new Error(`unexpected request: ${url}`);
      }),
    );

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Detalle del período' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar nueva entrada' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar entry-1' })).not.toBeInTheDocument();
  });
});
