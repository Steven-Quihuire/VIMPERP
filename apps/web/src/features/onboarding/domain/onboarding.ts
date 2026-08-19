import type { AuthSession } from '../../auth/domain/auth';
import { getCompanyMemberships } from '../../auth/domain/auth';
import {
  isValidEcuadorianCedula,
  isValidEcuadorianRuc,
} from '@/shared/lib/ecuadorian-document';

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

export const MAX_ONBOARDING_SERVICES = 5;
export const PRIVACY_POLICY_VERSION = '2025-07-09';

export const isValidEcuadorianMobile = (value: string) =>
  /^09\d{8}$/.test(value);

export type OnboardingStep =
  | 'account'
  | 'legal'
  | 'services'
  | 'address'
  | 'contact'
  | 'palette'
  | 'module';

export const onboardingSteps: OnboardingStep[] = [
  'account',
  'legal',
  'services',
  'address',
  'contact',
  'palette',
  'module',
];

export type OnboardingDraft = {
  companyName: string;
  legalIdentifier: string;
  servicesInput: string;
  services: string[];
  country: string;
  city: string;
  exactLocation: string;
  contactPhone: string;
  contactEmail: string;
  paletteId: PaletteId;
  erpModuleId: ErpModuleId;
};

export const createInitialOnboardingDraft = (
  session: AuthSession | null,
): OnboardingDraft => ({
  companyName: session?.user.username ?? '',
  legalIdentifier: '',
  servicesInput: '',
  services: [],
  country: 'Ecuador',
  city: '',
  exactLocation: '',
  contactPhone: '',
  contactEmail: session?.user.email ?? '',
  paletteId: 'mono',
  erpModuleId: 'inventory',
});

export const normalizeServices = (services: string[]) => {
  const normalizedServices = new Set<string>();

  for (const service of services) {
    const normalizedService = service.trim();

    if (normalizedService.length > 0) {
      normalizedServices.add(normalizedService);
    }
  }

  return [...normalizedServices].slice(0, MAX_ONBOARDING_SERVICES);
};

export const isValidEcuadorianLegalIdentifier = (value: string) => {
  return isValidEcuadorianCedula(value) || isValidEcuadorianRuc(value);
};

export { isValidEcuadorianCedula, isValidEcuadorianRuc };

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
      return draft.legalIdentifier.trim().length === 0
        ? 'Ingresa una cédula o RUC para continuar.'
        : isValidEcuadorianLegalIdentifier(draft.legalIdentifier.trim())
          ? null
          : 'Ingresa una cédula ecuatoriana o un RUC válido.';
    case 'services':
      return normalizeServices(draft.services).length > 0
        ? null
        : 'Complete the services step before continuing.';
    case 'address':
      return draft.country.trim() &&
        draft.city.trim() &&
        draft.exactLocation.trim()
        ? null
        : 'Complete the address step before continuing.';
    case 'contact':
      if (!isValidEcuadorianMobile(draft.contactPhone.trim())) {
        return 'Ingresa un celular ecuatoriano válido de 10 dígitos que empiece en 09.';
      }

      return draft.contactEmail.trim().length > 0
        ? null
        : 'Ingresa un correo electrónico para continuar.';
    case 'palette':
      return paletteValues.includes(draft.paletteId)
        ? null
        : 'Elige una paleta para continuar.';
    case 'module':
      return erpModuleValues.includes(draft.erpModuleId)
        ? null
        : 'Elige el módulo principal de tu empresa para continuar.';
  }
};

export const needsCompanyOnboarding = (session: AuthSession | null) => {
  if (!session) {
    return false;
  }

  return (
    !session.memberships.some(
      (membership) => membership.role === 'platform-admin',
    ) && getCompanyMemberships(session).length === 0
  );
};
