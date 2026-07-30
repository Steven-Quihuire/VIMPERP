import { describe, expect, it, vi } from 'vitest';

import { createCreateCompany } from './create-company';
import type {
  CompanyOnboardingGateway,
  CreateCompanyInput,
  ProvisioningRecorder,
} from '../domain/company';

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
    phone: ' +52 81 5555 0000 ',
    email: ' OPS@VIMCORE.TEST ',
  },
  paletteId: 'ocean',
  branches: [
    { name: ' HQ ', locale: ' es-MX ' },
    { name: ' Remote ' },
  ],
});

const createRecorder = (): ProvisioningRecorder => ({
  startRun: vi.fn().mockResolvedValue({ runId: 'run-1' }),
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

    expect(recorder.startRun).toHaveBeenCalledWith({
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      process: 'company-onboarding',
      requestId: 'req-1',
    });
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
        phone: '+52 81 5555 0000',
        email: 'ops@vimcore.test',
      },
      branches: [
        { name: 'HQ', locale: 'es-MX' },
        { name: 'Remote' },
      ],
    });
    expect(recorder.succeedRun).toHaveBeenCalledWith({
      runId: 'run-1',
      steps: [
        {
          detail: { companyId: 'company-1' },
          name: 'company-creation',
          status: 'succeeded',
        },
      ],
    });
    expect(recorder.failRun).not.toHaveBeenCalled();
    expect(result).toEqual({ companyId: 'company-1', paletteId: 'ocean' });
  });

  it('returns the created company when success finalization fails after the atomic transaction commits', async () => {
    const recorder = createRecorder();
    vi.mocked(recorder.succeedRun).mockRejectedValue(new Error('recorder unavailable'));
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
      services: [' Implementation ', 'Implementation', ' ', 'Support', 'Support '],
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

    await expect(createCompany(buildInput())).rejects.toThrow('duplicate legal identifier');

    expect(recorder.startRun).toHaveBeenCalledTimes(1);
    expect(recorder.succeedRun).not.toHaveBeenCalled();
    expect(recorder.failRun).toHaveBeenCalledWith({
      errorSummary: 'duplicate legal identifier',
      runId: 'run-1',
      steps: [
        {
          detail: { message: 'duplicate legal identifier' },
          name: 'company-creation',
          status: 'failed',
        },
      ],
    });
  });

  it('sanitizes and bounds the failed provisioning summary before recording it', async () => {
    const recorder = createRecorder();
    const gatewayError = new Error(`upstream failed with password=super-secret ${'x'.repeat(800)}`);
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

    expect(recorder.failRun).toHaveBeenCalledWith({
      errorSummary: 'Unexpected server error',
      runId: 'run-1',
      steps: [
        {
          detail: { message: 'Unexpected server error' },
          name: 'company-creation',
          status: 'failed',
        },
      ],
    });
  });
});
