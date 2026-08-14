import type { HrResponsibilityGateway } from '../domain/hr-responsibility';

export const createListHrResponsibilityInvitations = ({
  gateway,
  now = () => new Date(),
}: {
  gateway: HrResponsibilityGateway;
  now?: () => Date;
}) => {
  return (companyId: string) =>
    gateway.listPendingInvitations(companyId, now());
};
