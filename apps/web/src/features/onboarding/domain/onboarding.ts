import type { AuthSession } from '../../auth/domain/auth';

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

const isValidModulo11CheckDigit = (
  value: string,
  weights: readonly number[],
) => {
  const sum = weights.reduce(
    (total, weight, index) => total + Number(value[index]) * weight,
    0,
  );
  const remainder = 11 - (sum % 11);
  const expectedDigit = remainder === 10 ? 0 : remainder === 11 ? 1 : remainder;

  return Number(value[weights.length]) === expectedDigit;
};

export const isValidEcuadorianCedula = (value: string) => {
  if (!/^\d{10}$/.test(value)) {
    return false;
  }

  const province = Number(value.slice(0, 2));
  const thirdDigit = Number(value[2]);

  if (province < 1 || province > 24 || thirdDigit > 5) {
    return false;
  }

  const sum = Array.from(value.slice(0, 9)).reduce((total, digit, index) => {
    const product = Number(digit) * (index % 2 === 0 ? 2 : 1);
    return total + (product > 9 ? product - 9 : product);
  }, 0);

  const checkDigit = (10 - (sum % 10)) % 10;
  return Number(value[9]) === checkDigit;
};

export const isValidEcuadorianRuc = (value: string) => {
  if (!/^\d{13}$/.test(value) || value.slice(10) === '000') {
    return false;
  }

  if (isValidEcuadorianCedula(value.slice(0, 10))) {
    return true;
  }

  const province = Number(value.slice(0, 2));
  const thirdDigit = Number(value[2]);

  if (province < 1 || province > 24) {
    return false;
  }

  if (thirdDigit === 9) {
    return isValidModulo11CheckDigit(value, [4, 3, 2, 7, 6, 5, 4, 3, 2]);
  }

  if (thirdDigit === 6) {
    return isValidModulo11CheckDigit(value, [3, 2, 7, 6, 5, 4, 3, 2, 1]);
  }

  return false;
};

export const isValidEcuadorianLegalIdentifier = (value: string) => {
  return isValidEcuadorianCedula(value) || isValidEcuadorianRuc(value);
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

  return !session.memberships.some(
    (membership) =>
      membership.role === 'platform-admin' || membership.companyId,
  );
};
