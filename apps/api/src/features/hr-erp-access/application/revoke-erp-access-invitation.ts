import type { ErpAccessGateway } from '../domain/erp-access-invitations';
import { ErpAccessLinkNotFoundError } from '../domain/erp-access-links';

export const createRevokeErpAccessInvitationUseCase = ({
  gateway,
  now = () => new Date(),
}: {
  gateway: ErpAccessGateway;
  now?: () => Date;
}) => {
  return async (input: { companyId: string; employeeId: string }) => {
    const activeLink = await gateway.getActiveLinkByEmployeeId(
      input.companyId,
      input.employeeId,
    );

    if (!activeLink) {
      throw new ErpAccessLinkNotFoundError();
    }

    await gateway.revokeAccess({
      companyId: input.companyId,
      employeeId: input.employeeId,
      revokedAt: now(),
    });
  };
};
