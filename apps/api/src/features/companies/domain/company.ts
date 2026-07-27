export const paletteValues = ['ocean', 'forest', 'violet', 'sunset', 'midnight'] as const;

export type PaletteId = (typeof paletteValues)[number];

export type CompanyBranchDraft = {
  name: string;
  locale?: string | undefined;
};

export type CreateCompanyInput = {
  ownerUserId: string;
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

export type CreateCompanyResult = {
  companyId: string;
  paletteId: PaletteId;
};

export type CompanyOnboardingGateway = {
  createCompany: (input: CreateCompanyInput) => Promise<CreateCompanyResult>;
  getThemePreference: (userId: string) => Promise<ThemePreference | null>;
  saveThemePreference: (input: {
    userId: string;
    paletteId: PaletteId;
  }) => Promise<ThemePreference>;
};
