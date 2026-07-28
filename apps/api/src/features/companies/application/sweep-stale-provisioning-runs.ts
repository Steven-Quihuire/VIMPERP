import type { ProvisioningRecorder } from '../domain/company';

const DEFAULT_STALE_TIMEOUT_MS = 15 * 60 * 1000;

export const createSweepStaleProvisioningRuns = ({
  recorder,
  now = () => new Date(),
  staleTimeoutMs = DEFAULT_STALE_TIMEOUT_MS,
}: {
  recorder: ProvisioningRecorder;
  now?: () => Date;
  staleTimeoutMs?: number;
}) => {
  return async () => {
    const olderThan = new Date(now().getTime() - staleTimeoutMs);

    return recorder.sweepStaleRuns(olderThan);
  };
};
