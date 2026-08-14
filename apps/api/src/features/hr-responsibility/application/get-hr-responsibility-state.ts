import type { HrResponsibilityGateway } from '../domain/hr-responsibility';

export const createGetHrResponsibilityState = (
  gateway: HrResponsibilityGateway,
) => {
  return async (companyId: string) => {
    const [users, responsibilities] = await Promise.all([
      gateway.listCompanyUsers(companyId),
      gateway.listResponsibilities(companyId),
    ]);
    const pendingInvitations = await gateway.listPendingInvitations(
      companyId,
      new Date(),
    );

    return {
      companyId,
      hasResponsibles: responsibilities.length > 0,
      responsibles: responsibilities,
      availableUsers: users.filter(
        (user) =>
          !responsibilities.some(
            (responsible) => responsible.userId === user.userId,
          ),
      ),
      pendingInvitations,
    };
  };
};
