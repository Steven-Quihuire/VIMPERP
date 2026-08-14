import type { HrResponsibilityGateway } from '../domain/hr-responsibility';

export const createAssignHrResponsible = (gateway: HrResponsibilityGateway) => {
  return (input: { companyId: string; userId: string }) =>
    gateway.assignResponsibility(input);
};
