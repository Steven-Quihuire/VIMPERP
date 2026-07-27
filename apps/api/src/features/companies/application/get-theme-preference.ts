import {
  type CompanyOnboardingGateway,
  type PaletteId,
  type ThemePreference,
} from '../domain/company';

export const createGetThemePreference = (
  gateway: CompanyOnboardingGateway,
  defaultPaletteId: PaletteId = 'ocean',
) => {
  return async (userId: string): Promise<ThemePreference> => {
    const preference = await gateway.getThemePreference(userId);

    return preference ?? { paletteId: defaultPaletteId };
  };
};
