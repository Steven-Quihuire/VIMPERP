import type { CompanyOnboardingGateway } from '../domain/company';

export const createGetCurrentCompanySummary = (gateway: CompanyOnboardingGateway) => {
  return async (activeCompanyId: string | null) =>
    await gateway.getCurrentCompanySummary(activeCompanyId);
};
