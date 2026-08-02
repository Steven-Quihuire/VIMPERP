export const paletteValues = [
  'mono',
  'ocean',
  'forest',
  'violet',
  'sunset',
  'midnight',
] as const;

export type PaletteId = (typeof paletteValues)[number];

export const erpModuleValues = [
  'sales',
  'purchases',
  'inventory',
  'accounting',
  'invoicing',
  'crm',
  'human-resources',
  'other',
  'projects',
  'manufacturing',
  'assets',
  'ecommerce',
  'marketing',
  'point-of-sale',
  'logistics',
  'reports',
] as const;

export type ErpModuleId = (typeof erpModuleValues)[number];

export const MAX_COMPANY_SERVICES = 5;

export const isValidEcuadorianMobile = (value: string) =>
  /^09\d{8}$/.test(value);

export const normalizeCompanyServices = (services: string[]) => {
  const normalizedServices = new Set<string>();

  for (const service of services) {
    const normalizedService = service.trim();

    if (normalizedService.length > 0) {
      normalizedServices.add(normalizedService);
    }
  }

  if (normalizedServices.size > MAX_COMPANY_SERVICES) {
    throw new Error(
      `A company can have at most ${MAX_COMPANY_SERVICES} services.`,
    );
  }

  return [...normalizedServices];
};

export type CompanyBranchDraft = {
  name: string;
  locale?: string | undefined;
};

export type CreateCompanyInput = {
  ownerUserId: string;
  correlationId: string;
  requestId: string;
  idempotencyKey: string | null;
  name: string;
  legalIdentifier: string;
  services: string[];
  address: {
    country: string;
    city: string;
    exactLocation: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  paletteId: PaletteId;
  erpModuleId: ErpModuleId;
  branches: CompanyBranchDraft[];
};

export type ThemePreference = {
  paletteId: PaletteId;
};

export type CurrentCompanySummary = {
  companyId: string;
  name: string;
};

export type CreateCompanyResult = {
  companyId: string;
  paletteId: PaletteId;
};

export type CompanyProvisioningStartResult =
  | { kind: 'started'; runId: string }
  | { kind: 'replay-succeeded'; runId: string; result: CreateCompanyResult };

export type ProvisioningStepStatus = 'succeeded' | 'failed' | 'skipped';

export type ProvisioningStep = {
  name: string;
  status: ProvisioningStepStatus;
  detail?: Record<string, unknown> | null;
};

export type ProvisioningRecorder = {
  startRun: (input: {
    actorUserId: string;
    correlationId: string;
    process: string;
    requestId: string;
    idempotencyKey: string | null;
    payloadFingerprint: string;
  }) => Promise<CompanyProvisioningStartResult>;
  succeedRun: (input: {
    runId: string;
    steps: ProvisioningStep[];
  }) => Promise<void>;
  failRun: (input: {
    errorSummary: string;
    runId: string;
    steps: ProvisioningStep[];
  }) => Promise<void>;
  sweepStaleRuns: (olderThan: Date) => Promise<number>;
};

export class CompanyConflictError extends Error {
  readonly code = 'COMPANY_CONFLICT';

  constructor(message: string) {
    super(message);
  }
}

export class DuplicateCompanyError extends CompanyConflictError {
  constructor(message = 'The company is already registered.') {
    super(message);
  }
}

export class CompanyIdempotencyConflictError extends CompanyConflictError {
  constructor(message = 'Idempotency key already used with a different company payload') {
    super(message);
  }
}

export type CompanyOnboardingGateway = {
  createCompany: (input: CreateCompanyInput) => Promise<CreateCompanyResult>;
  getCurrentCompanySummary: (
    activeCompanyId: string | null,
  ) => Promise<CurrentCompanySummary | null>;
  getThemePreference: (userId: string) => Promise<ThemePreference | null>;
  saveThemePreference: (input: {
    userId: string;
    paletteId: PaletteId;
  }) => Promise<ThemePreference>;
};
