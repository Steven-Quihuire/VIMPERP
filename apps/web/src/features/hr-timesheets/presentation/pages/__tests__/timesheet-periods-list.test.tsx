import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import type { AuthSession } from '@/features/auth/domain/auth';

import { TimesheetPeriodsListPage } from '../timesheet-periods-list';

const createSession = (): AuthSession => ({
  user: {
    id: 'user-1',
    email: 'owner@vimcore.test',
    username: 'owner',
  },
  memberships: [
    { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
  ],
  activeCompany: { companyId: 'company-1', status: 'active' },
  activeLocalId: null,
  activeScope: null,
  capabilities: ['hr.timesheets.read'],
});

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TimesheetPeriodsListPage session={createSession()} apiBaseUrl="https://api.vimcore.test" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TimesheetPeriodsListPage', () => {
  it('narrows the list when the status filter changes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.endsWith('/companies/company-1/timesheets')) {
          return Promise.resolve(
            createJsonResponse([
              {
                id: 'period-draft',
                companyId: 'company-1',
                employeeAssignmentId: 'assignment-1',
                periodStart: '2026-08-11',
                periodEnd: '2026-08-17',
                status: 'draft',
                submittedAt: null,
                submittedByUserId: null,
                approvedAt: null,
                approvedByUserId: null,
                rejectionReason: null,
                approvalPolicyId: null,
                createdAt: '2026-08-11T00:00:00.000Z',
                updatedAt: '2026-08-11T00:00:00.000Z',
              },
              {
                id: 'period-submitted',
                companyId: 'company-1',
                employeeAssignmentId: 'assignment-2',
                periodStart: '2026-08-18',
                periodEnd: '2026-08-24',
                status: 'submitted',
                submittedAt: '2026-08-24T09:00:00.000Z',
                submittedByUserId: 'user-2',
                approvedAt: null,
                approvedByUserId: null,
                rejectionReason: null,
                approvalPolicyId: 'policy-1',
                createdAt: '2026-08-18T00:00:00.000Z',
                updatedAt: '2026-08-24T09:00:00.000Z',
              },
            ]),
          );
        }

        if (url.endsWith('/companies/company-1/timesheets?status=submitted')) {
          return Promise.resolve(
            createJsonResponse([
              {
                id: 'period-submitted',
                companyId: 'company-1',
                employeeAssignmentId: 'assignment-2',
                periodStart: '2026-08-18',
                periodEnd: '2026-08-24',
                status: 'submitted',
                submittedAt: '2026-08-24T09:00:00.000Z',
                submittedByUserId: 'user-2',
                approvedAt: null,
                approvedByUserId: null,
                rejectionReason: null,
                approvalPolicyId: 'policy-1',
                createdAt: '2026-08-18T00:00:00.000Z',
                updatedAt: '2026-08-24T09:00:00.000Z',
              },
            ]),
          );
        }

        throw new Error(`unexpected request: ${url}`);
      }),
    );

    renderPage();

    expect(await screen.findByText('period-draft')).toBeInTheDocument();
    expect(screen.getByText('period-submitted')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Estado'), {
      target: { value: 'submitted' },
    });

    expect(await screen.findByText('period-submitted')).toBeInTheDocument();
    expect(screen.queryByText('period-draft')).not.toBeInTheDocument();
  });

  it('shows a friendly error when the periods query fails with a typed timesheet error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.endsWith('/companies/company-1/timesheets')) {
          return Promise.resolve(
            createJsonResponse(
              {
                error: {
                  code: 'TIMESHEET_INVALID_STATUS_TRANSITION',
                  message: 'Cannot load periods.',
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

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La acción ya no está disponible para el estado actual del período.',
    );
  });
});
