export type AuthRole = 'platform-admin' | 'company-owner' | 'company-user';

export type AuthMembership = {
  companyId: string | null;
  role: AuthRole;
};

export type AuthUser = {
  id: string;
  email: string;
  username: string;
};

export type AuthSession = {
  user: AuthUser;
  memberships: AuthMembership[];
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
  logout: () => Promise<void>;
};
