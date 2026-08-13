import { createHash, randomBytes } from 'node:crypto';

export const hashNodeManagementInvitationToken = (token: string) => {
  return createHash('sha256').update(token).digest('hex');
};

export const createNodeManagementInvitationToken = () => {
  return randomBytes(32).toString('hex');
};
