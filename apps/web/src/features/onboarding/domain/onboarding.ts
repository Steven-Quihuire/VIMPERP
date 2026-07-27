import type { AuthSession } from '../../auth/domain/auth';

export const paletteValues = ['ocean', 'forest', 'violet', 'sunset', 'midnight'] as const;

export type PaletteId = (typeof paletteValues)[number];

export type OnboardingStep =
  | 'account'
  | 'legal'
  | 'services'
  | 'address'
  | 'contact';

export const onboardingSteps: OnboardingStep[] = [
  'account',
  'legal',
  'services',
  'address',
  'contact',
];

export type OnboardingDraft = {
  companyName: string;
  legalIdentifier: string;
  servicesInput: string;
  country: string;
  city: string;
  exactLocation: string;
  contactPhone: string;
  contactEmail: string;
  paletteId: PaletteId;
};

export const createInitialOnboardingDraft = (
  session: AuthSession | null,
): OnboardingDraft => ({
  companyName: '',
  legalIdentifier: '',
  servicesInput: '',
  country: '',
  city: '',
  exactLocation: '',
  contactPhone: '',
  contactEmail: session?.user.email ?? '',
  paletteId: 'ocean',
});

export const normalizeServices = (servicesInput: string) => {
  return servicesInput
    .split(',')
    .map((service) => service.trim())
    .filter((service) => service.length > 0);
};

export const validateOnboardingStep = (
  step: OnboardingStep,
  draft: OnboardingDraft,
) => {
  switch (step) {
    case 'account':
      return draft.companyName.trim().length > 0
        ? null
        : 'Complete the account step before continuing.';
    case 'legal':
      return draft.legalIdentifier.trim().length > 0
        ? null
        : 'Complete the legal and tax step before continuing.';
    case 'services':
      return normalizeServices(draft.servicesInput).length > 0
        ? null
        : 'Complete the services step before continuing.';
    case 'address':
      return draft.country.trim() && draft.city.trim() && draft.exactLocation.trim()
        ? null
        : 'Complete the address step before continuing.';
    case 'contact':
      return draft.contactPhone.trim() && draft.contactEmail.trim()
        ? null
        : 'Complete the contact step before creating the company.';
  }
};

export const needsCompanyOnboarding = (session: AuthSession | null) => {
  if (!session) {
    return false;
  }

  return !session.memberships.some(
    (membership) => membership.role === 'platform-admin' || membership.companyId,
  );
};
