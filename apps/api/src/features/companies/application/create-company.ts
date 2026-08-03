import {
  isValidEcuadorianMobile,
  normalizeCompanyServices,
} from '../domain/company';
import type {
  CompanyOnboardingGateway,
  CreateCompanyInput,
  CreateCompanyResult,
  ProvisioningRecorder,
} from '../domain/company';

const createPayloadFingerprint = (input: CreateCompanyInput) => {
  return JSON.stringify({
    ownerUserId: input.ownerUserId,
    name: input.name.trim(),
    legalIdentifier: input.legalIdentifier.trim(),
    services: normalizeCompanyServices(input.services),
    address: {
      country: input.address.country.trim(),
      city: input.address.city.trim(),
      exactLocation: input.address.exactLocation.trim(),
    },
    contact: {
      phone: input.contact.phone.trim(),
      email: input.contact.email.trim().toLowerCase(),
    },
    paletteId: input.paletteId,
    erpModuleId: input.erpModuleId,
    privacyPolicyVersion: input.privacyPolicyVersion,
    branches: input.branches.map((branch) => ({
      name: branch.name.trim(),
      locale: branch.locale?.trim() ?? null,
    })),
  });
};

const ERROR_SUMMARY_MAX_LENGTH = 500;
const ERROR_SUMMARY_INPUT_MAX_LENGTH = 2048;
const REDACTED_VALUE = '[REDACTED]';
const REDACTION_PATTERNS: Array<[RegExp, string]> = [
  [
    /(["'])(password|token|secret|api[_-]?key|authorization|cookie|session)\1\s*:\s*(["'])(?:\\.|(?!\3).)*\3/gi,
    `$1$2$1:$3${REDACTED_VALUE}$3`,
  ],
  [
    /\b(password|token|secret|api[_-]?key|authorization|cookie|session)\b\s*([:=])\s*([^\s,;]+)/gi,
    `$1$2${REDACTED_VALUE}`,
  ],
  [/\b(Bearer)\s+[A-Za-z0-9._=-]+/gi, `$1 ${REDACTED_VALUE}`],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED_VALUE],
];

const sanitizeErrorSummary = (message: string) => {
  const boundedInput = message.slice(0, ERROR_SUMMARY_INPUT_MAX_LENGTH);

  return REDACTION_PATTERNS.reduce(
    (summary, [pattern, replacement]) => summary.replace(pattern, replacement),
    boundedInput,
  ).slice(0, ERROR_SUMMARY_MAX_LENGTH);
};

const toErrorSummary = (error: unknown) => {
  const message = error instanceof Error ? error.message.trim() : '';

  return message.length > 0
    ? sanitizeErrorSummary(message)
    : 'Unexpected server error';
};

export const createCreateCompany = ({
  gateway,
  recorder,
}: {
  gateway: CompanyOnboardingGateway;
  recorder: ProvisioningRecorder;
}) => {
  return async (input: CreateCompanyInput) => {
    const payloadFingerprint = createPayloadFingerprint(input);
    const startResult = await recorder.startRun({
      actorUserId: input.ownerUserId,
      companyName: input.name.trim(),
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      payloadFingerprint,
      process: 'company-onboarding',
      requestId: input.requestId,
    });

    if (startResult.kind === 'replay-succeeded') {
      return startResult.result;
    }

    const { runId } = startResult;

    let result: CreateCompanyResult;

    try {
      const contactPhone = input.contact.phone.trim();

      if (!isValidEcuadorianMobile(contactPhone)) {
        throw new Error(
          'The contact phone must be a valid Ecuadorian mobile number.',
        );
      }

      result = await gateway.createCompany({
        ...input,
        name: input.name.trim(),
        legalIdentifier: input.legalIdentifier.trim(),
        services: normalizeCompanyServices(input.services),
        address: {
          country: input.address.country.trim(),
          city: input.address.city.trim(),
          exactLocation: input.address.exactLocation.trim(),
        },
        contact: {
          phone: contactPhone,
          email: input.contact.email.trim().toLowerCase(),
        },
        branches: input.branches.map((branch) => ({
          name: branch.name.trim(),
          ...(branch.locale ? { locale: branch.locale.trim() } : {}),
        })),
      });
    } catch (error) {
      const errorSummary = toErrorSummary(error);

      await recorder.failRun({
        errorSummary,
        runId,
        steps: [
          {
            name: 'company-creation',
            status: 'failed',
            detail: { message: errorSummary, payloadFingerprint },
          },
        ],
      });

      throw error;
    }

    try {
      await recorder.succeedRun({
        runId,
        steps: [
          {
            name: 'company-creation',
            status: 'succeeded',
            detail: {
              companyId: result.companyId,
              paletteId: result.paletteId,
              payloadFingerprint,
            },
          },
        ],
      });
    } catch {
      // The company transaction already committed; stale-run sweeping records finalization loss.
    }

    return result;
  };
};
