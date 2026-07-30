export const paletteValues = ['ocean', 'forest', 'violet', 'sunset', 'midnight'] as const;

export type PaletteId = (typeof paletteValues)[number];

export type CompanyBranchDraft = {
  name: string;
  locale?: string | undefined;
};

export type CreateCompanyInput = {
  ownerUserId: string;
  correlationId: string;
  requestId: string;
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
  }) => Promise<{ runId: string }>;
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

export type CompanyOnboardingGateway = {
  createCompany: (input: CreateCompanyInput) => Promise<CreateCompanyResult>;
  getCurrentCompanySummary: (userId: string) => Promise<CurrentCompanySummary | null>;
  getThemePreference: (userId: string) => Promise<ThemePreference | null>;
  saveThemePreference: (input: {
    userId: string;
    paletteId: PaletteId;
  }) => Promise<ThemePreference>;
};
