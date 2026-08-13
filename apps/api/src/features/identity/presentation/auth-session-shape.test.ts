import { describe, expect, it } from 'vitest';

import type {
  AuthMembership as ApiAuthMembership,
  AuthSession as ApiAuthSession,
} from '../domain/auth';
import { authMembershipSchema, authSessionSchema } from './auth.router';
import type {
  AuthMembership as WebAuthMembership,
  AuthSession as WebAuthSession,
} from '../../../../../web/src/features/auth/domain/auth';

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

type ApiSessionFields = keyof ApiAuthSession;
type WebSessionFields = keyof WebAuthSession;
type ApiMembershipFields = keyof ApiAuthMembership;
type WebMembershipFields = keyof WebAuthMembership;

type _SessionCheck = Equal<ApiSessionFields, WebSessionFields>;
type _MembershipCheck = Equal<ApiMembershipFields, WebMembershipFields>;

const sessionShapeKeys = Object.keys(authSessionSchema.shape).sort();
const membershipShapeKeys = Object.keys(authMembershipSchema.shape).sort();

describe('auth session shape lockstep (api zod <-> web type)', () => {
  it('exposes the same session fields as the web AuthSession type', () => {
    const webSessionFields: (keyof WebAuthSession)[] = [
      'user',
      'memberships',
      'activeCompany',
      'activeScope',
      'activeLocalId',
      'capabilities',
    ].sort() as (keyof WebAuthSession)[];

    expect(sessionShapeKeys).toEqual(webSessionFields);
  });

  it('exposes the same membership fields as the web AuthMembership type', () => {
    const webMembershipFields: (keyof WebAuthMembership)[] = [
      'companyId',
      'role',
      'divisionId',
      'localId',
    ].sort() as (keyof WebAuthMembership)[];

    expect(membershipShapeKeys).toEqual(webMembershipFields);
  });
});
