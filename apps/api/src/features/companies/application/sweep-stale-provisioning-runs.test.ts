import { describe, expect, it, vi } from 'vitest';

import { createSweepStaleProvisioningRuns } from './sweep-stale-provisioning-runs';
import type { ProvisioningRecorder } from '../domain/company';

const createRecorder = (): ProvisioningRecorder => ({
  startRun: vi.fn(),
  succeedRun: vi.fn(),
  failRun: vi.fn(),
  sweepStaleRuns: vi.fn(),
});

describe('createSweepStaleProvisioningRuns', () => {
  it('marks only stale running runs as incomplete via the recorder and returns the affected count', async () => {
    const now = new Date('2026-07-28T12:00:00.000Z');
    const runs = [
      { id: 'run-1', createdAt: new Date('2026-07-28T11:30:00.000Z'), status: 'running' },
      { id: 'run-2', createdAt: new Date('2026-07-28T11:55:00.000Z'), status: 'running' },
      { id: 'run-3', createdAt: new Date('2026-07-28T11:00:00.000Z'), status: 'succeeded' },
      { id: 'run-4', createdAt: new Date('2026-07-28T11:00:00.000Z'), status: 'failed' },
    ];
    const recorder: ProvisioningRecorder = {
      startRun: vi.fn(),
      succeedRun: vi.fn(),
      failRun: vi.fn(),
      sweepStaleRuns: vi.fn((olderThan: Date) => {
        let updated = 0;

        for (const run of runs) {
          if (run.status === 'running' && run.createdAt < olderThan) {
            run.status = 'incomplete';
            updated += 1;
          }
        }

        return Promise.resolve(updated);
      }),
    };
    const sweep = createSweepStaleProvisioningRuns({
      now: () => now,
      recorder,
      staleTimeoutMs: 15 * 60 * 1000,
    });

    const updated = await sweep();

    expect(updated).toBe(1);
    expect(recorder.sweepStaleRuns).toHaveBeenCalledWith(new Date('2026-07-28T11:45:00.000Z'));
    expect(runs).toEqual([
      { id: 'run-1', createdAt: new Date('2026-07-28T11:30:00.000Z'), status: 'incomplete' },
      { id: 'run-2', createdAt: new Date('2026-07-28T11:55:00.000Z'), status: 'running' },
      { id: 'run-3', createdAt: new Date('2026-07-28T11:00:00.000Z'), status: 'succeeded' },
      { id: 'run-4', createdAt: new Date('2026-07-28T11:00:00.000Z'), status: 'failed' },
    ]);
  });

  it('uses the default 15 minute stale timeout when none is provided', async () => {
    const recorder = createRecorder();
    recorder.sweepStaleRuns = vi.fn().mockResolvedValue(0);
    const sweep = createSweepStaleProvisioningRuns({
      now: () => new Date('2026-07-28T12:00:00.000Z'),
      recorder,
    });

    await sweep();

    expect(recorder.sweepStaleRuns).toHaveBeenCalledWith(new Date('2026-07-28T11:45:00.000Z'));
  });
});
