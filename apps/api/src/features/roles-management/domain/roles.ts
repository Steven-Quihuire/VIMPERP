export type Role = {
  id: string;
  companyId: string;
  key: string;
  name: string;
  isSystem: boolean;
  createdAt: Date;
};

export type RoleWithPermissions = Role & {
  permissionKeys: string[];
};

export type RolePermissionRow = {
  roleId: string;
  permissionKey: string;
};

export type RolesGateway = {
  createRole: (input: {
    companyId: string;
    key: string;
    name: string;
    isSystem: boolean;
    permissionIds: string[];
  }) => Promise<Role>;
  updateRole: (input: {
    roleId: string;
    key?: string;
    name?: string;
  }) => Promise<Role>;
  deleteRole: (roleId: string) => Promise<void>;
  listRoles: (companyId: string) => Promise<Role[]>;
  findRoleById: (roleId: string) => Promise<Role | null>;
  findRoleWithPermissions: (roleId: string) => Promise<RoleWithPermissions | null>;
  listRolePermissionRows: (roleIds: string[]) => Promise<RolePermissionRow[]>;
  replaceRolePermissions: (input: {
    roleId: string;
    permissionIds: string[];
  }) => Promise<void>;
  countAssignmentsForRole: (roleId: string) => Promise<number>;
};

export class RoleConflictError extends Error {
  readonly code = 'ROLE_CONFLICT';

  constructor(message = 'A role with this key already exists for the company.') {
    super(message);
    this.name = 'RoleConflictError';
  }
}

export class RoleNotFoundError extends Error {
  readonly code = 'ROLE_NOT_FOUND';

  constructor(message = 'Role not found') {
    super(message);
    this.name = 'RoleNotFoundError';
  }
}

export class RoleInUseError extends Error {
  readonly code = 'ROLE_IN_USE';

  constructor(message = 'Cannot delete a role while assignments still reference it.') {
    super(message);
    this.name = 'RoleInUseError';
  }
}

export class SystemRoleNotDeletableError extends Error {
  readonly code = 'SYSTEM_ROLE_NOT_DELETABLE';

  constructor(message = 'System roles cannot be deleted.') {
    super(message);
    this.name = 'SystemRoleNotDeletableError';
  }
}
