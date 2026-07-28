import { describe, expect, it, vi } from 'vitest';

import { startProvisioningSweepWorker } from './main';

describe('startProvisioningSweepWorker', () => {
  it('schedules the sweep worker with the configured interval and unreferences the timer', async () => {
    const unref = vi.fn();
    const run = vi.fn().mockResolvedValue(1);
    const schedule = vi.fn().mockImplementation((callback: () => void, _intervalMs: number) => {
      void callback();
      return { unref };
    });

    startProvisioningSweepWorker({
      logger: { error: vi.fn() },
      run,
      schedule,
      sweepIntervalMs: 5 * 60 * 1000,
    });

    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
    expect(unref).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('swallows sweep failures and logs them without throwing', async () => {
    const error = new Error('write failed');
    const logger = { error: vi.fn() };
    const schedule = vi.fn().mockImplementation((callback: () => void) => {
      void callback();
      return { unref: vi.fn() };
    });

    startProvisioningSweepWorker({
      logger,
      run: vi.fn().mockRejectedValue(error),
      schedule,
      sweepIntervalMs: 5 * 60 * 1000,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(logger.error).toHaveBeenCalledWith({ err: error }, 'Provisioning sweep failed');
  });
});
