import { randomUUID } from 'node:crypto';

import { and, desc, eq, sql } from 'drizzle-orm';

import type { ApplicationErrorRecorder } from '../../../shared/presentation/error.middleware';
import type { SanitizedApplicationError } from '../../../shared/infrastructure/observability/error-sanitizer';
import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  applicationErrorsTable,
  provisioningRunsTable,
  provisioningStepsTable,
} from '../../../shared/infrastructure/db/schema';
import {
  CompanyIdempotencyConflictError,
  type PaletteId as CreatePaletteId,
  type ProvisioningRecorder,
  type ProvisioningStep,
} from '../domain/company';

type DrizzleProvisioningRecorder = ProvisioningRecorder &
  ApplicationErrorRecorder;

const toStepRows = ({
  createId,
  now,
  runId,
  steps,
}: {
  createId: () => string;
  now: Date;
  runId: string;
  steps: ProvisioningStep[];
}) => {
  return steps.map((step) => ({
    id: createId(),
    runId,
    name: step.name,
    status: step.status,
    attempt: 1,
    detail: step.detail ?? null,
    createdAt: now,
  }));
};

export const createDrizzleProvisioningRecorder = (
  db: AppDb,
  {
    createId,
    now = () => new Date(),
  }: {
    createId?: () => string;
    now?: () => Date;
  } = {},
): DrizzleProvisioningRecorder => {
  const generateId = createId ?? randomUUID;

  return {
    startRun: async ({
      actorUserId,
      companyName,
      correlationId,
      process,
      requestId,
      idempotencyKey,
      payloadFingerprint,
    }) => {
      if (idempotencyKey) {
        const [existingRun] = await db
          .select({
            id: provisioningRunsTable.id,
            status: provisioningRunsTable.status,
          })
          .from(provisioningRunsTable)
          .where(
            and(
              eq(provisioningRunsTable.process, process),
              eq(provisioningRunsTable.idempotencyKey, idempotencyKey),
            ),
          )
          .limit(1);

        if (existingRun) {
          const [existingStep] = await db
            .select({ detail: provisioningStepsTable.detail })
            .from(provisioningStepsTable)
            .where(
              and(
                eq(provisioningStepsTable.runId, existingRun.id),
                eq(provisioningStepsTable.name, 'company-creation'),
              ),
            )
            .orderBy(desc(provisioningStepsTable.createdAt))
            .limit(1);

          const detail =
            (existingStep?.detail as Record<string, unknown> | null) ?? null;
          const savedFingerprint =
            typeof detail?.payloadFingerprint === 'string'
              ? detail.payloadFingerprint
              : null;

          if (savedFingerprint && savedFingerprint !== payloadFingerprint) {
            throw new CompanyIdempotencyConflictError();
          }

          if (
            existingRun.status === 'succeeded' &&
            typeof detail?.companyId === 'string' &&
            typeof detail?.paletteId === 'string'
          ) {
            return {
              kind: 'replay-succeeded' as const,
              runId: existingRun.id,
              result: {
                companyId: detail.companyId,
                paletteId: detail.paletteId as CreatePaletteId,
              },
            };
          }

          if (savedFingerprint === payloadFingerprint) {
            throw new CompanyIdempotencyConflictError(
              'Company onboarding request is already in progress',
            );
          }
        }
      }

      const createdAt = now();
      const runId = generateId();

      await db.insert(provisioningRunsTable).values({
        id: runId,
        correlationId,
        requestId,
        actorUserId,
        companyName,
        process,
        status: 'running',
        attempt: 1,
        idempotencyKey,
        errorSummary: null,
        createdAt,
        updatedAt: createdAt,
      });

      return { kind: 'started' as const, runId };
    },
    succeedRun: async ({ runId, steps }) => {
      const recordedAt = now();

      await db
        .update(provisioningRunsTable)
        .set({
          status: 'succeeded',
          errorSummary: null,
          updatedAt: recordedAt,
        })
        .where(eq(provisioningRunsTable.id, runId));

      await db.insert(provisioningStepsTable).values(
        toStepRows({
          createId: generateId,
          now: recordedAt,
          runId,
          steps,
        }),
      );
    },
    failRun: async ({ errorSummary, runId, steps }) => {
      const recordedAt = now();

      await db
        .update(provisioningRunsTable)
        .set({
          status: 'failed',
          errorSummary,
          updatedAt: recordedAt,
        })
        .where(eq(provisioningRunsTable.id, runId));

      await db.insert(provisioningStepsTable).values(
        toStepRows({
          createId: generateId,
          now: recordedAt,
          runId,
          steps,
        }),
      );
    },
    sweepStaleRuns: async (olderThan) => {
      const result = await db.execute(sql`
        UPDATE provisioning_runs
        SET status = 'incomplete',
            error_summary = COALESCE(error_summary, 'Provisioning run timed out before finalization'),
            updated_at = ${now()}
        WHERE status = 'running'
          AND created_at < ${olderThan}
      `);

      return result.rowCount ?? 0;
    },
    record: async (error: SanitizedApplicationError) => {
      await db.insert(applicationErrorsTable).values({
        id: generateId(),
        correlationId: error.correlationId,
        requestId: error.requestId,
        fingerprint: error.fingerprint,
        status: error.status,
        code: error.code,
        message: error.message,
        stack: error.stack,
        context: error.context,
        createdAt: error.createdAt,
      });
    },
  };
};
