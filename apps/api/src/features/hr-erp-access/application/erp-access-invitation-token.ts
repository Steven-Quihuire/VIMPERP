import { createHash, randomBytes } from 'node:crypto';

export const hashErpAccessInvitationToken = (token: string) => {
  return createHash('sha256').update(token).digest('hex');
};

export const createErpAccessInvitationToken = () => {
  return randomBytes(32).toString('hex');
};
