import type { CompanyOnboardingGateway } from '../domain/company';

export const createGetCurrentCompanySummary = (gateway: CompanyOnboardingGateway) => {
  return async (userId: string) => await gateway.getCurrentCompanySummary(userId);
};
