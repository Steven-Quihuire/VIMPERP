export type AuthRole = 'platform-admin' | 'company-owner' | 'company-user';

export type AuthMembership = {
  companyId: string | null;
  role: AuthRole;
};

export type CompanyLifecycle = 'active' | 'suspended' | 'provisioning_failed';

export type ActiveCompany = {
  companyId: string;
  status: CompanyLifecycle;
};

export type AuthCapability =
  | 'catalog.read'
  | 'catalog.write'
  | 'catalog.delete';

export type AuthUser = {
  id: string;
  email: string;
  username: string;
};

export type AuthSession = {
  user: AuthUser;
  memberships: AuthMembership[];
  activeCompany: ActiveCompany | null;
  capabilities: AuthCapability[];
};

export type SwitchActiveCompanyInput = {
  companyId: string;
};

export type LoginInput = {
  identifier: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  username: string;
  password: string;
};

export type AuthRepository = {
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  getMe: () => Promise<AuthSession>;
  switchActiveCompany: (input: SwitchActiveCompanyInput) => Promise<void>;
  logout: () => Promise<void>;
};

export const getCompanyMemberships = (session: AuthSession) =>
  session.memberships.filter(
    (membership): membership is AuthMembership & { companyId: string } =>
      membership.companyId !== null,
  );

export const needsActiveCompanySelection = (session: AuthSession) =>
  !session.activeCompany && getCompanyMemberships(session).length > 0;

export const hasBlockedActiveCompany = (session: AuthSession) =>
  session.activeCompany?.status === 'suspended' ||
  session.activeCompany?.status === 'provisioning_failed';
