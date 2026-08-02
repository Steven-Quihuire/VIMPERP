import { describe, expect, it, vi } from 'vitest';

import { createCreateCompany } from './create-company';
import type {
  CompanyOnboardingGateway,
  CompanyProvisioningStartResult,
  CreateCompanyInput,
  ProvisioningRecorder,
  ProvisioningStep,
} from '../domain/company';

const expectFingerprintDetail = (
  detail: ProvisioningStep['detail'],
  expected: Record<string, unknown>,
) => {
  expect(detail).toMatchObject(expected);
  expect(typeof detail?.payloadFingerprint).toBe('string');
};

const buildInput = (): CreateCompanyInput => ({
  ownerUserId: 'user-1',
  correlationId: 'corr-1',
  requestId: 'req-1',
  name: '  Vimcore Labs  ',
  legalIdentifier: '  RFC-123456  ',
  services: [' Implementation ', ' ', 'Support'],
  address: {
    country: '  Mexico ',
    city: ' Monterrey ',
    exactLocation: ' San Pedro 123 ',
  },
  contact: {
    phone: ' 0991234567 ',
    email: ' OPS@VIMCORE.TEST ',
  },
  idempotencyKey: 'idem-key-1',
  paletteId: 'ocean',
  erpModuleId: 'inventory',
  branches: [{ name: ' HQ ', locale: ' es-MX ' }, { name: ' Remote ' }],
});

const createRecorder = (): ProvisioningRecorder => ({
  startRun: vi
    .fn<
      (input: {
        actorUserId: string;
        correlationId: string;
        process: string;
        requestId: string;
        idempotencyKey: string | null;
        payloadFingerprint: string;
      }) => Promise<CompanyProvisioningStartResult>
    >()
    .mockResolvedValue({ kind: 'started', runId: 'run-1' }),
  succeedRun: vi.fn().mockResolvedValue(undefined),
  failRun: vi.fn().mockResolvedValue(undefined),
  sweepStaleRuns: vi.fn().mockResolvedValue(0),
});

describe('createCreateCompany', () => {
  it('starts a provisioning run, delegates the atomic company transaction, and finalizes a successful run', async () => {
    const recorder = createRecorder();
    const gateway: CompanyOnboardingGateway = {
      createCompany: vi.fn().mockResolvedValue({
        companyId: 'company-1',
        paletteId: 'ocean',
      }),
      getCurrentCompanySummary: vi.fn(),
      getThemePreference: vi.fn(),
      saveThemePreference: vi.fn(),
    };
    const createCompany = createCreateCompany({ gateway, recorder });

    const result = await createCompany(buildInput());
    const startRunInput = vi.mocked(recorder.startRun).mock.calls[0]?.[0];
    const succeedRunInput = vi.mocked(recorder.succeedRun).mock.calls[0]?.[0];

    expect(startRunInput).toMatchObject({
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      idempotencyKey: 'idem-key-1',
      process: 'company-onboarding',
      requestId: 'req-1',
    });
    expect(typeof startRunInput?.payloadFingerprint).toBe('string');
    expect(gateway.createCompany).toHaveBeenCalledWith({
      ...buildInput(),
      name: 'Vimcore Labs',
      legalIdentifier: 'RFC-123456',
      services: ['Implementation', 'Support'],
      address: {
        country: 'Mexico',
        city: 'Monterrey',
        exactLocation: 'San Pedro 123',
      },
      contact: {
        phone: '0991234567',
        email: 'ops@vimcore.test',
      },
      idempotencyKey: 'idem-key-1',
      branches: [{ name: 'HQ', locale: 'es-MX' }, { name: 'Remote' }],
    });
    expect(succeedRunInput?.runId).toBe('run-1');
    expect(succeedRunInput?.steps).toHaveLength(1);
    expect(succeedRunInput?.steps[0]).toMatchObject({
      name: 'company-creation',
      status: 'succeeded',
    });
    expectFingerprintDetail(succeedRunInput?.steps[0]?.detail, {
      companyId: 'company-1',
      paletteId: 'ocean',
    });
    expect(recorder.failRun).not.toHaveBeenCalled();
    expect(result).toEqual({ companyId: 'company-1', paletteId: 'ocean' });
  });

  it('returns the created company when success finalization fails after the atomic transaction commits', async () => {
    const recorder = createRecorder();
    vi.mocked(recorder.succeedRun).mockRejectedValue(
      new Error('recorder unavailable'),
    );
    const gateway: CompanyOnboardingGateway = {
      createCompany: vi.fn().mockResolvedValue({
        companyId: 'company-1',
        paletteId: 'ocean',
      }),
      getCurrentCompanySummary: vi.fn(),
      getThemePreference: vi.fn(),
      saveThemePreference: vi.fn(),
    };
    const createCompany = createCreateCompany({ gateway, recorder });

    const result = await createCompany(buildInput());

    expect(result).toEqual({ companyId: 'company-1', paletteId: 'ocean' });
    expect(recorder.succeedRun).toHaveBeenCalledTimes(1);
    expect(recorder.failRun).not.toHaveBeenCalled();
  });

  it('deduplicates normalized service names before delegating to the gateway', async () => {
    const recorder = createRecorder();
    const gateway: CompanyOnboardingGateway = {
      createCompany: vi.fn().mockResolvedValue({
        companyId: 'company-1',
        paletteId: 'ocean',
      }),
      getCurrentCompanySummary: vi.fn(),
      getThemePreference: vi.fn(),
      saveThemePreference: vi.fn(),
    };
    const createCompany = createCreateCompany({ gateway, recorder });

    await createCompany({
      ...buildInput(),
      services: [
        ' Implementation ',
        'Implementation',
        ' ',
        'Support',
        'Support ',
      ],
    });

    expect(gateway.createCompany).toHaveBeenCalledWith(
      expect.objectContaining({
        services: ['Implementation', 'Support'],
      }),
    );
  });

  it('records a failed provisioning step and rethrows when atomic company creation fails', async () => {
    const recorder = createRecorder();
    const gatewayError = new Error('duplicate legal identifier');
    const gateway: CompanyOnboardingGateway = {
      createCompany: vi.fn().mockRejectedValue(gatewayError),
      getCurrentCompanySummary: vi.fn(),
      getThemePreference: vi.fn(),
      saveThemePreference: vi.fn(),
    };
    const createCompany = createCreateCompany({ gateway, recorder });

    await expect(createCompany(buildInput())).rejects.toThrow(
      'duplicate legal identifier',
    );
    const failRunInput = vi.mocked(recorder.failRun).mock.calls[0]?.[0];

    expect(recorder.startRun).toHaveBeenCalledTimes(1);
    expect(recorder.succeedRun).not.toHaveBeenCalled();
    expect(failRunInput?.errorSummary).toBe('duplicate legal identifier');
    expect(failRunInput?.runId).toBe('run-1');
    expect(failRunInput?.steps).toHaveLength(1);
    expect(failRunInput?.steps[0]).toMatchObject({
      name: 'company-creation',
      status: 'failed',
    });
    expectFingerprintDetail(failRunInput?.steps[0]?.detail, {
      message: 'duplicate legal identifier',
    });
  });

  it('sanitizes and bounds the failed provisioning summary before recording it', async () => {
    const recorder = createRecorder();
    const gatewayError = new Error(
      `upstream failed with password=super-secret ${'x'.repeat(800)}`,
    );
    const gateway: CompanyOnboardingGateway = {
      createCompany: vi.fn().mockRejectedValue(gatewayError),
      getCurrentCompanySummary: vi.fn(),
      getThemePreference: vi.fn(),
      saveThemePreference: vi.fn(),
    };
    const createCompany = createCreateCompany({ gateway, recorder });

    await expect(createCompany(buildInput())).rejects.toBe(gatewayError);

    const failRunInput = vi.mocked(recorder.failRun).mock.calls[0]?.[0];

    expect(recorder.failRun).toHaveBeenCalledTimes(1);
    expect(failRunInput?.runId).toBe('run-1');
    expect(failRunInput?.errorSummary).toBeDefined();
    expect(failRunInput?.errorSummary).toContain('password=[REDACTED]');
    expect(failRunInput?.errorSummary).not.toContain('super-secret');
    expect(failRunInput?.errorSummary.length).toBeLessThanOrEqual(500);
    expect(failRunInput?.steps).toHaveLength(1);
    expect(failRunInput?.steps[0]).toMatchObject({
      name: 'company-creation',
      status: 'failed',
    });
    const detailMessage =
      typeof failRunInput?.steps[0]?.detail?.message === 'string'
        ? failRunInput.steps[0].detail.message
        : undefined;

    expect(detailMessage).toBeDefined();
    expect(detailMessage).toContain('password=[REDACTED]');
  });

  it('falls back to a generic error summary when the gateway throws a non-Error value', async () => {
    const recorder = createRecorder();
    const gateway: CompanyOnboardingGateway = {
      createCompany: vi.fn().mockRejectedValue('boom'),
      getCurrentCompanySummary: vi.fn(),
      getThemePreference: vi.fn(),
      saveThemePreference: vi.fn(),
    };
    const createCompany = createCreateCompany({ gateway, recorder });

    await expect(createCompany(buildInput())).rejects.toBe('boom');
    const failRunInput = vi.mocked(recorder.failRun).mock.calls[0]?.[0];

    expect(failRunInput?.errorSummary).toBe('Unexpected server error');
    expect(failRunInput?.runId).toBe('run-1');
    expect(failRunInput?.steps).toHaveLength(1);
    expect(failRunInput?.steps[0]).toMatchObject({
      name: 'company-creation',
      status: 'failed',
    });
    expectFingerprintDetail(failRunInput?.steps[0]?.detail, {
      message: 'Unexpected server error',
    });
  });

  it('replays the original terminal result when the recorder resolves an equivalent idempotent retry', async () => {
    const recorder = createRecorder();
    vi.mocked(recorder.startRun).mockResolvedValue({
      kind: 'replay-succeeded',
      runId: 'run-1',
      result: { companyId: 'company-1', paletteId: 'ocean' },
    });
    const gateway: CompanyOnboardingGateway = {
      createCompany: vi.fn(),
      getCurrentCompanySummary: vi.fn(),
      getThemePreference: vi.fn(),
      saveThemePreference: vi.fn(),
    };
    const createCompany = createCreateCompany({ gateway, recorder });

    const result = await createCompany(buildInput());

    expect(result).toEqual({ companyId: 'company-1', paletteId: 'ocean' });
    expect(gateway.createCompany).not.toHaveBeenCalled();
    expect(recorder.succeedRun).not.toHaveBeenCalled();
    expect(recorder.failRun).not.toHaveBeenCalled();
  });

  it('rethrows payload-conflict rejections from the recorder before any company write occurs', async () => {
    const recorder = createRecorder();
    vi.mocked(recorder.startRun).mockRejectedValue(
      new Error('Idempotency key already used with a different company payload'),
    );
    const gateway: CompanyOnboardingGateway = {
      createCompany: vi.fn(),
      getCurrentCompanySummary: vi.fn(),
      getThemePreference: vi.fn(),
      saveThemePreference: vi.fn(),
    };
    const createCompany = createCreateCompany({ gateway, recorder });

    await expect(createCompany(buildInput())).rejects.toThrow(
      'Idempotency key already used with a different company payload',
    );

    expect(gateway.createCompany).not.toHaveBeenCalled();
    expect(recorder.succeedRun).not.toHaveBeenCalled();
    expect(recorder.failRun).not.toHaveBeenCalled();
  });
});
