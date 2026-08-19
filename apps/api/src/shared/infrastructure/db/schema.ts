import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  type AnyPgColumn,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const authRoleEnum = pgEnum('auth_role', [
  'platform-admin',
  'company-owner',
  'company-user',
]);

export const provisioningStatusEnum = pgEnum('provisioning_status', [
  'running',
  'succeeded',
  'failed',
  'incomplete',
]);

export const provisioningStepStatusEnum = pgEnum('provisioning_step_status', [
  'pending',
  'succeeded',
  'failed',
  'skipped',
]);

export const itemTypeEnum = pgEnum('item_type', ['product', 'service']);

export const itemUnitEnum = pgEnum('item_unit', [
  'unit',
  'hour',
  'kg',
  'liter',
  'meter',
  'box',
  'service',
]);

export const itemTrackBatchModeEnum = pgEnum('item_track_batch_mode', [
  'none',
  'batch',
  'serial',
]);

export const companyStatusEnum = pgEnum('company_status', [
  'active',
  'suspended',
  'provisioning_failed',
]);

export const areaKindEnum = pgEnum('area_kind', ['area', 'department']);

export const permissionFamilyEnum = pgEnum('permission_family', [
  'normal',
  'reserved',
]);

export const scopeNodeTypeEnum = pgEnum('scope_node_type', [
  'company',
  'division',
  'local',
  'area',
  'warehouse',
  'point-of-sale',
]);

export const roleAssignmentModeEnum = pgEnum('role_assignment_mode', [
  'subtree_inclusive',
  'exact_node',
]);

export const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
});

export const sessionsTable = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const membershipsTable = pgTable('memberships', {
  userId: text('user_id').notNull(),
  companyId: text('company_id'),
  divisionId: text('division_id'),
  localId: text('local_id'),
  role: authRoleEnum('role').notNull(),
});

export const companiesTable = pgTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: companyStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const divisionsTable = pgTable(
  'divisions',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('divisions_id_company_idx').on(table.id, table.companyId),
    uniqueIndex('divisions_company_name_idx').on(table.companyId, table.name),
  ],
);

export const privacyConsentsTable = pgTable(
  'privacy_consents',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    companyId: text('company_id').notNull(),
    policyVersion: text('policy_version').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('privacy_consents_user_company_version_idx').on(
      table.userId,
      table.companyId,
      table.policyVersion,
    ),
  ],
);

export const privacyPolicyAcceptancesTable = pgTable(
  'privacy_policy_acceptances',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    policyVersion: text('policy_version').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('privacy_policy_acceptances_user_version_idx').on(
      table.userId,
      table.policyVersion,
    ),
  ],
);

export const userPreferencesTable = pgTable('user_preferences', {
  userId: text('user_id').primaryKey(),
  activeCompanyId: text('active_company_id').references(
    () => companiesTable.id,
  ),
  activeLocalId: text('active_local_id'),
  activeScopeNodeId: text('active_scope_node_id').references(
    () => scopeNodesTable.id,
    { onDelete: 'restrict' },
  ),
});

export const permissionsTable = pgTable(
  'permissions',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    family: permissionFamilyEnum('family').notNull(),
  },
  (table) => [uniqueIndex('permissions_key_idx').on(table.key)],
);

export const rolesTable = pgTable(
  'roles',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('roles_company_key_idx').on(table.companyId, table.key),
    index('roles_company_idx').on(table.companyId),
  ],
);

export const rolePermissionsTable = pgTable(
  'role_permissions',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => rolesTable.id, { onDelete: 'restrict' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissionsTable.id, { onDelete: 'restrict' }),
  },
  (table) => [
    uniqueIndex('role_permissions_role_permission_idx').on(
      table.roleId,
      table.permissionId,
    ),
    index('role_permissions_permission_idx').on(table.permissionId),
  ],
);

export const roleAssignmentsTable = pgTable(
  'role_assignments',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'restrict' }),
    roleId: text('role_id')
      .notNull()
      .references(() => rolesTable.id, { onDelete: 'restrict' }),
    scopeNodeId: text('scope_node_id')
      .notNull()
      .references(() => scopeNodesTable.id, { onDelete: 'restrict' }),
    mode: roleAssignmentModeEnum('mode').notNull().default('subtree_inclusive'),
    scopeType: scopeNodeTypeEnum('scope_type').notNull(),
    scopeId: text('scope_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('role_assignments_user_company_idx').on(
      table.userId,
      table.companyId,
    ),
    index('role_assignments_scope_node_idx').on(table.scopeNodeId),
    index('role_assignments_scope_idx').on(table.scopeType, table.scopeId),
    uniqueIndex('role_assignments_unique_scope_idx').on(
      table.companyId,
      table.userId,
      table.roleId,
      table.scopeType,
      table.scopeId,
    ),
  ],
);

export const staleRoleAssignmentsTable = pgTable(
  'stale_role_assignments',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id').notNull(),
    userId: text('user_id').notNull(),
    roleId: text('role_id').notNull(),
    scopeType: scopeNodeTypeEnum('scope_type').notNull(),
    scopeId: text('scope_id'),
    expectedScopeNodeId: text('expected_scope_node_id'),
    quarantineReason: text('quarantine_reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    quarantinedAt: timestamp('quarantined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('stale_role_assignments_company_idx').on(table.companyId)],
);

export const scopeNodesTable = pgTable(
  'scope_nodes',
  {
    id: text('id').primaryKey(),
    nodeType: scopeNodeTypeEnum('node_type').notNull(),
    sourceId: text('source_id').notNull(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    parentScopeNodeId: text('parent_scope_node_id').references(
      (): AnyPgColumn => scopeNodesTable.id,
      { onDelete: 'restrict' },
    ),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('scope_nodes_node_source_idx').on(
      table.nodeType,
      table.sourceId,
    ),
    uniqueIndex('scope_nodes_id_company_idx').on(table.id, table.companyId),
    index('scope_nodes_company_idx').on(table.companyId),
    index('scope_nodes_parent_scope_node_idx').on(table.parentScopeNodeId),
  ],
);

export const nodeResponsibilitiesTable = pgTable(
  'node_responsibilities',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    scopeNodeId: text('scope_node_id')
      .notNull()
      .references(() => scopeNodesTable.id, { onDelete: 'restrict' }),
    scopeType: scopeNodeTypeEnum('scope_type').notNull(),
    scopeId: text('scope_id').notNull(),
    responsibleUserId: text('responsible_user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'restrict' }),
    managedRoleKey: text('managed_role_key').notNull().default('node-manager'),
    assignmentMode: roleAssignmentModeEnum('assignment_mode')
      .notNull()
      .default('subtree_inclusive'),
    baseMembershipRole: authRoleEnum('base_membership_role')
      .notNull()
      .default('company-user'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => [
    index('node_responsibilities_company_idx').on(table.companyId),
    index('node_responsibilities_scope_node_idx').on(table.scopeNodeId),
    index('node_responsibilities_scope_idx').on(table.scopeType, table.scopeId),
    index('node_responsibilities_user_idx').on(table.responsibleUserId),
    uniqueIndex('node_responsibilities_active_scope_node_idx')
      .on(table.scopeNodeId)
      .where(sql`${table.isActive} = true AND ${table.endedAt} IS NULL`),
  ],
);

export const nodeManagementInvitationsTable = pgTable(
  'node_management_invitations',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    scopeNodeId: text('scope_node_id')
      .notNull()
      .references(() => scopeNodesTable.id, { onDelete: 'restrict' }),
    scopeType: scopeNodeTypeEnum('scope_type').notNull(),
    scopeId: text('scope_id').notNull(),
    inviteeEmail: text('invitee_email').notNull(),
    tokenHash: text('token_hash').notNull(),
    managedRoleKey: text('managed_role_key').notNull().default('node-manager'),
    baseMembershipRole: authRoleEnum('base_membership_role')
      .notNull()
      .default('company-user'),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedByUserId: text('accepted_by_user_id').references(
      () => usersTable.id,
      {
        onDelete: 'restrict',
      },
    ),
  },
  (table) => [
    index('node_management_invitations_company_idx').on(table.companyId),
    index('node_management_invitations_scope_node_idx').on(table.scopeNodeId),
    uniqueIndex('node_management_invitations_token_hash_idx').on(
      table.tokenHash,
    ),
    index('node_management_invitations_invitee_email_idx').on(
      table.inviteeEmail,
    ),
    check(
      'node_management_invitations_acceptance_chk',
      sql`(${table.acceptedAt} IS NULL AND ${table.acceptedByUserId} IS NULL) OR (${table.acceptedAt} IS NOT NULL AND ${table.acceptedByUserId} IS NOT NULL)`,
    ),
  ],
);

export const hrResponsibilityInvitationsTable = pgTable(
  'hr_responsibility_invitations',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    inviteeEmail: text('invitee_email').notNull(),
    tokenHash: text('token_hash').notNull(),
    purpose: text('purpose').notNull().default('hr-responsible'),
    roleKey: text('role_key').notNull().default('hr-responsible'),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedByUserId: text('accepted_by_user_id').references(
      () => usersTable.id,
      { onDelete: 'restrict' },
    ),
  },
  (table) => [
    index('hr_responsibility_invitations_company_idx').on(table.companyId),
    index('hr_responsibility_invitations_email_idx').on(table.inviteeEmail),
    uniqueIndex('hr_responsibility_invitations_token_hash_idx').on(
      table.tokenHash,
    ),
    check(
      'hr_responsibility_invitations_purpose_chk',
      sql`${table.purpose} = 'hr-responsible' AND ${table.roleKey} = 'hr-responsible'`,
    ),
    check(
      'hr_responsibility_invitations_acceptance_chk',
      sql`(${table.acceptedAt} IS NULL AND ${table.acceptedByUserId} IS NULL) OR (${table.acceptedAt} IS NOT NULL AND ${table.acceptedByUserId} IS NOT NULL)`,
    ),
  ],
);

export const companyProfilesTable = pgTable('company_profiles', {
  companyId: text('company_id').primaryKey(),
  legalIdentifier: text('legal_identifier').notNull(),
  services: text('services').notNull(),
  country: text('country').notNull(),
  city: text('city').notNull(),
  exactLocation: text('exact_location').notNull(),
  contactPhone: text('contact_phone').notNull(),
  contactEmail: text('contact_email').notNull(),
  erpModuleId: text('erp_module_id').notNull().default('inventory'),
});

export const companyServicesTable = pgTable(
  'company_services',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('company_services_company_name_idx').on(
      table.companyId,
      table.name,
    ),
  ],
);

export const itemCategoriesTable = pgTable(
  'item_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id),
    parentId: uuid('parent_id').references(
      (): AnyPgColumn => itemCategoriesTable.id,
    ),
    localId: text('local_id'),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('item_categories_company_local_parent_name_idx').on(
      table.companyId,
      table.localId,
      table.parentId,
      table.name,
    ),
  ],
);

export const itemsTable = pgTable(
  'items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id),
    categoryId: uuid('category_id').references(() => itemCategoriesTable.id),
    sku: text('sku'),
    localId: text('local_id'),
    name: text('name').notNull(),
    type: itemTypeEnum('type').notNull().default('product'),
    unit: itemUnitEnum('unit').notNull().default('unit'),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    tracksStock: boolean('tracks_stock').notNull().default(false),
    trackBatchMode: itemTrackBatchModeEnum('track_batch_mode')
      .notNull()
      .default('none'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('items_id_company_idx').on(table.id, table.companyId),
    uniqueIndex('items_company_local_sku_idx')
      .on(table.companyId, table.localId, table.sku)
      .where(sql`${table.sku} IS NOT NULL`),
  ],
);

export const localsTable = pgTable(
  'locals',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    divisionId: text('division_id').references(() => divisionsTable.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    locale: text('locale'),
  },
  (table) => [
    uniqueIndex('locals_id_company_idx').on(table.id, table.companyId),
    foreignKey({
      columns: [table.divisionId, table.companyId],
      foreignColumns: [divisionsTable.id, divisionsTable.companyId],
      name: 'locals_division_company_fk',
    }),
    uniqueIndex('locals_company_name_root_idx')
      .on(table.companyId, table.name)
      .where(sql`${table.divisionId} IS NULL`),
    uniqueIndex('locals_division_name_idx')
      .on(table.divisionId, table.name)
      .where(sql`${table.divisionId} IS NOT NULL`),
    index('locals_company_idx').on(table.companyId),
    index('locals_division_idx').on(table.divisionId),
  ],
);

export const areasTable = pgTable(
  'areas',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id),
    divisionId: text('division_id').references(() => divisionsTable.id, {
      onDelete: 'restrict',
    }),
    localId: text('local_id').references(() => localsTable.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    kind: areaKindEnum('kind').notNull().default('area'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('areas_id_company_idx').on(table.id, table.companyId),
    check(
      'areas_exactly_one_parent_check',
      sql`((${table.divisionId} IS NOT NULL AND ${table.localId} IS NULL) OR (${table.divisionId} IS NULL AND ${table.localId} IS NOT NULL))`,
    ),
    foreignKey({
      columns: [table.divisionId, table.companyId],
      foreignColumns: [divisionsTable.id, divisionsTable.companyId],
      name: 'areas_division_company_fk',
    }),
    foreignKey({
      columns: [table.localId, table.companyId],
      foreignColumns: [localsTable.id, localsTable.companyId],
      name: 'areas_local_company_fk',
    }),
    uniqueIndex('areas_company_division_kind_name_idx')
      .on(table.companyId, table.divisionId, table.kind, table.name)
      .where(sql`${table.divisionId} IS NOT NULL AND ${table.localId} IS NULL`),
    uniqueIndex('areas_company_local_kind_name_idx')
      .on(table.companyId, table.localId, table.kind, table.name)
      .where(sql`${table.localId} IS NOT NULL AND ${table.divisionId} IS NULL`),
    index('areas_company_idx').on(table.companyId),
    index('areas_division_idx').on(table.divisionId),
    index('areas_local_idx').on(table.localId),
  ],
);

export const employeesTable = pgTable(
  'employees',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    fullName: text('full_name').notNull().default(''),
    documentType: text('document_type'),
    documentNumber: text('document_number'),
    email: text('email'),
    employmentStatus: text('employment_status').notNull().default('active'),
    hiredAt: date('hired_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('employees_company_idx').on(table.companyId),
    index('employees_company_status_idx').on(
      table.companyId,
      table.employmentStatus,
    ),
    uniqueIndex('employees_id_company_idx').on(table.id, table.companyId),
    uniqueIndex('employees_company_document_idx')
      .on(table.companyId, table.documentType, table.documentNumber)
      .where(sql`${table.documentNumber} IS NOT NULL`),
    check(
      'employees_employment_status_chk',
      sql`${table.employmentStatus} IN ('active', 'suspended', 'separated')`,
    ),
    check(
      'employees_document_pair_chk',
      sql`(${table.documentType} IS NULL AND ${table.documentNumber} IS NULL) OR (${table.documentType} IS NOT NULL AND ${table.documentNumber} IS NOT NULL)`,
    ),
  ],
);

export const positionsTable = pgTable(
  'positions',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    reportsToPositionId: text('reports_to_position_id').references(
      (): AnyPgColumn => positionsTable.id,
      { onDelete: 'restrict' },
    ),
    headcount: integer('headcount').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('positions_company_idx').on(table.companyId),
    uniqueIndex('positions_company_name_idx').on(table.companyId, table.name),
    index('positions_reports_to_position_idx').on(table.reportsToPositionId),
    uniqueIndex('positions_id_company_idx').on(table.id, table.companyId),
    check('positions_headcount_nonnegative_chk', sql`${table.headcount} >= 0`),
  ],
);

export const employeeAssignmentsTable = pgTable(
  'employee_assignments',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    employeeId: text('employee_id')
      .notNull()
      .references(() => employeesTable.id, { onDelete: 'restrict' }),
    scopeNodeId: text('scope_node_id')
      .notNull()
      .references(() => scopeNodesTable.id, { onDelete: 'restrict' }),
    positionId: text('position_id')
      .notNull()
      .references(() => positionsTable.id, { onDelete: 'restrict' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    isPrimary: boolean('is_primary').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('employee_assignments_company_idx').on(table.companyId),
    index('employee_assignments_employee_idx').on(table.employeeId),
    index('employee_assignments_scope_node_idx').on(table.scopeNodeId),
    index('employee_assignments_position_idx').on(table.positionId),
    foreignKey({
      columns: [table.employeeId, table.companyId],
      foreignColumns: [employeesTable.id, employeesTable.companyId],
      name: 'employee_assignments_employee_company_fk',
    }),
    foreignKey({
      columns: [table.scopeNodeId, table.companyId],
      foreignColumns: [scopeNodesTable.id, scopeNodesTable.companyId],
      name: 'employee_assignments_scope_node_company_fk',
    }),
    foreignKey({
      columns: [table.positionId, table.companyId],
      foreignColumns: [positionsTable.id, positionsTable.companyId],
      name: 'employee_assignments_position_company_fk',
    }),
    uniqueIndex('employee_assignments_active_primary_idx')
      .on(table.employeeId)
      .where(sql`${table.endedAt} IS NULL AND ${table.isPrimary} = true`),
  ],
);

export const erpAccessLinksTable = pgTable(
  'erp_access_links',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    employeeId: text('employee_id')
      .notNull()
      .references(() => employeesTable.id, { onDelete: 'restrict' }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'restrict' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    index('erp_access_links_company_idx').on(table.companyId),
    uniqueIndex('erp_access_links_active_employee_idx')
      .on(table.employeeId, table.companyId)
      .where(sql`${table.isActive} = true`),
    uniqueIndex('erp_access_links_active_user_idx')
      .on(table.userId, table.companyId)
      .where(sql`${table.isActive} = true`),
  ],
);

export const erpAccessInvitationsTable = pgTable(
  'erp_access_invitations',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    employeeId: text('employee_id')
      .notNull()
      .references(() => employeesTable.id, { onDelete: 'restrict' }),
    inviteeEmail: text('invitee_email').notNull(),
    tokenHash: text('token_hash').notNull(),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedByUserId: text('accepted_by_user_id').references(
      () => usersTable.id,
      {
        onDelete: 'restrict',
      },
    ),
  },
  (table) => [
    index('erp_access_invitations_company_idx').on(table.companyId),
    index('erp_access_invitations_employee_idx').on(table.employeeId),
    uniqueIndex('erp_access_invitations_token_hash_idx').on(table.tokenHash),
    index('erp_access_invitations_invitee_email_idx').on(table.inviteeEmail),
    check(
      'erp_access_invitations_acceptance_chk',
      sql`(${table.acceptedAt} IS NULL AND ${table.acceptedByUserId} IS NULL) OR (${table.acceptedAt} IS NOT NULL AND ${table.acceptedByUserId} IS NOT NULL)`,
    ),
  ],
);

export const approvalPoliciesTable = pgTable(
  'approval_policies',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    scopeType: scopeNodeTypeEnum('scope_type').notNull(),
    scopeNodeId: text('scope_node_id').references(() => scopeNodesTable.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    definition: jsonb('definition').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('approval_policies_company_idx').on(table.companyId),
    index('approval_policies_scope_node_idx').on(table.scopeNodeId),
    check(
      'approval_policies_scope_company_chk',
      sql`${table.scopeType} <> 'company' OR ${table.scopeNodeId} IS NULL`,
    ),
    check(
      'approval_policies_scope_node_required_chk',
      sql`${table.scopeType} = 'company' OR ${table.scopeNodeId} IS NOT NULL`,
    ),
  ],
);

export const timesheetStatusEnum = pgEnum('timesheet_status', [
  'draft',
  'submitted',
  'approved',
  'rejected',
]);

export const stockDocumentTypeEnum = pgEnum('stock_document_type', [
  'receipt',
  'transfer',
  'adjustment',
  'loss',
]);

export const stockDocumentStatusEnum = pgEnum('stock_document_status', [
  'draft',
  'confirmed',
  'cancelled',
]);

export const timesheetPeriodsTable = pgTable(
  'timesheet_periods',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    employeeAssignmentId: text('employee_assignment_id')
      .notNull()
      .references(() => employeeAssignmentsTable.id, { onDelete: 'restrict' }),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    status: timesheetStatusEnum('status').notNull().default('draft'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    submittedByUserId: text('submitted_by_user_id').references(
      () => usersTable.id,
      {
        onDelete: 'restrict',
      },
    ),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedByUserId: text('approved_by_user_id').references(
      () => usersTable.id,
      {
        onDelete: 'restrict',
      },
    ),
    rejectionReason: text('rejection_reason'),
    approvalPolicyId: text('approval_policy_id').references(
      () => approvalPoliciesTable.id,
      {
        onDelete: 'restrict',
      },
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('timesheet_periods_id_company_idx').on(
      table.id,
      table.companyId,
    ),
    foreignKey({
      columns: [table.employeeAssignmentId, table.companyId],
      foreignColumns: [
        employeeAssignmentsTable.id,
        employeeAssignmentsTable.companyId,
      ],
      name: 'timesheet_periods_employee_assignment_company_fk',
    }),
    foreignKey({
      columns: [table.approvalPolicyId, table.companyId],
      foreignColumns: [
        approvalPoliciesTable.id,
        approvalPoliciesTable.companyId,
      ],
      name: 'timesheet_periods_approval_policy_company_fk',
    }),
    check(
      'timesheet_periods_end_after_start_chk',
      sql`${table.periodEnd} >= ${table.periodStart}`,
    ),
    check(
      'timesheet_periods_submission_pair_chk',
      sql`(${table.submittedAt} IS NULL AND ${table.submittedByUserId} IS NULL) OR (${table.submittedAt} IS NOT NULL AND ${table.submittedByUserId} IS NOT NULL)`,
    ),
    check(
      'timesheet_periods_approval_pair_chk',
      sql`(${table.approvedAt} IS NULL AND ${table.approvedByUserId} IS NULL) OR (${table.approvedAt} IS NOT NULL AND ${table.approvedByUserId} IS NOT NULL)`,
    ),
    index('timesheet_periods_company_idx').on(table.companyId),
    index('timesheet_periods_assignment_idx').on(table.employeeAssignmentId),
    index('timesheet_periods_status_idx').on(table.companyId, table.status),
  ],
);

export const timeEntriesTable = pgTable(
  'time_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    periodId: uuid('period_id')
      .notNull()
      .references(() => timesheetPeriodsTable.id, { onDelete: 'restrict' }),
    entryDate: date('entry_date').notNull(),
    hours: numeric('hours', { precision: 5, scale: 2 }).notNull(),
    projectId: uuid('project_id'),
    taskLabel: text('task_label').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('time_entries_id_company_idx').on(table.id, table.companyId),
    foreignKey({
      columns: [table.periodId, table.companyId],
      foreignColumns: [
        timesheetPeriodsTable.id,
        timesheetPeriodsTable.companyId,
      ],
      name: 'time_entries_period_company_fk',
    }),
    check(
      'time_entries_hours_bounds_chk',
      sql`${table.hours} > 0 AND ${table.hours} <= 24`,
    ),
    uniqueIndex('time_entries_period_date_task_idx').on(
      table.periodId,
      table.entryDate,
      table.taskLabel,
    ),
    index('time_entries_company_idx').on(table.companyId),
    index('time_entries_period_idx').on(table.periodId),
  ],
);

export const warehousesTable = pgTable(
  'warehouses',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id),
    areaId: text('area_id').references(() => areasTable.id),
    localId: text('local_id').references(() => localsTable.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('warehouses_id_company_idx').on(table.id, table.companyId),
    check(
      'warehouses_exactly_one_parent_check',
      sql`((${table.areaId} IS NOT NULL AND ${table.localId} IS NULL) OR (${table.areaId} IS NULL AND ${table.localId} IS NOT NULL))`,
    ),
    foreignKey({
      columns: [table.areaId, table.companyId],
      foreignColumns: [areasTable.id, areasTable.companyId],
      name: 'warehouses_area_company_fk',
    }),
    foreignKey({
      columns: [table.localId, table.companyId],
      foreignColumns: [localsTable.id, localsTable.companyId],
      name: 'warehouses_local_company_fk',
    }),
    uniqueIndex('warehouses_company_area_name_idx')
      .on(table.companyId, table.areaId, table.name)
      .where(sql`${table.areaId} IS NOT NULL AND ${table.localId} IS NULL`),
    uniqueIndex('warehouses_company_local_name_idx')
      .on(table.companyId, table.localId, table.name)
      .where(sql`${table.localId} IS NOT NULL AND ${table.areaId} IS NULL`),
    index('warehouses_company_idx').on(table.companyId),
    index('warehouses_local_idx').on(table.localId),
    index('warehouses_area_idx').on(table.areaId),
  ],
);

export const pointsOfSaleTable = pgTable(
  'points_of_sale',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id),
    areaId: text('area_id').references(() => areasTable.id),
    localId: text('local_id').references(() => localsTable.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('points_of_sale_id_company_idx').on(table.id, table.companyId),
    check(
      'points_of_sale_exactly_one_parent_check',
      sql`((${table.areaId} IS NOT NULL AND ${table.localId} IS NULL) OR (${table.areaId} IS NULL AND ${table.localId} IS NOT NULL))`,
    ),
    foreignKey({
      columns: [table.areaId, table.companyId],
      foreignColumns: [areasTable.id, areasTable.companyId],
      name: 'points_of_sale_area_company_fk',
    }),
    foreignKey({
      columns: [table.localId, table.companyId],
      foreignColumns: [localsTable.id, localsTable.companyId],
      name: 'points_of_sale_local_company_fk',
    }),
    uniqueIndex('points_of_sale_company_area_name_idx')
      .on(table.companyId, table.areaId, table.name)
      .where(sql`${table.areaId} IS NOT NULL AND ${table.localId} IS NULL`),
    uniqueIndex('points_of_sale_company_local_name_idx')
      .on(table.companyId, table.localId, table.name)
      .where(sql`${table.localId} IS NOT NULL AND ${table.areaId} IS NULL`),
    index('points_of_sale_company_idx').on(table.companyId),
    index('points_of_sale_local_idx').on(table.localId),
    index('points_of_sale_area_idx').on(table.areaId),
  ],
);

export const stockLotsTable = pgTable(
  'stock_lots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => itemsTable.id),
    lotNumber: text('lot_number').notNull(),
    expiresAt: date('expires_at'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('stock_lots_id_company_idx').on(table.id, table.companyId),
    uniqueIndex('stock_lots_company_item_lot_idx').on(
      table.companyId,
      table.itemId,
      table.lotNumber,
    ),
    foreignKey({
      columns: [table.itemId, table.companyId],
      foreignColumns: [itemsTable.id, itemsTable.companyId],
      name: 'stock_lots_item_company_fk',
    }),
    index('stock_lots_item_idx').on(table.itemId),
    index('stock_lots_expires_at_idx').on(table.expiresAt),
  ],
);

export const stockDocumentsTable = pgTable(
  'stock_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    documentNo: text('document_no').notNull(),
    type: stockDocumentTypeEnum('type').notNull(),
    status: stockDocumentStatusEnum('status').notNull().default('draft'),
    originScopeNodeId: text('origin_scope_node_id').references(
      () => scopeNodesTable.id,
      {
        onDelete: 'restrict',
      },
    ),
    originScopeType: text('origin_scope_type'),
    destinationScopeNodeId: text('destination_scope_node_id').references(
      () => scopeNodesTable.id,
      {
        onDelete: 'restrict',
      },
    ),
    destinationScopeType: text('destination_scope_type'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'restrict' }),
    reversalOfId: uuid('reversal_of_id'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('stock_documents_id_company_idx').on(table.id, table.companyId),
    uniqueIndex('stock_documents_company_document_no_idx').on(
      table.companyId,
      table.documentNo,
    ),
    foreignKey({
      columns: [table.originScopeNodeId, table.companyId],
      foreignColumns: [scopeNodesTable.id, scopeNodesTable.companyId],
      name: 'stock_documents_origin_scope_node_company_fk',
    }),
    foreignKey({
      columns: [table.destinationScopeNodeId, table.companyId],
      foreignColumns: [scopeNodesTable.id, scopeNodesTable.companyId],
      name: 'stock_documents_destination_scope_node_company_fk',
    }),
    foreignKey({
      columns: [table.reversalOfId],
      foreignColumns: [table.id],
      name: 'stock_documents_reversal_of_id_stock_documents_id_fk',
    }),
    foreignKey({
      columns: [table.reversalOfId, table.companyId],
      foreignColumns: [table.id, table.companyId],
      name: 'stock_documents_reversal_company_fk',
    }),
    check(
      'stock_documents_origin_scope_type_warehouse_pos_chk',
      sql`${table.originScopeType} IS NULL OR ${table.originScopeType} IN ('warehouse', 'point-of-sale')`,
    ),
    check(
      'stock_documents_destination_scope_type_warehouse_pos_chk',
      sql`${table.destinationScopeType} IS NULL OR ${table.destinationScopeType} IN ('warehouse', 'point-of-sale')`,
    ),
    check(
      'stock_documents_origin_scope_pair_chk',
      sql`(${table.originScopeNodeId} IS NULL AND ${table.originScopeType} IS NULL) OR (${table.originScopeNodeId} IS NOT NULL AND ${table.originScopeType} IS NOT NULL)`,
    ),
    check(
      'stock_documents_destination_scope_pair_chk',
      sql`(${table.destinationScopeNodeId} IS NULL AND ${table.destinationScopeType} IS NULL) OR (${table.destinationScopeNodeId} IS NOT NULL AND ${table.destinationScopeType} IS NOT NULL)`,
    ),
    check(
      'stock_documents_reversal_confirmed_chk',
      sql`${table.reversalOfId} IS NULL OR ${table.status} = 'confirmed'`,
    ),
    check(
      'stock_documents_receipt_shape_chk',
      sql`${table.type} <> 'receipt' OR (${table.originScopeNodeId} IS NULL AND ${table.destinationScopeNodeId} IS NOT NULL)`,
    ),
    check(
      'stock_documents_loss_adjustment_shape_chk',
      sql`${table.type} NOT IN ('loss', 'adjustment') OR (${table.originScopeNodeId} IS NOT NULL AND ${table.destinationScopeNodeId} IS NULL)`,
    ),
    check(
      'stock_documents_transfer_shape_chk',
      sql`${table.type} <> 'transfer' OR (${table.originScopeNodeId} IS NOT NULL AND ${table.destinationScopeNodeId} IS NOT NULL AND ${table.originScopeNodeId} <> ${table.destinationScopeNodeId})`,
    ),
    index('stock_documents_company_idx').on(table.companyId),
    index('stock_documents_type_status_idx').on(
      table.companyId,
      table.type,
      table.status,
    ),
    index('stock_documents_origin_scope_idx').on(table.originScopeNodeId),
    index('stock_documents_destination_scope_idx').on(
      table.destinationScopeNodeId,
    ),
  ],
);

export const stockDocumentLinesTable = pgTable(
  'stock_document_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => stockDocumentsTable.id, { onDelete: 'restrict' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => itemsTable.id),
    quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
    unitCost: numeric('unit_cost', { precision: 14, scale: 4 }),
    lotId: uuid('lot_id').references(() => stockLotsTable.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('stock_document_lines_id_company_idx').on(
      table.id,
      table.companyId,
    ),
    foreignKey({
      columns: [table.documentId, table.companyId],
      foreignColumns: [stockDocumentsTable.id, stockDocumentsTable.companyId],
      name: 'stock_document_lines_document_company_fk',
    }),
    foreignKey({
      columns: [table.itemId, table.companyId],
      foreignColumns: [itemsTable.id, itemsTable.companyId],
      name: 'stock_document_lines_item_company_fk',
    }),
    foreignKey({
      columns: [table.lotId, table.companyId],
      foreignColumns: [stockLotsTable.id, stockLotsTable.companyId],
      name: 'stock_document_lines_lot_company_fk',
    }),
    check(
      'stock_document_lines_quantity_positive_chk',
      sql`${table.quantity} > 0`,
    ),
    index('stock_document_lines_document_idx').on(table.documentId),
    index('stock_document_lines_item_idx').on(table.itemId),
  ],
);

export const stockQuantsTable = pgTable(
  'stock_quants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => itemsTable.id),
    scopeNodeId: text('scope_node_id')
      .notNull()
      .references(() => scopeNodesTable.id, { onDelete: 'restrict' }),
    scopeType: text('scope_type').notNull(),
    lotId: uuid('lot_id').references(() => stockLotsTable.id, {
      onDelete: 'restrict',
    }),
    quantity: numeric('quantity', { precision: 14, scale: 3 })
      .notNull()
      .default('0'),
    reservedQuantity: numeric('reserved_quantity', { precision: 14, scale: 3 })
      .notNull()
      .default('0'),
    quarantineQuantity: numeric('quarantine_quantity', {
      precision: 14,
      scale: 3,
    })
      .notNull()
      .default('0'),
    avgUnitCost: numeric('avg_unit_cost', { precision: 14, scale: 4 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('stock_quants_id_company_idx').on(table.id, table.companyId),
    foreignKey({
      columns: [table.itemId, table.companyId],
      foreignColumns: [itemsTable.id, itemsTable.companyId],
      name: 'stock_quants_item_company_fk',
    }),
    foreignKey({
      columns: [table.scopeNodeId, table.companyId],
      foreignColumns: [scopeNodesTable.id, scopeNodesTable.companyId],
      name: 'stock_quants_scope_node_company_fk',
    }),
    foreignKey({
      columns: [table.lotId, table.companyId],
      foreignColumns: [stockLotsTable.id, stockLotsTable.companyId],
      name: 'stock_quants_lot_company_fk',
    }),
    check(
      'stock_quants_scope_type_warehouse_pos_chk',
      sql`${table.scopeType} IN ('warehouse', 'point-of-sale')`,
    ),
    check('stock_quants_quantity_nonnegative_chk', sql`${table.quantity} >= 0`),
    check(
      'stock_quants_reserved_nonnegative_chk',
      sql`${table.reservedQuantity} >= 0`,
    ),
    check(
      'stock_quants_quarantine_nonnegative_chk',
      sql`${table.quarantineQuantity} >= 0`,
    ),
    check(
      'stock_quants_reserved_quarantine_within_quantity_chk',
      sql`${table.reservedQuantity} + ${table.quarantineQuantity} <= ${table.quantity}`,
    ),
    index('stock_quants_company_item_scope_idx').on(
      table.companyId,
      table.itemId,
      table.scopeNodeId,
    ),
    index('stock_quants_scope_node_idx').on(table.scopeNodeId),
  ],
);
// Drizzle 0.44.x does not expose `unique().nullsNotDistinct()` for PostgreSQL indexes.
// Add `stock_quants_company_item_scope_lot_uk ... NULLS NOT DISTINCT` in PR2 migration SQL.

export const themePreferencesTable = pgTable('theme_preferences', {
  userId: text('user_id').primaryKey(),
  companyId: text('company_id'),
  paletteId: text('palette_id').notNull(),
});

export const notificationsTable = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id').notNull(),
    targetRole: authRoleEnum('target_role').notNull(),
    type: text('type').notNull(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('notifications_target_role_idx').on(table.targetRole)],
);

export const auditEventsTable = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    actorUserId: text('actor_user_id').notNull(),
    companyId: text('company_id').notNull(),
    divisionId: text('division_id'),
    localId: text('local_id'),
    type: text('type').notNull(),
    correlationId: text('correlation_id'),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    details: jsonb('details').notNull(),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('audit_events_company_created_at_idx').on(
      table.companyId,
      table.createdAt,
    ),
    index('audit_events_correlation_id_idx').on(table.correlationId),
    index('audit_events_local_id_idx').on(table.localId),
  ],
);

export const provisioningRunsTable = pgTable(
  'provisioning_runs',
  {
    id: text('id').primaryKey(),
    correlationId: text('correlation_id').notNull(),
    requestId: text('request_id').notNull(),
    actorUserId: text('actor_user_id').notNull(),
    process: text('process').notNull(),
    companyName: text('company_name'),
    status: provisioningStatusEnum('status').notNull(),
    attempt: integer('attempt').notNull().default(1),
    idempotencyKey: text('idempotency_key'),
    errorSummary: text('error_summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('provisioning_runs_process_idempotency_idx')
      .on(table.process, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index('provisioning_runs_correlation_id_idx').on(table.correlationId),
    index('provisioning_runs_status_created_at_idx').on(
      table.status,
      table.createdAt,
    ),
  ],
);

export const provisioningStepsTable = pgTable(
  'provisioning_steps',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    name: text('name').notNull(),
    status: provisioningStepStatusEnum('status').notNull(),
    attempt: integer('attempt').notNull().default(1),
    detail: jsonb('detail'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('provisioning_steps_run_id_created_at_idx').on(
      table.runId,
      table.createdAt,
    ),
    index('provisioning_steps_status_idx').on(table.status),
  ],
);

export const applicationErrorsTable = pgTable(
  'application_errors',
  {
    id: text('id').primaryKey(),
    correlationId: text('correlation_id').notNull(),
    requestId: text('request_id').notNull(),
    fingerprint: text('fingerprint').notNull(),
    status: text('status').notNull(),
    code: text('code').notNull(),
    message: text('message').notNull(),
    stack: text('stack'),
    context: jsonb('context'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('application_errors_correlation_id_idx').on(table.correlationId),
    index('application_errors_fingerprint_idx').on(table.fingerprint),
    index('application_errors_created_at_idx').on(table.createdAt),
  ],
);
