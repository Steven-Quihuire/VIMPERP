import { describe, expect, it, vi } from 'vitest';

import { createGetApplicationErrorDetail } from './get-application-error-detail';
import { createGetAuditEventDetail } from './get-audit-event-detail';
import { createGetProvisioningRunDetail } from './get-provisioning-run-detail';
import { createListApplicationErrors } from './list-application-errors';
import { createListAuditEvents } from './list-audit-events';
import { createListProvisioningRuns } from './list-provisioning-runs';
import type {
  AdminApplicationErrorDetail,
  AdminApplicationErrorSummary,
  AdminAuditEventDetail,
  AdminAuditEventSummary,
  AdminGateway,
  AdminProvisioningRunDetail,
  AdminProvisioningRunSummary,
} from '../domain/admin';

const createAdminGateway = (): AdminGateway => ({
  getCompanySummary: vi.fn(),
  listNotifications: vi.fn(),
  listNotificationsForCompanyRole: vi.fn(),
  listProvisioningRuns: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'run-1',
        correlationId: 'corr-run',
        requestId: 'req-run',
        actorUserId: 'user-1',
        companyName: 'Vimcore Labs',
        process: 'company-onboarding',
        status: 'succeeded',
        attempt: 1,
        idempotencyKey: null,
        errorSummary: null,
        createdAt: '2026-07-28T10:00:00.000Z',
        updatedAt: '2026-07-28T10:01:00.000Z',
      } satisfies AdminProvisioningRunSummary,
    ],
    nextCursor: 'next-run-cursor',
  }),
  getProvisioningRun: vi.fn().mockResolvedValue({
    id: 'run-1',
    correlationId: 'corr-run',
    requestId: 'req-run',
    actorUserId: 'user-1',
    companyName: 'Vimcore Labs',
    process: 'company-onboarding',
    status: 'succeeded',
    attempt: 1,
    idempotencyKey: null,
    errorSummary: null,
    createdAt: '2026-07-28T10:00:00.000Z',
    updatedAt: '2026-07-28T10:01:00.000Z',
    steps: [
      {
        id: 'step-1',
        name: 'company-creation',
        status: 'succeeded',
        attempt: 1,
        detail: { companyId: 'company-1' },
        createdAt: '2026-07-28T10:00:30.000Z',
      },
    ],
  } satisfies AdminProvisioningRunDetail),
  listApplicationErrors: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'error-1',
        correlationId: 'corr-err',
        requestId: 'req-err',
        fingerprint: 'fingerprint-1',
        status: '500',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected server error',
        createdAt: '2026-07-28T11:00:00.000Z',
      } satisfies AdminApplicationErrorSummary,
    ],
    nextCursor: null,
  }),
  getApplicationError: vi.fn().mockResolvedValue({
    id: 'error-1',
    correlationId: 'corr-err',
    requestId: 'req-err',
    fingerprint: 'fingerprint-1',
    status: '500',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected server error',
    stack: 'Error: boom',
    context: { route: '/companies' },
    createdAt: '2026-07-28T11:00:00.000Z',
  } satisfies AdminApplicationErrorDetail),
  listAuditEvents: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'audit-1',
        actorUserId: 'user-1',
        companyId: 'company-1',
        type: 'company.created',
        correlationId: 'corr-audit',
        entityType: 'company',
        entityId: 'company-1',
        createdAt: '2026-07-28T12:00:00.000Z',
      } satisfies AdminAuditEventSummary,
    ],
    nextCursor: null,
  }),
  getAuditEvent: vi.fn().mockResolvedValue({
    id: 'audit-1',
    actorUserId: 'user-1',
    companyId: 'company-1',
    type: 'company.created',
    correlationId: 'corr-audit',
    entityType: 'company',
    entityId: 'company-1',
    details: { source: 'onboarding' },
    oldValues: null,
    newValues: { companyId: 'company-1' },
    createdAt: '2026-07-28T12:00:00.000Z',
  } satisfies AdminAuditEventDetail),
});

describe('admin observability use cases', () => {
  it('lists provisioning runs and application errors through the admin gateway', async () => {
    const adminGateway = createAdminGateway();

    const listProvisioningRuns = createListProvisioningRuns(adminGateway);
    const listApplicationErrors = createListApplicationErrors(adminGateway);

    await expect(
      listProvisioningRuns({
        status: 'succeeded',
        correlationId: 'corr-run',
        limit: 5,
        cursor: 'cursor-run',
      }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 'run-1',
          status: 'succeeded',
        }),
      ],
      nextCursor: 'next-run-cursor',
    });
    await expect(
      listApplicationErrors({
        fingerprint: 'fingerprint-1',
        correlationId: 'corr-err',
        limit: 5,
        cursor: 'cursor-err',
      }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 'error-1',
          fingerprint: 'fingerprint-1',
        }),
      ],
      nextCursor: null,
    });

    expect(adminGateway.listProvisioningRuns).toHaveBeenCalledWith({
      status: 'succeeded',
      correlationId: 'corr-run',
      limit: 5,
      cursor: 'cursor-run',
    });
    expect(adminGateway.listApplicationErrors).toHaveBeenCalledWith({
      fingerprint: 'fingerprint-1',
      correlationId: 'corr-err',
      limit: 5,
      cursor: 'cursor-err',
    });
  });

  it('gets provisioning run and application error details through the admin gateway', async () => {
    const adminGateway = createAdminGateway();

    const getProvisioningRunDetail =
      createGetProvisioningRunDetail(adminGateway);
    const getApplicationErrorDetail =
      createGetApplicationErrorDetail(adminGateway);

    await expect(getProvisioningRunDetail('run-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'run-1',
        steps: [expect.objectContaining({ id: 'step-1' })],
      }),
    );
    await expect(getApplicationErrorDetail('error-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'error-1',
        stack: 'Error: boom',
      }),
    );

    expect(adminGateway.getProvisioningRun).toHaveBeenCalledWith('run-1');
    expect(adminGateway.getApplicationError).toHaveBeenCalledWith('error-1');
  });

  it('lists audit events and gets audit event details through the admin gateway', async () => {
    const adminGateway = createAdminGateway();

    const listAuditEvents = createListAuditEvents(adminGateway);
    const getAuditEventDetail = createGetAuditEventDetail(adminGateway);

    await expect(
      listAuditEvents({
        type: 'company.created',
        companyId: 'company-1',
        correlationId: 'corr-audit',
        limit: 5,
        cursor: 'cursor-audit',
      }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 'audit-1',
          type: 'company.created',
        }),
      ],
      nextCursor: null,
    });
    await expect(getAuditEventDetail('audit-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'audit-1',
        details: { source: 'onboarding' },
      }),
    );

    expect(adminGateway.listAuditEvents).toHaveBeenCalledWith({
      type: 'company.created',
      companyId: 'company-1',
      correlationId: 'corr-audit',
      limit: 5,
      cursor: 'cursor-audit',
    });
    expect(adminGateway.getAuditEvent).toHaveBeenCalledWith('audit-1');
  });
});
