import type {
  CompanyOnboardingGateway,
  PaletteId,
} from '../domain/company';

export const createUpdateThemePreference = (gateway: CompanyOnboardingGateway) => {
  return async (input: { userId: string; paletteId: PaletteId }) => {
    return gateway.saveThemePreference(input);
  };
};
