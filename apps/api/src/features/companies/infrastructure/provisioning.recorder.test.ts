import { describe, expect, it, vi } from 'vitest';

import { createDrizzleProvisioningRecorder } from './drizzle-provisioning.recorder';
import {
  applicationErrorsTable,
  provisioningRunsTable,
  provisioningStepsTable,
} from '../../../shared/infrastructure/db/schema';
import type { AppDb } from '../../../shared/infrastructure/db/client';

const createFakeDb = ({ sweepCount = 0 }: { sweepCount?: number } = {}) => {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const updates: Array<{ table: unknown; values: unknown }> = [];
  const execute = vi.fn().mockResolvedValue({ rowCount: sweepCount });
  const updateResult = {
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(resolve([])),
    catch: () => Promise.resolve([]),
  };

  const db = {
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        inserts.push({ table, values });
        return Promise.resolve([]);
      },
    }),
    update: (table: unknown) => ({
      set: (values: unknown) => {
        updates.push({ table, values });
        return {
          where: () => updateResult,
        };
      },
    }),
    execute,
  } as unknown as AppDb;

  return { db, execute, inserts, updates };
};

describe('createDrizzleProvisioningRecorder', () => {
  it('starts a running provisioning run and persists the request metadata', async () => {
    const { db, inserts } = createFakeDb();
    const recorder = createDrizzleProvisioningRecorder(db, {
      createId: () => 'run-1',
      now: () => new Date('2026-07-28T12:00:00.000Z'),
    });

    const result = await recorder.startRun({
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      idempotencyKey: null,
      payloadFingerprint: 'fingerprint-1',
      process: 'company-onboarding',
      requestId: 'req-1',
    });

    expect(result).toEqual({ kind: 'started', runId: 'run-1' });
    expect(inserts).toEqual([
      {
        table: provisioningRunsTable,
        values: {
          actorUserId: 'user-1',
          attempt: 1,
          correlationId: 'corr-1',
          createdAt: new Date('2026-07-28T12:00:00.000Z'),
          errorSummary: null,
          id: 'run-1',
          idempotencyKey: null,
          process: 'company-onboarding',
          requestId: 'req-1',
          status: 'running',
          updatedAt: new Date('2026-07-28T12:00:00.000Z'),
        },
      },
    ]);
  });

  it('finalizes successful and failed runs with append-only step rows', async () => {
    const { db, inserts, updates } = createFakeDb();
    const recorder = createDrizzleProvisioningRecorder(db, {
      createId: () => 'step-1',
      now: () => new Date('2026-07-28T12:05:00.000Z'),
    });

    await recorder.succeedRun({
      runId: 'run-1',
      steps: [
        {
          detail: { companyId: 'company-1' },
          name: 'company-creation',
          status: 'succeeded',
        },
      ],
    });
    await recorder.failRun({
      errorSummary: 'duplicate legal identifier',
      runId: 'run-2',
      steps: [
        {
          detail: { message: 'duplicate legal identifier' },
          name: 'company-creation',
          status: 'failed',
        },
      ],
    });

    expect(updates).toEqual([
      {
        table: provisioningRunsTable,
        values: {
          errorSummary: null,
          status: 'succeeded',
          updatedAt: new Date('2026-07-28T12:05:00.000Z'),
        },
      },
      {
        table: provisioningRunsTable,
        values: {
          errorSummary: 'duplicate legal identifier',
          status: 'failed',
          updatedAt: new Date('2026-07-28T12:05:00.000Z'),
        },
      },
    ]);
    expect(inserts.slice(0, 2)).toEqual([
      {
        table: provisioningStepsTable,
        values: [
          {
            attempt: 1,
            createdAt: new Date('2026-07-28T12:05:00.000Z'),
            detail: { companyId: 'company-1' },
            id: 'step-1',
            name: 'company-creation',
            runId: 'run-1',
            status: 'succeeded',
          },
        ],
      },
      {
        table: provisioningStepsTable,
        values: [
          {
            attempt: 1,
            createdAt: new Date('2026-07-28T12:05:00.000Z'),
            detail: { message: 'duplicate legal identifier' },
            id: 'step-1',
            name: 'company-creation',
            runId: 'run-2',
            status: 'failed',
          },
        ],
      },
    ]);
  });

  it('records sanitized application errors and sweeps stale runs through the database adapter', async () => {
    const { db, execute, inserts } = createFakeDb({ sweepCount: 2 });
    const recorder = createDrizzleProvisioningRecorder(db, {
      createId: () => 'error-1',
      now: () => new Date('2026-07-28T12:10:00.000Z'),
    });

    await recorder.record({
      code: 'E_UPSTREAM',
      context: { process: 'http-request', route: '/companies', statusCode: 500 },
      correlationId: 'corr-1',
      createdAt: new Date('2026-07-28T12:09:00.000Z'),
      fingerprint: 'fingerprint-1',
      message: 'sanitized message',
      requestId: 'req-1',
      stack: 'Error: sanitized stack',
      status: '500',
    });

    const updated = await recorder.sweepStaleRuns(new Date('2026-07-28T11:55:00.000Z'));

    expect(inserts).toContainEqual({
      table: applicationErrorsTable,
      values: {
        code: 'E_UPSTREAM',
        context: { process: 'http-request', route: '/companies', statusCode: 500 },
        correlationId: 'corr-1',
        createdAt: new Date('2026-07-28T12:09:00.000Z'),
        fingerprint: 'fingerprint-1',
        id: 'error-1',
        message: 'sanitized message',
        requestId: 'req-1',
        stack: 'Error: sanitized stack',
        status: '500',
      },
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(updated).toBe(2);
  });
});
