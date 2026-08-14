const unique = (values: string[]) => [...new Set(values)];

export const permissionFamilyValues = ['normal', 'reserved'] as const;

export type PermissionFamily = (typeof permissionFamilyValues)[number];

export type Permission = {
  id: string;
  key: string;
  family: PermissionFamily;
};

export type PermissionsGateway = {
  listPermissions: () => Promise<Permission[]>;
  findPermissionsByKeys: (keys: string[]) => Promise<Permission[]>;
};

export const roleManagementPermissionKeys = [
  'roles.read',
  'roles.write',
  'roles.assign',
] as const;

export const inventoryPermissionKeys = [
  'catalog.read',
  'catalog.write',
  'catalog.delete',
] as const;

export const hrPermissionKeys = [
  'hr.employees.read',
  'hr.employees.write',
  'hr.employees.assign',
  'hr.positions.read',
  'hr.positions.write',
  'hr.erp_access.invite',
  'hr.erp_access.revoke',
  'hr.approval_policy.read',
  'hr.approval_policy.write',
] as const;

export const reservedPlatformPermissionKeys = [
  'platform.bypass_company_isolation',
  'platform.impersonate_user',
] as const;

const modulePermissionRegistry: Record<string, readonly string[]> = {
  inventory: inventoryPermissionKeys,
  hr: hrPermissionKeys,
};

export const permissionCatalogSeeds: Array<{
  key: string;
  family: PermissionFamily;
}> = [
  ...inventoryPermissionKeys.map((key) => ({ key, family: 'normal' as const })),
  ...hrPermissionKeys.map((key) => ({ key, family: 'normal' as const })),
  ...roleManagementPermissionKeys.map((key) => ({
    key,
    family: 'normal' as const,
  })),
  ...reservedPlatformPermissionKeys.map((key) => ({
    key,
    family: 'reserved' as const,
  })),
];

const getModulePermissionKeys = (moduleIds: readonly string[]) => {
  return unique(
    moduleIds.flatMap((moduleId) => [...(modulePermissionRegistry[moduleId] ?? [])]),
  );
};

export const getCompanyOwnerPermissionKeys = (moduleIds: readonly string[]) => {
  return unique([
    ...roleManagementPermissionKeys,
    ...getModulePermissionKeys(moduleIds),
  ]);
};

export const getCompanyUserPermissionKeys = (moduleIds: readonly string[]) => {
  const modulePermissionKeys = getModulePermissionKeys(moduleIds).filter(
    (permissionKey) => permissionKey !== 'catalog.delete',
  );

  return unique(['roles.read', ...modulePermissionKeys]);
};

export class WildcardPermissionError extends Error {
  readonly code = 'ROLE_PERMISSION_WILDCARD';

  constructor(message = 'Wildcard permissions are not allowed.') {
    super(message);
    this.name = 'WildcardPermissionError';
  }
}

export class UnknownPermissionError extends Error {
  readonly code = 'ROLE_PERMISSION_UNKNOWN';

  constructor(message = 'The requested permission does not exist.') {
    super(message);
    this.name = 'UnknownPermissionError';
  }
}

export class ReservedPermissionError extends Error {
  readonly code = 'ROLE_PERMISSION_RESERVED';

  constructor(message = 'Reserved permissions cannot be granted to company roles.') {
    super(message);
    this.name = 'ReservedPermissionError';
  }
}
